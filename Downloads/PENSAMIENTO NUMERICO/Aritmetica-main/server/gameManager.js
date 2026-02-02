/**
 * @file server/gameManager.js
 * @description Gestor del estado del juego multijugador sincronizado
 * 
 * Maneja la lógica de juego, turnos simultáneos, y resolución de rondas.
 */

// Importar lógica del juego existente (funciones puras)
// Nota: Copiamos las funciones necesarias aquí para el servidor
// ya que el código original usa sintaxis ES6 de React

// ============================================
// Configuración de Dificultades (duplicada del cliente)
// ============================================
const DIFFICULTY_CONFIG = {
    easy: {
        name: 'Fácil',
        cardRange: { min: 1, max: 9 },
        cardCount: 4,
        targetRange: { min: 5, max: 30 },
        allowParentheses: false,
        operatorSymbols: ['+', '-'],
        accuracyThresholds: { perfect: 0, excellent: 3, good: 6, ok: 10, miss: 15 },
        playerHp: 150,
        variableConfig: null
    },
    medium: {
        name: 'Medio',
        cardRange: { min: 2, max: 10 },
        cardCount: 3,
        targetRange: { min: 10, max: 60 },
        allowParentheses: true,
        operatorSymbols: ['+', '-', '*'],
        accuracyThresholds: { perfect: 0, excellent: 2, good: 4, ok: 7, miss: 12 },
        playerHp: 200,
        variableConfig: { enabled: true, count: 1, valueRange: { min: 2, max: 8 } }
    },
    hard: {
        name: 'Difícil',
        cardRange: { min: 2, max: 20 },
        cardCount: 3,
        targetRange: { min: 20, max: 120 },
        allowParentheses: true,
        operatorSymbols: ['+', '-', '*', '/'],
        accuracyThresholds: { perfect: 0, excellent: 1, good: 2, ok: 4, miss: 8 },
        playerHp: 250,
        variableConfig: { enabled: true, count: 2, valueRange: { min: 2, max: 10 } }
    }
};

// ============================================
// Estado de Juegos
// ============================================

/**
 * @typedef {Object} PlayerState
 * @property {string} id - Socket ID
 * @property {string} name - Nombre del jugador
 * @property {number} hp - HP actual
 * @property {number} maxHp - HP máximo
 * @property {number[]} cards - Cartas numéricas
 * @property {Array<{symbol: string, value: number}>} variables - Variables algebraicas
 * @property {string} expression - Expresión enviada esta ronda
 * @property {boolean} submitted - Si ya envió su expresión
 * @property {number|null} result - Resultado de la expresión
 */

/**
 * @typedef {Object} GameState
 * @property {string} roomCode
 * @property {string} difficulty
 * @property {number} target - Número objetivo
 * @property {Object} variableValues - Valores de variables {x: 4, y: 7}
 * @property {PlayerState} player1
 * @property {PlayerState} player2
 * @property {number} round
 * @property {'playing'|'revealing'|'finished'} status
 */

/** @type {Map<string, GameState>} */
const games = new Map();

// ============================================
// Funciones de Generación
// ============================================

/**
 * Genera un número aleatorio entre min y max (inclusive)
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Genera cartas para un jugador
 */
function generateCards(difficulty) {
    const config = DIFFICULTY_CONFIG[difficulty];
    const cards = [];

    for (let i = 0; i < config.cardCount; i++) {
        cards.push(randomInt(config.cardRange.min, config.cardRange.max));
    }

    return cards;
}

/**
 * Genera variables algebraicas
 */
function generateVariables(difficulty) {
    const config = DIFFICULTY_CONFIG[difficulty];
    const variables = [];

    if (config.variableConfig?.enabled) {
        const symbols = ['x', 'y'];
        for (let i = 0; i < config.variableConfig.count; i++) {
            variables.push({
                symbol: symbols[i],
                value: randomInt(config.variableConfig.valueRange.min, config.variableConfig.valueRange.max)
            });
        }
    }

    return variables;
}

/**
 * Genera valores de variables (compartidos entre jugadores)
 */
