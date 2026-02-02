/**
 * @file SingleplayerScreen.jsx
 * @description Pantalla principal del modo Singleplayer con rondas especiales.
 * 
 * Gestiona el flujo de juego singleplayer:
 * 1. Pantalla de selección de modo
 * 2. Rondas según el modo seleccionado (Ruleta o Venn)
 * 3. Tracking de puntuación y progreso
 */

import React, { useState, useCallback } from 'react';
import { ALGEBRAIC_PROPERTIES } from '../../utils/singleplayerLogic';
import { SET_CONDITIONS } from '../../utils/vennLogic';
import { soundManager } from '../../utils/SoundManager';
import RuletaRound from './RuletaRound';
import VennRound from './VennRound';
import LiquidCard from '../UI/LiquidCard';

const TOTAL_ROUNDS = 5;

// Definición de modos disponibles
const GAME_MODES = {
    ruleta: {
        id: 'ruleta',
        name: 'Ruleta Algebraica',
        emoji: '🎰',
        description: 'Gira la ruleta y aplica propiedades algebraicas',
        color: '#BF5AF2'
    },
    venn: {
        id: 'venn',
        name: 'Venn Sorter',
        emoji: '🔵',
        description: 'Clasifica números en el diagrama de Venn',
        color: '#34C759'
    }
};

const SingleplayerScreen = ({ onExit }) => {
    const [phase, setPhase] = useState('config'); // 'config', 'playing', 'results'
    const [selectedMode, setSelectedMode] = useState(null);
    const [currentRound, setCurrentRound] = useState(1);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [roundHistory, setRoundHistory] = useState([]);
    const [roundKey, setRoundKey] = useState(0);

    // Iniciar juego con modo seleccionado
    const startGame = (mode) => {
        soundManager.playPop();
        setSelectedMode(mode);
        setCurrentRound(1);
        setScore({ correct: 0, total: 0 });
        setRoundHistory([]);
        setRoundKey(0);
        setPhase('playing');
    };

    // Manejar fin de ronda
    const handleRoundComplete = useCallback((wasCorrect, detail) => {
        // Actualizar historial
        setRoundHistory(prev => [...prev, {
            round: currentRound,
            mode: selectedMode,
            detail: detail || selectedMode,
            correct: wasCorrect
        }]);

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
            setRoundKey(prev => prev + 1);
        }
    }, [currentRound, selectedMode]);

    // Volver a configuración
    const backToConfig = () => {
        setPhase('config');
        setSelectedMode(null);
    };

    // Reiniciar juego
    const restartGame = () => {
        soundManager.playPop();
        startGame(selectedMode);
    };

    // ==================
    // PANTALLA DE CONFIG
    // ==================
    if (phase === 'config') {
        return (
            <div className="app-background menu-container">
                <LiquidCard className="singleplayer-config-card sp-mode-select">
                    <div className="sp-config-header">
                        <span className="sp-config-emoji">🎯</span>
                        <h2>Modo Práctica</h2>
                        <p>Elige un modo de entrenamiento</p>
                    </div>

                    {/* Selector de modos */}
                    <div className="sp-modes-grid">
                        {/* Modo Ruleta */}
                        <button
                            className="sp-mode-card"
                            onClick={() => startGame('ruleta')}
                            style={{ '--mode-color': GAME_MODES.ruleta.color }}
                        >
                            <span className="mode-emoji">{GAME_MODES.ruleta.emoji}</span>
                            <h3>{GAME_MODES.ruleta.name}</h3>
                            <p>{GAME_MODES.ruleta.description}</p>
                            <div className="mode-preview">
                                {Object.values(ALGEBRAIC_PROPERTIES).slice(0, 3).map((prop, i) => (
                                    <span key={i} className="preview-badge">{prop.emoji}</span>
                                ))}
                            </div>
                        </button>

                        {/* Modo Venn */}
                        <button
                            className="sp-mode-card"
                            onClick={() => startGame('venn')}
                            style={{ '--mode-color': GAME_MODES.venn.color }}
                        >
                            <span className="mode-emoji">{GAME_MODES.venn.emoji}</span>
                            <h3>{GAME_MODES.venn.name}</h3>
                            <p>{GAME_MODES.venn.description}</p>
                            <div className="mode-preview">
                                <span className="preview-badge">A∩B</span>
                                <span className="preview-badge">A-B</span>
                                <span className="preview-badge">∅</span>
                            </div>
                        </button>
                    </div>

                    <div className="sp-config-info">
                        <div className="info-item">
                            <span className="info-icon">🎮</span>
                            <span>{TOTAL_ROUNDS} rondas por modo</span>
                        </div>
                    </div>

                    <button onClick={onExit} className="btn btn-secondary">
                        ← Volver al Menú
                    </button>
                </LiquidCard>
            </div>
        );
    }

    // ==================
    // PANTALLA DE JUEGO
    // ==================
    if (phase === 'playing') {
        const modeInfo = GAME_MODES[selectedMode];

        return (
            <div className="app-background">
                <div className="singleplayer-container">
                    {/* Header */}
                    <header className="sp-header">
                        <button onClick={backToConfig} className="btn-icon" title="Salir">🏠</button>
                        <div className="sp-progress">
                            <span className="sp-round-indicator">
                                {modeInfo.emoji} Ronda {currentRound} / {TOTAL_ROUNDS}
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

                    {/* Ronda según modo */}
                    {selectedMode === 'ruleta' && (
                        <RuletaRound
                            key={roundKey}
                            onComplete={handleRoundComplete}
                            roundNumber={currentRound}
                            isLastRound={currentRound >= TOTAL_ROUNDS}
                        />
                    )}

                    {selectedMode === 'venn' && (
                        <VennRound
                            key={roundKey}
                            onComplete={handleRoundComplete}
                            roundNumber={currentRound}
                            isLastRound={currentRound >= TOTAL_ROUNDS}
                        />
                    )}
                </div>
            </div>
        );
    }

    // =====================
    // PANTALLA DE RESULTADOS
    // =====================
    if (phase === 'results') {
        const percentage = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
        const grade = percentage >= 80 ? '🏆' : percentage >= 60 ? '⭐' : percentage >= 40 ? '📚' : '💪';
        const message = percentage >= 80 ? '¡Excelente dominio!'
            : percentage >= 60 ? '¡Buen trabajo!'
                : percentage >= 40 ? 'Sigue practicando'
                    : '¡No te rindas!';
        const modeInfo = GAME_MODES[selectedMode];

        return (
            <div className="app-background menu-container">
                <LiquidCard className="sp-results-card">
                    <div className="sp-results-header">
                        <span className="results-grade-emoji">{grade}</span>
                        <h2>Resultados - {modeInfo?.name}</h2>
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
                                        {modeInfo?.emoji} {entry.mode === 'venn' ? 'Venn Sorter' :
                                            (ALGEBRAIC_PROPERTIES[entry.detail]?.name || entry.detail)}
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
                        <button onClick={backToConfig} className="btn btn-secondary">
                            🎯 Cambiar Modo
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
