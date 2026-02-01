/**
 * Script de Testeo del Sistema de Targets
 * 
 * Este script simula 100+ rondas para analizar:
 * 1. Distribución de targets (¿están bien distribuidos en el rango?)
 * 2. Alcanzabilidad (¿todos los targets son alcanzables?)
 * 3. Variabilidad entre jugadores (¿es justo?)
 */

import {
    generateCardsByDifficulty,
    generateTargetByDifficulty,
    findSolution,
    DIFFICULTY_CONFIG
} from './src/utils/gameLogic.js';

const ROUNDS = 100;
const DIFFICULTY = 'hard';


function runTest() {
    console.log('='.repeat(60));
    console.log('ANÁLISIS DE JUSTICIA DEL SISTEMA DE TARGETS');
    console.log('='.repeat(60));
    console.log(`Dificultad: ${DIFFICULTY}`);
    console.log(`Rondas simuladas: ${ROUNDS}`);
    console.log(`Rango de cartas: ${DIFFICULTY_CONFIG[DIFFICULTY].cardRange.min}-${DIFFICULTY_CONFIG[DIFFICULTY].cardRange.max}`);
    console.log(`Rango de target: ${DIFFICULTY_CONFIG[DIFFICULTY].targetRange.min}-${DIFFICULTY_CONFIG[DIFFICULTY].targetRange.max}`);
    console.log('');

    const results = [];
    let noSolutionCount = 0;
    let outsideRangeCount = 0;

    for (let i = 0; i < ROUNDS; i++) {
        // Simular generación de cartas y target
        const playerData = generateCardsByDifficulty(DIFFICULTY);
        const cards = playerData.cards;
        const variables = playerData.variables;

        // Crear objeto de valores de variables
        const varValues = {};
        for (const v of variables) {
            varValues[v.symbol] = v.value;
        }

        const target = generateTargetByDifficulty(DIFFICULTY, cards, varValues);
        const solution = findSolution(target, cards, DIFFICULTY, varValues);

        // Verificar si está en rango
        const { min, max } = DIFFICULTY_CONFIG[DIFFICULTY].targetRange;
        const inRange = target >= min && target <= max;
        if (!inRange) outsideRangeCount++;

        // Verificar si tiene solución
        const hasSolution = solution && !solution.includes('No se encontró');
        if (!hasSolution) noSolutionCount++;

        results.push({
            round: i + 1,
            cards,
            variables: varValues,
            target,
            inRange,
            hasSolution,
            solution: hasSolution ? solution : null,
            totalValues: [...cards, ...Object.values(varValues)]
        });
    }

    // Análisis estadístico
    const targets = results.map(r => r.target);
    const avgTarget = targets.reduce((a, b) => a + b, 0) / targets.length;
    const minTarget = Math.min(...targets);
    const maxTarget = Math.max(...targets);
    const stdDev = Math.sqrt(
        targets.reduce((acc, t) => acc + Math.pow(t - avgTarget, 2), 0) / targets.length
    );

    // Distribución por cuartiles
    const sortedTargets = [...targets].sort((a, b) => a - b);
    const q1 = sortedTargets[Math.floor(ROUNDS * 0.25)];
    const median = sortedTargets[Math.floor(ROUNDS * 0.5)];
    const q3 = sortedTargets[Math.floor(ROUNDS * 0.75)];

    // Histograma simple
    const buckets = {};
    const bucketSize = 5;
    targets.forEach(t => {
        const bucket = Math.floor(t / bucketSize) * bucketSize;
        buckets[bucket] = (buckets[bucket] || 0) + 1;
    });

    console.log('📊 ESTADÍSTICAS DE TARGETS');
    console.log('-'.repeat(40));
    console.log(`Promedio: ${avgTarget.toFixed(2)}`);
    console.log(`Mínimo:   ${minTarget}`);
    console.log(`Máximo:   ${maxTarget}`);
    console.log(`Desv. Estándar: ${stdDev.toFixed(2)}`);
    console.log(`Q1 (25%): ${q1} | Mediana: ${median} | Q3 (75%): ${q3}`);
    console.log('');

    console.log('📈 DISTRIBUCIÓN DE TARGETS');
    console.log('-'.repeat(40));
    Object.keys(buckets).sort((a, b) => a - b).forEach(bucket => {
        const count = buckets[bucket];
        const bar = '█'.repeat(Math.ceil(count / 2));
        console.log(`${bucket.toString().padStart(3)}-${(parseInt(bucket) + bucketSize - 1).toString().padEnd(3)}: ${bar} (${count})`);
    });
    console.log('');

    console.log('⚠️ PROBLEMAS DETECTADOS');
    console.log('-'.repeat(40));
    console.log(`Targets fuera de rango: ${outsideRangeCount}/${ROUNDS} (${(outsideRangeCount / ROUNDS * 100).toFixed(1)}%)`);
    console.log(`Targets sin solución:   ${noSolutionCount}/${ROUNDS} (${(noSolutionCount / ROUNDS * 100).toFixed(1)}%)`);
    console.log('');

    // Mostrar ejemplos problemáticos
    const problematic = results.filter(r => !r.inRange || !r.hasSolution);
    if (problematic.length > 0) {
        console.log('🔴 EJEMPLOS PROBLEMÁTICOS (máx 5):');
        console.log('-'.repeat(40));
        problematic.slice(0, 5).forEach(r => {
            console.log(`  Ronda ${r.round}:`);
            console.log(`    Cartas: [${r.cards.join(', ')}] + Variables: ${JSON.stringify(r.variables)}`);
            console.log(`    Target: ${r.target} | En rango: ${r.inRange} | Solución: ${r.hasSolution ? '✓' : '✗'}`);
        });
        console.log('');
    }

    // Análisis de variabilidad (justicia)
    console.log('⚖️ ANÁLISIS DE JUSTICIA');
    console.log('-'.repeat(40));

    // Simular 20 partidas (2 jugadores cada una)
    console.log('Simulando 20 partidas (J1 vs J2)...');
    let j1Harder = 0;
    let j2Harder = 0;
    let equal = 0;

    for (let i = 0; i < 20; i++) {
        const p1 = generateCardsByDifficulty(DIFFICULTY);
        const vv1 = {};
        p1.variables.forEach(v => vv1[v.symbol] = v.value);
        const t1 = generateTargetByDifficulty(DIFFICULTY, p1.cards, vv1);
        const sum1 = [...p1.cards, ...Object.values(vv1)].reduce((a, b) => a + b, 0);

        const p2 = generateCardsByDifficulty(DIFFICULTY);
        const vv2 = {};
        p2.variables.forEach(v => vv2[v.symbol] = v.value);
        const t2 = generateTargetByDifficulty(DIFFICULTY, p2.cards, vv2);
        const sum2 = [...p2.cards, ...Object.values(vv2)].reduce((a, b) => a + b, 0);

        // Comparar dificultad relativa (target / suma de recursos)
        const ratio1 = t1 / sum1;
        const ratio2 = t2 / sum2;
        const diff = Math.abs(ratio1 - ratio2);

        if (diff < 0.1) equal++;
        else if (ratio1 > ratio2) j1Harder++;
        else j2Harder++;
    }

    console.log(`  J1 más difícil: ${j1Harder}/20`);
    console.log(`  J2 más difícil: ${j2Harder}/20`);
    console.log(`  Similar:        ${equal}/20`);
    console.log('');

    // Veredicto final
    console.log('='.repeat(60));
    console.log('📋 VEREDICTO FINAL');
    console.log('='.repeat(60));

    const issues = [];
    if (outsideRangeCount > ROUNDS * 0.05) issues.push('Alto % de targets fuera de rango');
    if (noSolutionCount > 0) issues.push('Existen targets sin solución');
    if (stdDev < 5) issues.push('Targets muy concentrados (poca variedad)');
    if (Math.abs(j1Harder - j2Harder) > 8) issues.push('Posible sesgo entre jugadores');

    if (issues.length === 0) {
        console.log('✅ SISTEMA JUSTO - No se detectaron problemas significativos');
        console.log('   - Targets bien distribuidos');
        console.log('   - Todos los targets son alcanzables');
        console.log('   - Balance entre jugadores adecuado');
    } else {
        console.log('⚠️ PROBLEMAS DETECTADOS:');
        issues.forEach(issue => console.log(`   - ${issue}`));
    }

    console.log('');
}

runTest();
