
import React from 'react';

const ControlDeck = ({
    cards,
    usedCards,
    variables = [],
    usedVariables = [],
    difficultyConfig,
    canAddNumber,
    canAddVariable,
    canAddOperator,
    canAddOpenParen,
    canAddCloseParen,
    onAddNumber,
    onAddVariable,
    onAddOperator,
    onAddParenthesis
}) => {
    return (
        <div className="control-deck liquid-glass-panel">
            {/* Numbers and Variables Row */}
            <div className="deck-numbers">
                {/* Cartas numéricas */}
                {cards.map((card, idx) => {
                    const isUsed = usedCards.includes(idx);
                    const isDisabled = isUsed || !canAddNumber;
                    return (
                        <button
                            key={`num-${idx}`}
                            onClick={() => !isDisabled && onAddNumber(card.toString(), idx)}
                            disabled={isDisabled}
                            className={`deck-card ${isUsed ? 'used' : ''} ${!canAddNumber && !isUsed ? 'waiting' : ''}`}
                        >
                            {card}
                        </button>
                    );
                })}

                {/* Cartas de variables algebraicas */}
                {variables.map((variable) => {
                    const isUsed = usedVariables.includes(variable.symbol);
                    const isDisabled = isUsed || !canAddVariable;
                    return (
                        <button
                            key={`var-${variable.symbol}`}
                            onClick={() => !isDisabled && onAddVariable(variable.symbol)}
                            disabled={isDisabled}
                            className={`deck-card variable-card ${isUsed ? 'used' : ''} ${!canAddVariable && !isUsed ? 'waiting' : ''}`}
                            title={`${variable.symbol} = ${variable.value}`}
                        >
                            <span className="variable-symbol">{variable.symbol}</span>
                            <span className="variable-value">={variable.value}</span>
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
