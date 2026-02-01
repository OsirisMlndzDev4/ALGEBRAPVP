/**
 * @file gameLogic.js
 * @description Módulo central de lógica del juego Aritmética PvP.
 * 
 * Este archivo contiene todas las funciones puras y constantes de configuración
 * que rigen las reglas matemáticas, la generación de problemas y el sistema de puntuación.
 * 
 * Principales responsabilidades:
 * 1. Configuración de Dificultades (Easy, Medium, Hard).
 * 2. Generación procedimental de cartas y objetivos (Targets).
 * 3. Solucionador de expresiones (Solver) para validar targets.
 * 4. Sistema de Daño Normalizado (Cálculo de puntuación).
 * 5. Sistema de Rachas (Streak System).
 * 
 * @author Antigravity Agent
 */

/**
 * Sistema de Daño Normalizado
 * ---------------------------
 * A diferencia de juegos tradicionales donde mayor número = más daño,
 * aquí el daño se basa en la COMPLEJIDAD de la operación y la HABILIDAD del jugador.
 * 
 * Esto permite que una operación "2+2=4" tenga el mismo peso base que "100+100=200",
 * pero bonifica el uso de más cartas, operadores variados y funciones avanzadas.
 * 
 * Fórmula: DañoTotal = Base + BonusCartas + BonusOperadores + BonusDivision
 * Multiplicado por el factor de precisión según la diferencia con el target.
 */

/**
 * Configuración de Dificultades
 * Cada nivel adapta la generación de números, targets y operadores disponibles.
 */
export const DIFFICULTY_CONFIG = {
  easy: {
    name: 'Fácil',
    emoji: '🌱',
    description: 'Números pequeños, operaciones simples. ¡Perfecto para calentar!',
    color: '#34C759',
    // Cartas: números del 1 al 9
    cardRange: { min: 1, max: 9 },
    // Targets: sumas/restas simples (10-30)
    targetRange: { min: 10, max: 30 },
    // Solo suma y resta
    operators: ['+', '-'],
    operatorSymbols: ['+', '−'],
    // Sin paréntesis
    allowParentheses: false,
    // Precisión más flexible
    accuracyThresholds: {
      perfect: 0,
      excellent: 3,
      good: 6,
      ok: 10,
      miss: 15
    },
    // HP reducido para partidas más rápidas
    playerHp: 150,
    // Configuración de Rachas: Menos bonus, más difícil de activar
    streakConfig: [
      { minStreak: 0, name: '', emoji: '', bonus: 0, intensity: 0, color: 'transparent' },
      { minStreak: 3, name: 'Calentando', emoji: '🔥', bonus: 5, intensity: 1, color: '#FF9F0A' },
      { minStreak: 4, name: 'Encendido', emoji: '🔥🔥', bonus: 10, intensity: 2, color: '#FF6B35' },
      { minStreak: 5, name: 'On Fire', emoji: '🔥🔥🔥', bonus: 15, intensity: 3, color: '#FF453A' },
      { minStreak: 6, name: 'IMPARABLE', emoji: '🤯', bonus: 25, intensity: 4, color: '#AC8E68' },
    ]
  },
  medium: {
    name: 'Medio',
    emoji: '⚔️',
    description: 'Todas las operaciones. ¡El verdadero desafío matemático!',
    color: '#FF9F0A',
    // Cartas: números del 1 al 12
    cardRange: { min: 1, max: 12 },
    // Targets: operaciones intermedias (20-60)
    targetRange: { min: 20, max: 60 },
    // Todas las operaciones
    operators: ['+', '-', '*', '/'],
    operatorSymbols: ['+', '−', '×', '÷'],
    // Paréntesis disponibles
    allowParentheses: true,
    // Precisión estándar
    accuracyThresholds: {
      perfect: 0,
      excellent: 2,
      good: 4,
      ok: 7,
      miss: 12
    },
    // HP estándar
    playerHp: 200,
    // Configuración de Rachas: Balanceada
    streakConfig: [
      { minStreak: 0, name: '', emoji: '', bonus: 0, intensity: 0, color: 'transparent' },
      { minStreak: 2, name: 'En Fuego', emoji: '🔥', bonus: 8, intensity: 1, color: '#FF9F0A' },
      { minStreak: 3, name: 'Imparable', emoji: '🔥🔥', bonus: 15, intensity: 2, color: '#FF6B35' },
      { minStreak: 4, name: 'Dominando', emoji: '🔥🔥🔥', bonus: 25, intensity: 3, color: '#FF453A' },
      { minStreak: 5, name: 'LEGENDARIO', emoji: '💀', bonus: 40, intensity: 4, color: '#FFD60A' },
    ]
  },
  hard: {
    name: 'Difícil',
    emoji: '💀',
    description: 'Números grandes, precisión exigente. ¡Solo para maestros!',
    color: '#FF453A',
    // Cartas: números del 2 al 20 (incluyendo más grandes)
    cardRange: { min: 2, max: 20 },
    // Targets: operaciones complejas (50-150)
    targetRange: { min: 50, max: 150 },
    // Todas las operaciones
    operators: ['+', '-', '*', '/'],
    operatorSymbols: ['+', '−', '×', '÷'],
    // Paréntesis obligatorios para bonus máximo
    allowParentheses: true,
    // Precisión estricta
    accuracyThresholds: {
      perfect: 0,
      excellent: 1,
      good: 2,
      ok: 4,
      miss: 8
    },
    // Más HP para partidas épicas
    playerHp: 250,
    // Configuración de Rachas: High Risk, High Reward
    streakConfig: [
      { minStreak: 0, name: '', emoji: '', bonus: 0, intensity: 0, color: 'transparent' },
      { minStreak: 2, name: 'Brutal', emoji: '⚡', bonus: 15, intensity: 1, color: '#FF453A' },
      { minStreak: 3, name: 'Sádico', emoji: '⚡⚡', bonus: 30, intensity: 2, color: '#BF5AF2' },
      { minStreak: 4, name: 'DIOS', emoji: '⚡⚡⚡', bonus: 50, intensity: 3, color: '#5E5CE6' },
      { minStreak: 5, name: 'CALCULADORA HUMANA', emoji: '🧠', bonus: 80, intensity: 4, color: '#FFFFFF' },
    ]
  }
};

