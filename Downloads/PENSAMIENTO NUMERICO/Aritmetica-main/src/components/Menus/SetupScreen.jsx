
import React, { useState } from 'react';
import LiquidCard from '../UI/LiquidCard';

const SetupScreen = ({ onStartGame, onBack }) => {
    const [p1Name, setP1Name] = useState('Jugador 1');
    const [p2Name, setP2Name] = useState('Jugador 2');

    const handleStart = () => {
        onStartGame(p1Name || 'Jugador 1', p2Name || 'Jugador 2');
    };

    return (
        <div className="app-background menu-container">
            <LiquidCard className="menu-card">
                <div className="menu-icon">👥</div>
                <h1 className="menu-title">Jugadores</h1>
                <p className="menu-description">Ingresa los nombres de los duelistas.</p>

                <div className="setup-inputs">
                    <div className="input-group">
                        <label>Jugador 1</label>
                        <input
                            type="text"
                            value={p1Name}
                            onChange={(e) => setP1Name(e.target.value)}
                            className="liquid-input"
                            placeholder="Nombre Jugador 1"
                            maxLength={12}
                        />
                    </div>
                    <div className="input-group">
                        <label>Jugador 2</label>
                        <input
                            type="text"
                            value={p2Name}
                            onChange={(e) => setP2Name(e.target.value)}
                            className="liquid-input"
                            placeholder="Nombre Jugador 2"
                            maxLength={12}
                        />
                    </div>
                </div>

                <button onClick={handleStart} className="btn btn-primary menu-btn">
                    ¡A Luchar!
                </button>

                <button
                    onClick={onBack}
                    className="btn btn-secondary menu-btn"
                    style={{ marginTop: '10px' }}
                >
                    Volver
                </button>
            </LiquidCard>
        </div>
    );
};

export default SetupScreen;
