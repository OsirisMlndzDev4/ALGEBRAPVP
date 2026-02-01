
import React from 'react';

const SpellBar = ({
    expression,
    result,
    onClear,
    onAttack,
    isAttacking,
    onSurrender,
    canSurrender, // pass !isAttacking && !showSurrenderConfirmation
    showSurrenderConfirmation // to disable button
}) => {
    return (
        <>
            <div className="spell-bar-container">
                <div key={expression} className="liquid-glass spell-bar updating">
                    <span className="expression-preview">{expression || 'Selecciona cartas...'}</span>
                    {expression && (
                        <span className="expression-result-preview">
                            = {result ?? '?'}
                        </span>
                    )}

                    <div className="spell-actions">
                        <button onClick={onClear} className="btn-icon" title="Borrar">⌫</button>
                    </div>
                </div>

                <button
                    onClick={onAttack}
                    disabled={!expression}
                    className={`btn btn-primary attack-btn-floating ${!expression ? 'disabled' : ''}`}
                >
                    ATACAR
                </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <button
                    onClick={onSurrender}
                    className="btn btn-ghost surrender-btn"
                    disabled={!canSurrender || showSurrenderConfirmation}
                >
                    🏳️ Rendirse
                </button>
            </div>
        </>
    );
};

export default SpellBar;
