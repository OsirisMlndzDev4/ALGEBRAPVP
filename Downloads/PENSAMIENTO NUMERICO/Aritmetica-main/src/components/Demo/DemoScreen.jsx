/**
 * @file DemoScreen.jsx
 * @description Pantalla principal para el modo Demo CPU vs CPU.
 * 
 * Funcionalidades principales:
 * 1. Simulación automática de partidas entre dos IAs.
 * 2. Panel de configuración para ajustar dificultad y habilidades de CPU.
 * 3. Controles de reproducción con velocidad variable (0.5x - 3x).
 * 4. Visualización en tiempo real de targets, cartas y expresiones.
 * 5. Sistema de historial y análisis ("Reasoning Panel") para explicar jugadas.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DIFFICULTY_CONFIG, generateCardsByDifficulty, generateTargetByDifficulty, calculateNormalizedDamage, getOperatorsFromExpression, hasExactDivisionInExpression, calculateStreakBonus } from '../../utils/gameLogic';
import { soundManager } from '../../utils/SoundManager';
import PlayerCard from '../Game/PlayerCard';
import LiquidCard from '../UI/LiquidCard';
import { AI_STRATEGY, generateCpuPlay } from '../../utils/cpuPlayer';

// Presets de habilidad para configurar las IAs
const CPU_SKILL_PRESETS = {
    novato: { name: 'Novato', emoji: '🐣', errorRate: 0.5, complexity: 0.3, description: 'Comete muchos errores, jugadas simples' },
    aprendiz: { name: 'Aprendiz', emoji: '📚', errorRate: 0.3, complexity: 0.5, description: 'Errores ocasionales, complejidad media' },
    experto: { name: 'Experto', emoji: '⚔️', errorRate: 0.1, complexity: 0.8, description: 'Rara vez falla, jugadas complejas' },
    maestro: { name: 'Maestro', emoji: '🧠', errorRate: 0.02, complexity: 1.0, description: 'Casi perfecto, máxima complejidad' },
};

/**
 * Componente principal de la pantalla de Demo.
 * Gestiona todo el ciclo de vida de la partida simulada.
 * 
 * @param {Object} props
 * @param {string} props.difficulty - Dificultad inicial seleccionada en el menú
 * @param {Function} props.onExit - Callback para volver al menú principal
 */