function generateVariableValues(difficulty) {
    const config = DIFFICULTY_CONFIG[difficulty];
    const values = {};

    if (config.variableConfig?.enabled) {
        const symbols = ['x', 'y'];
        for (let i = 0; i < config.variableConfig.count; i++) {
            values[symbols[i]] = randomInt(config.variableConfig.valueRange.min, config.variableConfig.valueRange.max);
        }
    }

    return values;
}

/**
 * Genera un target alcanzable
 */
function generateTarget(difficulty, cards, variableValues) {
    const config = DIFFICULTY_CONFIG[difficulty];

    // Intentar generar un target que sea alcanzable
    // Usamos un enfoque simplificado: suma aleatoria de algunas cartas
    const numCardsToUse = Math.min(3, cards.length);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);

    let target = 0;
    for (let i = 0; i < numCardsToUse; i++) {
        const op = Math.random() > 0.3 ? 1 : -1;
        target += shuffled[i] * op;
    }

    // Agregar valor de variable si existe
    if (variableValues.x) {
        target += variableValues.x * (Math.random() > 0.5 ? 1 : 2);
    }

    // Asegurar que esté en el rango válido
    target = Math.max(config.targetRange.min, Math.min(config.targetRange.max, Math.abs(target)));

    return target;
}

/**
 * Evalúa una expresión matemática con variables
 */
function evaluateExpression(expression, variableValues = {}) {
    if (!expression || expression.trim() === '') {
        return null;
    }

    try {
        let expr = expression;

        // Reemplazar multiplicación implícita: "3x" -> "3*x", "(2+1)x" -> "(2+1)*x"
        expr = expr.replace(/(\d)([xy])/g, '$1*$2');
        expr = expr.replace(/(\))([xy])/g, '$1*$2');
        expr = expr.replace(/([xy])(\()/g, '$1*$2');
        expr = expr.replace(/([xy])(\d)/g, '$1*$2');

        // Reemplazar variables con sus valores
        for (const [symbol, value] of Object.entries(variableValues)) {
            const regex = new RegExp(symbol, 'g');
            expr = expr.replace(regex, `(${value})`);
        }

        // Evaluar la expresión
        const result = eval(expr);

        if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
            return null;
        }

        return result;
    } catch (error) {
        return null;
    }
}

/**
 * Calcula el daño basado en la cercanía al target
 */
function calculateDamage(result, target, difficulty) {
    if (result === null) {
        return { damage: 0, type: 'miss', isMiss: true };
    }

    const config = DIFFICULTY_CONFIG[difficulty];
    const difference = Math.abs(result - target);
    const thresholds = config.accuracyThresholds;

    let baseDamage = 0;
    let type = 'miss';

    if (difference === thresholds.perfect) {
        baseDamage = 50;
        type = 'perfect';
    } else if (difference <= thresholds.excellent) {
        baseDamage = 40;
        type = 'excellent';
    } else if (difference <= thresholds.good) {
        baseDamage = 30;
        type = 'good';
    } else if (difference <= thresholds.ok) {
        baseDamage = 20;
        type = 'ok';
    } else if (difference < thresholds.miss) {
        baseDamage = 10;
        type = 'close';
    } else {
        baseDamage = 0;
        type = 'miss';
    }

    return { damage: baseDamage, type, isMiss: type === 'miss', difference };
}

// ============================================
// Funciones de Juego
// ============================================

/**
 * Inicializa un nuevo juego
 * @param {string} roomCode 
 * @param {Object} lobby - Lobby con información de jugadores
 * @returns {GameState}
 */
export function initializeGame(roomCode, lobby) {
    const difficulty = lobby.difficulty;
    const config = DIFFICULTY_CONFIG[difficulty];

    // Generar valores de variables compartidos
    const variableValues = generateVariableValues(difficulty);

    // CARTAS COMPARTIDAS - Ambos jugadores tienen las mismas cartas
    const sharedCards = generateCards(difficulty);
    const sharedVariables = generateVariables(difficulty);

    // Generar target basado en las cartas compartidas
    const target = generateTarget(difficulty, sharedCards, variableValues);

    /** @type {GameState} */
    const gameState = {
        roomCode,
        difficulty,
        target,
        variableValues,
        // Cartas compartidas (para referencia en nuevas rondas)
        sharedCards,
        sharedVariables,
        player1: {
            id: lobby.hostId,
            name: lobby.hostName,
            hp: config.playerHp,
            maxHp: config.playerHp,
            cards: sharedCards,      // Mismas cartas
            variables: sharedVariables, // Mismas variables
            expression: '',
            submitted: false,
            result: null
        },
        player2: {
            id: lobby.guestId,
            name: lobby.guestName,
            hp: config.playerHp,
            maxHp: config.playerHp,
            cards: sharedCards,      // Mismas cartas
            variables: sharedVariables, // Mismas variables
            expression: '',
            submitted: false,
            result: null
        },
        round: 1,
        status: 'playing'
    };

    games.set(roomCode, gameState);
    return gameState;
}

