/**
 * @file cpuPlayer.js
 * @description Motor de Inteligencia Artificial para el modo CPU vs CPU.
 * 
 * Este módulo se encarga de simular decisiones humanas en el juego.
 * No solo busca la solución óptima, sino que puede cometer errores intencionales
 * basados en una "tasa de error" configurada, para simular diferentes niveles de habilidad.
 * 
 * Estrategias soportadas:
 * - Perfect: Siempre encuentra la mejor jugada posible.
 * - Realistic: Comete errores humanos comunes (cálculos cercanos).
 * - Learning: Simula un jugador novato con más fallos.
 */

import { findSolution, DIFFICULTY_CONFIG } from './gameLogic';

/**
 * AI Play Strategies
 */
/**
 * Estrategias de comportamiento de la IA.
 * Definen la probabilidad de éxito y el tipo de jugadas que intentará realizar.
 */
export const AI_STRATEGY = {
    /** Siempre encuentra la solución exacta si existe. */
    PERFECT: 'perfect',
    /** Simula un jugador humano promedio: aciertos frecuentes pero con errores ocasionales. */
    REALISTIC: 'realistic',
    /** Simula un principiante: jugadas simples y mayor tasa de fallos. */
    LEARNING: 'learning',
};

/**
 * Genera una jugada de la CPU basada en la situación actual del tablero.
 * 
 * El proceso es:
 * 1. Calcula primero la solución óptima (Target exacto).
 * 2. Decide si usar esa solución o "equivocarse" basado en la estrategia y tasa de error.
 * 3. Si decide equivocarse, genera una jugada "cercana" o un "fallo total".
 * 
 * @param {Object} params - Parámetros del estado del juego
 * @param {number} params.target - El número objetivo
 * @param {number[]} params.cards - Las cartas disponibles en mano
 * @param {string} params.difficulty - Dificultad actual (afecta la tolerancia de errores)
 * @param {string} params.strategy - Estrategia base (PERFECT, REALISTIC, LEARNING)
 * @param {number} params.errorRate - [Opcional] Probabilidad específica de cometer error (0.0 - 1.0)
 * @param {number} params.complexity - [Opcional] Preferencia por jugadas complejas (usar más cartas)
 * @returns {Object} Objeto de jugada (expression, result, commentary, type, cardsUsed)
 */
export function generateCpuPlay({ target, cards, difficulty = 'medium', strategy = AI_STRATEGY.REALISTIC, errorRate, complexity }) {
    const config = DIFFICULTY_CONFIG[difficulty];

    // Find the optimal solution
    const optimalSolution = findSolution(target, cards, difficulty);

    // Determine if AI should make a "mistake" based on strategy
    const roll = Math.random();
    let play = {
        expression: '',
        result: 0,
        commentary: '',
        type: 'perfect',
        cardsUsed: 0,
    };

    switch (strategy) {
        case AI_STRATEGY.PERFECT:
            // Always use optimal solution
            play = buildPerfectPlay(optimalSolution, target, cards);
            break;

        case AI_STRATEGY.REALISTIC:
            // 70% perfect, 20% near-perfect, 10% miss
            if (roll < 0.7) {
                play = buildPerfectPlay(optimalSolution, target, cards);
            } else if (roll < 0.9) {
                play = buildNearPerfectPlay(target, cards, config);
            } else {
                play = buildMissPlay(target, cards, config);
            }
            break;

        case AI_STRATEGY.LEARNING:
            // 40% perfect, 30% near, 30% miss (more mistakes for tutorial)
            if (roll < 0.4) {
                play = buildPerfectPlay(optimalSolution, target, cards);
            } else if (roll < 0.7) {
                play = buildNearPerfectPlay(target, cards, config);
            } else {
                play = buildMissPlay(target, cards, config);
            }
            break;

        default:
            play = buildPerfectPlay(optimalSolution, target, cards);
    }

    return play;
}

/**
 * Builds a perfect play (exact target hit)
 */
