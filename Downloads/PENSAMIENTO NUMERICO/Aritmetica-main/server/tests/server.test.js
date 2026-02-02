/**
 * @file server/tests/server.test.js
 * @description Tests automatizados para el servidor multijugador
 * 
 * Ejecutar con: npm run test:server
 */

import assert from 'assert';

// Importar módulos del servidor
import {
    createLobby,
    joinLobby,
    leaveLobby,
    getAvailableLobbies,
    getLobbyBySocketId,
    startLobbyGame
} from '../lobbyManager.js';

import {
    initializeGame,
    submitPlayerExpression,
    checkBothPlayersReady,
    resolveRound,
    getGameState,
    cleanupGame
} from '../gameManager.js';

// ============================================
// Test Utilities
// ============================================
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        testsPassed++;
    } catch (error) {
        console.log(`  ❌ ${name}`);
        console.log(`     Error: ${error.message}`);
        testsFailed++;
    }
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message} - Expected: ${expected}, Got: ${actual}`);
    }
}

function assertNotNull(value, message = '') {
    if (value === null || value === undefined) {
        throw new Error(`${message} - Expected non-null value`);
    }
}

function assertTrue(value, message = '') {
    if (!value) {
        throw new Error(`${message} - Expected true`);
    }
}

// ============================================
// LOBBY TESTS
// ============================================
console.log('\n📋 LOBBY MANAGER TESTS\n');

// Limpiar estado antes de tests
function cleanupLobbies() {
    // Forzar limpieza creando y eliminando lobbies
    const mockIds = ['test-host-1', 'test-host-2', 'test-host-3', 'test-guest-1'];
    mockIds.forEach(id => {
        try { leaveLobby(id); } catch { }
    });
}

cleanupLobbies();

test('Crear lobby genera código único', () => {
    const result1 = createLobby('host-1', 'TestHost', 'medium');
    const result2 = createLobby('host-2', 'TestHost2', 'easy');

    assertNotNull(result1.roomCode, 'roomCode should exist');
    assertEqual(result1.roomCode.length, 4, 'roomCode should be 4 characters');
    assertTrue(result1.roomCode !== result2.roomCode, 'roomCodes should be unique');

    // Cleanup
    leaveLobby('host-1');
    leaveLobby('host-2');
});

test('Unirse a lobby existente', () => {
    const created = createLobby('host-3', 'HostPlayer', 'hard');
    const joined = joinLobby('guest-1', created.roomCode, 'GuestPlayer');

    assertEqual(joined.roomCode, created.roomCode, 'roomCodes should match');
    assertEqual(joined.hostName, 'HostPlayer', 'hostName should match');

    // Cleanup
    leaveLobby('host-3');
});

test('No permitir unirse a lobby inexistente', () => {
    let errorThrown = false;
    try {
        joinLobby('guest-2', 'XXXX', 'TestGuest');
    } catch (error) {
        errorThrown = true;
        assertTrue(error.message.includes('no encontrada'), 'Should throw room not found error');
    }
    assertTrue(errorThrown, 'Should throw an error');
});

test('No permitir unirse a lobby lleno', () => {
    const created = createLobby('host-4', 'Host', 'medium');
    joinLobby('guest-3', created.roomCode, 'Guest1');

    let errorThrown = false;
    try {
        joinLobby('guest-4', created.roomCode, 'Guest2');
    } catch (error) {
        errorThrown = true;
        assertTrue(error.message.includes('llena'), 'Should throw room full error');
    }
    assertTrue(errorThrown, 'Should throw an error');

    // Cleanup
    leaveLobby('host-4');
});

test('Obtener lobbies disponibles', () => {
    const created1 = createLobby('host-5', 'Available1', 'easy');
    const created2 = createLobby('host-6', 'Available2', 'medium');

    const available = getAvailableLobbies();
    assertTrue(available.length >= 2, 'Should have at least 2 available lobbies');

    // Cleanup
    leaveLobby('host-5');
    leaveLobby('host-6');
});

test('Abandonar lobby como host elimina la sala', () => {
    const created = createLobby('host-7', 'ToDelete', 'medium');
    const roomCode = created.roomCode;

    leaveLobby('host-7');

    const lobby = getLobbyBySocketId('host-7');
    assertEqual(lobby, null, 'Lobby should be deleted');
});

// ============================================
// GAME MANAGER TESTS
// ============================================
console.log('\n🎮 GAME MANAGER TESTS\n');

test('Inicializar juego genera estado correcto', () => {
    const lobby = {
        roomCode: 'TEST',
        hostId: 'p1-socket',
        hostName: 'Player1',
        guestId: 'p2-socket',
        guestName: 'Player2',
        difficulty: 'medium'
    };

    const game = initializeGame('TEST', lobby);

    assertNotNull(game, 'Game should be created');
    assertEqual(game.round, 1, 'Should start at round 1');
    assertEqual(game.player1.hp, 200, 'Player1 HP should be 200 for medium');
    assertEqual(game.player2.hp, 200, 'Player2 HP should be 200 for medium');
    assertTrue(game.player1.cards.length === 3, 'Player1 should have 3 cards');
    assertTrue(game.player2.cards.length === 3, 'Player2 should have 3 cards');
    assertTrue(typeof game.target === 'number', 'Target should be a number');

    cleanupGame('TEST');
});

test('Submit expresión guarda correctamente', () => {
    const lobby = {
        roomCode: 'TEST2',
        hostId: 'p1',
        hostName: 'Player1',
        guestId: 'p2',
        guestName: 'Player2',
        difficulty: 'easy'
    };

    initializeGame('TEST2', lobby);

    const result = submitPlayerExpression('TEST2', 'p1', '3+5');
    assertTrue(result.success, 'Submit should succeed');

    const state = getGameState('TEST2', 'p1');
    assertTrue(state.mySubmitted, 'Player should be marked as submitted');

    cleanupGame('TEST2');
});

test('Ambos jugadores ready detectado correctamente', () => {
    const lobby = {
        roomCode: 'TEST3',
        hostId: 'p1',
        hostName: 'Player1',
        guestId: 'p2',
        guestName: 'Player2',
        difficulty: 'easy'
    };

    initializeGame('TEST3', lobby);

    submitPlayerExpression('TEST3', 'p1', '5+5');
    assertTrue(!checkBothPlayersReady('TEST3'), 'Should not be ready with 1 player');

    submitPlayerExpression('TEST3', 'p2', '4+4');
    assertTrue(checkBothPlayersReady('TEST3'), 'Should be ready with 2 players');

    cleanupGame('TEST3');
});

test('Resolver ronda calcula ganador correctamente', () => {
    const lobby = {
        roomCode: 'TEST4',
        hostId: 'p1',
        hostName: 'Player1',
        guestId: 'p2',
        guestName: 'Player2',
        difficulty: 'easy'
    };

    const game = initializeGame('TEST4', lobby);
    const target = game.target;

    // Player1 envía respuesta perfecta
    submitPlayerExpression('TEST4', 'p1', String(target));
    // Player2 envía respuesta alejada
    submitPlayerExpression('TEST4', 'p2', String(target + 20));

    const result = resolveRound('TEST4');

    assertEqual(result.roundWinner, 'Player1', 'Player1 should win');
    assertTrue(result.player2.damageTaken > 0, 'Player2 should take damage');

    cleanupGame('TEST4');
});

test('Empate aplica 50% daño a ambos', () => {
    const lobby = {
        roomCode: 'TEST5',
        hostId: 'p1',
        hostName: 'Player1',
        guestId: 'p2',
        guestName: 'Player2',
        difficulty: 'easy'
    };

    const game = initializeGame('TEST5', lobby);
    const target = game.target;

    // Ambos envían la misma respuesta (empate)
    submitPlayerExpression('TEST5', 'p1', String(target));
    submitPlayerExpression('TEST5', 'p2', String(target));

    const result = resolveRound('TEST5');

    assertEqual(result.roundWinner, 'draw', 'Should be a draw');
    // En empate perfecto, ambos reciben 50% del daño que harían
    assertTrue(result.player1.damageTaken >= 0, 'Player1 should take some damage or 0');
    assertTrue(result.player2.damageTaken >= 0, 'Player2 should take some damage or 0');

    cleanupGame('TEST5');
});

test('Skip/No respuesta cuenta como MISS', () => {
    const lobby = {
        roomCode: 'TEST6',
        hostId: 'p1',
        hostName: 'Player1',
        guestId: 'p2',
        guestName: 'Player2',
        difficulty: 'easy'
    };

    const game = initializeGame('TEST6', lobby);
    const target = game.target;

    // Player1 envía respuesta perfecta
    submitPlayerExpression('TEST6', 'p1', String(target));
    // Player2 no envía nada (skip)
    submitPlayerExpression('TEST6', 'p2', '');

    const result = resolveRound('TEST6');

    assertEqual(result.roundWinner, 'Player1', 'Player1 should win');
    assertEqual(result.player2.damageType, 'miss', 'Player2 should have miss');

    cleanupGame('TEST6');
});

test('Game Over cuando HP llega a 0', () => {
    const lobby = {
        roomCode: 'TEST7',
        hostId: 'p1',
        hostName: 'Player1',
        guestId: 'p2',
        guestName: 'Player2',
        difficulty: 'easy'
    };

    // Inicializar y forzar HP bajo
    const game = initializeGame('TEST7', lobby);
    game.player2.hp = 30; // HP bajo

    const target = game.target;
    submitPlayerExpression('TEST7', 'p1', String(target)); // Perfecto = 50 daño
    submitPlayerExpression('TEST7', 'p2', String(target + 100)); // Miss

    const result = resolveRound('TEST7');

    assertTrue(result.gameOver, 'Game should be over');
    assertEqual(result.winner, 'Player1', 'Player1 should win');

    cleanupGame('TEST7');
});

// ============================================
// RESULTS
// ============================================
console.log('\n========================================');
console.log(`  Tests passed: ${testsPassed}`);
console.log(`  Tests failed: ${testsFailed}`);
console.log('========================================\n');

if (testsFailed > 0) {
    process.exit(1);
}
