
import React from 'react';

const ControlDeck = ({
    cards,
    usedCards,
    difficultyConfig,
    canAddNumber,
    canAddOperator,
    canAddOpenParen,
    canAddCloseParen,
    onAddNumber,
    onAddOperator,
    onAddParenthesis
}) => {
    return (
        <div className="control-deck liquid-glass-panel">
            {/* Numbers */}
            <div className="deck-numbers">
                {cards.map((card, idx) => {
                    const isUsed = usedCards.includes(idx);
                    const isDisabled = isUsed || !canAddNumber;
                    return (
                        <button
                            key={idx}
                            onClick={() => !isDisabled && onAddNumber(card.toString(), idx)}
                            disabled={isDisabled}
                            className={`deck-card ${isUsed ? 'used' : ''} ${!canAddNumber && !isUsed ? 'waiting' : ''}`}
                        >
                            {card}
                        </button>
                    );
                })}
            </div>

            {/* Operators Row */}
            <div className="deck-operators">
                {difficultyConfig?.allowParentheses && (
                    <button
                        onClick={() => onAddParenthesis('(')}
                        disabled={!canAddOpenParen}
                        className={`deck-op paren ${!canAddOpenParen ? 'waiting' : ''}`}
                    >
                        (
                    </button>
                )}

                {difficultyConfig?.operators.map((op, i) => (
                    <button
                        key={op}
                        onClick={() => onAddOperator(op)}
                        disabled={!canAddOperator}
                        className={`deck-op ${!canAddOperator ? 'waiting' : ''}`}
                    >
                        {difficultyConfig.operatorSymbols[i]}
                    </button>
                ))}

                {difficultyConfig?.allowParentheses && (
                    <button
                        onClick={() => onAddParenthesis(')')}
                        disabled={!canAddCloseParen}
                        className={`deck-op paren ${!canAddCloseParen ? 'waiting' : ''}`}
                    >
                        )
                    </button>
                )}
            </div>
        </div>
    );
};

export default ControlDeck;
