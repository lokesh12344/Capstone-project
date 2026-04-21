import React from 'react';
import { formatCurrency } from '../lib/format';

const PAYMENT_COLORS = {
    cash: '#1f8a70',
    upi: '#1d4ed8',
    credit: '#d97706',
};

export default function PaymentDonut({ totals }) {
    const items = [
        { key: 'cash', label: 'Cash', value: totals.cash },
        { key: 'upi', label: 'UPI', value: totals.upi },
        { key: 'credit', label: 'Credit', value: totals.credit },
    ];

    const total = items.reduce((sum, item) => sum + item.value, 0);

    if (total <= 0) return null;

    let cumulative = 0;
    const segments = items.map(item => {
        const fraction = item.value / total;
        const start = cumulative;
        cumulative += fraction;
        return {
            ...item,
            startAngle: start * Math.PI * 2 - Math.PI / 2,
            endAngle: cumulative * Math.PI * 2 - Math.PI / 2,
        };
    });

    return (
        <div className="donut-layout">
            <svg viewBox="0 0 220 220" className="donut-chart" role="img" aria-label="Payment mode distribution">
                {segments.map(segment => (
                    <path
                        key={segment.key}
                        d={describeArc(110, 110, 72, segment.startAngle, segment.endAngle)}
                        stroke={PAYMENT_COLORS[segment.key]}
                        strokeWidth="26"
                        fill="none"
                        strokeLinecap="round"
                    >
                        <title>{`${segment.label}: ${formatCurrency(segment.value)}`}</title>
                    </path>
                ))}
                <circle cx="110" cy="110" r="44" fill="#f6efe3" />
                <text x="110" y="102" textAnchor="middle" className="donut-center-label">Total</text>
                <text x="110" y="124" textAnchor="middle" className="donut-center-value">{formatCurrency(total)}</text>
            </svg>

            <div className="legend">
                {items.map(item => {
                    const share = total > 0 ? (item.value / total) * 100 : 0;
                    return (
                        <div key={item.key} className="legend__row">
                            <div className="legend__label">
                                <span className="legend__dot" style={{ backgroundColor: PAYMENT_COLORS[item.key] }} />
                                {item.label}
                            </div>
                            <div className="legend__values">
                                <strong>{formatCurrency(item.value)}</strong>
                                <span>{share.toFixed(1)}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function polarToCartesian(cx, cy, radius, angleInRadians) {
    return {
        x: cx + radius * Math.cos(angleInRadians),
        y: cy + radius * Math.sin(angleInRadians),
    };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';

    return [
        'M', start.x, start.y,
        'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    ].join(' ');
}
