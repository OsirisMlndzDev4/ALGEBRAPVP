
import React from 'react';

const LiquidCard = ({ children, className = '', style = {}, onClick }) => {
    return (
        <div
            className={`liquid-glass ${className}`}
            style={style}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

export default LiquidCard;
