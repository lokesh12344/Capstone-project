import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Panel from '../components/Panel';
import KpiCard, { Delta } from '../components/KpiCard';
import SegmentedControl from '../components/SegmentedControl';
import SalesChart from '../components/SalesChart';
import PaymentDonut from '../components/PaymentDonut';
import Icon from '../components/Icon';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StatusBlock';
import { formatAgo, formatCompactNumber, formatCurrency, percentChange } from '../lib/format';
import { dailyWindow, groupSeries, hasPreviousWindow, sumSeries } from '../lib/series';

const GRANULARITY = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

export default function OverviewView({ business, feeds, range, onRetry }) {
    const navigate = useNavigate();
    const [granularity, setGranularity] = useState('daily');
    const [showAllProducts, setShowAllProducts] = useState(false);

    const summary = feeds.summary.data;
    const salesRows = feeds.sales.data || [];
    const inventory = feeds.inventory.data;

    const current = useMemo(() => dailyWindow(salesRows, range), [salesRows, range]);
    const previous = useMemo(() => (hasPreviousWindow(range) ? dailyWindow(salesRows, range, range) : null), [salesRows, range]);
    const totals = sumSeries(current);
    const prevTotals = previous ? sumSeries(previous) : null;
    const chartData = groupSeries(current, granularity);

    const today = summary?.today || { revenue: 0, orders: 0 };
    const yesterday = summary?.yesterday_same_time;

    const attention = buildAttention(summary, inventory);

    return (
        <div className="page">
            <div className="page-head">
                <h1>Good {greeting()}, {business.name}</h1>
                <p>Here&apos;s what&apos;s happening with your business today.</p>
            </div>

            <div className="grid grid--kpi4">
                <KpiCard icon="bag" tone="primary" label="Today's sales" value={formatCurrency(today.revenue)}
                    delta={yesterday ? percentChange(today.revenue, yesterday.revenue) : null} deltaNote="vs this time yesterday"
                    hint="Sales booked since midnight" />
                <KpiCard icon="cart" tone="info" label="Orders today" value={formatCompactNumber(today.orders)}
                    delta={yesterday ? percentChange(today.orders, yesterday.orders) : null} deltaNote="vs this time yesterday"
                    hint="Bills completed since midnight" />
                <KpiCard icon="alert" tone="warning" label="Low stock items" value={formatCompactNumber(summary?.alerts?.low_stock)}
                    hint="Products at or below reorder level" onClick={() => navigate('/dashboard/inventory?filter=reorder')} />
                <KpiCard icon="expiry" tone="critical" label="Near expiry" value={formatCompactNumber(summary?.alerts?.near_expiry)}
                    hint="Batches with stock expiring within 7 days" onClick={() => navigate('/dashboard/inventory?filter=expiry')} />
            </div>

            <div className="grid grid--sales">
                <Panel
                    title="Sales performance"
                    subtitle={`Revenue and orders over the last ${range} days`}
                    action={<SegmentedControl options={GRANULARITY} value={granularity} onChange={setGranularity} label="Chart grouping" />}
                >
                    {feeds.sales.loading ? <LoadingBlock label="Loading sales…" />
                        : feeds.sales.error ? <ErrorBlock message={feeds.sales.error} onRetry={onRetry} />
                            : totals.orderCount === 0 ? <EmptyBlock title="No sales in this period" subtitle="Bills from the shop app appear here after they sync." />
                                : (
                                    <>
                                        <SalesChart data={chartData} />
                                        <div className="metric-row">
                                            <Metric label="Revenue" value={formatCurrency(totals.revenue)} delta={prevTotals && percentChange(totals.revenue, prevTotals.revenue)} />
                                            <Metric label="Orders" value={formatCompactNumber(totals.orderCount)} delta={prevTotals && percentChange(totals.orderCount, prevTotals.orderCount)} />
                                            <Metric label="Average bill" value={formatCurrency(totals.orderCount ? totals.revenue / totals.orderCount : 0)}
                                                delta={prevTotals && prevTotals.orderCount ? percentChange(totals.revenue / (totals.orderCount || 1), prevTotals.revenue / prevTotals.orderCount) : null} />
                                        </div>
                                    </>
                                )}
                </Panel>

                <Panel title="Payment insights" subtitle={`How customers paid over the last ${range} days`}>
                    {feeds.sales.loading ? <LoadingBlock label="Loading payment mix…" />
                        : totals.revenue === 0 ? <EmptyBlock title="No payments yet" subtitle="The split appears after the first synced sale." />
                            : (
                                <>
                                    <PaymentDonut totals={totals} />
                                    {prevTotals && prevTotals.revenue > 0 && (
                                        <p className="donut-compare">
                                            <Delta value={percentChange(totals.revenue, prevTotals.revenue)} /> vs the previous {range} days
                                            {' '}({formatCurrency(prevTotals.revenue)})
                                        </p>
                                    )}
                                </>
                            )}
                </Panel>
            </div>

            <div className="grid grid--three">
                <Panel
                    title="Top products"
                    subtitle="Best sellers in the last 30 days"
                    action={feeds.topProducts.data?.length > 5 && (
                        <button type="button" className="link-btn" onClick={() => setShowAllProducts(v => !v)}>
                            {showAllProducts ? 'Show top 5' : 'View all'}
                        </button>
                    )}
                    flush
                >
                    {feeds.topProducts.loading ? <LoadingBlock /> : !feeds.topProducts.data?.length ? (
                        <EmptyBlock title="No ranked products yet" subtitle="Sales activity will rank products automatically." />
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>#</th><th>Product</th><th className="num">Units</th><th className="num">Revenue</th></tr></thead>
                                <tbody>
                                    {feeds.topProducts.data.slice(0, showAllProducts ? 10 : 5).map((p, i) => (
                                        <tr key={p.id}>
                                            <td className="rank">{i + 1}</td>
                                            <td><div className="cell-main"><strong>{p.name}</strong><span>{p.category}</span></div></td>
                                            <td className="num">{formatCompactNumber(p.unitsSold)}</td>
                                            <td className="num">{formatCurrency(p.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>

                <Panel
                    title="Customer intelligence"
                    subtitle="High-value customers and segment mix"
                    action={<button type="button" className="link-btn" onClick={() => navigate('/dashboard/customers')}>View all</button>}
                >
                    {feeds.customers.loading ? <LoadingBlock /> : !feeds.customers.data?.customers?.length ? (
                        <EmptyBlock title="No customer data yet" subtitle="Segments appear once bills are linked to customers." />
                    ) : (
                        <>
                            <Segments summary={feeds.customers.data.summary} onPick={seg => navigate(`/dashboard/customers?segment=${seg}`)} />
                            <div className="table-wrap">
                                <table>
                                    <thead><tr><th>Customer</th><th className="num">Orders</th><th className="num">Spend</th></tr></thead>
                                    <tbody>
                                        {feeds.customers.data.customers.slice(0, 5).map(c => (
                                            <tr key={c.id}>
                                                <td><div className="cell-main"><strong>{c.name}</strong><span>{formatAgo(c.last_order_at)}</span></div></td>
                                                <td className="num">{c.orderCount30d}</td>
                                                <td className="num">{formatCurrency(c.spend30d)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </Panel>

                <Panel
                    title="Needs attention"
                    subtitle="What to act on to keep the shop running smoothly"
                    action={<button type="button" className="link-btn" onClick={() => navigate('/dashboard/inventory')}>View all</button>}
                >
                    {feeds.inventory.loading && !inventory ? <LoadingBlock /> : attention.length === 0 ? (
                        <EmptyBlock title="All clear" subtitle="No stock, expiry or slow-moving issues right now." />
                    ) : (
                        <div className="attention">
                            {attention.map(a => (
                                <div key={a.key} className={`attention__row tone-${a.tone}`}>
                                    <span className="attention__icon"><Icon name={a.icon} /></span>
                                    <div className="attention__text">
                                        <strong>{a.title}</strong>
                                        <span>{a.detail}</span>
                                    </div>
                                    <button type="button" className="link-btn" onClick={() => navigate(`/dashboard/inventory?filter=${a.filter}`)}>
                                        {a.cta} <Icon name="chevronRight" size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Panel>
            </div>
        </div>
    );
}

function Metric({ label, value, delta }) {
    return (
        <div className="metric">
            <span>{label}</span>
            <strong>{value}</strong> {delta != null && <Delta value={delta} />}
        </div>
    );
}

export function Segments({ summary, active, onPick }) {
    const tones = { regular: 'primary', occasional: 'info', dormant: 'warning', new: 'violet' };
    return (
        <div className="segments">
            {Object.entries(tones).map(([seg, tone]) => (
                <button key={seg} type="button" className={`segment tone-${tone}${active === seg ? ' is-active' : ''}`} onClick={() => onPick(seg)}>
                    <span>{seg}</span>
                    <strong>{summary?.[seg] || 0}</strong>
                </button>
            ))}
        </div>
    );
}

// The overview's to-do list, drawn from the same analytics as Inventory.
function buildAttention(summary, inventory) {
    if (!inventory) return [];
    const rows = [];
    const expiry = inventory.expiry_risk?.summary;
    if (expiry?.at_risk_batches) {
        rows.push({ key: 'expiry', tone: 'critical', icon: 'expiry', filter: 'expiry', cta: 'Review',
            title: `${expiry.at_risk_batches} batch${expiry.at_risk_batches === 1 ? '' : 'es'} may expire unsold`,
            detail: `${formatCurrency(expiry.value_at_risk_sale)} of sales value at risk` });
    }
    const low = summary?.alerts?.low_stock;
    if (low) {
        rows.push({ key: 'reorder', tone: 'warning', icon: 'box', filter: 'reorder', cta: 'Reorder',
            title: `${low} product${low === 1 ? '' : 's'} at reorder level`, detail: 'Restock before they run out' });
    }
    const markdowns = inventory.markdowns?.summary?.markdown_count;
    if (markdowns) {
        rows.push({ key: 'markdown', tone: 'info', icon: 'tag', filter: 'markdown', cta: 'Discount',
            title: `${markdowns} product${markdowns === 1 ? '' : 's'} worth discounting`,
            detail: `Could recover ~${formatCurrency(inventory.markdowns.summary.potential_recovery_value)}` });
    }
    const dead = inventory.dead_stock?.summary;
    if (dead?.blocked_cost_value) {
        rows.push({ key: 'dead', tone: 'neutral', icon: 'rupee', filter: 'dead', cta: 'View',
            title: `${formatCurrency(dead.blocked_cost_value)} tied up in slow stock`,
            detail: `${dead.dead_stock_count} not selling, ${dead.slow_mover_count} slow` });
    }
    const onSale = inventory.on_sale?.summary?.on_sale_count;
    if (onSale) {
        rows.push({ key: 'sale', tone: 'violet', icon: 'sparkle', filter: 'on_sale', cta: 'Track',
            title: `${onSale} product${onSale === 1 ? '' : 's'} on sale now`, detail: 'See whether the discounts are moving stock' });
    }
    return rows;
}

function greeting() {
    const h = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()));
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
}
