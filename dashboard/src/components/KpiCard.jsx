import React from 'react';

export default function KpiCard({ label, value, hint, tone = 'teal', isActive = false, onClick }) {
    const Tag = onClick ? 'button' : 'article';
    const extraClass = isActive ? ' kpi--active' : '';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            className={`kpi kpi--${tone}${extraClass}`}
            onClick={onClick}
        >
            <p className="kpi__label">{label}</p>
            <h3 className="kpi__value">{value}</h3>
            <p className="kpi__hint">{hint}</p>
        </Tag>
    );
}
