/**
 * @file src/components/Multiplayer/MultiplayerScreen.jsx
 * @description Contenedor principal para el modo multijugador LAN
 * 
 * Estados:
 * - 'lobby': Pantalla de selección/creación de salas
 * - 'game': Partida en progreso
 */

import React, { useState } from 'react';
import LobbyScreen from './LobbyScreen';
import MultiplayerGame from './MultiplayerGame';
import { useSocket } from '../../hooks/useSocket';

const MultiplayerScreen = ({ difficulty, onExit }) => {
    const { socket, isConnected } = useSocket();

    // Estados del flujo
    const [screen, setScreen] = useState('lobby'); // 'lobby' | 'game'
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [opponentName, setOpponentName] = useState('');
    const [initialGameState, setInitialGameState] = useState(null); // Datos iniciales del servidor

    // Handler cuando se inicia el juego desde el lobby
    const handleGameStart = (gameData) => {
        setRoomCode(gameData.roomCode);
        setIsHost(gameData.isHost);
        setOpponentName(gameData.opponentName);
        setInitialGameState(gameData.initialGameState); // Guardar datos del servidor
        setScreen('game');
    };

    // Handler cuando termina el juego
    const handleGameOver = (data) => {
        console.log('[MultiplayerScreen] Game Over:', data);
        // Opcional: mostrar resultados o volver al lobby
    };

    // Handler para volver al lobby
    const handleLeaveGame = () => {
        setScreen('lobby');
        setRoomCode(null);
        setInitialGameState(null);
    };

    // Si no está conectado, mostrar pantalla de conexión
    if (!isConnected) {
        return (
            <div className="app-background multiplayer-connecting">
                <div className="connecting-content liquid-glass">
                    <h2>🌐 Conectando al servidor...</h2>
                    <p>Asegúrate de que el servidor esté corriendo con <code>npm run server</code></p>
                    <div className="spinner"></div>
                    <button onClick={onExit} className="btn btn-secondary" style={{ marginTop: '2rem' }}>
                        Volver al Menú
                    </button>
                </div>
            </div>
        );
    }

    // Renderizar según el estado
    if (screen === 'game' && roomCode) {
        return (
            <MultiplayerGame
                socket={socket}
                roomCode={roomCode}
                playerName={playerName}
                opponentName={opponentName}
                isHost={isHost}
                difficulty={difficulty}
                initialGameState={initialGameState}
                onLeave={handleLeaveGame}
                onGameOver={handleGameOver}
            />
        );
    }

    // Lobby por defecto
    return (
        <LobbyScreen
            socket={socket}
            difficulty={difficulty}
            playerName={playerName}
            setPlayerName={setPlayerName}
            onGameStart={handleGameStart}
            onExit={onExit}
        />
    );
};

export default MultiplayerScreen;
