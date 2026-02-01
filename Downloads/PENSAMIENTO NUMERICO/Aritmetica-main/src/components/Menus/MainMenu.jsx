
import React from 'react';
import { DIFFICULTY_CONFIG } from '../../utils/gameLogic';
import LiquidCard from '../UI/LiquidCard';

const MainMenu = ({ difficulty, setDifficulty, onStart, onDemo }) => {
    const selectedConfig = DIFFICULTY_CONFIG[difficulty];

    return (
        <div className="app-background menu-container">
            {/* Floating Background Shapes */}
            <div className="floating-shape shape-plus">+</div>
            <div className="floating-shape shape-minus">-</div>
            <div className="floating-shape shape-times">×</div>
            <div className="floating-shape shape-div">÷</div>
            <div className="floating-shape shape-sum">∑</div>

            <div className="menu-wide-layout">
                {/* Header */}
                <header className="menu-header-compact">
                    <span className="menu-main-icon">⚡</span>
                    <h1 className="menu-title hero-text">
                        Aritmética <span className="text-gradient">PvP</span>
                    </h1>
                    <p className="menu-tagline">Combina • Calcula • Conquista</p>
                </header>

                {/* Difficulty Cards Grid */}
                <div className="difficulty-grid">
                    {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => setDifficulty(key)}
                            className={`difficulty-card ${difficulty === key ? 'selected' : ''}`}
                            style={{ '--diff-color': config.color }}
                        >
                            <div className="diff-card-header">
                                <span className="diff-card-emoji">{config.emoji}</span>
                                <span className="diff-card-name">{config.name}</span>
                            </div>

                            <p className="diff-card-desc">{config.description}</p>

                            <div className="diff-card-stats">
                                <div className="diff-stat">
                                    <span className="diff-stat-label">Cartas</span>
                                    <span className="diff-stat-value">{config.cardRange.min} - {config.cardRange.max}</span>
                                </div>
                                <div className="diff-stat">
                                    <span className="diff-stat-label">Target</span>
                                    <span className="diff-stat-value">{config.targetRange.min} - {config.targetRange.max}</span>
                                </div>
                                <div className="diff-stat">
                                    <span className="diff-stat-label">Operadores</span>
                                    <span className="diff-stat-value operators">{config.operatorSymbols.join(' ')}</span>
                                </div>
                                <div className="diff-stat">
                                    <span className="diff-stat-label">HP Inicial</span>
                                    <span className="diff-stat-value hp">{config.playerHp}</span>
                                </div>
                            </div>

                            <div className="diff-card-features">
                                {config.allowParentheses && (
                                    <span className="diff-feature">( ) Paréntesis</span>
                                )}
                                <span className="diff-feature">
                                    🔥 Racha desde {config.streakConfig[1]?.minStreak || 2}
                                </span>
                            </div>

                            {difficulty === key && (
                                <div className="diff-card-selected-badge">✓ Seleccionado</div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="menu-actions">
                    <button onClick={onStart} className="btn btn-primary menu-btn-large pulse-btn">
                        CONFIGURAR PARTIDA ⚔️
                    </button>
                    <button onClick={onDemo} className="btn btn-secondary menu-btn-demo">
                        🤖 VER DEMO CPU vs CPU
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;
