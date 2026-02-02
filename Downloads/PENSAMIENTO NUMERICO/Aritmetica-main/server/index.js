/**
 * @file server/index.js
 * @description Servidor Socket.IO para el multijugador LAN de Aritmética PvP
 * 
 * Ejecutar con: npm run server
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { networkInterfaces } from 'os';
import dgram from 'dgram';

import {
    createLobby,
    joinLobby,
    leaveLobby,
    getAvailableLobbies,
    getLobbyBySocketId,
    startLobbyGame
} from './lobbyManager.js';

import {
    initializeGame,
    submitPlayerExpression,
    checkBothPlayersReady,
    resolveRound,
    getGameState,
    cleanupGame,
    skipPlayerTurn,
    startNextRound
} from './gameManager.js';

// ============================================
// Configuración del Servidor
// ============================================

const PORT = process.env.PORT || 3001;
const BROADCAST_PORT = 3002;

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// ============================================
// Utilidades de Red
// ============================================

function getLocalIPs() {
    const nets = networkInterfaces();
    const results = [];

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Saltar interfaces internas y no IPv4
            if (net.family === 'IPv4' && !net.internal) {
                results.push(net.address);
            }
        }
    }
    return results;
}

// ============================================
// UDP Broadcast para Auto-descubrimiento
// ============================================

let broadcastServer = null;

function startBroadcast() {
    try {
        broadcastServer = dgram.createSocket('udp4');

        broadcastServer.on('message', (msg, rinfo) => {
            if (msg.toString() === 'ARITMETICA_DISCOVER') {
                const response = JSON.stringify({
                    type: 'ARITMETICA_SERVER',
                    port: PORT,
                    name: 'Servidor Aritmética PvP'
                });
                broadcastServer.send(response, rinfo.port, rinfo.address);
            }
        });

        broadcastServer.bind(BROADCAST_PORT, () => {
            console.log(`[UDP] Escuchando broadcasts en puerto ${BROADCAST_PORT}`);
        });
    } catch (error) {
        console.error('[UDP] Error iniciando broadcast:', error);
    }
}

// ============================================
// Manejo de Conexiones Socket.IO
// ============================================

io.on('connection', (socket) => {
    console.log(`[Socket] Cliente conectado: ${socket.id}`);

    // ----------------------------------------
    // LOBBY EVENTS
    // ----------------------------------------

    /**
     * Crear nueva sala
     * Payload: { playerName: string, difficulty: string }
     */
    socket.on('lobby:create', ({ playerName, difficulty }) => {
        try {
            const result = createLobby(socket.id, playerName, difficulty);
            socket.join(result.roomCode);
            socket.emit('lobby:created', result);
            console.log(`[Lobby] Sala ${result.roomCode} creada por ${playerName}`);

            // Notificar a todos los clientes que hay una nueva sala disponible
            io.emit('lobby:listUpdate', getAvailableLobbies());
        } catch (error) {
            socket.emit('lobby:error', { message: error.message });
        }
    });

    /**
     * Unirse a una sala existente
     * Payload: { playerName: string, roomCode: string }
     */
    socket.on('lobby:join', ({ playerName, roomCode }) => {
        try {
            const result = joinLobby(socket.id, roomCode, playerName);
            socket.join(roomCode.toUpperCase());

            // Notificar al jugador que se unió
            socket.emit('lobby:joined', result);

            // Notificar al host que alguien se unió
            socket.to(roomCode.toUpperCase()).emit('lobby:playerJoined', {
                playerName
            });

            console.log(`[Lobby] ${playerName} se unió a sala ${roomCode}`);

            // Actualizar lista de lobbies (ya no está disponible)
            io.emit('lobby:listUpdate', getAvailableLobbies());
        } catch (error) {
            socket.emit('lobby:error', { message: error.message });
        }
    });

    /**
     * Abandonar sala actual
     */
    socket.on('lobby:leave', () => {
        handlePlayerLeave(socket);
    });

    /**
     * Solicitar lista de salas disponibles
     */
    socket.on('lobby:list', () => {
        socket.emit('lobby:listUpdate', getAvailableLobbies());
    });

    // ----------------------------------------
    // GAME EVENTS
    // ----------------------------------------

    /**
     * Iniciar partida (solo host)
     * Payload: { roomCode: string }
     */
    socket.on('game:start', ({ roomCode }) => {
        try {
            const lobby = startLobbyGame(roomCode, socket.id);
            if (!lobby) {
                socket.emit('lobby:error', { message: 'No se puede iniciar el juego' });
                return;
            }

            // Inicializar estado del juego
            const gameState = initializeGame(roomCode, lobby);

            // Enviar estado inicial a cada jugador (con sus propias cartas)
            const player1State = getGameState(roomCode, lobby.hostId);
            const player2State = getGameState(roomCode, lobby.guestId);

            io.to(lobby.hostId).emit('game:started', player1State);
            io.to(lobby.guestId).emit('game:started', player2State);

            console.log(`[Game] Partida iniciada en sala ${roomCode}`);

            // Actualizar lista (ya no está disponible)
            io.emit('lobby:listUpdate', getAvailableLobbies());
        } catch (error) {
            socket.emit('game:error', { message: error.message });
        }
    });

    /**
     * Enviar expresión (submit)
     * Payload: { roomCode: string, expression: string }
     */
    socket.on('game:submit', ({ roomCode, expression }) => {
        try {
            const result = submitPlayerExpression(roomCode, socket.id, expression);

            if (!result.success) {
                socket.emit('game:error', { message: result.error });
                return;
            }

            // Confirmar al jugador que su expresión fue recibida
            socket.emit('game:submitted', { expression });

            // Notificar al oponente que el jugador está listo
            socket.to(roomCode).emit('game:opponentReady');

            // Verificar si ambos jugadores han enviado su respuesta
            if (checkBothPlayersReady(roomCode)) {
                // Resolver la ronda
                const roundResult = resolveRound(roomCode);

                // Enviar resultados a ambos jugadores
                io.to(roomCode).emit('game:roundResult', roundResult);

                console.log(`[Game] Ronda ${roundResult.round} resuelta en ${roomCode}`);

                // Si hay un ganador, terminar el juego
                if (roundResult.gameOver) {
                    io.to(roomCode).emit('game:over', {
                        winner: roundResult.winner,
                        finalStats: roundResult.finalStats
                    });

                    // Limpiar el juego después de un delay
                    setTimeout(() => {
                        cleanupGame(roomCode);
                    }, 5000);
                }
            }
        } catch (error) {
            socket.emit('game:error', { message: error.message });
        }
    });

    /**
     * Jugador se rinde / No envía respuesta (timeout manual o botón skip)
     * Payload: { roomCode: string }
     */
    socket.on('game:skip', ({ roomCode }) => {
        try {
            const result = skipPlayerTurn(roomCode, socket.id);

            if (!result.success) {
                socket.emit('game:error', { message: result.error });
                return;
            }

            // Confirmar al jugador
            socket.emit('game:submitted', { expression: '', skipped: true });

            // Notificar al oponente
            socket.to(roomCode).emit('game:opponentReady');

            // Verificar si ambos han respondido
            if (checkBothPlayersReady(roomCode)) {
                const roundResult = resolveRound(roomCode);
                io.to(roomCode).emit('game:roundResult', roundResult);

                if (roundResult.gameOver) {
                    io.to(roomCode).emit('game:over', {
                        winner: roundResult.winner,
                        finalStats: roundResult.finalStats
                    });

                    setTimeout(() => {
                        cleanupGame(roomCode);
                    }, 5000);
                }
            }
        } catch (error) {
            socket.emit('game:error', { message: error.message });
        }
    });

    /**
     * Solicitar siguiente ronda (SOLO HOST puede iniciar)
     * Payload: { roomCode: string }
     */
    socket.on('game:nextRound', ({ roomCode }) => {
        try {
            const lobby = getLobbyBySocketId(socket.id);
            if (!lobby) {
                socket.emit('game:error', { message: 'Juego no encontrado' });
                return;
            }

            // SOLO EL HOST puede iniciar la siguiente ronda
            if (socket.id !== lobby.hostId) {
                socket.emit('game:error', { message: 'Solo el host puede iniciar la siguiente ronda' });
                return;
            }

            // Generar nuevas cartas y target para la ronda
            const updatedGame = startNextRound(roomCode);
            if (!updatedGame) {
                socket.emit('game:error', { message: 'Error al iniciar nueva ronda' });
                return;
            }

            // Enviar nuevo estado a cada jugador
            const player1State = getGameState(roomCode, lobby.hostId);
            const player2State = getGameState(roomCode, lobby.guestId);

            io.to(lobby.hostId).emit('game:roundStart', player1State);
            io.to(lobby.guestId).emit('game:roundStart', player2State);

            console.log(`[Game] Nueva ronda ${updatedGame.round} iniciada en ${roomCode}`);
        } catch (error) {
            socket.emit('game:error', { message: error.message });
        }
    });

    // ----------------------------------------
    // DISCONNECT
    // ----------------------------------------

    socket.on('disconnect', () => {
        console.log(`[Socket] Cliente desconectado: ${socket.id}`);
        handlePlayerLeave(socket);
    });
});