function buildPerfectPlay(solution, target, cards) {
    // Count cards used in solution
    const cardsUsed = countCardsInExpression(solution, cards);
    const hasParentheses = solution.includes('(');
    const hasDivision = solution.includes('/');
    const operators = countUniqueOperators(solution);

    let commentary = '🎯 ¡PERFECTO! ';

    if (cardsUsed === 4 && operators >= 3) {
        commentary = '🌟 ¡JUGADA MAESTRA! Usa las 4 cartas con 3+ operadores diferentes';
    } else if (hasParentheses) {
        commentary += 'Usa paréntesis para cambiar el orden de operaciones';
    } else if (hasDivision) {
        commentary += 'División exacta otorga +10 bonus';
    } else if (cardsUsed >= 3) {
        commentary += `Usa ${cardsUsed} cartas para bonus de +${cardsUsed === 3 ? 10 : 25}`;
    } else {
        commentary += 'Acierto exacto al target';
    }

    return {
        expression: solution,
        result: target,
        commentary,
        type: 'perfect',
        cardsUsed,
        difference: 0,
    };
}

/**
 * Builds a near-perfect play (close to target)
 */
function buildNearPerfectPlay(target, cards, config) {
    // Use 2-3 cards with simple operations
    const numCards = Math.random() < 0.5 ? 2 : 3;
    const selectedCards = cards.slice(0, numCards);

    // Build a simple expression
    let expr = selectedCards[0].toString();
    let result = selectedCards[0];

    for (let i = 1; i < selectedCards.length; i++) {
        const ops = config.operators;
        const op = ops[Math.floor(Math.random() * Math.min(2, ops.length))]; // Prefer + and -
        expr += ` ${op} ${selectedCards[i]}`;
        result = evalSimple(result, op, selectedCards[i]);
    }

    const difference = Math.abs(result - target);
    let commentary = '';

    if (difference <= 5) {
        commentary = `📊 Cerca del target (±${difference}) - Recibe 75% del daño`;
    } else if (difference <= 10) {
        commentary = `📉 Lejos del target (±${difference}) - Solo 50% del daño`;
    } else {
        commentary = `❌ MISS! Diferencia de ${difference} - Sin daño`;
    }

    return {
        expression: expr,
        result,
        commentary,
        type: difference <= 5 ? 'close' : difference <= 10 ? 'far' : 'miss',
        cardsUsed: numCards,
        difference,
    };
}

/**
 * Builds an intentional miss play
 */
function buildMissPlay(target, cards, config) {
    // Use only 1-2 cards to likely miss
    const card = cards[0];
    const expr = card.toString();
    const result = card;
    const difference = Math.abs(result - target);

    return {
        expression: expr,
        result,
        commentary: `❌ MISS! Solo usa 1 carta y falla por ${difference}. ¡La racha se rompe!`,
        type: 'miss',
        cardsUsed: 1,
        difference,
    };
}

/**
 * Helper: Count cards used in an expression
 */
function countCardsInExpression(expr, cards) {
    let count = 0;
    const numbers = expr.match(/\\d+/g) || [];
    for (const num of numbers) {
        if (cards.includes(parseInt(num))) count++;
    }
    return Math.min(count, 4);
}

/**
 * Helper: Count unique operators in expression
 */
function countUniqueOperators(expr) {
    const ops = new Set();
    if (expr.includes('+')) ops.add('+');
    if (expr.includes('-')) ops.add('-');
    if (expr.includes('*') || expr.includes('×')) ops.add('*');
    if (expr.includes('/') || expr.includes('÷')) ops.add('/');
    return ops.size;
}

/**
 * Helper: Simple eval for 2 numbers
 */
function evalSimple(a, op, b) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b !== 0 ? a / b : 0;
        default: return a + b;
    }
}

/**
 * Generate commentary for a streak event
 */
export function getStreakCommentary(streak, difficulty) {
    const config = DIFFICULTY_CONFIG[difficulty];
    const tier = config.streakConfig.find(t => streak >= t.minStreak && streak < (config.streakConfig[config.streakConfig.indexOf(t) + 1]?.minStreak || Infinity));

    if (!tier || tier.bonus === 0) return null;

    return {
        emoji: tier.emoji,
        name: tier.name,
        bonus: tier.bonus,
        message: `${tier.emoji} ¡RACHA x${streak}! +${tier.bonus} daño bonus por aciertos consecutivos`,
    };
}


