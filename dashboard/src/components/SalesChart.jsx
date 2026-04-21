import React from 'react';
import { formatCurrency, formatShortDate } from '../lib/format';

export default function SalesChart({ data }) {
    if (!data.length) return null;

    const maxRevenue = Math.max(...data.map(item => item.revenue), 1);
    const width = Math.max(640, data.length * 44);
    const height = 260;
    const padding = 24;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;
    const labelStep = Math.max(1, Math.ceil(data.length / 7));

    const points = data.map((item, index) => {
        const x = padding + index * step;
        const y = padding + chartHeight - (item.revenue / maxRevenue) * chartHeight;
        return { ...item, x, y, index };
    });

    const linePath = points.map((point, index) => (
        `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )).join(' ');

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
        <div className="chart-shell">
            <svg viewBox={`0 0 ${width} ${height}`} className="sales-chart" role="img" aria-label="Sales trend chart">
                <defs>
                    <linearGradient id="salesArea" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#1f8a70" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="#1f8a70" stopOpacity="0.02" />
                    </linearGradient>
                </defs>
                {[0, 0.25, 0.5, 0.75, 1].map(line => {
                    const y = padding + chartHeight * line;
                    return <line key={line} x1={padding} x2={width - padding} y1={y} y2={y} className="chart-grid" />;
                })}
                <path d={areaPath} fill="url(#salesArea)" />
                <path d={linePath} className="chart-line" />
                {points.map(point => (
                    <g key={point.period}>
                        <circle cx={point.x} cy={point.y} r="4.5" className="chart-point" />
                        <title>{`${formatShortDate(point.period)}: ${formatCurrency(point.revenue)} from ${point.orderCount} orders`}</title>
                    </g>
                ))}
                {points.map(point => {
                    const shouldRenderLabel =
                        point.index === 0 ||
                        point.index === points.length - 1 ||
                        point.index % labelStep === 0;

                    return shouldRenderLabel ? (
                        <text key={`${point.period}-label`} x={point.x} y={height - 6} textAnchor="middle" className="chart-axis-label">
                            {formatShortDate(point.period)}
                        </text>
                    ) : null;
                })}
            </svg>
        </div>
    );
}
