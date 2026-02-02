/**
 * @file src/components/Multiplayer/LobbyScreen.jsx
 * @description Pantalla de lobby para crear/unirse a partidas multijugador
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSocketEvent } from '../../hooks/useSocket';

const LobbyScreen = ({ socket, difficulty, playerName, setPlayerName, onGameStart, onExit }) => {
    const [view, setView] = useState('main'); // 'main' | 'create' | 'join' | 'waiting'
    const [roomCode, setRoomCode] = useState('');
    const [createdRoomCode, setCreatedRoomCode] = useState(null);
    const [availableLobbies, setAvailableLobbies] = useState([]);
    const [error, setError] = useState('');
    const [guestName, setGuestName] = useState(null);
    const [hostName, setHostName] = useState(null); // Nombre del host (para guests)

    // Solicitar lista de lobbies al montar
    useEffect(() => {
        socket.emit('lobby:list');
    }, [socket]);

    // Event handlers
    const handleLobbyCreated = useCallback((data) => {
        console.log('[Lobby] Sala creada:', data);
        setCreatedRoomCode(data.roomCode);
        setView('waiting');
    }, []);

    const handleLobbyJoined = useCallback((data) => {
        console.log('[Lobby] Te uniste a sala:', data);
        // Como guest, guardamos el nombre del host como nuestro oponente
        setView('waiting');
        setCreatedRoomCode(data.roomCode);
        setHostName(data.hostName); // Guardar nombre del host para mostrarlo
    }, []);

    const handlePlayerJoined = useCallback((data) => {
        console.log('[Lobby] Jugador se unió:', data);
        setGuestName(data.playerName);
    }, []);

    const handleGameStarted = useCallback((gameState) => {
        console.log('[Lobby] Juego iniciado:', gameState);
        // Determinar si somos host: el host creó la sala (no tiene hostName guardado)
        const weAreHost = hostName === null;
        onGameStart({
            roomCode: createdRoomCode || roomCode,
            isHost: weAreHost,
            // Si somos host, el oponente es el guest; si somos guest, es el host
            opponentName: weAreHost ? guestName : hostName || gameState.opponentName || 'Oponente',
            // PASAR DATOS INICIALES DEL SERVIDOR
            initialGameState: gameState
        });
    }, [createdRoomCode, roomCode, hostName, guestName, onGameStart]);

    const handlePlayerLeft = useCallback((data) => {
        console.log('[Lobby] Jugador abandonó:', data);
        if (data.hostLeft) {
            setError('El host abandonó la sala');
            setView('main');
        } else {
            setGuestName(null);
        }
    }, []);

    const handleLobbyListUpdate = useCallback((lobbies) => {
        setAvailableLobbies(lobbies);
    }, []);

    const handleError = useCallback((data) => {
        console.error('[Lobby] Error:', data);
        setError(data.message);
    }, []);

    // Subscribe to events
    useSocketEvent('lobby:created', handleLobbyCreated);
    useSocketEvent('lobby:joined', handleLobbyJoined);
    useSocketEvent('lobby:playerJoined', handlePlayerJoined);
    useSocketEvent('lobby:playerLeft', handlePlayerLeft);
    useSocketEvent('lobby:listUpdate', handleLobbyListUpdate);
    useSocketEvent('lobby:error', handleError);
    useSocketEvent('game:started', handleGameStarted);

    // Actions
    const handleCreateLobby = () => {
        if (!playerName.trim()) {
            setError('Ingresa tu nombre primero');
            return;
        }
        setError('');
        socket.emit('lobby:create', { playerName, difficulty });
    };

    const handleJoinLobby = (code) => {
        if (!playerName.trim()) {
            setError('Ingresa tu nombre primero');
            return;
        }
        setError('');
        socket.emit('lobby:join', { playerName, roomCode: code || roomCode });
    };

    const handleStartGame = () => {
        socket.emit('game:start', { roomCode: createdRoomCode });
    };

    const handleLeave = () => {
        socket.emit('lobby:leave');
        setView('main');
        setCreatedRoomCode(null);
        setGuestName(null);
    };

    // Render based on view
    const renderMain = () => (
        <div className="lobby-main">
            <div className="lobby-name-input">
                <label>Tu Nombre</label>
                <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Ingresa tu nombre..."
                    maxLength={15}
                    className="input-field"
                />
            </div>

            <div className="lobby-actions">
                <button onClick={handleCreateLobby} className="btn btn-primary lobby-btn">
                    ➕ Crear Sala
                </button>
                <button onClick={() => setView('join')} className="btn btn-secondary lobby-btn">
                    🔗 Unirse con Código
                </button>
            </div>

            {availableLobbies.length > 0 && (
                <div className="available-lobbies">
                    <h3>Salas Disponibles</h3>
                    <div className="lobby-list">
                        {availableLobbies.map((lobby) => (
                            <div key={lobby.roomCode} className="lobby-item liquid-glass">
                                <div className="lobby-info">
                                    <span className="lobby-host">{lobby.hostName}</span>
                                    <span className="lobby-code">{lobby.roomCode}</span>
                                    <span className="lobby-difficulty">{lobby.difficulty}</span>
                                </div>
                                <button
                                    onClick={() => handleJoinLobby(lobby.roomCode)}
                                    className="btn btn-sm btn-primary"
                                >
                                    Unirse
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderJoin = () => (
        <div className="lobby-join">
            <h3>Unirse a Sala</h3>
            <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Código de 4 letras"
                maxLength={4}
                className="input-field room-code-input"
            />
            <div className="lobby-actions">
                <button onClick={() => setView('main')} className="btn btn-secondary">
                    Cancelar
                </button>
                <button onClick={() => handleJoinLobby()} className="btn btn-primary">
                    Unirse
                </button>
            </div>
        </div>
    );

    const renderWaiting = () => {
        // Si somos guest (tenemos hostName), el oponente es el host
        // Si somos host (!hostName), el oponente es el guest
        const weAreHost = hostName === null;
        const opponentDisplay = weAreHost ? guestName : hostName;
        const opponentReady = weAreHost ? !!guestName : true; // El host siempre está listo cuando nos unimos

        return (
            <div className="lobby-waiting">
                <h2>Sala: <span className="room-code-display">{createdRoomCode}</span></h2>

                <div className="players-status">
                    <div className="player-slot filled">
                        <span className="player-name">{playerName}</span>
                        <span className="player-role">(Tú{weAreHost ? ' - Host' : ''})</span>
                    </div>
                    <div className="vs-divider">VS</div>
                    <div className={`player-slot ${opponentReady ? 'filled' : 'empty'}`}>
                        <span className="player-name">{opponentDisplay || 'Esperando...'}</span>
                        {!opponentReady && <div className="spinner-sm"></div>}
                    </div>
                </div>

                <div className="lobby-actions">
                    <button onClick={handleLeave} className="btn btn-secondary">
                        Abandonar
                    </button>
                    {weAreHost && guestName && (
                        <button onClick={handleStartGame} className="btn btn-primary pulse-btn">
                            ⚔️ Iniciar Partida
                        </button>
                    )}
                    {!weAreHost && (
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '1rem' }}>
                            ⏳ Esperando a que {hostName} inicie la partida...
                        </p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="app-background lobby-screen">
            <div className="lobby-container liquid-glass">
                <header className="lobby-header">
                    <button onClick={onExit} className="btn-icon back-btn">🏠</button>
                    <h1>🌐 Multijugador LAN</h1>
                </header>

                {error && (
                    <div className="lobby-error">
                        ⚠️ {error}
                        <button onClick={() => setError('')} className="btn-icon">✕</button>
                    </div>
                )}

                {view === 'main' && renderMain()}
                {view === 'join' && renderJoin()}
                {view === 'waiting' && renderWaiting()}
            </div>
        </div>
    );
};

export default LobbyScreen;