/**
 * Manejar cuando un jugador abandona (voluntario o desconexión)
 */
function handlePlayerLeave(socket) {
    const lobby = getLobbyBySocketId(socket.id);

    if (lobby) {
        const wasHost = lobby.hostId === socket.id;
        const otherPlayerId = wasHost ? lobby.guestId : lobby.hostId;

        // Notificar al otro jugador
        if (otherPlayerId) {
            io.to(otherPlayerId).emit('lobby:playerLeft', {
                playerName: wasHost ? lobby.hostName : lobby.guestName,
                hostLeft: wasHost
            });

            // Si estaban en juego, el otro jugador gana por abandono
            if (lobby.status === 'playing') {
                io.to(otherPlayerId).emit('game:over', {
                    winner: wasHost ? lobby.guestName : lobby.hostName,
                    reason: 'opponent_disconnected'
                });
                cleanupGame(lobby.roomCode);
            }
        }

        // Limpiar lobby
        leaveLobby(socket.id);
        socket.leave(lobby.roomCode);

        // Actualizar lista de lobbies
        io.emit('lobby:listUpdate', getAvailableLobbies());
    }
}

// ============================================
// Iniciar Servidor
// ============================================
httpServer.listen(PORT, () => {
    const ips = getLocalIPs();
    console.log('\n========================================');
    console.log('  🎮 Aritmética PvP - Servidor LAN');
    console.log('========================================');
    console.log(`  Puerto: ${PORT}`);
    console.log('  IPs disponibles:');
    ips.forEach(ip => console.log(`    - http://${ip}:${PORT}`));
    if (ips.length === 0) {
        console.log('    - http://localhost:' + PORT);
    }
    console.log('========================================\n');

    // Iniciar broadcast UDP para auto-descubrimiento
    startBroadcast();
});