const DemoScreen = ({ difficulty: initialDifficulty = 'medium', onExit }) => {
    // Configuration state
    const [showConfig, setShowConfig] = useState(true);
    const [gameDifficulty, setGameDifficulty] = useState(initialDifficulty);
    const [cpu1Skill, setCpu1Skill] = useState('aprendiz');
    const [cpu2Skill, setCpu2Skill] = useState('aprendiz');

    // Game state
    const [player1, setPlayer1] = useState({ name: 'CPU Alpha', hp: 200, maxHp: 200 });
    const [player2, setPlayer2] = useState({ name: 'CPU Beta', hp: 200, maxHp: 200 });
    const [currentPlayer, setCurrentPlayer] = useState(1);
    const [target, setTarget] = useState(0);
    const [cards, setCards] = useState([]);
    const [turn, setTurn] = useState(1);
    const [winner, setWinner] = useState(null);

    // Streak tracking
    const [player1Streak, setPlayer1Streak] = useState(0);
    const [player2Streak, setPlayer2Streak] = useState(0);

    // Demo controls
    const [isPaused, setIsPaused] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [analysisMode, setAnalysisMode] = useState(false);

    // History tracking
    const [cpu1History, setCpu1History] = useState([]);
    const [cpu2History, setCpu2History] = useState([]);

    // Current play display
    const [currentPlay, setCurrentPlay] = useState(null);
    const [commentary, setCommentary] = useState('');
    const [reasoning, setReasoning] = useState('');
    const [showDamage, setShowDamage] = useState(null);

    // Animation states
    const [takingDamage, setTakingDamage] = useState(null);

    // Referencias para timers
    const timerRef = useRef(null);
    const config = DIFFICULTY_CONFIG[gameDifficulty];

    // Opciones de velocidad dinámicas según el modo seleccionado
    const SPEED_OPTIONS = analysisMode ? [0.5, 1, 1.5] : [1, 2, 3];

    /**
     * Inicializa o reinicia el estado del juego para una nueva partida.
     * Resetea HP, historiales y genera las primeras cartas.
     */
    const initializeGame = useCallback(() => {
        const hp = config.playerHp;
        setPlayer1({ name: 'CPU Alpha', hp, maxHp: hp });
        setPlayer2({ name: 'CPU Beta', hp, maxHp: hp });
        setPlayer1Streak(0);
        setPlayer2Streak(0);
        setCpu1History([]);
        setCpu2History([]);
        setCurrentPlayer(1);
        setTurn(1);
        setWinner(null);
        setCurrentPlay(null);
        setReasoning('');
        setIsPlaying(false);

        const initialData = generateCardsByDifficulty(gameDifficulty);
        // Extraer valores de variables para el target
        const varValues = {};
        for (const v of initialData.variables) {
            varValues[v.symbol] = v.value;
        }
        setCards(initialData.cards);
        setTarget(generateTargetByDifficulty(gameDifficulty, initialData.cards, varValues));
        setCommentary('🎮 ¡Pulsa INICIAR para comenzar la demo!');
    }, [gameDifficulty, config.playerHp]);

    /**
     * Mapea un preset de habilidad (string) a una estrategia de IA interna.
     * @param {string} skillKey - Clave del preset (novato, experto, etc.)
     */
    const getStrategyForSkill = (skillKey) => {
        const skill = CPU_SKILL_PRESETS[skillKey];
        // Map error rate to strategy
        if (skill.errorRate <= 0.05) return AI_STRATEGY.PERFECT;
        if (skill.errorRate <= 0.2) return AI_STRATEGY.REALISTIC;
        return AI_STRATEGY.LEARNING;
    };

    /**
     * Ejecuta un turno completo de la CPU.
     * 1. Determina jugador y habilidad.
     * 2. Genera jugada IA.
     * 3. Muestra "pensamiento" (expresión).
     * 4. Calcula daño y aplica efectos tras un delay.
     * 5. Programa el siguiente turno.
     */
    const executeTurn = useCallback(() => {
        if (winner || isPaused) return;

        const currentPlayerData = currentPlayer === 1 ? player1 : player2;
        const currentStreak = currentPlayer === 1 ? player1Streak : player2Streak;
        const currentSkill = currentPlayer === 1 ? cpu1Skill : cpu2Skill;
        const skillPreset = CPU_SKILL_PRESETS[currentSkill];

        // Generate CPU play with skill-based strategy
        const play = generateCpuPlay({
            target,
            cards,
            difficulty: gameDifficulty,
            strategy: getStrategyForSkill(currentSkill),
            errorRate: skillPreset.errorRate,
            complexity: skillPreset.complexity,
        });

        setCurrentPlay(play);
        setCommentary(`🤖 ${currentPlayerData.name} (${skillPreset.emoji} ${skillPreset.name}) calcula: ${play.expression} = ${play.result}`);

        // Generate reasoning for analysis mode
        const generateReasoning = (p, t, c) => {
            const diff = Math.abs(p.result - t);
            let reasons = [];
            if (p.cardsUsed >= 3) reasons.push(`Usa ${p.cardsUsed} cartas (+bonus)`);
            if (p.expression.includes('/')) reasons.push('División (+10 si exacta)');
            if (p.expression.includes('(')) reasons.push('Paréntesis (+5)');
            if (diff === 0) reasons.push('¡Acierto exacto!');
            else if (diff <= 3) reasons.push(`Cerca (±${diff})`);
            else reasons.push(`Lejos (±${diff})`);
            return reasons.join(' • ');
        };

        if (analysisMode) {
            setReasoning(generateReasoning(play, target, cards));
        }

        // Process after showing the expression
        const processDelay = analysisMode ? 3000 / speed : 2000 / speed;
        setTimeout(() => {
            // Calculate damage
            const difference = Math.abs(play.result - target);
            const operatorsUsed = getOperatorsFromExpression(play.expression);
            const hasExactDiv = hasExactDivisionInExpression(play.expression);
            const isPerfect = difference === 0;

            const damageResult = calculateNormalizedDamage({
                cardsUsed: play.cardsUsed,
                operatorsUsed,
                difference,
                hasExactDivision: hasExactDiv
            });

            const streakResult = calculateStreakBonus(currentStreak, isPerfect, gameDifficulty);

            // Update streak
            if (currentPlayer === 1) {
                setPlayer1Streak(streakResult.newStreak);
            } else {
                setPlayer2Streak(streakResult.newStreak);
            }

            const totalDamage = damageResult.miss ? 0 : damageResult.damage + streakResult.bonus;

            // Add to history
            const historyEntry = {
                turn,
                expression: play.expression,
                result: play.result,
                target,
                damage: totalDamage,
                type: isPerfect ? 'perfect' : damageResult.miss ? 'miss' : 'hit',
            };

            if (currentPlayer === 1) {
                setCpu1History(prev => [historyEntry, ...prev].slice(0, 5));
            } else {
                setCpu2History(prev => [historyEntry, ...prev].slice(0, 5));
            }

            // Show detailed commentary
            let detailedComment = play.commentary;
            if (streakResult.bonus > 0) {
                detailedComment += ` | 🔥 Racha x${streakResult.newStreak}: +${streakResult.bonus}`;
            }
            if (damageResult.miss && currentStreak >= 2) {
                detailedComment = `💔 ¡Racha de ${currentStreak} rota! El MISS termina la racha.`;
            }
            setCommentary(detailedComment);

            // Apply damage
            if (totalDamage > 0) {
                setShowDamage({ amount: totalDamage, player: currentPlayer === 1 ? 2 : 1 });
                setTakingDamage(currentPlayer === 1 ? 2 : 1);
                soundManager.playAttack();

                setTimeout(() => {
                    soundManager.playDamage();
                    setTakingDamage(null);
                    setShowDamage(null);
                }, 500);

                if (currentPlayer === 1) {
                    const newHp = Math.max(0, player2.hp - totalDamage);
                    setPlayer2(prev => ({ ...prev, hp: newHp }));
                    if (newHp <= 0) {
                        setWinner(player1.name);
                        setCommentary(`🏆 ¡${player1.name} GANA! Victoria por KO`);
                        setIsPlaying(false);
                        soundManager.playWin();
                        return;
                    }
                } else {
                    const newHp = Math.max(0, player1.hp - totalDamage);
                    setPlayer1(prev => ({ ...prev, hp: newHp }));
                    if (newHp <= 0) {
                        setWinner(player2.name);
                        setCommentary(`🏆 ¡${player2.name} GANA! Victoria por KO`);
                        setIsPlaying(false);
                        soundManager.playWin();
                        return;
                    }
                }
            }

            // Next turn after delay
            setTimeout(() => {
                if (!winner) {
                    const newData = generateCardsByDifficulty(gameDifficulty);
                    // Extraer valores de variables para el target
                    const varValues = {};
                    for (const v of newData.variables) {
                        varValues[v.symbol] = v.value;
                    }
                    setCards(newData.cards);
                    setTarget(generateTargetByDifficulty(gameDifficulty, newData.cards, varValues));
                    setCurrentPlay(null);

                    if (currentPlayer === 1) {
                        setCurrentPlayer(2);
                    } else {
                        setCurrentPlayer(1);
                        setTurn(t => t + 1);
                    }

                    const nextPlayer = currentPlayer === 1 ? player2 : player1;
                    const nextSkill = currentPlayer === 1 ? cpu2Skill : cpu1Skill;
                    setCommentary(`⏳ Turno de ${nextPlayer.name} (${CPU_SKILL_PRESETS[nextSkill].emoji})...`);
                }
            }, 1500 / speed);

        }, 2000 / speed);

    }, [currentPlayer, player1, player2, target, cards, gameDifficulty, winner, isPaused, speed, player1Streak, player2Streak, cpu1Skill, cpu2Skill]);

    // Auto-play loop
    useEffect(() => {
        if (isPlaying && !isPaused && !winner) {
            timerRef.current = setTimeout(() => {
                executeTurn();
            }, 3000 / speed);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isPlaying, isPaused, winner, executeTurn, speed, currentPlayer]);

    const startDemo = () => {
        initializeGame();
        setShowConfig(false);
        setTimeout(() => {
            setIsPlaying(true);
            setCommentary(`⚔️ ¡Comienza la batalla! Turno de CPU Alpha (${CPU_SKILL_PRESETS[cpu1Skill].emoji})`);
        }, 100);
    };

    const togglePause = () => {
        setIsPaused(!isPaused);
        setCommentary(isPaused ? '▶️ Reanudando...' : '⏸️ Demo pausada');
    };

    const cycleSpeed = () => {
        const options = analysisMode ? [0.5, 1, 1.5] : [1, 2, 3];
        const currentIndex = options.indexOf(speed);
        const nextIndex = (currentIndex + 1) % options.length;
        setSpeed(options[nextIndex]);
    };

    const resetDemo = () => {
        setShowConfig(true);
        setIsPlaying(false);
        setWinner(null);
    };

    // Configuration Panel
    if (showConfig) {
        return (
            <div className="app-background menu-container">
                <LiquidCard className="demo-config-card">
                    <div className="demo-config-header">
                        <span className="demo-config-emoji">🤖</span>
                        <h2>Configurar Demo</h2>
                        <p>Personaliza la batalla CPU vs CPU</p>
                    </div>

                    {/* Difficulty Selector */}
                    <div className="demo-config-section">
                        <label className="demo-config-label">Dificultad del Juego</label>
                        <div className="demo-config-options">
                            {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    className={`demo-config-option ${gameDifficulty === key ? 'selected' : ''}`}
                                    onClick={() => setGameDifficulty(key)}
                                    style={{ '--opt-color': cfg.color }}
                                >
                                    <span className="opt-emoji">{cfg.emoji}</span>
                                    <span className="opt-name">{cfg.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CPU 1 Skill */}
                    <div className="demo-config-section">
                        <label className="demo-config-label">
                            <span className="cpu-indicator cpu1">●</span> CPU Alpha - Nivel de Habilidad
                        </label>
                        <div className="demo-config-options skill-options">
                            {Object.entries(CPU_SKILL_PRESETS).map(([key, skill]) => (
                                <button
                                    key={key}
                                    className={`demo-config-option skill-option ${cpu1Skill === key ? 'selected' : ''}`}
                                    onClick={() => setCpu1Skill(key)}
                                >
                                    <span className="opt-emoji">{skill.emoji}</span>
                                    <div className="opt-details">
                                        <span className="opt-name">{skill.name}</span>
                                        <span className="opt-desc">{skill.description}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* CPU 2 Skill */}
                    <div className="demo-config-section">
                        <label className="demo-config-label">
                            <span className="cpu-indicator cpu2">●</span> CPU Beta - Nivel de Habilidad
                        </label>
                        <div className="demo-config-options skill-options">
                            {Object.entries(CPU_SKILL_PRESETS).map(([key, skill]) => (
                                <button
                                    key={key}
                                    className={`demo-config-option skill-option ${cpu2Skill === key ? 'selected' : ''}`}
                                    onClick={() => setCpu2Skill(key)}
                                >
                                    <span className="opt-emoji">{skill.emoji}</span>
                                    <div className="opt-details">
                                        <span className="opt-name">{skill.name}</span>
                                        <span className="opt-desc">{skill.description}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview Summary */}
                    <div className="demo-config-preview">
                        <div className="preview-matchup">
                            <span className="preview-cpu cpu1">
                                {CPU_SKILL_PRESETS[cpu1Skill].emoji} Alpha
                            </span>
                            <span className="preview-vs">VS</span>
                            <span className="preview-cpu cpu2">
                                Beta {CPU_SKILL_PRESETS[cpu2Skill].emoji}
                            </span>
                        </div>
                        <span className="preview-difficulty">
                            Dificultad: {DIFFICULTY_CONFIG[gameDifficulty].emoji} {DIFFICULTY_CONFIG[gameDifficulty].name}
                        </span>
                    </div>

                    {/* Analysis Mode Toggle */}
                    <div className="demo-config-section">
                        <label className="demo-config-label">Modo de Visualización</label>
                        <div className="demo-config-options">
                            <button
                                className={`demo-config-option ${!analysisMode ? 'selected' : ''}`}
                                onClick={() => setAnalysisMode(false)}
                            >
                                <span className="opt-emoji">⚡</span>
                                <div className="opt-details">
                                    <span className="opt-name">Normal</span>
                                    <span className="opt-desc">Velocidad 1x-3x</span>
                                </div>
                            </button>
                            <button
                                className={`demo-config-option ${analysisMode ? 'selected' : ''}`}
                                onClick={() => setAnalysisMode(true)}
                            >
                                <span className="opt-emoji">🔍</span>
                                <div className="opt-details">
                                    <span className="opt-name">Análisis</span>
                                    <span className="opt-desc">Más lento + explicaciones</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Preview Summary */}
                    <div className="demo-config-preview">
                        <div className="preview-matchup">
                            <span className="preview-cpu cpu1">
                                {CPU_SKILL_PRESETS[cpu1Skill].emoji} Alpha
                            </span>
                            <span className="preview-vs">VS</span>
                            <span className="preview-cpu cpu2">
                                Beta {CPU_SKILL_PRESETS[cpu2Skill].emoji}
                            </span>
                        </div>
                        <span className="preview-difficulty">
                            {DIFFICULTY_CONFIG[gameDifficulty].emoji} {DIFFICULTY_CONFIG[gameDifficulty].name}
                            {analysisMode && ' · 🔍 Modo Análisis'}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="demo-config-actions">
                        <button onClick={startDemo} className="btn btn-primary">
                            ▶️ INICIAR DEMO
                        </button>
                        <button onClick={onExit} className="btn btn-secondary">
                            ← Volver al Menú
                        </button>
                    </div>
                </LiquidCard>
            </div>
        );
    }

    // Main Demo View
    return (
        <div className="app-background">
            <div className="demo-container">
                {/* Header */}
                <header className="demo-header">
                    <button onClick={resetDemo} className="btn-icon" title="Configurar">⚙️</button>
                    <div className="demo-title">
                        <span className="demo-badge">🤖 DEMO</span>
                        <h2>
                            <span className="cpu1-color">{CPU_SKILL_PRESETS[cpu1Skill].emoji}</span>
                            {' vs '}
                            <span className="cpu2-color">{CPU_SKILL_PRESETS[cpu2Skill].emoji}</span>
                        </h2>
                        <span className="demo-round">Ronda {turn} · {DIFFICULTY_CONFIG[gameDifficulty].name}</span>
                    </div>
                    <div className="demo-controls">
                        <button onClick={togglePause} className="btn btn-secondary">
                            {isPaused ? '▶️' : '⏸️'}
                        </button>
                        <button onClick={cycleSpeed} className="btn btn-secondary">
                            {speed}x
                        </button>
                        <button onClick={onExit} className="btn-icon" title="Salir">🏠</button>
                    </div>
                </header>

                {/* Arena */}
                <div className="demo-arena-with-history">
                    {/* CPU 1 History */}
                    <div className="demo-history-sidebar cpu1">
                        <div className="demo-history-title">📜 Alpha</div>
                        {cpu1History.length === 0 ? (
                            <div className="demo-history-empty">Sin jugadas aún</div>
                        ) : (
                            cpu1History.map((entry, i) => (
                                <div key={i} className={`demo-history-item ${entry.type}`}>
                                    <div className="history-item-row">
                                        <span>R{entry.turn}</span>
                                        <span className={entry.damage > 0 ? 'dmg-hit' : 'dmg-miss'}>
                                            {entry.damage > 0 ? `-${entry.damage}` : 'MISS'}
                                        </span>
                                    </div>
                                    <div className="history-item-expr">{entry.expression} = {entry.result}</div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Main Arena */}
                    <div className="demo-arena">
                        <div className="demo-player-side">
                            <div className="demo-cpu-label cpu1">
                                {CPU_SKILL_PRESETS[cpu1Skill].emoji} {CPU_SKILL_PRESETS[cpu1Skill].name}
                            </div>
                            <PlayerCard
                                player={player1}
                                isCurrentTurn={currentPlayer === 1}
                                isTakingDamage={takingDamage === 1}
                                streak={player1Streak}
                                difficulty={gameDifficulty}
                                positionClass="p1-card"
                            />
                            {showDamage?.player === 1 && (
                                <div className="demo-damage-popup">-{showDamage.amount}</div>
                            )}
                        </div>

                        <div className="demo-center">
                            <div className="demo-target liquid-glass">
                                <span className="target-label">TARGET</span>
                                <span className="target-number">{target}</span>
                            </div>

                            {currentPlay && (
                                <div className="demo-expression liquid-glass">
                                    <span className="expression-text">{currentPlay.expression}</span>
                                    <span className="expression-equals">=</span>
                                    <span className={`expression-result ${currentPlay.type}`}>{currentPlay.result}</span>
                                </div>
                            )}

                            {/* Reasoning Panel (Analysis Mode) */}
                            {analysisMode && reasoning && (
                                <div className="demo-reasoning liquid-glass">
                                    <span className="reasoning-label">🔍 Análisis:</span>
                                    <span className="reasoning-text">{reasoning}</span>
                                </div>
                            )}

                            <div className="demo-cards">
                                {cards.map((card, i) => (
                                    <div key={i} className="demo-card">{card}</div>
                                ))}
                            </div>
                        </div>

                        <div className="demo-player-side">
                            <div className="demo-cpu-label cpu2">
                                {CPU_SKILL_PRESETS[cpu2Skill].name} {CPU_SKILL_PRESETS[cpu2Skill].emoji}
                            </div>
                            <PlayerCard
                                player={player2}
                                isCurrentTurn={currentPlayer === 2}
                                isTakingDamage={takingDamage === 2}
                                streak={player2Streak}
                                difficulty={gameDifficulty}
                                positionClass="p2-card"
                            />
                            {showDamage?.player === 2 && (
                                <div className="demo-damage-popup">-{showDamage.amount}</div>
                            )}
                        </div>
                    </div>

                    {/* CPU 2 History */}
                    <div className="demo-history-sidebar cpu2">
                        <div className="demo-history-title">Beta 📜</div>
                        {cpu2History.length === 0 ? (
                            <div className="demo-history-empty">Sin jugadas aún</div>
                        ) : (
                            cpu2History.map((entry, i) => (
                                <div key={i} className={`demo-history-item ${entry.type}`}>
                                    <div className="history-item-row">
                                        <span>R{entry.turn}</span>
                                        <span className={entry.damage > 0 ? 'dmg-hit' : 'dmg-miss'}>
                                            {entry.damage > 0 ? `-${entry.damage}` : 'MISS'}
                                        </span>
                                    </div>
                                    <div className="history-item-expr">{entry.expression} = {entry.result}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Commentary */}
                <div className="demo-commentary liquid-glass">
                    <p>{commentary}</p>
                </div>

                {/* Winner overlay */}
                {winner && (
                    <div className="demo-winner-overlay">
                        <LiquidCard className="demo-winner-card">
                            <span className="winner-emoji">🏆</span>
                            <h2>{winner}</h2>
                            <p>¡Victoria!</p>
                            <div className="demo-winner-actions">
                                <button onClick={resetDemo} className="btn btn-primary">
                                    Nueva Demo
                                </button>
                                <button onClick={onExit} className="btn btn-secondary">
                                    Volver al Menú
                                </button>
                            </div>
                        </LiquidCard>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DemoScreen;