/**
 * Obtiene el estado del juego para un jugador específico
 * (Solo muestra sus propias cartas)
 */
export function getGameState(roomCode, playerId) {
    const game = games.get(roomCode);
    if (!game) return null;

    const isPlayer1 = game.player1.id === playerId;
    const myPlayer = isPlayer1 ? game.player1 : game.player2;
    const opponent = isPlayer1 ? game.player2 : game.player1;

    // Extraer solo los símbolos de las variables (el cliente espera strings, no objetos)
    const myVariableSymbols = myPlayer.variables.map(v => v.symbol || v);

    return {
        roomCode: game.roomCode,
        difficulty: game.difficulty,
        target: game.target,
        variableValues: game.variableValues,
        round: game.round,
        status: game.status,
        // Información del jugador actual
        myCards: myPlayer.cards,
        myVariables: myVariableSymbols, // Solo símbolos: ['x', 'y']
        myHp: myPlayer.hp,
        myMaxHp: myPlayer.maxHp,
        myName: myPlayer.name,
        mySubmitted: myPlayer.submitted,
        // Información del oponente (limitada)
        opponentName: opponent.name,
        opponentHp: opponent.hp,
        opponentMaxHp: opponent.maxHp,
        opponentSubmitted: opponent.submitted
        // NO enviamos las cartas del oponente
    };
}

/**
 * Registra la expresión de un jugador
 */
export function submitPlayerExpression(roomCode, playerId, expression) {
    const game = games.get(roomCode);
    if (!game) {
        return { success: false, error: 'Juego no encontrado' };
    }

    if (game.status !== 'playing') {
        return { success: false, error: 'No es momento de enviar expresiones' };
    }

    const isPlayer1 = game.player1.id === playerId;
    const player = isPlayer1 ? game.player1 : game.player2;

    if (player.submitted) {
        return { success: false, error: 'Ya enviaste tu expresión' };
    }

    player.expression = expression;
    player.submitted = true;
    player.result = evaluateExpression(expression, game.variableValues);

    return { success: true };
}

/**
 * Verifica si ambos jugadores han enviado su expresión
 */
export function checkBothPlayersReady(roomCode) {
    const game = games.get(roomCode);
    if (!game) return false;

    return game.player1.submitted && game.player2.submitted;
}

/**
 * Resuelve la ronda actual
 * Determina ganador, aplica daño, prepara siguiente ronda
 */
