
import React from 'react';
import LiquidCard from '../UI/LiquidCard';

const GameOverScreen = ({ winner, player1, player2, history, onRematch, onMenu }) => {
    return (
        <div className="app-background menu-container">
            <LiquidCard className="menu-card">
                <div className="menu-icon">🏆</div>
                <h1 className="menu-title">¡{winner} Gana!</h1>

                <div className="stats-container">
                    {[player1, player2].map(p => {
                        const pMoves = history.filter(h => h.player === p.name);
                        const totalDmg = pMoves.reduce((acc, curr) => acc + curr.damage, 0);
                        const maxStreak = Math.max(0, ...pMoves.map(m => m.streak || 0));
                        const perfects = pMoves.filter(m => m.type === 'perfect').length;

                        return (
                            <div key={p.name} className="player-stat-card">
                                <h3 className="stat-player-name">{p.name}</h3>
                                <div className="stat-row">
                                    <span>Daño Total</span>
                                    <strong>{totalDmg}</strong>
                                </div>
                                <div className="stat-row">
                                    <span>Mejor Racha</span>
                                    <strong>{maxStreak} 🔥</strong>
                                </div>
                                <div className="stat-row">
                                    <span>Perfectos</span>
                                    <strong>{perfects} 🎯</strong>
                                </div>
                                <div className="stat-row">
                                    <span>HP Final</span>
                                    <strong>{p.hp}</strong>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="game-over-buttons">
                    <button onClick={onRematch} className="btn btn-primary menu-btn">
                        Revancha
                    </button>
                    <button
                        onClick={onMenu}
                        className="btn btn-secondary menu-btn"
                        style={{ marginTop: '10px' }}
                    >
                        Menú Principal
                    </button>
                </div>
            </LiquidCard>
        </div>
    );
};

export default GameOverScreen;
