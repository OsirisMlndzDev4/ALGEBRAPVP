
import React from 'react';
import LiquidCard from '../UI/LiquidCard';

const TransitionScreen = ({ currentPlayerName, onReady }) => {
    return (
        <div className="app-background menu-container">
            <LiquidCard className="menu-card transition-card">
                <div className="menu-icon">⚔️</div>
                <h2 className="menu-title">Siguiente Turno</h2>
                <div className="next-player-display">
                    <p className="next-label">Es el turno de:</p>
                    <h1 className="next-player-name">{currentPlayerName}</h1>
                </div>
                <p className="menu-description">
                    Pasa el dispositivo a tu oponente.
                    ¡No mires sus cartas!
                </p>
                <button
                    onClick={onReady}
                    className="btn btn-primary menu-btn"
                >
                    ¡Estoy Listo!
                </button>
            </LiquidCard>
        </div>
    );
};

export default TransitionScreen;
