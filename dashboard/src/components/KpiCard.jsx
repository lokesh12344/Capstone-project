import React from 'react';

export default function KpiCard({ label, value, hint, tone = 'teal' }) {
    return (
        <article className={`kpi kpi--${tone}`}>
            <p className="kpi__label">{label}</p>
            <h3 className="kpi__value">{value}</h3>
            <p className="kpi__hint">{hint}</p>
        </article>
    );
}
