
import React from 'react';

const Arena = ({ target }) => {
    return (
        <div className="arena-target liquid-glass">
            <span className="target-label">OBJETIVO</span>
            <span className="target-number">{target}</span>
        </div>
    );
};

export default Arena;
