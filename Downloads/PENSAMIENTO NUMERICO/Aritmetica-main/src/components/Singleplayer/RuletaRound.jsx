/**
 * @file RuletaRound.jsx
 * @description Componente de ronda "Ruleta Algebraica" para el modo Singleplayer.
 * 
 * Muestra una ruleta animada que selecciona una propiedad algebraica,
 * luego presenta una expresión para que el jugador la transforme.
 */

import React, { useState, useCallback } from 'react';
import { ALGEBRAIC_PROPERTIES, generateExpressionByProperty, validateAnswer, selectRandomProperty } from '../../utils/singleplayerLogic';
import { soundManager } from '../../utils/SoundManager';

const RuletaRound = ({ onComplete, roundNumber, isLastRound }) => {
    // Fases: 'ready' (esperando girar), 'spinning', 'showing', 'input', 'feedback'
    const [phase, setPhase] = useState('ready');
    const [challenge, setChallenge] = useState(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [isCorrect, setIsCorrect] = useState(null);
    const [spinAngle, setSpinAngle] = useState(0);
    const [selectedProperty, setSelectedProperty] = useState(null);

    const propertyKeys = Object.keys(ALGEBRAIC_PROPERTIES);

    // Obtener config de la propiedad seleccionada (si existe)
    const propertyConfig = selectedProperty ? ALGEBRAIC_PROPERTIES[selectedProperty] : null;

    // Función para girar la ruleta
    const spinWheel = useCallback(() => {
        if (phase !== 'ready') return;

        soundManager.playPop();

        // Seleccionar propiedad aleatoria
        const newProperty = selectRandomProperty();
        setSelectedProperty(newProperty);

        // Calcular ángulo de la nueva propiedad
        const propertyIndex = propertyKeys.indexOf(newProperty);
        const baseAngle = spinAngle + 360 * 3; // 3 vueltas adicionales desde el ángulo actual
        const propertyAngle = (propertyIndex / propertyKeys.length) * 360;
        const finalAngle = baseAngle + propertyAngle + 60;

        setSpinAngle(finalAngle);
        setPhase('spinning');

        // Después de la animación, mostrar propiedad
        setTimeout(() => {
            setPhase('showing');
            soundManager.playPop();
        }, 2500);

        // Después de mostrar, generar challenge y pasar a input
        setTimeout(() => {
            const newChallenge = generateExpressionByProperty(newProperty);
            setChallenge(newChallenge);
            setPhase('input');
        }, 4000);
    }, [phase, spinAngle, propertyKeys]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!userAnswer.trim() || !challenge) return;

        const correct = validateAnswer(userAnswer, challenge.answer, challenge.alternativeAnswers);
        setIsCorrect(correct);
        setPhase('feedback');

        if (correct) {
            soundManager.playWin();
        } else {
            soundManager.playError();
        }
    };

    // Continuar a siguiente ronda o finalizar
    const handleContinue = () => {
        onComplete(isCorrect, selectedProperty);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    return (
        <div className="ruleta-round">
            {/* Encabezado de ronda */}
            <div className="ruleta-header">
                <span className="round-badge">Ronda {roundNumber}</span>
                <h2>🎰 Ruleta Algebraica</h2>
            </div>

            {/* Ruleta animada */}
            <div className="ruleta-container">
                <div
                    className={`ruleta-wheel ${phase === 'spinning' ? 'spinning' : ''}`}
                    style={{ '--spin-angle': `${spinAngle}deg` }}
                >
                    {propertyKeys.map((key, index) => {
                        const config = ALGEBRAIC_PROPERTIES[key];
                        const angle = (index / propertyKeys.length) * 360;
                        return (
                            <div
                                key={key}
                                className="ruleta-segment"
                                style={{
                                    '--segment-angle': `${angle}deg`,
                                    '--segment-color': config.color
                                }}
                            >
                                <span className="segment-emoji">{config.emoji}</span>
                                <span className="segment-name">{config.name}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="ruleta-pointer">▼</div>
            </div>

            {/* Botón para girar la ruleta */}
            {phase === 'ready' && (
                <button onClick={spinWheel} className="btn btn-primary btn-spin pulse-btn">
                    🎲 ¡GIRAR RULETA!
                </button>
            )}

            {/* Propiedad seleccionada */}
            {(phase === 'showing' || phase === 'input' || phase === 'feedback') && propertyConfig && (
                <div
                    className="property-display animate-in"
                    style={{ '--property-color': propertyConfig.color }}
                >
                    <span className="property-emoji">{propertyConfig.emoji}</span>
                    <h3 className="property-name">{propertyConfig.name}</h3>
                    <p className="property-hint">{propertyConfig.hint}</p>
                </div>
            )}

            {/* Challenge - Expresión a transformar */}
            {(phase === 'input' || phase === 'feedback') && challenge && (
                <div className="expression-challenge animate-in">
                    <p className="challenge-label">Aplica la propiedad:</p>
                    <div className="challenge-expression">{challenge.expression}</div>

                    <form onSubmit={handleSubmit} className="answer-form">
                        <input
                            type="text"
                            className={`answer-input ${phase === 'feedback' ? (isCorrect ? 'correct' : 'incorrect') : ''}`}
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Escribe tu respuesta..."
                            autoFocus
                            disabled={phase === 'feedback'}
                        />
                        {phase === 'input' && (
                            <button type="submit" className="btn btn-primary submit-btn">
                                ✓ Verificar
                            </button>
                        )}
                    </form>
                </div>
            )}

            {/* Feedback */}
            {phase === 'feedback' && (
                <div className={`feedback-display ${isCorrect ? 'correct' : 'incorrect'}`}>
                    {isCorrect ? (
                        <>
                            <span className="feedback-emoji">✅</span>
                            <h3>¡Correcto!</h3>
                            <p>{challenge.explanation}</p>
                        </>
                    ) : (
                        <>
                            <span className="feedback-emoji">❌</span>
                            <h3>Incorrecto</h3>
                            <p>Respuesta correcta: <strong>{challenge.answer}</strong></p>
                            <p className="feedback-explanation">{challenge.explanation}</p>
                        </>
                    )}

                    {/* Botón para continuar */}
                    <button onClick={handleContinue} className="btn btn-primary btn-continue">
                        {isLastRound ? '📊 Ver Resultados' : '➡️ Siguiente Ronda'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default RuletaRound;
