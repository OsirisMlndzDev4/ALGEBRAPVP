
import React, { useState, useEffect } from 'react';
import { calculateNormalizedDamage, getOperatorsFromExpression, hasExactDivisionInExpression, calculateStreakBonus, validateParentheses, calculateParenthesesBonus, DIFFICULTY_CONFIG, generateCardsByDifficulty, generateTargetByDifficulty, findSolution, evaluateExpressionWithVariables, calculateVariableBonus, detectVariablesInExpression } from './utils/gameLogic';

import { soundManager } from './utils/SoundManager';
import './styles/index.css';

// Components
import MainMenu from './components/Menus/MainMenu';
import SetupScreen from './components/Menus/SetupScreen';
import TransitionScreen from './components/Menus/TransitionScreen';
import GameOverScreen from './components/Menus/GameOverScreen';
import PlayerCard from './components/Game/PlayerCard';
import Arena from './components/Game/Arena';
import SpellBar from './components/Game/SpellBar';
import ControlDeck from './components/Game/ControlDeck';
import PlayerHistory from './components/Game/PlayerHistory';
/**
 * @file App.jsx
 * @description Componente raíz y controlador principal del juego.
 * 
 * Este archivo orquesta todo el flujo del juego, manejando:
 * 1. Estados globales del juego (Menú, Configuración, Jugando, Demo, GameOver).
 * 2. Lógica de turnos y puntuación.
 * 3. Sistemas visuales (efectos de pantalla, partículas, confeti).
 * 4. Integración de Sonido y renderizado condicional de pantallas.
 * 
 * @author Antigravity Agent
 */

import DemoScreen from './components/Demo/DemoScreen';
import MultiplayerScreen from './components/Multiplayer/MultiplayerScreen';
import SingleplayerScreen from './components/Singleplayer/SingleplayerScreen';

/**
 * Componente principal de la aplicación.
 * Contiene toda la lógica de estado para una partida PvP local.
 */
