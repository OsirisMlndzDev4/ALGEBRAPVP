
import React from 'react';
import { getStreakTier } from '../../utils/gameLogic';
import LiquidCard from '../UI/LiquidCard';

const PlayerCard = ({
    player,
    isCurrentTurn,
    isTakingDamage,
    streak,
    difficulty,
    positionClass,
    totalDamage = 0
}) => {
    const streakTier = streak > 1 ? getStreakTier(streak, difficulty) : null;

    return (
        <LiquidCard
            className={`player-card dashboard-card ${positionClass} ${isCurrentTurn ? 'active' : ''} ${isTakingDamage ? 'taking-damage' : ''}`}
        >
            <div className="player-info">
                <span className="player-name">{player.name}</span>
                {streakTier && (
                    <span className="streak-mini" style={{ color: streakTier.color }}>
                        {streakTier.emoji} {streak}
                    </span>
                )}
            </div>
            <div className="hp-bar-wrapper">
                <div
                    className="hp-bar-fill"
                    style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
                />
            </div>
            <div className="player-stats-row">
                <span className="hp-text-mini">{player.hp} HP</span>
                {totalDamage > 0 && (
                    <span className="damage-dealt-mini">⚔️ {totalDamage}</span>
                )}
            </div>
        </LiquidCard>
    );
};

export default PlayerCard;
