import React from 'react';
import { formatCurrency } from '../lib/format';

const ITEMS = [
    { key: 'cash', label: 'Cash', color: 'var(--pay-cash)' },
    { key: 'upi', label: 'UPI', color: 'var(--pay-upi)' },
    { key: 'credit', label: 'Credit', color: 'var(--pay-credit)' },
];

export default function PaymentDonut({ totals }) {
    const total = ITEMS.reduce((sum, item) => sum + totals[item.key], 0);
    if (total <= 0) return null;

    // Stroke-dasharray donut: each segment is an arc of one circle, with a
    // small gap so adjacent segments read as separate.
    const r = 70;
    const circumference = 2 * Math.PI * r;
    const gap = 3;
    let offset = 0;

    return (
        <div className="donut-layout">
            <svg viewBox="0 0 200 200" className="donut-chart" role="img" aria-label="Payment mode split">
                <g transform="rotate(-90 100 100)">
                    {ITEMS.map(item => {
                        const len = (totals[item.key] / total) * circumference;
                        const seg = (
                            <circle
                                key={item.key}
                                cx="100" cy="100" r={r}
                                fill="none"
                                stroke={item.color}
                                strokeWidth="26"
                                strokeDasharray={`${Math.max(len - gap, 0)} ${circumference}`}
                                strokeDashoffset={-offset}
                            >
                                <title>{`${item.label}: ${formatCurrency(totals[item.key])}`}</title>
                            </circle>
                        );
                        offset += len;
                        return seg;
                    })}
                </g>
                <text x="100" y="98" textAnchor="middle" className="donut-center-value">{formatCurrency(total)}</text>
                <text x="100" y="120" textAnchor="middle" className="donut-center-label">Total sales</text>
            </svg>

            <div className="legend">
                {ITEMS.map(item => (
                    <div key={item.key} className="legend__row">
                        <span className="legend__label"><span className="legend__dot" style={{ background: item.color }} />{item.label}</span>
                        <strong>{formatCurrency(totals[item.key])}</strong>
                        <span className="legend__share">{((totals[item.key] / total) * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