/**
 * Genera cartas según la dificultad seleccionada.
 * 
 * @param {string} difficulty - 'easy', 'medium', o 'hard'
 * @returns {number[]} Array de 4 números aleatorios
 */
export function generateCardsByDifficulty(difficulty = 'medium') {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  const { min, max } = config.cardRange;

  const cards = [];
  for (let i = 0; i < 4; i++) {
    cards.push(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return cards;
}

/**
 * Genera un target (número objetivo) GARANTIZADO de ser alcanzable.
 * 
 * Utiliza un algoritmo constructivo (brute-force inteligente) para explorar
 * el espacio de soluciones posibles con las cartas dadas.
 * 
 * Algoritmo:
 * 1. Toma las 4 cartas generadas.
 * 2. Genera recursivamente todas las combinaciones posibles de operaciones (+, -, *, /).
 * 3. Almacena todos los resultados enteros positivos en un Set.
 * 4. Filtra los resultados que caen dentro del rango de dificultad (min-max).
 * 5. Selecciona uno aleatoriamente (con preferencia a la complejidad si es posible).
 * 
 * @param {string} difficulty - Nivel de dificultad ('easy', 'medium', 'hard')
 * @param {number[]} cards - Array de números disponibles (las cartas)
 * @returns {number} Un número objetivo matemáticamente posible de alcanzar con las cartas
 */
export function generateTargetByDifficulty(difficulty = 'medium', cards) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium;
  const { min, max } = config.targetRange;

  // 1. Calcular todos los resultados posibles con estas cartas
  const possibleResults = new Set();

  // Helper recursivo para permutar y operar
  function explore(currentNumbers) {
    // Agregar números individuales al set de posibles
    for (const num of currentNumbers) {
      if (Number.isInteger(num)) possibleResults.add(Math.abs(num));
    }

    if (currentNumbers.length === 1) return;

    // Intentar combinar cada par de números
    for (let i = 0; i < currentNumbers.length; i++) {
      for (let j = 0; j < currentNumbers.length; j++) {
        if (i === j) continue;

        const a = currentNumbers[i];
        const b = currentNumbers[j];
        const remaining = currentNumbers.filter((_, idx) => idx !== i && idx !== j);

        // Probar todas las operaciones permitidas
        const nextSteps = [];

        // Suma (+)
        nextSteps.push(a + b);

        // Resta (-)
        nextSteps.push(a - b);

        if (difficulty !== 'easy') {
          // Multiplicación (*)
          nextSteps.push(a * b);

          // División (/) - Solo divisores enteros y no cero
          if (b !== 0 && a % b === 0) {
            nextSteps.push(a / b);
          }
        }

        for (const res of nextSteps) {
          explore([res, ...remaining]);
        }
      }
    }
  }

  // Iniciar exploración (limitada para rendimiento si fuera necesario, pero 4 cartas es rápido)
  explore(cards);

  // 2. Filtrar resultados que estén dentro del rango de dificultad deseado
  // Se convierte a Array para elegir uno random
  const validTargets = Array.from(possibleResults).filter(val =>
    val >= min && val <= max && Number.isInteger(val)
  );

  // 3. Fallback inteligente
  if (validTargets.length > 0) {
    // Dar preferencia a números más complejos/interesantes si hay muchos
    return validTargets[Math.floor(Math.random() * validTargets.length)];
  } else {
    // Si no encontramos nada en el rango (raro), devolvemos el resultado más cercano al rango
    // o simplemente la suma de todo para asegurar que se pueda hacer "algo"
    const sum = cards.reduce((a, b) => a + b, 0);
    return sum;
  }
}

/**
 * Encuentra una solución exacta para el target dado utilizando las cartas disponibles.
 * Útil para la función de "Rendirse" (mostrar solución) o para la IA.
 * 
 * Utiliza un enfoque similar a `generateTarget` pero optimizado para detenerse
 * en cuanto encuentra la PRIMERA solución válida exacta.
 * 
 * Maneja la precedencia de operadores para generar strings con paréntesis correctos.
 * 
 * @param {number} target - El número objetivo a alcanzar
 * @param {number[]} cards - Las cartas disponibles
 * @param {string} difficulty - Nivel de dificultad (afecta operaciones permitidas)
 * @returns {string|null} La expresión matemática solución (ej: "4 * (5 + 2)") o mensaje de error.
 */
export function findSolution(target, cards, difficulty = 'medium') {
  // Estructura para almacenar valor y expresión
  // { value: number, expr: string, precedence: number }
  // Precedence: 2 para * /, 1 para + -

  let result = null;

  function explore(currentItems) {
    if (result) return; // Ya encontramos uno

    for (const item of currentItems) {
      if (Math.abs(item.value - target) < 0.0001) {
        result = item.expr;
        return;
      }
    }

    if (currentItems.length === 1) return;

    for (let i = 0; i < currentItems.length; i++) {
      for (let j = 0; j < currentItems.length; j++) {
        if (i === j) continue;

        const a = currentItems[i];
        const b = currentItems[j];
        const remaining = currentItems.filter((_, idx) => idx !== i && idx !== j);

        const ops = [];
        // a + b
        ops.push({ value: a.value + b.value, expr: `${a.expr} + ${b.expr}`, precedence: 1 });
        // a - b (y b - a si b > a, pero el orden de iteración ya cubre b, a)
        ops.push({ value: a.value - b.value, expr: `${a.expr} - ${b.expr}`, precedence: 1 }); // Simple, cuidado con parentesis

        // Corrección de paréntesis para resta:
        // Si el segundo operando (b) tiene menor precedencia (es una suma/resta anterior), poner paréntesis
        // PERO mejor simplifiquemos: siempre poner paréntesis si es operación compuesta para asegurar
        // O una lógica más robusta:

        const wrap = (item, myPrec) => (item.precedence && item.precedence < myPrec) ? `(${item.expr})` : item.expr;

        // Reiniciamos ops con lógica de parentesis correcta
        // Suma
        ops.length = 0;
        ops.push({
          value: a.value + b.value,
          expr: `${a.expr} + ${b.expr}`,
          precedence: 1
        });

        // Resta
        // Para a - b, si b es suma/resta, necesita parentesis: a - (c+d)
        ops.push({
          value: a.value - b.value,
          expr: `${a.expr} - ${wrap(b, 2)}`, // Forzar parentesis en el sustraendo si es compuesta
          precedence: 1
        });

        if (difficulty !== 'easy') {
          // Mult
          // Si a o b son suma/resta, necesitan parentesis
          ops.push({
            value: a.value * b.value,
            expr: `${wrap(a, 2)} * ${wrap(b, 2)}`,
            precedence: 2
          });

          // Div
          if (b.value !== 0 && a.value % b.value === 0) {
            ops.push({
              value: a.value / b.value,
              expr: `${wrap(a, 2)} / ${wrap(b, 2)}`,
              precedence: 2
            });
          }
        }

        for (const op of ops) {
          explore([op, ...remaining]);
          if (result) return;
        }
      }
    }
  }

  // Convertir cartas number a objetos
  const initialItems = cards.map(c => ({ value: c, expr: c.toString(), precedence: 3 })); // 3 = atom
  explore(initialItems);

  return result || "Sin solución encontrada??";
}

/**
 * Calcula el daño final y las estadísticas de la jugada.
 * Este es el núcleo del sistema de puntuación ("Game Juice").
 * 
 * Factores de Puntuación:
 * 1. **Base Damage**: Daño fijo por acertar.
 * 2. **Card Bonus**: Incentiva usar más cartas (3 o 4) en lugar de soluciones simples de 2 cartas.
 * 3. **Operator Bonus**: Incentiva la variedad (usar suma y resta y multi...).
 * 4. **Division Bonus**: Recompensa extra por usar divisiones exactas (más difícil mentalmente).
 * 5. **Accuracy**: El multiplicador global basado en qué tan cerca estuviste del target.
 * 
 * @param {Object} params - Parámetros del ataque
 * @param {number} params.cardsUsed - Número de cartas utilizadas en la fórmula (1-4)
 * @param {string[]} params.operatorsUsed - Array de símbolos de operadores usados
 * @param {number} params.difference - Distancia absoluta al target (|resultado - target|)
 * @param {boolean} params.hasExactDivision - Flag si se detectó una división exacta válida
 * @returns {Object} Objeto detallado con el daño final y el desglose para la UI
 */
export function calculateNormalizedDamage({ cardsUsed, operatorsUsed, difference, hasExactDivision = false }) {
  // === DAÑO BASE ===
  const BASE_DAMAGE = 20;

  // === BONUS POR CARTAS USADAS ===
  // 2 cartas: +0, 3 cartas: +10, 4 cartas: +25
  const CARD_BONUSES = { 2: 0, 3: 10, 4: 25 };
  const cardBonus = CARD_BONUSES[cardsUsed] || 0;

  // === BONUS POR OPERADORES DISTINTOS ===
  // +5 por cada tipo de operador único usado
  const uniqueOperators = new Set(operatorsUsed);
  const operatorBonus = uniqueOperators.size * 5;

  // === BONUS POR DIVISIÓN EXACTA ===
  // +10 si se usa división y el resultado es entero (requiere habilidad)
  const divisionBonus = hasExactDivision && uniqueOperators.has('/') ? 10 : 0;

  // === CALCULAR DAÑO BRUTO ===
  const rawDamage = BASE_DAMAGE + cardBonus + operatorBonus + divisionBonus;

  // === MULTIPLICADOR DE PRECISIÓN ===
  let accuracyMultiplier = 1;
  let accuracyType = 'perfect';
  let accuracyLabel = '🎯 ¡PERFECTO!';

  if (difference === 0) {
    accuracyMultiplier = 1.0;
    accuracyType = 'perfect';
    accuracyLabel = '🎯 ¡PERFECTO!';
  } else if (difference <= 5) {
    accuracyMultiplier = 0.75;
    accuracyType = 'close';
    accuracyLabel = `📊 Cerca (±${difference}): 75%`;
  } else if (difference <= 10) {
    accuracyMultiplier = 0.5;
    accuracyType = 'far';
    accuracyLabel = `📉 Lejos (±${difference}): 50%`;
  } else {
    // MISS - diferencia > 10
    return {
      damage: 0,
      rawDamage: 0,
      baseDamage: BASE_DAMAGE,
      cardBonus: 0,
      operatorBonus: 0,
      divisionBonus: 0,
      accuracyMultiplier: 0,
      accuracyType: 'miss',
      accuracyLabel: `❌ MISS! (±${difference})`,
      isMasterPlay: false,
      miss: true,
      bonusBreakdown: []
    };
  }

  // === DAÑO FINAL ===
  const finalDamage = Math.floor(rawDamage * accuracyMultiplier);

  // === DETECTAR JUGADA MAESTRA ===
  // 4 cartas + 3 operadores distintos + exacto = Jugada Maestra
  const isMasterPlay = cardsUsed === 4 && uniqueOperators.size >= 3 && difference === 0;

  // === CONSTRUIR BREAKDOWN DE BONUSES ===
  const bonusBreakdown = [accuracyLabel];

  if (cardBonus > 0) {
    bonusBreakdown.push(`+${cardBonus} (${cardsUsed} cartas)`);
  }
  if (operatorBonus > 0) {
    const opSymbols = Array.from(uniqueOperators).join(',');
    bonusBreakdown.push(`+${operatorBonus} ops (${opSymbols})`);
  }
  if (divisionBonus > 0) {
    bonusBreakdown.push(`+${divisionBonus} división exacta`);
  }
  if (isMasterPlay) {
    bonusBreakdown.push('🌟 ¡JUGADA MAESTRA!');
  }

  return {
    damage: finalDamage,
    rawDamage,
    baseDamage: BASE_DAMAGE,
    cardBonus,
    operatorBonus,
    divisionBonus,
    accuracyMultiplier,
    accuracyType,
    accuracyLabel,
    isMasterPlay,
    miss: false,
    bonusBreakdown
  };
}

/**
 * Extrae los operadores usados de una expresión aritmética.
 * 
 * @param {string} expression - La expresión matemática (ej: "5+3*2")
 * @returns {string[]} Array de operadores encontrados
 */
export function getOperatorsFromExpression(expression) {
  const matches = expression.match(/[\+\-\*\/]/g);
  return matches || [];
}

/**
 * Valida que los paréntesis estén balanceados en una expresión.
 * 
 * @param {string} expression - La expresión a validar
 * @returns {Object} { isValid, openCount, closeCount, message }
 */
export function validateParentheses(expression) {
  let depth = 0;
  let openCount = 0;
  let closeCount = 0;

  for (const char of expression) {
    if (char === '(') {
      depth++;
      openCount++;
    } else if (char === ')') {
      depth--;
      closeCount++;
      if (depth < 0) {
        return {
          isValid: false,
          openCount,
          closeCount,
          message: '❌ Paréntesis de cierre sin abrir'
        };
      }
    }
  }

  if (depth !== 0) {
    return {
      isValid: false,
      openCount,
      closeCount,
      message: `⚠️ Faltan ${depth} paréntesis de cierre`
    };
  }

  return {
    isValid: true,
    openCount,
    closeCount,
    message: '✓ Paréntesis balanceados'
  };
}

/**
 * Calcula el bonus por uso estratégico de paréntesis.
 * Solo da bonus si los paréntesis cambian el resultado (uso efectivo).
 * 
 * @param {string} expression - La expresión con paréntesis
 * @returns {Object} { bonus, hasEffectiveParentheses, pairsUsed }
 */
export function calculateParenthesesBonus(expression) {
  const validation = validateParentheses(expression);

  if (!validation.isValid || validation.openCount === 0) {
    return { bonus: 0, hasEffectiveParentheses: false, pairsUsed: 0 };
  }

  // Remover paréntesis para comparar resultados
  const expressionWithoutParens = expression.replace(/[()]/g, '');

  try {
    const resultWith = eval(expression);
    const resultWithout = eval(expressionWithoutParens);

    // Solo bonus si los paréntesis cambian el resultado
    if (resultWith !== resultWithout) {
      // +5 por cada par de paréntesis efectivo
      const bonus = validation.openCount * 5;
      return {
        bonus,
        hasEffectiveParentheses: true,
        pairsUsed: validation.openCount
      };
    }
  } catch (e) {
    // Si hay error, no dar bonus
  }

  return { bonus: 0, hasEffectiveParentheses: false, pairsUsed: validation.openCount };
}

/**
 * Verifica si una expresión contiene una división exacta (sin residuo).
 * 
 * @param {string} expression - La expresión matemática
 * @returns {boolean} True si hay división y es exacta
 */
export function hasExactDivisionInExpression(expression) {
  if (!expression.includes('/')) return false;

  // Buscar patrones de división y verificar si son exactas
  const divisionPattern = /(\d+)\s*\/\s*(\d+)/g;
  let match;

  while ((match = divisionPattern.exec(expression)) !== null) {
    const dividend = parseInt(match[1]);
    const divisor = parseInt(match[2]);

    if (divisor !== 0 && dividend % divisor === 0) {
      return true;
    }
  }

  return false;
}

// ======================================
// 🔥 SISTEMA DE RACHAS (STREAK SYSTEM)
// ======================================

/**
 * Obtiene el tier de racha actual basado en el contador y la dificultad.
 * 
 * @param {number} streak - Número de aciertos exactos consecutivos
 * @param {string} difficulty - Dificultad actual ('easy', 'medium', 'hard')
 * @returns {Object} Tier de racha con nombre, emoji, bonus, intensidad y color
 */
export function getStreakTier(streak, difficulty = 'medium') {
  const config = (DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.medium).streakConfig;

  // Ordenar de mayor a menor para encontrar el tier más alto aplicable
  for (let i = config.length - 1; i >= 0; i--) {
    if (streak >= config[i].minStreak) {
      return { ...config[i], currentStreak: streak };
    }
  }
  return { ...config[0], currentStreak: streak };
}

/**
 * Calcula el bonus de daño por racha y devuelve información para UI.
 * 
 * @param {number} streak - Racha actual del jugador
 * @param {boolean} isPerfect - Si el ataque actual fue exacto (diferencia = 0)
 * @param {string} difficulty - Dificultad actual del juego
 * @returns {Object} Resultado con bonus, nuevo streak, tier y si hubo cambio de tier
 */
export function calculateStreakBonus(currentStreak, isPerfect, difficulty = 'medium') {
  let newStreak = isPerfect ? currentStreak + 1 : 0;

  const oldTier = getStreakTier(currentStreak, difficulty);
  const newTier = getStreakTier(newStreak, difficulty);

  const tierChanged = newTier.intensity !== oldTier.intensity;
  const tierUp = newTier.intensity > oldTier.intensity;
  const streakBroken = !isPerfect && currentStreak >= 2;

  return {
    oldStreak: currentStreak,
    newStreak: newStreak,
    bonus: newTier.bonus, // Usar el bonus del nuevo tier (recompensa inmediata)
    tier: newTier,
    tierChanged,
    tierUp,
    streakBroken,
    showAnimation: tierUp
  };
}
