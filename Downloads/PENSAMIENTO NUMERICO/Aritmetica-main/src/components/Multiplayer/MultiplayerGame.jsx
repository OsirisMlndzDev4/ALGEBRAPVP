/**
 * @file MultiplayerGame.jsx
 * @description Componente de juego multijugador sincronizado vía Socket.IO
 * 
 * IMPORTANTE: Usa datos del SERVIDOR (cartas/target compartidos)
 * Solo el HOST puede iniciar la siguiente ronda
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSocketEvent } from '../../hooks/useSocket';
import {
    DIFFICULTY_CONFIG,
    evaluateExpressionWithVariables
} from '../../utils/gameLogic';
import { soundManager } from '../../utils/SoundManager';

const MultiplayerGame = ({
    socket,
    roomCode,
    playerName,
    opponentName,
    isHost,
    difficulty,
    initialGameState, // DATOS INICIALES DEL SERVIDOR (pasados desde LobbyScreen)
    onLeave,
    onGameOver
}) => {
    // Config
    const diffConfig = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
    const maxHp = diffConfig.playerHp || 200;

    // Game State - Datos del SERVIDOR
    const [round, setRound] = useState(1);
    const [target, setTarget] = useState(0);
    const [cards, setCards] = useState([]);           // Cartas numéricas
    const [variables, setVariables] = useState([]);   // Variables [{symbol, value}]
    const [variableValues, setVariableValues] = useState({}); // {x: 5, y: 3}
    const [myHp, setMyHp] = useState(maxHp);
    const [opponentHp, setOpponentHp] = useState(maxHp);
    const [waitingForServer, setWaitingForServer] = useState(true);

    // Expression building
    const [expression, setExpression] = useState('');
    const [usedCards, setUsedCards] = useState([]);
    const [usedVariables, setUsedVariables] = useState([]);

    // Turn state
    const [submitted, setSubmitted] = useState(false);
    const [opponentReady, setOpponentReady] = useState(false);

    // Result state
    const [showResult, setShowResult] = useState(false);
    const [roundResult, setRoundResult] = useState(null);
    const [waitingForNextRound, setWaitingForNextRound] = useState(false);

    // Game over state
    const [gameOver, setGameOver] = useState(false);
    const [winner, setWinner] = useState(null);

    // Visual state
    const [isShaking, setIsShaking] = useState(false);

    // ========================================
    // Socket Event Handlers - USAR DATOS DEL SERVIDOR
    // ========================================

    /**
     * Recibe datos del servidor cuando inicia el juego o una nueva ronda
     */
    const handleGameData = useCallback((gameState) => {
        console.log('[Game] Recibido estado del servidor:', gameState);

        if (!gameState) {
            console.error('[Game] gameState es null/undefined');
            return;
        }

        // Actualizar datos del juego desde el servidor
        setRound(gameState.round || 1);
        setTarget(gameState.target || 0);

        // Cartas del servidor
        setCards(gameState.myCards || []);

        // Variables - el servidor envía símbolos como strings ['x', 'y']
        const varsArray = (gameState.myVariables || []).map(sym => ({
            symbol: typeof sym === 'string' ? sym : sym.symbol,
            value: gameState.variableValues?.[typeof sym === 'string' ? sym : sym.symbol] || 0
        }));
        setVariables(varsArray);
        setVariableValues(gameState.variableValues || {});

        // HP
        if (gameState.myHp !== undefined) setMyHp(gameState.myHp);
        if (gameState.opponentHp !== undefined) setOpponentHp(gameState.opponentHp);

        // Reset estado de la ronda
        setExpression('');
        setUsedCards([]);
        setUsedVariables([]);
        setSubmitted(false);
        setOpponentReady(false);
        setShowResult(false);
        setRoundResult(null);
        setWaitingForServer(false);
        setWaitingForNextRound(false);

        console.log('[Game] Estado actualizado:', {
            round: gameState.round,
            target: gameState.target,
            cards: gameState.myCards,
            variables: gameState.myVariables,
            variableValues: gameState.variableValues
        });
    }, []);

    // Initialize with data from props (passed from LobbyScreen via game:started event)
    useEffect(() => {
        console.log('[MultiplayerGame] Mounted with initialGameState:', initialGameState);
        soundManager.init();

        // Si tenemos datos iniciales, usarlos inmediatamente
        if (initialGameState) {
            handleGameData(initialGameState);
        }
    }, [initialGameState, handleGameData]);

    const handleSubmitted = useCallback((data) => {
        console.log('[Game] Mi expresión confirmada');
        setSubmitted(true);
    }, []);

    const handleOpponentReady = useCallback(() => {
        console.log('[Game] Oponente listo');
        setOpponentReady(true);
    }, []);

    const handleRoundResult = useCallback((result) => {
        console.log('[Game] Resultado de ronda:', result);
        setRoundResult(result);
        setShowResult(true);

        // Determinar mis datos y del oponente
        const myData = isHost ? result.player1 : result.player2;
        const opponentData = isHost ? result.player2 : result.player1;

        // Efectos de sonido
        if (myData.damageTaken > 0) {
            soundManager.playDamage();
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        } else if (opponentData.damageTaken > 0) {
            soundManager.playWin();
        }

        // Actualizar HP
        setMyHp(myData.currentHp);
        setOpponentHp(opponentData.currentHp);

    }, [isHost]);

    const handleGameOver = useCallback((data) => {
        console.log('[Game] Fin del juego:', data);
        setGameOver(true);
        setWinner(data.winner);

        if (data.winner === playerName) {
            soundManager.playWin();
        } else {
            soundManager.playError();
        }
    }, [playerName]);

    // Subscribe to events - IMPORTANTE: game:started para datos iniciales
    useSocketEvent('game:started', handleGameData);
    useSocketEvent('game:roundStart', handleGameData);
    useSocketEvent('game:submitted', handleSubmitted);
    useSocketEvent('game:opponentReady', handleOpponentReady);
    useSocketEvent('game:roundResult', handleRoundResult);
    useSocketEvent('game:over', handleGameOver);

    // ========================================
    // Expression Building - IGUAL QUE MODO LOCAL
    // ========================================

    const getLastTokenType = (expr) => {
        if (!expr || expr.length === 0) return 'empty';
        const lastChar = expr[expr.length - 1];
        if (/\d/.test(lastChar)) return 'number';
        if (['x', 'y'].includes(lastChar)) return 'variable';
        if (['+', '-', '*', '/'].includes(lastChar)) return 'operator';
        if (lastChar === '(') return 'openParen';
        if (lastChar === ')') return 'closeParen';
        return 'unknown';
    };

    const lastTokenType = getLastTokenType(expression);
    const canAddNumber = lastTokenType === 'empty' || lastTokenType === 'operator' || lastTokenType === 'openParen';
    const canAddVariable = canAddNumber || lastTokenType === 'number' || lastTokenType === 'closeParen';
    const canAddOperator = lastTokenType === 'number' || lastTokenType === 'variable' || lastTokenType === 'closeParen';
    const canAddOpenParen = lastTokenType === 'empty' || lastTokenType === 'operator' || lastTokenType === 'openParen';
    const openParenCount = (expression.match(/\(/g) || []).length;
    const closeParenCount = (expression.match(/\)/g) || []).length;
    const canAddCloseParen = (lastTokenType === 'number' || lastTokenType === 'variable' || lastTokenType === 'closeParen') && openParenCount > closeParenCount;

    const handleCardClick = (cardValue, index) => {
        if (submitted || usedCards.includes(index) || !canAddNumber) return;
        soundManager.playSelect();
        setExpression(prev => prev + cardValue);
        setUsedCards(prev => [...prev, index]);
    };

    const handleVariableClick = (variable) => {
        if (submitted || usedVariables.includes(variable.symbol) || !canAddVariable) return;
        soundManager.playSelect();
        setExpression(prev => prev + variable.symbol);
        setUsedVariables(prev => [...prev, variable.symbol]);
    };

    const handleOperatorClick = (operator) => {
        if (submitted || !canAddOperator) return;
        soundManager.playPop();
        setExpression(prev => prev + operator);
    };

    const handleParenthesis = (paren) => {
        if (submitted) return;
        if (paren === '(' && canAddOpenParen) {
            soundManager.playPop();
            setExpression(prev => prev + '(');
        } else if (paren === ')' && canAddCloseParen) {
            soundManager.playPop();
            setExpression(prev => prev + ')');
        }
    };

    const handleClear = () => {
        if (submitted) return;
        soundManager.playError();
        setExpression('');
        setUsedCards([]);
        setUsedVariables([]);
    };

    const evaluateExpression = () => {
        if (!expression) return null;
        try {
            return evaluateExpressionWithVariables(expression, variableValues);
        } catch {
            return null;
        }
    };

    const handleSubmit = () => {
        if (submitted || !expression.trim()) return;

        const result = evaluateExpression();
        if (result === null || isNaN(result)) {
            console.error('[Game] Expresión inválida');
            return;
        }

        soundManager.playAttack();
        socket.emit('game:submit', { roomCode, expression });
    };

    // SOLO EL HOST puede iniciar siguiente ronda
    const handleNextRound = () => {
        if (!isHost) return; // Seguridad extra en cliente
        setWaitingForNextRound(true);
        socket.emit('game:nextRound', { roomCode });
    };

    const handleExit = () => {
        socket.emit('lobby:leave');
        onLeave();
    };

    const previewResult = evaluateExpression();

    // ========================================
    // Render
    // ========================================

    // Waiting for server data
    if (waitingForServer && cards.length === 0) {
        return (
            <div className="app-background multiplayer-connecting">
                <div className="connecting-content liquid-glass">
                    <h2>⏳ Cargando partida...</h2>
                    <p>Esperando datos del servidor</p>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    // Game Over Screen
    if (gameOver) {
        const isWinner = winner === playerName;
        return (
            <div className="app-background multiplayer-gameover">
                <div className="gameover-content liquid-glass">
                    <h1 className="gameover-title">
                        {isWinner ? '🏆 ¡VICTORIA!' : '💀 DERROTA'}
                    </h1>
                    <p className="gameover-winner">
                        {isWinner ? '¡Has ganado la batalla!' : `${winner} ha ganado`}
                    </p>
                    <button onClick={handleExit} className="btn btn-primary">
                        Volver al Menú
                    </button>
                </div>
            </div>
        );
    }

    // Round Result Screen
    if (showResult && roundResult) {
        const myData = isHost ? roundResult.player1 : roundResult.player2;
        const theirData = isHost ? roundResult.player2 : roundResult.player1;

        return (
            <div className="app-background round-result-screen">
                <div className="round-result-content liquid-glass">
                    <header className="result-header">
                        <h2>Ronda {roundResult.round}</h2>
                        <p className="result-target">Target: {roundResult.target}</p>
                    </header>

                    <div className="result-winner-banner">
                        {roundResult.roundWinner === 'draw' || roundResult.roundWinner === 'draw_miss'
                            ? '🤝 ¡EMPATE!'
                            : roundResult.roundWinner === playerName
                                ? '🎉 ¡GANASTE LA RONDA!'
                                : '😔 Perdiste la ronda'}
                    </div>

                    <div className="results-comparison">
                        <div className="result-card">
                            <h3>{playerName} (Tú)</h3>
                            <div className="result-expression">{myData.expression || '(Sin respuesta)'}</div>
                            <div className="result-value">= {myData.result ?? '?'}</div>
                            <div className="result-stats">
                                <span className="result-damage">{myData.damageTaken > 0 ? `-${myData.damageTaken} HP` : 'Sin daño'}</span>
                                <span className="result-hp">HP: {myData.currentHp}</span>
                            </div>
                        </div>

                        <div className="result-vs-divider">VS</div>

                        <div className="result-card">
                            <h3>{opponentName}</h3>
                            <div className="result-expression">{theirData.expression || '(Sin respuesta)'}</div>
                            <div className="result-value">= {theirData.result ?? '?'}</div>
                            <div className="result-stats">
                                <span className="result-damage">{theirData.damageTaken > 0 ? `-${theirData.damageTaken} HP` : 'Sin daño'}</span>
                                <span className="result-hp">HP: {theirData.currentHp}</span>
                            </div>
                        </div>
                    </div>

                    {/* SOLO HOST puede continuar */}
                    {isHost ? (
                        <button
                            onClick={handleNextRound}
                            className="btn btn-primary continue-btn pulse-btn"
                            disabled={waitingForNextRound}
                        >
                            {waitingForNextRound ? '⏳ Iniciando...' : 'Siguiente Ronda ➡️'}
                        </button>
                    ) : (
                        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: '1.5rem' }}>
                            ⏳ Esperando a que {opponentName} inicie la siguiente ronda...
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // Main Game Screen
    return (
        <div className={`app-background multiplayer-game ${isShaking ? 'shake-effect' : ''}`}>
            {/* Header */}
            <header className="mp-game-header">
                <div className="mp-room-info">
                    <span className="mp-room-code">Sala: {roomCode}</span>
                    <span className="mp-round">Ronda {round}</span>
                </div>
            </header>

            {/* Players Bar */}
            <div className="mp-players-bar">
                <div className="mp-player me">
                    <div className="mp-player-name">{playerName}</div>
                    <div className="mp-hp-bar">
                        <div className="mp-hp-fill" style={{ width: `${(myHp / maxHp) * 100}%` }}></div>
                        <span className="mp-hp-text">{myHp} HP</span>
                    </div>
                    {submitted && <span className="mp-status ready">✓ Listo</span>}
                </div>

                <div className="mp-vs">VS</div>

                <div className="mp-player opponent">
                    <div className="mp-player-name">{opponentName}</div>
                    <div className="mp-hp-bar opponent-bar">
                        <div className="mp-hp-fill" style={{ width: `${(opponentHp / maxHp) * 100}%` }}></div>
                        <span className="mp-hp-text">{opponentHp} HP</span>
                    </div>
                    {opponentReady && <span className="mp-status ready">✓ Listo</span>}
                </div>
            </div>

            {/* Target Display */}
            <div className="mp-target-display liquid-glass">
                <span className="mp-target-label">TARGET</span>
                <span className="mp-target-value">{target}</span>
            </div>

            {/* Variables Display */}
            {Object.keys(variableValues).length > 0 && (
                <div className="mp-variables liquid-glass">
                    <span className="mp-variables-label">Variables:</span>
                    <div className="mp-variables-list">
                        {Object.entries(variableValues).map(([name, value]) => (
                            <span key={name} className="mp-variable">{name} = {value}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Expression Builder */}
            <div className="mp-expression-area liquid-glass">
                <div className="mp-expression-display">
                    <span className="mp-expression-text">
                        {expression || 'Construye tu expresión...'}
                    </span>
                    {expression && (
                        <span className="mp-expression-preview">
                            = {previewResult ?? '?'}
                        </span>
                    )}
                </div>
            </div>

            {/* Cards - Cartas numéricas */}
            <div className="mp-cards-area">
                {cards.map((cardValue, index) => (
                    <button
                        key={`card-${index}`}
                        className={`mp-card ${usedCards.includes(index) ? 'used' : ''}`}
                        onClick={() => handleCardClick(cardValue, index)}
                        disabled={submitted || usedCards.includes(index)}
                    >
                        {cardValue}
                    </button>
                ))}
                {/* Variables como cartas */}
                {variables.map((variable, index) => (
                    <button
                        key={`var-${variable.symbol}`}
                        className={`mp-card variable-card ${usedVariables.includes(variable.symbol) ? 'used' : ''}`}
                        onClick={() => handleVariableClick(variable)}
                        disabled={submitted || usedVariables.includes(variable.symbol)}
                    >
                        {variable.symbol}
                    </button>
                ))}
            </div>

            {/* Operators */}
            <div className="mp-operators-area">
                {diffConfig.operatorSymbols.map((op, i) => (
                    <button
                        key={op}
                        className="mp-operator"
                        onClick={() => handleOperatorClick(diffConfig.operators[i])}
                        disabled={submitted}
                    >
                        {op}
                    </button>
                ))}
                {diffConfig.allowParentheses && (
                    <>
                        <button className="mp-operator" onClick={() => handleParenthesis('(')} disabled={submitted}>(</button>
                        <button className="mp-operator" onClick={() => handleParenthesis(')')} disabled={submitted}>)</button>
                    </>
                )}
            </div>

            {/* Actions */}
            <div className="mp-actions-area">
                <button className="btn btn-secondary" onClick={handleClear} disabled={submitted}>
                    🗑️ Limpiar
                </button>
                <button
                    className={`btn btn-primary ${submitted ? '' : 'pulse-btn'}`}
                    onClick={handleSubmit}
                    disabled={submitted || !expression}
                >
                    {submitted ? '⏳ Esperando...' : '✅ Enviar'}
                </button>
            </div>

            {/* Status Messages */}
            {submitted && !opponentReady && (
                <div className="mp-waiting-message liquid-glass">
                    ⏳ Esperando a que {opponentName} envíe su respuesta...
                </div>
            )}
            {submitted && opponentReady && (
                <div className="mp-waiting-message liquid-glass">
                    ✅ ¡Ambos listos! Calculando resultados...
                </div>
            )}
        </div>
    );
};

export default MultiplayerGame;
