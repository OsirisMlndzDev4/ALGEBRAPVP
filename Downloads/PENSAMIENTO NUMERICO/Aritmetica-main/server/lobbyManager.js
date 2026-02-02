/**
 * @file server/lobbyManager.js
 * @description Gestor de salas/lobbies para el multijugador LAN
 * 
 * Maneja la creación, unión y gestión de salas de juego.
 */

// ============================================
// Estado de Lobbies
// ============================================

/**
 * @typedef {Object} Lobby
 * @property {string} roomCode - Código único de la sala
 * @property {string} hostId - Socket ID del host
 * @property {string} hostName - Nombre del host
 * @property {string|null} guestId - Socket ID del invitado
 * @property {string|null} guestName - Nombre del invitado
 * @property {string} difficulty - Dificultad seleccionada
 * @property {'waiting'|'ready'|'playing'|'finished'} status - Estado de la sala
 * @property {number} createdAt - Timestamp de creación
 */

/** @type {Map<string, Lobby>} */
const lobbies = new Map();

/** @type {Map<string, string>} socketId -> roomCode */
const playerToRoom = new Map();

// ============================================
// Generación de Códigos
// ============================================

/**
 * Genera un código de sala único de 4 caracteres alfanuméricos
 * @returns {string} Código de sala
 */
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin I, O, 1, 0 para evitar confusión
    let code;

    do {
        code = '';
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (lobbies.has(code)); // Asegurar unicidad

    return code;
}

// ============================================
// Funciones de Lobby
// ============================================

/**
 * Crea una nueva sala
 * @param {string} hostSocketId - Socket ID del host
 * @param {string} hostName - Nombre del jugador host
 * @param {string} difficulty - Dificultad seleccionada
 * @returns {{ roomCode: string, difficulty: string }}
 */
export function createLobby(hostSocketId, hostName, difficulty = 'medium') {
    // Verificar si el jugador ya está en una sala
    if (playerToRoom.has(hostSocketId)) {
        throw new Error('Ya estás en una sala. Abandónala primero.');
    }

    const roomCode = generateRoomCode();

    /** @type {Lobby} */
    const lobby = {
        roomCode,
        hostId: hostSocketId,
        hostName: hostName || 'Jugador 1',
        guestId: null,
        guestName: null,
        difficulty,
        status: 'waiting',
        createdAt: Date.now()
    };

    lobbies.set(roomCode, lobby);
    playerToRoom.set(hostSocketId, roomCode);

    return { roomCode, difficulty };
}

/**
 * Unirse a una sala existente
 * @param {string} guestSocketId - Socket ID del invitado
 * @param {string} roomCode - Código de la sala
 * @param {string} guestName - Nombre del jugador invitado
 * @returns {{ roomCode: string, hostName: string, difficulty: string }}
 */
export function joinLobby(guestSocketId, roomCode, guestName) {
    // Verificar si el jugador ya está en una sala
    if (playerToRoom.has(guestSocketId)) {
        throw new Error('Ya estás en una sala. Abandónala primero.');
    }

    const lobby = lobbies.get(roomCode.toUpperCase());

    if (!lobby) {
        throw new Error('Sala no encontrada. Verifica el código.');
    }

    if (lobby.guestId) {
        throw new Error('La sala está llena.');
    }

    if (lobby.status !== 'waiting') {
        throw new Error('La sala ya no está disponible.');
    }

    // Agregar al invitado
    lobby.guestId = guestSocketId;
    lobby.guestName = guestName || 'Jugador 2';
    lobby.status = 'ready';

    playerToRoom.set(guestSocketId, roomCode.toUpperCase());

    return {
        roomCode: lobby.roomCode,
        hostName: lobby.hostName,
        difficulty: lobby.difficulty
    };
}

/**
 * Abandonar una sala
 * @param {string} socketId - Socket ID del jugador que abandona
 * @returns {boolean} true si se eliminó la sala
 */
export function leaveLobby(socketId) {
    const roomCode = playerToRoom.get(socketId);
    if (!roomCode) return false;

    const lobby = lobbies.get(roomCode);
    if (!lobby) {
        playerToRoom.delete(socketId);
        return false;
    }

    // Si es el host quien abandona, eliminar la sala completa
    if (lobby.hostId === socketId) {
        // Limpiar referencias del guest también
        if (lobby.guestId) {
            playerToRoom.delete(lobby.guestId);
        }
        lobbies.delete(roomCode);
        playerToRoom.delete(socketId);
        return true;
    }

    // Si es el guest quien abandona, solo removerlo de la sala
    if (lobby.guestId === socketId) {
        lobby.guestId = null;
        lobby.guestName = null;
        lobby.status = 'waiting';
        playerToRoom.delete(socketId);
    }

    return false;
}

/**
 * Obtiene la lista de salas disponibles (esperando jugadores)
 * @returns {Array<{ roomCode: string, hostName: string, difficulty: string, createdAt: number }>}
 */
export function getAvailableLobbies() {
    const available = [];

    for (const [_, lobby] of lobbies) {
        if (lobby.status === 'waiting' && !lobby.guestId) {
            available.push({
                roomCode: lobby.roomCode,
                hostName: lobby.hostName,
                difficulty: lobby.difficulty,
                createdAt: lobby.createdAt
            });
        }
    }

    // Ordenar por más recientes primero
    return available.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Obtiene un lobby por socket ID del jugador
 * @param {string} socketId 
 * @returns {Lobby|null}
 */
export function getLobbyBySocketId(socketId) {
    const roomCode = playerToRoom.get(socketId);
    if (!roomCode) return null;
    return lobbies.get(roomCode) || null;
}

/**
 * Obtiene un lobby por código de sala
 * @param {string} roomCode 
 * @returns {Lobby|null}
 */
export function getLobbyByCode(roomCode) {
    return lobbies.get(roomCode.toUpperCase()) || null;
}

/**
 * Marca un lobby como "en juego" y lo prepara para iniciar
 * @param {string} roomCode 
 * @param {string} hostSocketId - Para verificar que solo el host puede iniciar
 * @returns {Lobby|null}
 */
export function startLobbyGame(roomCode, hostSocketId) {
    const lobby = lobbies.get(roomCode);

    if (!lobby) return null;
    if (lobby.hostId !== hostSocketId) return null; // Solo el host puede iniciar
    if (lobby.status !== 'ready') return null; // Debe tener 2 jugadores
    if (!lobby.guestId) return null;

    lobby.status = 'playing';
    return lobby;
}

/**
 * Marca un lobby como terminado
 * @param {string} roomCode 
 */
export function finishLobby(roomCode) {
    const lobby = lobbies.get(roomCode);
    if (lobby) {
        lobby.status = 'finished';
    }
}

/**
 * Elimina un lobby completamente
 * @param {string} roomCode 
 */
export function deleteLobby(roomCode) {
    const lobby = lobbies.get(roomCode);
    if (lobby) {
        playerToRoom.delete(lobby.hostId);
        if (lobby.guestId) {
            playerToRoom.delete(lobby.guestId);
        }
        lobbies.delete(roomCode);
    }
}

// Para debugging
export function debugLobbies() {
    console.log('=== LOBBIES ===');
    for (const [code, lobby] of lobbies) {
        console.log(`${code}: ${lobby.hostName} vs ${lobby.guestName || '(esperando)'} [${lobby.status}]`);
    }
    console.log('===============');
}
