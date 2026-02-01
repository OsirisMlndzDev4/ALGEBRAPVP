
import React from 'react';

const PlayerHistory = ({ entries, playerName, position }) => {
    if (!entries || entries.length === 0) {
        return (
            <div className={`player-history ${position}`}>
                <p className="history-empty-mini">Sin ataques aún</p>
            </div>
        );
    }

    return (
        <div className={`player-history ${position}`}>
            <p className="history-title-mini">Últimos ataques</p>
            {entries.slice(0, 3).map((entry, idx) => (
                <div key={idx} className={`history-item-mini ${entry.type}`}>
                    <div className="history-row">
                        <span className="history-round">R{entry.turn}</span>
                        <span className={`history-dmg ${entry.type === 'miss' ? 'miss' : 'hit'}`}>
                            {entry.damage > 0 ? `+${entry.damage}` : entry.damage}
                        </span>
                    </div>
                    <div className="history-expr-mini">{entry.expression}</div>
                </div>
            ))}
        </div>
    );
};

export default PlayerHistory;
