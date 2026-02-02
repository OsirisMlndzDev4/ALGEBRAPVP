/**
 * @file src/components/Multiplayer/RoundResult.jsx
 * @description Pantalla de resultados de ronda para multijugador
 */

import React from 'react';

const RoundResult = ({ result, isHost, playerName, opponentName, onContinue }) => {
    // Determinar datos según si es host o guest
    const myResult = isHost ? result.player1 : result.player2;
    const theirResult = isHost ? result.player2 : result.player1;
    const myName = isHost ? playerName : playerName;
    const theirName = opponentName;

    // Determinar ganador de la ronda
    const getRoundWinnerText = () => {
        if (result.roundWinner === 'draw') {
            return '🤝 ¡EMPATE!';
        }
        const winnerName = result.roundWinner;
        if (winnerName === myName || winnerName === playerName ||
            (isHost && result.roundWinner === 'Player1') ||
            (!isHost && result.roundWinner === 'Player2')) {
            return '🎉 ¡GANASTE LA RONDA!';
        }
        return '😔 Perdiste la ronda';
    };

    const getResultClass = (res) => {
        if (res.damageType === 'perfect') return 'result-perfect';
        if (res.damageType === 'close') return 'result-close';
        if (res.damageType === 'miss') return 'result-miss';
        return '';
    };

    return (
        <div className="app-background round-result-screen">
            <div className="round-result-content liquid-glass">
                <header className="result-header">
                    <h2>Ronda {result.round}</h2>
                    <p className="result-target">Target: {result.target}</p>
                </header>

                <div className="result-winner-banner">
                    {getRoundWinnerText()}
                </div>

                <div className="results-comparison">
                    {/* Mi resultado */}
                    <div className={`result-card ${getResultClass(myResult)}`}>
                        <h3 className="result-player-name">{myName} (Tú)</h3>
                        <div className="result-expression">{myResult.expression || '(Sin respuesta)'}</div>
                        <div className="result-value">= {myResult.result ?? '?'}</div>
                        <div className="result-stats">
                            <span className="result-damage">
                                {myResult.damageTaken > 0 ? `-${myResult.damageTaken} HP` : 'Sin daño'}
                            </span>
                            <span className="result-hp">HP: {myResult.currentHp}</span>
                        </div>
                    </div>

                    <div className="result-vs-divider">VS</div>

                    {/* Resultado del oponente */}
                    <div className={`result-card ${getResultClass(theirResult)}`}>
                        <h3 className="result-player-name">{theirName}</h3>
                        <div className="result-expression">{theirResult.expression || '(Sin respuesta)'}</div>
                        <div className="result-value">= {theirResult.result ?? '?'}</div>
                        <div className="result-stats">
                            <span className="result-damage">
                                {theirResult.damageTaken > 0 ? `-${theirResult.damageTaken} HP` : 'Sin daño'}
                            </span>
                            <span className="result-hp">HP: {theirResult.currentHp}</span>
                        </div>
                    </div>
                </div>

                <button onClick={onContinue} className="btn btn-primary continue-btn pulse-btn">
                    Siguiente Ronda ➡️
                </button>
            </div>
        </div>
    );
};

export default RoundResult;