export function resolveRound(roomCode) {
    const game = games.get(roomCode);
    if (!game) return null;

    game.status = 'revealing';

    const p1Result = game.player1.result;
    const p2Result = game.player2.result;
    const target = game.target;

    // Calcular cercanía al target
    const p1Damage = calculateDamage(p1Result, target, game.difficulty);
    const p2Damage = calculateDamage(p2Result, target, game.difficulty);

    const p1Diff = p1Result !== null ? Math.abs(p1Result - target) : Infinity;
    const p2Diff = p2Result !== null ? Math.abs(p2Result - target) : Infinity;

    let winner = null;
    let p1DamageTaken = 0;
    let p2DamageTaken = 0;

    // Determinar ganador de la ronda
    if (p1Damage.isMiss && p2Damage.isMiss) {
        // Ambos fallaron - nadie recibe daño
        winner = 'draw_miss';
    } else if (p1Diff < p2Diff) {
        // Jugador 1 más cerca - Jugador 2 recibe daño
        winner = game.player1.name;
        p2DamageTaken = p1Damage.damage;
    } else if (p2Diff < p1Diff) {
        // Jugador 2 más cerca - Jugador 1 recibe daño
        winner = game.player2.name;
        p1DamageTaken = p2Damage.damage;
    } else {
        // Empate - ambos reciben 50% del daño
        winner = 'draw';
        p1DamageTaken = Math.floor(p2Damage.damage * 0.5);
        p2DamageTaken = Math.floor(p1Damage.damage * 0.5);
    }

    // Aplicar daño
    game.player1.hp = Math.max(0, game.player1.hp - p1DamageTaken);
    game.player2.hp = Math.max(0, game.player2.hp - p2DamageTaken);

    // Verificar game over
    let gameOver = false;
    let gameWinner = null;

    if (game.player1.hp <= 0 && game.player2.hp <= 0) {
        // Ambos mueren al mismo tiempo - empate final
        gameOver = true;
        gameWinner = 'draw';
    } else if (game.player1.hp <= 0) {
        gameOver = true;
        gameWinner = game.player2.name;
    } else if (game.player2.hp <= 0) {
        gameOver = true;
        gameWinner = game.player1.name;
    }

    const result = {
        round: game.round,
        target: game.target,
        player1: {
            name: game.player1.name,
            expression: game.player1.expression || '(sin respuesta)',
            result: p1Result,
            difference: p1Diff === Infinity ? null : p1Diff,
            damageType: p1Damage.type,
            damageTaken: p1DamageTaken,
            currentHp: game.player1.hp
        },
        player2: {
            name: game.player2.name,
            expression: game.player2.expression || '(sin respuesta)',
            result: p2Result,
            difference: p2Diff === Infinity ? null : p2Diff,
            damageType: p2Damage.type,
            damageTaken: p2DamageTaken,
            currentHp: game.player2.hp
        },
        roundWinner: winner,
        gameOver,
        winner: gameWinner,
        finalStats: gameOver ? {
            player1: { name: game.player1.name, finalHp: game.player1.hp },
            player2: { name: game.player2.name, finalHp: game.player2.hp },
            totalRounds: game.round
        } : null
    };

    // Preparar siguiente ronda si no hay game over
    // NOTA: Ya no regeneramos cartas aquí, eso lo hace startNextRound con cartas COMPARTIDAS
    if (!gameOver) {
        game.status = 'waiting_next';  // Esperando a que host inicie siguiente ronda

        // Solo resetear estados de envío
        game.player1.expression = '';
        game.player1.submitted = false;
        game.player1.result = null;
        game.player2.expression = '';
        game.player2.submitted = false;
        game.player2.result = null;
    } else {
        game.status = 'finished';
    }

    return result;
}

/**
 * Inicia una nueva ronda con cartas y target nuevos
 * @param {string} roomCode 
 * @returns {Object|null} El estado actualizado del juego o null si no existe
 */
export function startNextRound(roomCode) {
    const game = games.get(roomCode);
    if (!game) return null;

    const difficulty = game.difficulty;
    const variableValues = generateVariableValues(difficulty);

    // Generar nuevas cartas compartidas
    const sharedCards = generateCards(difficulty);
    const sharedVariables = generateVariables(difficulty);

    // Generar nuevo target
    const target = generateTarget(difficulty, sharedCards, variableValues);

    // Actualizar estado del juego
    game.round += 1;
    game.target = target;
    game.variableValues = variableValues;
    game.sharedCards = sharedCards;
    game.sharedVariables = sharedVariables;

    // Actualizar cartas de ambos jugadores
    game.player1.cards = sharedCards;
    game.player1.variables = sharedVariables;
    game.player1.expression = '';
    game.player1.submitted = false;
    game.player1.result = null;

    game.player2.cards = sharedCards;
    game.player2.variables = sharedVariables;
    game.player2.expression = '';
    game.player2.submitted = false;
    game.player2.result = null;

    return game;
}

/**
 * Salta el turno de un jugador (no envía respuesta)
 */
export function skipPlayerTurn(roomCode, playerId) {
    return submitPlayerExpression(roomCode, playerId, '');
}

/**
 * Limpia un juego terminado
 */
export function cleanupGame(roomCode) {
    games.delete(roomCode);
}

/**
 * Obtiene el juego completo (para debugging)
 */
export function getFullGameState(roomCode) {
    return games.get(roomCode);
}
