/**
 * @file SingleplayerScreen.jsx
 * @description Pantalla principal del modo Singleplayer con rondas especiales.
 * 
 * Gestiona el flujo de juego singleplayer:
 * 1. Pantalla de configuración inicial
 * 2. Rondas de Ruleta Algebraica
 * 3. Tracking de puntuación y progreso
 */

import React, { useState, useCallback } from 'react';
import { ALGEBRAIC_PROPERTIES } from '../../utils/singleplayerLogic';
import { soundManager } from '../../utils/SoundManager';
import RuletaRound from './RuletaRound';
import LiquidCard from '../UI/LiquidCard';

const TOTAL_ROUNDS = 5;

const SingleplayerScreen = ({ onExit }) => {
    const [phase, setPhase] = useState('config'); // 'config', 'playing', 'results'
    const [currentRound, setCurrentRound] = useState(1);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [roundHistory, setRoundHistory] = useState([]);
    // Key para forzar remount del componente RuletaRound en cada ronda
    const [roundKey, setRoundKey] = useState(0);

    // Iniciar juego
    const startGame = () => {
        soundManager.playPop();
        setCurrentRound(1);
        setScore({ correct: 0, total: 0 });
        setRoundHistory([]);
        setRoundKey(0);
        setPhase('playing');
    };

    // Manejar fin de ronda (recibe wasCorrect y opcionalmente la propiedad usada)
    const handleRoundComplete = useCallback((wasCorrect, propertyUsed) => {
        // Actualizar historial (la propiedad ahora viene de RuletaRound)
        if (propertyUsed) {
            setRoundHistory(prev => [...prev, {
                round: currentRound,
                property: propertyUsed,
                propertyName: ALGEBRAIC_PROPERTIES[propertyUsed]?.name || 'Desconocida',
                correct: wasCorrect
            }]);
        }

        // Actualizar puntuación
        setScore(prev => ({
            correct: wasCorrect ? prev.correct + 1 : prev.correct,
            total: prev.total + 1
        }));

        // Siguiente ronda o resultados
        if (currentRound >= TOTAL_ROUNDS) {
            setPhase('results');
            soundManager.playWin();
        } else {
            setCurrentRound(prev => prev + 1);
            setRoundKey(prev => prev + 1); // Forzar remount para resetear RuletaRound
        }
    }, [currentRound]);

    // Reiniciar juego
    const restartGame = () => {
        soundManager.playPop();
        startGame();
    };

    // Pantalla de configuración
    if (phase === 'config') {
        return (
            <div className="app-background menu-container">
                <LiquidCard className="singleplayer-config-card">
                    <div className="sp-config-header">
                        <span className="sp-config-emoji">🎯</span>
                        <h2>Modo Práctica</h2>
                        <p>Entrena tus habilidades algebraicas</p>
                    </div>

                    <div className="sp-mode-section">
                        <h3>🎰 Ruleta Algebraica</h3>
                        <p className="sp-mode-desc">
                            Gira la ruleta para seleccionar una propiedad algebraica.
                            Aplica correctamente la propiedad a la expresión mostrada.
                        </p>

                        <div className="sp-properties-preview">
                            {Object.entries(ALGEBRAIC_PROPERTIES).map(([key, config]) => (
                                <div
                                    key={key}
                                    className="sp-property-badge"
                                    style={{ '--badge-color': config.color }}
                                >
                                    <span>{config.emoji}</span>
                                    <span>{config.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="sp-config-info">
                        <div className="info-item">
                            <span className="info-icon">🎮</span>
                            <span>{TOTAL_ROUNDS} rondas</span>
                        </div>
                        <div className="info-item">
                            <span className="info-icon">🎲</span>
                            <span>Propiedades aleatorias</span>
                        </div>
                    </div>

                    <div className="sp-config-actions">
                        <button onClick={startGame} className="btn btn-primary btn-large pulse-btn">
                            ▶️ INICIAR PRÁCTICA
                        </button>
                        <button onClick={onExit} className="btn btn-secondary">
                            ← Volver al Menú
                        </button>
                    </div>
                </LiquidCard>
            </div>
        );
    }

    // Pantalla de juego
    if (phase === 'playing') {
        return (
            <div className="app-background">
                <div className="singleplayer-container">
                    {/* Header */}
                    <header className="sp-header">
                        <button onClick={onExit} className="btn-icon" title="Salir">🏠</button>
                        <div className="sp-progress">
                            <span className="sp-round-indicator">
                                Ronda {currentRound} / {TOTAL_ROUNDS}
                            </span>
                            <div className="sp-progress-bar">
                                <div
                                    className="sp-progress-fill"
                                    style={{ width: `${(currentRound - 1) / TOTAL_ROUNDS * 100}%` }}
                                />
                            </div>
                        </div>
                        <div className="sp-score">
                            <span className="score-correct">✓ {score.correct}</span>
                            <span className="score-separator">/</span>
                            <span className="score-total">{score.total}</span>
                        </div>
                    </header>

                    {/* Ronda actual - key fuerza remount */}
                    <RuletaRound
                        key={roundKey}
                        onComplete={handleRoundComplete}
                        roundNumber={currentRound}
                        isLastRound={currentRound >= TOTAL_ROUNDS}
                    />
                </div>
            </div>
        );
    }

    // Pantalla de resultados
    if (phase === 'results') {
        const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
        const grade = percentage >= 80 ? '🏆' : percentage >= 60 ? '⭐' : percentage >= 40 ? '📚' : '💪';
        const message = percentage >= 80 ? '¡Excelente dominio!'
            : percentage >= 60 ? '¡Buen trabajo!'
                : percentage >= 40 ? 'Sigue practicando'
                    : '¡No te rindas!';

        return (
            <div className="app-background menu-container">
                <LiquidCard className="sp-results-card">
                    <div className="sp-results-header">
                        <span className="results-grade-emoji">{grade}</span>
                        <h2>Resultados</h2>
                        <p className="results-message">{message}</p>
                    </div>

                    <div className="sp-results-score">
                        <div className="score-circle" style={{ '--percentage': percentage }}>
                            <span className="score-percentage">{percentage}%</span>
                        </div>
                        <p className="score-detail">
                            {score.correct} de {score.total} correctas
                        </p>
                    </div>

                    <div className="sp-results-history">
                        <h3>📜 Historial de Rondas</h3>
                        <div className="history-list">
                            {roundHistory.map((entry, index) => (
                                <div
                                    key={index}
                                    className={`history-entry ${entry.correct ? 'correct' : 'incorrect'}`}
                                >
                                    <span className="entry-round">R{entry.round}</span>
                                    <span className="entry-property">
                                        {ALGEBRAIC_PROPERTIES[entry.property]?.emoji} {entry.propertyName}
                                    </span>
                                    <span className="entry-result">
                                        {entry.correct ? '✓' : '✗'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="sp-results-actions">
                        <button onClick={restartGame} className="btn btn-primary">
                            🔄 Jugar de Nuevo
                        </button>
                        <button onClick={onExit} className="btn btn-secondary">
                            ← Volver al Menú
                        </button>
                    </div>
                </LiquidCard>
            </div>
        );
    }

    return null;
};

export default SingleplayerScreen;
