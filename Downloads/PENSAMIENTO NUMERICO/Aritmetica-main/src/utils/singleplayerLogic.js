/**
 * @file singleplayerLogic.js
 * @description Generador dinámico de expresiones algebraicas para el modo Singleplayer.
 * 
 * Implementa la generación de problemas para "Ruleta Algebraica":
 * - Propiedad Distributiva: a(b + c) → ab + ac
 * - Propiedad Conmutativa: a + b → b + a, a * b → b * a
 * - Propiedad Asociativa: (a + b) + c → a + (b + c)
 */

/**
 * Configuración de las propiedades algebraicas
 */
export const ALGEBRAIC_PROPERTIES = {
    distributiva: {
        name: 'Distributiva',
        emoji: '📐',
        description: 'Multiplica el factor por cada término dentro del paréntesis',
        color: '#FF9F0A',
        hint: 'a(b + c) = ab + ac'
    },
    conmutativa: {
        name: 'Conmutativa',
        emoji: '🔄',
        description: 'El orden de los factores no altera el resultado',
        color: '#34C759',
        hint: 'a + b = b + a'
    },
    asociativa: {
        name: 'Asociativa',
        emoji: '🔗',
        description: 'La agrupación de términos no altera el resultado',
        color: '#5E5CE6',
        hint: '(a + b) + c = a + (b + c)'
    }
};

/**
 * Genera un número aleatorio entre min y max (inclusive)
 */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Selecciona un elemento aleatorio de un array
 */
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Genera una expresión de propiedad distributiva
 * Formato: a(x + b) → ax + ab  o  a(b + c) → ab + ac
 * 
 * @returns {Object} { expression, answer, explanation, property }
 */
export const generateDistributiveExpression = () => {
    const useVariable = Math.random() > 0.3; // 70% usa variable
    const a = randomInt(2, 9);

    if (useVariable) {
        // Formato: a(x + b) → ax + ab
        const variable = randomChoice(['x', 'y']);
        const b = randomInt(1, 9);
        const operation = randomChoice(['+', '-']);

        const expression = `${a}(${variable} ${operation} ${b})`;

        // Calcular respuesta
        const secondTerm = operation === '+' ? a * b : -(a * b);
        const answer = secondTerm >= 0
            ? `${a}${variable} + ${secondTerm}`
            : `${a}${variable} - ${Math.abs(secondTerm)}`;

        // Respuestas alternativas válidas (sin espacios, orden diferente)
        const alternativeAnswers = [
            answer,
            answer.replace(/\s/g, ''), // Sin espacios
            `${a}${variable}${operation}${a * b}`, // Compacto
        ];

        return {
            expression,
            answer,
            alternativeAnswers,
            explanation: `${a} × ${variable} = ${a}${variable}, ${a} × ${b} = ${a * b}`,
            property: 'distributiva'
        };
    } else {
        // Formato numérico: a(b + c) → ab + ac
        const b = randomInt(1, 9);
        const c = randomInt(1, 9);
        const operation = randomChoice(['+', '-']);

        const expression = `${a}(${b} ${operation} ${c})`;

        const term1 = a * b;
        const term2 = operation === '+' ? a * c : -(a * c);
        const answer = term2 >= 0
            ? `${term1} + ${term2}`
            : `${term1} - ${Math.abs(term2)}`;

        // También aceptar el resultado final calculado
        const finalResult = operation === '+' ? term1 + a * c : term1 - a * c;

        const alternativeAnswers = [
            answer,
            answer.replace(/\s/g, ''),
            `${term1}${operation}${a * c}`,
            `${finalResult}` // Resultado numérico final
        ];

        return {
            expression,
            answer,
            alternativeAnswers,
            explanation: `${a} × ${b} = ${term1}, ${a} × ${c} = ${a * c}`,
            property: 'distributiva'
        };
    }
};

/**
 * Genera una expresión de propiedad conmutativa
 * Formato: a + b → b + a  o  a × b → b × a
 * 
 * @returns {Object} { expression, answer, explanation, property }
 */
export const generateCommutativeExpression = () => {
    const useMultiplication = Math.random() > 0.5;
    const useVariable = Math.random() > 0.5;

    if (useVariable) {
        const variable = randomChoice(['x', 'y']);
        const num = randomInt(2, 15);

        if (useMultiplication) {
            // 3x → x·3 o x·3
            const expression = `${num}${variable}`;
            const answer = `${variable} · ${num}`;

            return {
                expression,
                answer,
                alternativeAnswers: [
                    answer,
                    `${variable}·${num}`,
                    `${variable}*${num}`,
                    `${variable} * ${num}`,
                    `${variable}(${num})`,
                    `(${variable})(${num})`
                ],
                explanation: `El orden de los factores no altera el producto`,
                property: 'conmutativa'
            };
        } else {
            // x + 5 → 5 + x
            const expression = `${variable} + ${num}`;
            const answer = `${num} + ${variable}`;

            return {
                expression,
                answer,
                alternativeAnswers: [
                    answer,
                    `${num}+${variable}`,
                    answer.replace(/\s/g, '')
                ],
                explanation: `El orden de los sumandos no altera la suma`,
                property: 'conmutativa'
            };
        }
    } else {
        const a = randomInt(2, 20);
        const b = randomInt(2, 20);
        const operator = useMultiplication ? '×' : '+';
        const operatorAlt = useMultiplication ? '*' : '+';

        const expression = `${a} ${operator} ${b}`;
        const answer = `${b} ${operator} ${a}`;

        return {
            expression,
            answer,
            alternativeAnswers: [
                answer,
                `${b}${operatorAlt}${a}`,
                `${b} ${operatorAlt} ${a}`,
                answer.replace(/\s/g, '')
            ],
            explanation: useMultiplication
                ? `El orden de los factores no altera el producto`
                : `El orden de los sumandos no altera la suma`,
            property: 'conmutativa'
        };
    }
};

