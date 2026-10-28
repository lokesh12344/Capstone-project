import React from 'react';
import Icon from './Icon';

// One KPI tile. Clickable tiles (onClick) act as filters or shortcuts and
// show a chevron; `delta` is a % change vs the comparison period.
export default function KpiCard({ label, value, hint, icon, tone = 'primary', delta, deltaNote, compact = false, isActive = false, onClick }) {
    const Tag = onClick ? 'button' : 'article';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            className={`kpi tone-${tone}${compact ? ' kpi--compact' : ''}${isActive ? ' is-active' : ''}`}
            onClick={onClick}
            aria-pressed={onClick ? isActive : undefined}
        >
            {icon && <span className="kpi__icon"><Icon name={icon} size={compact ? 19 : 22} /></span>}
            <div className="kpi__body">
                <p className="kpi__label">{label}</p>
                <p className="kpi__value">{value}</p>
                {delta != null ? (
                    <p className="kpi__hint">
                        <Delta value={delta} />
                        {deltaNote && <span className="delta-note">{deltaNote}</span>}
                    </p>
                ) : hint ? <p className="kpi__hint">{hint}</p> : null}
            </div>
            {onClick && !compact && <Icon name="chevronRight" className="kpi__chev" />}
        </Tag>
    );
}

export function Delta({ value }) {
    if (value == null || !Number.isFinite(value)) return null;
    const rounded = Math.round(value * 10) / 10;
    const dir = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
    return (
        <span className={`delta delta--${dir}`}>
            {dir !== 'flat' && <Icon name={dir === 'up' ? 'arrowUp' : 'arrowDown'} size={14} strokeWidth={2.2} />}
            {dir === 'up' ? '+' : ''}{rounded}%
        </span>
    );
}
