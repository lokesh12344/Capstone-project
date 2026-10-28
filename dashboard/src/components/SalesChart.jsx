import React, { useEffect, useRef, useState } from 'react';
import { formatCurrency, formatShortDate } from '../lib/format';

// Revenue line over order-count bars; bars use their own scale (orders) so
// both read clearly. The SVG is drawn at the container's real pixel width so
// axis text never gets stretched.
const VB_H = 280;
const PAD_L = 56;
const PAD_R = 16;
const PAD_T = 14;
const PAD_B = 30;

export default function SalesChart({ data }) {
    const wrapRef = useRef(null);
    const [VB_W, setWidth] = useState(800);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(([entry]) => setWidth(Math.max(320, Math.round(entry.contentRect.width))));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    if (!data.length) return null;

    const maxRevenue = niceMax(Math.max(...data.map(d => d.revenue), 1));
    const maxOrders = Math.max(...data.map(d => d.orderCount), 1);
    const chartW = VB_W - PAD_L - PAD_R;
    const chartH = VB_H - PAD_T - PAD_B;
    const slot = chartW / data.length;
    const barW = Math.min(28, slot * 0.6);
    const labelStep = Math.max(1, Math.ceil(data.length / Math.max(3, Math.floor(chartW / 80))));

    const xFor = i => PAD_L + slot * i + slot / 2;
    const yFor = revenue => PAD_T + chartH - (revenue / maxRevenue) * chartH;

    const points = data.map((d, i) => ({ ...d, i, x: xFor(i), y: yFor(d.revenue) }));
    const line = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
    const grid = [0, 0.25, 0.5, 0.75, 1].map(f => ({ f, y: PAD_T + chartH * (1 - f), value: maxRevenue * f }));

    return (
        <div ref={wrapRef}>
            <div className="chart-legend">
                <span><i />Revenue (₹)</span>
                <span><i className="bar" />Orders</span>
            </div>
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="sales-chart" role="img" aria-label="Revenue and orders over time" >
                {grid.map(g => (
                    <g key={g.f}>
                        <line x1={PAD_L} x2={VB_W - PAD_R} y1={g.y} y2={g.y} className="chart-grid" vectorEffect="non-scaling-stroke" />
                        <text x={PAD_L - 10} y={g.y + 4} textAnchor="end" className="chart-axis-label">{compactRupees(g.value)}</text>
                    </g>
                ))}

                {points.map(p => {
                    const h = (p.orderCount / maxOrders) * chartH * 0.7;
                    return <rect key={`b${p.period}`} x={p.x - barW / 2} y={PAD_T + chartH - h} width={barW} height={h} rx="3" className="chart-bar" />;
                })}

                <path d={line} className="chart-line" vectorEffect="non-scaling-stroke" />

                {points.map(p => (
                    <g key={p.period}>
                        <circle cx={p.x} cy={p.y} r="4.5" className="chart-point" vectorEffect="non-scaling-stroke" />
                        <rect x={p.x - slot / 2} y={PAD_T} width={slot} height={chartH} fill="transparent">
                            <title>{`${p.label || formatShortDate(p.period)}: ${formatCurrency(p.revenue)} · ${p.orderCount} orders`}</title>
                        </rect>
                    </g>
                ))}

                {points.map(p => (p.i % labelStep === 0) && (
                    <text key={`l${p.period}`} x={p.x} y={VB_H - 8} textAnchor="middle" className="chart-axis-label">
                        {p.label || formatShortDate(p.period)}
                    </text>
                ))}
            </svg>
        </div>
    );
}

// Round the y-axis top up to a tidy number (₹2,000 / ₹15,000 …).
function niceMax(value) {
    const mag = 10 ** Math.floor(Math.log10(value));
    const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    return (steps.find(s => s * mag >= value) || 10) * mag;
}

function compactRupees(value) {
    if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10000 || value % 1000 === 0 ? 0 : 1)}K`;
    return `₹${Math.round(value)}`;
}