/**
 * Genera una expresión de propiedad asociativa
 * Formato: (a + b) + c → a + (b + c)
 * 
 * @returns {Object} { expression, answer, explanation, property }
 */
export const generateAssociativeExpression = () => {
    const useMultiplication = Math.random() > 0.6; // 40% multiplicación
    const a = randomInt(2, 10);
    const b = randomInt(2, 10);
    const c = randomInt(2, 10);

    const operator = useMultiplication ? '×' : '+';
    const operatorAlt = useMultiplication ? '*' : '+';

    // Decidir dirección: (a○b)○c → a○(b○c) o viceversa
    const leftToRight = Math.random() > 0.5;

    if (leftToRight) {
        const expression = `(${a} ${operator} ${b}) ${operator} ${c}`;
        const answer = `${a} ${operator} (${b} ${operator} ${c})`;

        return {
            expression,
            answer,
            alternativeAnswers: [
                answer,
                `${a}${operatorAlt}(${b}${operatorAlt}${c})`,
                answer.replace(/\s/g, ''),
                `${a} ${operatorAlt} (${b} ${operatorAlt} ${c})`
            ],
            explanation: `Reagrupamos: primero ${b} ${operator} ${c}, luego ${operator} ${a}`,
            property: 'asociativa'
        };
    } else {
        const expression = `${a} ${operator} (${b} ${operator} ${c})`;
        const answer = `(${a} ${operator} ${b}) ${operator} ${c}`;

        return {
            expression,
            answer,
            alternativeAnswers: [
                answer,
                `(${a}${operatorAlt}${b})${operatorAlt}${c}`,
                answer.replace(/\s/g, ''),
                `(${a} ${operatorAlt} ${b}) ${operatorAlt} ${c}`
            ],
            explanation: `Reagrupamos: primero ${a} ${operator} ${b}, luego ${operator} ${c}`,
            property: 'asociativa'
        };
    }
};

/**
 * Selecciona una propiedad aleatoria
 * @returns {string} Clave de la propiedad
 */
export const selectRandomProperty = () => {
    const properties = Object.keys(ALGEBRAIC_PROPERTIES);
    return randomChoice(properties);
};

/**
 * Genera una expresión según la propiedad especificada
 * @param {string} property - 'distributiva', 'conmutativa', o 'asociativa'
 * @returns {Object} Expresión generada
 */
export const generateExpressionByProperty = (property) => {
    switch (property) {
        case 'distributiva':
            return generateDistributiveExpression();
        case 'conmutativa':
            return generateCommutativeExpression();
        case 'asociativa':
            return generateAssociativeExpression();
        default:
            return generateDistributiveExpression();
    }
};

/**
 * Normaliza una respuesta para comparación
 * Elimina espacios y convierte símbolos equivalentes
 */
const normalizeAnswer = (answer) => {
    return answer
        .toLowerCase()
        .replace(/\s/g, '')      // Eliminar espacios
        .replace(/×/g, '*')      // Normalizar multiplicación
        .replace(/·/g, '*')
        .replace(/−/g, '-')      // Normalizar resta
        .replace(/\(/g, '(')     // Asegurar paréntesis estándar
        .replace(/\)/g, ')');
};

/**
 * Valida la respuesta del usuario
 * @param {string} userAnswer - Respuesta del usuario
 * @param {string} correctAnswer - Respuesta correcta
 * @param {string[]} alternativeAnswers - Respuestas alternativas válidas
 * @returns {boolean} true si es correcta
 */
export const validateAnswer = (userAnswer, correctAnswer, alternativeAnswers = []) => {
    const normalizedUser = normalizeAnswer(userAnswer);

    // Verificar contra respuesta principal
    if (normalizedUser === normalizeAnswer(correctAnswer)) {
        return true;
    }

    // Verificar contra alternativas
    for (const alt of alternativeAnswers) {
        if (normalizedUser === normalizeAnswer(alt)) {
            return true;
        }
    }

    return false;
};

/**
 * Genera una ronda completa de Ruleta Algebraica
 * @returns {Object} { property, propertyConfig, challenge }
 */
export const generateRuletaRound = () => {
    const propertyKey = selectRandomProperty();
    const propertyConfig = ALGEBRAIC_PROPERTIES[propertyKey];
    const challenge = generateExpressionByProperty(propertyKey);

    return {
        property: propertyKey,
        propertyConfig,
        challenge
    };
};