const ArithmeticPvPGame = () => {
  // Init sound on mount
  /**
   * Efecto para inicializar el contexto de audio tras la primera interacción del usuario.
   * Navegadores modernos bloquean audio automático sin interacción previa.
   */
  useEffect(() => {
    const handleInteraction = () => soundManager.init();
    window.addEventListener('click', handleInteraction, { once: true });
    return () => window.removeEventListener('click', handleInteraction);
  }, []);

  // === GAME STATES ===
  // 'menu': Menú principal
  // 'setup': Pantalla de configuración de nombres
  // 'transition': Pantalla intermedia entre turnos
  // 'playing': En partida activa
  // 'demo': Modo CPU vs CPU
  // 'gameover': Pantalla de victoria/derrota
  const [gameState, setGameState] = useState('menu');
  const [difficulty, setDifficulty] = useState('medium');

  // Player States
  const [player1, setPlayer1] = useState({ name: 'Jugador 1', hp: 200, maxHp: 200 });
  const [player2, setPlayer2] = useState({ name: 'Jugador 2', hp: 200, maxHp: 200 });
  const [currentPlayer, setCurrentPlayer] = useState(1);

  // Turn State
  const [target, setTarget] = useState(0);        // Número a alcanzar
  const [cards1, setCards1] = useState([]);       // Cartas numéricas J1
  const [cards2, setCards2] = useState([]);       // Cartas numéricas J2
  const [variables1, setVariables1] = useState([]); // Variables algebraicas J1 (ej: [{symbol: 'x', value: 4}])
  const [variables2, setVariables2] = useState([]); // Variables algebraicas J2
  const [variableValues, setVariableValues] = useState({}); // Valores actuales de variables (ej: {x: 4, y: 7})
  const [expression, setExpression] = useState(''); // Expresión actual construida
  const [usedCards, setUsedCards] = useState([]);   // Índices de cartas numéricas usadas
  const [usedVariables, setUsedVariables] = useState([]); // Símbolos de variables usadas (ej: ['x'])
  const [message, setMessage] = useState('');       // Mensajes de feedback (error/éxito)
  const [turn, setTurn] = useState(1);
  const [winner, setWinner] = useState(null);
  const [history, setHistory] = useState([]);       // Historial completo de jugadas


  // Streak states
  const [player1Streak, setPlayer1Streak] = useState(0);
  const [player2Streak, setPlayer2Streak] = useState(0);
  const [streakAnimation, setStreakAnimation] = useState(null);

  // Animation states
  const [isAttacking, setIsAttacking] = useState(false);
  const [damagePopup, setDamagePopup] = useState(null);
  const [takingDamage, setTakingDamage] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null); // Used for trigger only? Logic looks unused in render but valid for state
  const [showConfetti, setShowConfetti] = useState(false);
  const [screenShake, setScreenShake] = useState(false);
  const [particles, setParticles] = useState([]);

  // Particle Spawner
  /**
   * Sistema de partículas simple para VFX.
   * Crea elementos visuales temporales en coordenadas específicas.
   * @param {number} x - Coordenada X
   * @param {number} y - Coordenada Y
   * @param {number} count - Cantidad de partículas
   * @param {string} color - Color de las partículas
   */
  const spawnParticles = (x, y, count = 10, color = '#FF453A') => {
    const newParticles = Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + i,
      x: x,
      y: y,
      dx: (Math.random() - 0.5) * 200 + 'px',
      dy: (Math.random() - 0.5) * 200 + 'px',
      color: color
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 1000);
  };

  // Surrender states
  const [showSurrenderConfirmation, setShowSurrenderConfirmation] = useState(false);
  const [surrenderSolution, setSurrenderSolution] = useState(null);

  // Exit Confirmation states
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Get current difficulty config
  const difficultyConfig = DIFFICULTY_CONFIG[difficulty];

  // Helper getters
  const currentCards = currentPlayer === 1 ? cards1 : cards2;
  const currentVariables = currentPlayer === 1 ? variables1 : variables2;
  const currentPlayerName = currentPlayer === 1 ? player1.name : player2.name;

  const handleExitGame = () => {
    setGameState('menu');
    setShowExitConfirmation(false);
  };

  const confirmSurrender = () => {
    setShowSurrenderConfirmation(false);
    // Pasar variableValues a findSolution para mostrar solución con variables
    const solution = findSolution(target, currentCards, difficulty, variableValues);
    setSurrenderSolution(solution);
  };


  const closeSolutionAndNextTurn = () => {
    setSurrenderSolution(null);
    if (currentPlayer === 1) setPlayer1Streak(0);
    else setPlayer2Streak(0);

    const damage = 25;
    setTakingDamage(currentPlayer);
    setDamagePopup({ damage: -damage, type: 'pro', x: window.innerWidth / 2, y: window.innerHeight / 2 });

    // Sonido de daño al rendirse
    soundManager.playDamage();

    // Calcular nuevo HP y verificar si muere
    let newHp;
    let playerDied = false;

    if (currentPlayer === 1) {
      newHp = Math.max(0, player1.hp - damage);
      setPlayer1(prev => ({ ...prev, hp: newHp }));
      playerDied = newHp <= 0;
    } else {
      newHp = Math.max(0, player2.hp - damage);
      setPlayer2(prev => ({ ...prev, hp: newHp }));
      playerDied = newHp <= 0;
    }

    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 500);

    setHistory(prev => [{
      player: currentPlayerName,
      damage: damage,
      target: target,
      result: 'RENDIDO',
      expression: '🏳️',
      turn: turn,
      type: 'miss'
    }, ...prev]);

    setTimeout(() => {
      setTakingDamage(null);
      setDamagePopup(null);

      // Verificar si el jugador murió al rendirse
      if (playerDied) {
        // El oponente gana - replicar comportamiento de victoria normal
        const winnerName = currentPlayer === 1 ? player2.name : player1.name;
        setWinner(winnerName);
        soundManager.playWin();
        setShowConfetti(true);
        setTimeout(() => {
          setShowConfetti(false);
          setGameState('gameover');
        }, 2000);
      } else {
        nextTurn();
      }
    }, 1500);
  };



  const startGame = (p1Name = 'Jugador 1', p2Name = 'Jugador 2') => {
    soundManager.playPop();
    const config = DIFFICULTY_CONFIG[difficulty];
    const hp = config.playerHp;

    // Generar cartas y variables para ambos jugadores
    const player1Data = generateCardsByDifficulty(difficulty);
    const player2Data = generateCardsByDifficulty(difficulty);

    // Extraer valores de variables para el target (usamos las del jugador 1 inicialmente)
    const varValues = {};
    for (const v of player1Data.variables) {
      varValues[v.symbol] = v.value;
    }

    setPlayer1({ name: p1Name, hp: hp, maxHp: hp });
    setPlayer2({ name: p2Name, hp: hp, maxHp: hp });
    setCards1(player1Data.cards);
    setCards2(player2Data.cards);
    setVariables1(player1Data.variables);
    setVariables2(player2Data.variables);
    setVariableValues(varValues);
    setTarget(generateTargetByDifficulty(difficulty, player1Data.cards, varValues));
    setCurrentPlayer(1);
    setExpression('');
    setUsedCards([]);
    setUsedVariables([]);
    setMessage('');
    setTurn(1);
    setWinner(null);
    setHistory([]);
    setPlayer1Streak(0);
    setPlayer2Streak(0);
    setStreakAnimation(null);
    setGameState('playing');
  };


  // Expression construction logic
  const getLastTokenType = (expr) => {
    if (!expr || expr.length === 0) return 'empty';
    const lastChar = expr[expr.length - 1];
    if (/\d/.test(lastChar)) return 'number';
    if (['x', 'y'].includes(lastChar)) return 'variable'; // Variables se comportan como números
    if (['+', '-', '*', '/'].includes(lastChar)) return 'operator';
    if (lastChar === '(') return 'openParen';
    if (lastChar === ')') return 'closeParen';
    return 'unknown';
  };

  const lastTokenType = getLastTokenType(expression);
  // Números se pueden añadir después de operador, paréntesis abierto, o al inicio
  const canAddNumber = lastTokenType === 'empty' || lastTokenType === 'operator' || lastTokenType === 'openParen';
  // Variables se pueden añadir donde van números Y también después de un número (multiplicación implícita: 2x)
  // También después de paréntesis de cierre: (3+1)x
  const canAddVariable = canAddNumber || lastTokenType === 'number' || lastTokenType === 'closeParen';
  const canAddOperator = lastTokenType === 'number' || lastTokenType === 'variable' || lastTokenType === 'closeParen';
  const canAddOpenParen = lastTokenType === 'empty' || lastTokenType === 'operator' || lastTokenType === 'openParen';
  const openParenCount = (expression.match(/\(/g) || []).length;
  const closeParenCount = (expression.match(/\)/g) || []).length;
  const canAddCloseParen = (lastTokenType === 'number' || lastTokenType === 'variable' || lastTokenType === 'closeParen') && openParenCount > closeParenCount;


  const addToExpression = (value, cardIndex) => {
    soundManager.playSelect();
    setSelectedCard(cardIndex);
    setTimeout(() => setSelectedCard(null), 400);

    setExpression(prev => prev + value);
    setUsedCards(prev => [...prev, cardIndex]);
  };

  // Nueva función para agregar variables a la expresión
  const addVariableToExpression = (symbol) => {
    if (!canAddVariable) return;
    soundManager.playSelect();
    setExpression(prev => prev + symbol);
    setUsedVariables(prev => [...prev, symbol]);
  };

  const addOperator = (op) => {
    if (canAddOperator) {
      setExpression(prev => prev + op);
      soundManager.playPop();
    }
  };

  const addParenthesis = (paren) => {
    if (paren === '(' && canAddOpenParen) {
      setExpression(prev => prev + '(');
      soundManager.playPop();
    }
    else if (paren === ')' && canAddCloseParen) {
      setExpression(prev => prev + ')');
      soundManager.playPop();
    }
  };

  const clearExpression = () => {
    setExpression('');
    setUsedCards([]);
    setUsedVariables([]);
  };

  // Evalúa la expresión reemplazando variables con sus valores
  const evaluateExpression = (expr) => {
    // Si hay variables en la dificultad, usar evaluación con variables
    if (difficultyConfig?.variableConfig?.enabled) {
      return evaluateExpressionWithVariables(expr, variableValues);
    }
    // Fallback para modo fácil sin variables
    try {
      const result = eval(expr);
      return typeof result === 'number' && !isNaN(result) ? result : null;
    } catch {
      return null;
    }
  };


  /**
   * Procesa el ataque del jugador actual.
   * 1. Evalúa la expresión matemática.
   * 2. Calcula daño, bonificaciones y validaciones.
   * 3. Aplica efectos visuales y de sonido.
   * 4. Actualiza HP y Estado del juego.
   */
  const submitAttack = () => {
    const result = evaluateExpression(expression);
    if (result === null) {
      setMessage('⚠️ Expresión inválida. Intenta de nuevo.');
      soundManager.playError();
      return;
    }
    const cardsUsed = usedCards.length;
    if (cardsUsed === 0) {
      setMessage('⚠️ Debes usar al menos una carta.');
      return;
    }

    setIsAttacking(true);
    const difference = Math.abs(result - target);
    const operatorsUsed = getOperatorsFromExpression(expression);
    const hasExactDivision = hasExactDivisionInExpression(expression);
    const isPerfect = difference === 0;

    const damageResult = calculateNormalizedDamage({ cardsUsed, operatorsUsed, difference, hasExactDivision });
    const currentStreak = currentPlayer === 1 ? player1Streak : player2Streak;
    const streakResult = calculateStreakBonus(currentStreak, isPerfect, difficulty);

    if (currentPlayer === 1) setPlayer1Streak(streakResult.newStreak);
    else setPlayer2Streak(streakResult.newStreak);

    const parenValidation = validateParentheses(expression);
    if (!parenValidation.isValid) {
      setMessage(parenValidation.message);
      setIsAttacking(false);
      return;
    }
    const parenBonus = calculateParenthesesBonus(expression);

    // Calcular bonus por uso de variables algebraicas (10% extra)
    const variableBonusResult = calculateVariableBonus(expression, damageResult.damage, difficulty);

    // Daño total incluye: base + streak + paréntesis + variables
    const totalDamage = damageResult.miss ? 0 : damageResult.damage + streakResult.bonus + parenBonus.bonus + variableBonusResult.bonus;

    setHistory(prev => [{
      turn: turn,
      player: currentPlayerName,
      expression: expression,
      result: result,
      target: target,
      damage: totalDamage,
      type: damageResult.accuracyType,
      details: damageResult.bonusBreakdown.join(' | '),
      isMasterPlay: damageResult.isMasterPlay,
      streak: streakResult.newStreak,
      streakBonus: streakResult.bonus,
      variableBonus: variableBonusResult.bonus,
      variablesUsed: variableBonusResult.variablesUsed
    }, ...prev]);

    setTimeout(() => {
      setIsAttacking(false);
      if (streakResult.showAnimation) {
        setStreakAnimation({
          player: currentPlayer,
          tier: streakResult.tier,
          tierUp: streakResult.tierUp,
          broken: streakResult.streakBroken
        });
        setTimeout(() => setStreakAnimation(null), 2000);
      }

      if (damageResult.miss) {
        const brokenMsg = currentStreak >= 2 ? ` 💔 Racha de ${currentStreak} rota!` : '';
        setMessage(`❌ MISS! Resultado: ${result} | Target: ${target}.${brokenMsg}`);
        nextTurn();
        return;
      }

      setDamagePopup({
        damage: totalDamage,
        isCritical: damageResult.isMasterPlay || streakResult.tier.intensity >= 3,
        targetPlayer: currentPlayer === 1 ? 2 : 1,
        streakBonus: streakResult.bonus,
        variableBonus: variableBonusResult.bonus
      });

      // Spawn particles at target location (approximate)
      const targetX = currentPlayer === 1 ? window.innerWidth * 0.75 : window.innerWidth * 0.25;
      const targetY = window.innerHeight * 0.3;
      // Partículas doradas extra si usó variables
      const particleColor = variableBonusResult.bonus > 0 ? '#BF5AF2' : (damageResult.isMasterPlay ? '#FFD60A' : '#FF453A');
      spawnParticles(targetX, targetY, 15, particleColor);

      // Sound Effects based on outcome
      if (damageResult.isMasterPlay || streakResult.tier.intensity >= 3) {
        soundManager.playWin(); // Fanfare for big moves
      } else {
        soundManager.playAttack();
        setTimeout(() => soundManager.playDamage(), 200); // Delay impact slightly
      }

      setTimeout(() => setDamagePopup(null), 1500);

      setTakingDamage(currentPlayer === 1 ? 2 : 1);
      setTimeout(() => setTakingDamage(null), 500);

      if (totalDamage >= 40 || streakResult.tier.intensity >= 3) {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 300);
      }

      const masterPlayMsg = damageResult.isMasterPlay ? ' 🌟 JUGADA MAESTRA!' : '';
      const streakMsg = streakResult.bonus > 0 ? ` ${streakResult.tier.emoji} +${streakResult.bonus} racha!` : '';
      const parenMsg = parenBonus.bonus > 0 ? ` 🧠 +${parenBonus.bonus} paréntesis!` : '';
      const varMsg = variableBonusResult.bonus > 0 ? ` 📐 +${variableBonusResult.bonus} álgebra!` : '';
      const attackMsg = `⚔️ ${currentPlayerName} ataca con ${totalDamage} de daño!${masterPlayMsg}${streakMsg}${parenMsg}${varMsg}`;


      if (currentPlayer === 1) {
        const newHp = Math.max(0, player2.hp - totalDamage);
        setPlayer2({ ...player2, hp: newHp });
        setMessage(`${attackMsg}`);
        if (newHp <= 0) {
          setWinner(player1.name);
          soundManager.playWin();
          setShowConfetti(true);
          setTimeout(() => {
            setShowConfetti(false);
            setGameState('gameover');
          }, 2000);
          return;
        }
      } else {
        const newHp = Math.max(0, player1.hp - totalDamage);
        setPlayer1({ ...player1, hp: newHp });
        setMessage(`${attackMsg}`);
        if (newHp <= 0) {
          setWinner(player2.name);
          soundManager.playWin();
          setShowConfetti(true);
          setTimeout(() => {
            setShowConfetti(false);
            setGameState('gameover');
          }, 2000);
          return;
        }
      }
      nextTurn();
    }, 500);
  };

  const nextTurn = () => {
    setTimeout(() => {
      setGameState('transition');
      let nextPlayer = currentPlayer === 1 ? 2 : 1;

      // Generar nuevas cartas y variables para el siguiente jugador
      const newPlayerData = generateCardsByDifficulty(difficulty);

      // Extraer valores de variables para el target
      const varValues = {};
      for (const v of newPlayerData.variables) {
        varValues[v.symbol] = v.value;
      }

      setCurrentPlayer(nextPlayer);
      setVariableValues(varValues);

      if (nextPlayer === 1) {
        setCards1(newPlayerData.cards);
        setVariables1(newPlayerData.variables);
        setTurn(prev => prev + 1);
        setTarget(generateTargetByDifficulty(difficulty, newPlayerData.cards, varValues));
      } else {
        setCards2(newPlayerData.cards);
        setVariables2(newPlayerData.variables);
        setTarget(generateTargetByDifficulty(difficulty, newPlayerData.cards, varValues));
      }
      setExpression('');
      setUsedCards([]);
      setUsedVariables([]);
      setMessage('');
    }, 2000);
  };


  // --- RENDER ---
  if (gameState === 'menu') {
    return (
      <MainMenu
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        onStart={() => setGameState('setup')}
        onDemo={() => setGameState('demo')}
        onMultiplayer={() => setGameState('multiplayer')}
        onSingleplayer={() => setGameState('singleplayer')}
      />
    );
  }

  if (gameState === 'multiplayer') {
    return <MultiplayerScreen difficulty={difficulty} onExit={() => setGameState('menu')} />;
  }

  if (gameState === 'singleplayer') {
    return <SingleplayerScreen onExit={() => setGameState('menu')} />;
  }

  if (gameState === 'demo') {
    return <DemoScreen difficulty={difficulty} onExit={() => setGameState('menu')} />;
  }

  if (gameState === 'setup') {
    return <SetupScreen onStartGame={startGame} onBack={() => setGameState('menu')} />;
  }

  if (gameState === 'transition') {
    return <TransitionScreen currentPlayerName={currentPlayerName} onReady={() => setGameState('playing')} />;
  }

  if (gameState === 'gameover') {
    return (
      <GameOverScreen
        winner={winner}
        player1={player1}
        player2={player2}
        history={history}
        onRematch={() => startGame(player1.name, player2.name)}
        onMenu={() => setGameState('menu')}
      />
    );
  }

  return (
    <div className={`app-background ${screenShake ? 'screen-shake' : ''}`}>
      {/* GLOBAL OVERLAYS */}
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#FFD60A', '#FF453A', '#34C759', '#007AFF', '#FF9F0A'][Math.floor(Math.random() * 5)]
              }}
            />
          ))}
        </div>
      )}

      {damagePopup && (
        <div
          className={`damage-popup ${damagePopup.isCritical ? 'critical' : ''}`}
          style={{
            top: '30%',
            left: damagePopup.targetPlayer === 1 ? '25%' : '75%',
            transform: 'translateX(-50%)'
          }}
        >
          {damagePopup.damage > 0 ? `+${damagePopup.damage}` : damagePopup.damage}
          {damagePopup.streakBonus > 0 && <span className="streak-bonus-popup">+{damagePopup.streakBonus}</span>}
        </div>
      )}

      {streakAnimation && !streakAnimation.broken && (
        <div
          className={`streak-display intensity-${streakAnimation.tier.intensity}`}
          style={{ '--streak-color': streakAnimation.tier.color, left: streakAnimation.player === 1 ? '25%' : '75%' }}
        >
          <span className="streak-emoji">{streakAnimation.tier.emoji}</span>
          <span className="streak-name">{streakAnimation.tier.name}</span>
          <span className="streak-count">x{streakAnimation.tier.currentStreak}</span>
        </div>
      )}

      {streakAnimation && streakAnimation.broken && (
        <div className="streak-broken" style={{ left: streakAnimation.player === 1 ? '25%' : '75%' }}>
          💔 Racha Rota!
        </div>
      )}

      {/* PARTICLES SYSTEM */}
      {particles.map(p => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.x,
            top: p.y,
            '--dx': p.dx,
            '--dy': p.dy,
            backgroundColor: p.color
          }}
        />
      ))}

      {/* MODALS */}
      {showExitConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content liquid-glass">
            <h3>¿Abandonar Partida? 🏠</h3>
            <p>El progreso actual se perderá.</p>
            <div className="modal-actions">
              <button onClick={() => setShowExitConfirmation(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={handleExitGame} className="btn btn-danger">Abandonar</button>
            </div>
          </div>
        </div>
      )}

      {showSurrenderConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content liquid-glass">
            <h3>¿Rendirse? 🏳️</h3>
            <p>Perderás tu racha y recibirás <span style={{ color: 'var(--color-danger)' }}>25 dmg</span>.</p>
            <div className="modal-actions">
              <button onClick={() => setShowSurrenderConfirmation(false)} className="btn btn-secondary">Cancelar</button>
              <button onClick={confirmSurrender} className="btn btn-danger">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {surrenderSolution && (
        <div className="modal-overlay">
          <div className="modal-content liquid-glass solution-modal">
            <h3>Solución 🧠</h3>
            <div className="solution-display">{surrenderSolution}</div>
            <p className="penalty-text">Penalización aplicada</p>
            <button onClick={closeSolutionAndNextTurn} className="btn btn-primary">Entendido</button>
          </div>
        </div>
      )}

      {/* GAME CONTAINER */}
      <div className={`game-container ${isAttacking ? 'attacking' : ''}`}>
        <header className="game-header" style={{ position: 'relative' }}>
          <button
            onClick={() => setShowExitConfirmation(true)}
            className="btn-icon back-btn"
            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}
            title="Volver al Menú"
          >
            🏠
          </button>

          <button
            onClick={toggleMute}
            className="btn-icon mute-btn"
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
            title={isMuted ? "Activar Sonido" : "Silenciar"}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <h1 className="game-title">Aritmética PvP</h1>
          <p className="game-subtitle">Ronda {turn} · Turno de {currentPlayerName}</p>
        </header>

        {/* DASHBOARD LAYOUT */}
        <div className="dashboard-layout">
          {/* LEFT COLUMN - Player 1 */}
          <div className="player-column">
            <PlayerCard
              player={player1}
              isCurrentTurn={currentPlayer === 1}
              isTakingDamage={takingDamage === 1}
              streak={player1Streak}
              difficulty={difficulty}
              positionClass="p1-card"
              totalDamage={history.filter(h => h.player === player1.name && h.damage > 0).reduce((sum, h) => sum + h.damage, 0)}
            />
            <PlayerHistory
              entries={history.filter(h => h.player === player1.name)}
              playerName={player1.name}
              position="left"
            />
          </div>

          {/* CENTER COLUMN - Target */}
          <div className="center-column">
            {/* Variables display - encima del target */}
            {Object.keys(variableValues).length > 0 && (
              <div className="variable-values-display">
                {Object.entries(variableValues).map(([symbol, value]) => (
                  <span key={symbol} className="variable-badge">
                    <span className="var-symbol">{symbol}</span>
                    <span className="var-equals">=</span>
                    <span className="var-value">{value}</span>
                  </span>
                ))}
              </div>
            )}
            {/* Target bubble */}
            <div className="arena-target-large liquid-glass">
              <span className="target-label">Target</span>
              <span className="target-number">{target}</span>
            </div>
          </div>



          {/* RIGHT COLUMN - Player 2 */}
          <div className="player-column">
            <PlayerCard
              player={player2}
              isCurrentTurn={currentPlayer === 2}
              isTakingDamage={takingDamage === 2}
              streak={player2Streak}
              difficulty={difficulty}
              positionClass="p2-card"
              totalDamage={history.filter(h => h.player === player2.name && h.damage > 0).reduce((sum, h) => sum + h.damage, 0)}
            />
            <PlayerHistory
              entries={history.filter(h => h.player === player2.name)}
              playerName={player2.name}
              position="right"
            />
          </div>
        </div>

        {/* SPELL BAR */}
        <SpellBar
          expression={expression}
          result={evaluateExpression(expression)}
          onClear={clearExpression}
          onAttack={submitAttack}
          isAttacking={isAttacking}
          onSurrender={() => setShowSurrenderConfirmation(true)}
          canSurrender={!isAttacking && !showSurrenderConfirmation}
          showSurrenderConfirmation={showSurrenderConfirmation}
        />

        {/* CONTROL DECK */}
        <ControlDeck
          cards={currentCards}
          usedCards={usedCards}
          variables={currentVariables}
          usedVariables={usedVariables}
          difficultyConfig={difficultyConfig}
          canAddNumber={canAddNumber}
          canAddVariable={canAddVariable}
          canAddOperator={canAddOperator}
          canAddOpenParen={canAddOpenParen}
          canAddCloseParen={canAddCloseParen}
          onAddNumber={addToExpression}
          onAddVariable={addVariableToExpression}
          onAddOperator={addOperator}
          onAddParenthesis={addParenthesis}
        />


        {/* SYSTEM MESSAGES */}
        {message && (
          <div className="liquid-glass message-card" style={{ marginTop: '16px' }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArithmeticPvPGame;