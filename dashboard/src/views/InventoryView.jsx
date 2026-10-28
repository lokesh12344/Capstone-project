import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Panel from '../components/Panel';
import KpiCard from '../components/KpiCard';
import Icon from '../components/Icon';
import DiscountDialog from '../components/DiscountDialog';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StatusBlock';
import { formatCompactNumber, formatCurrency, formatShortDate } from '../lib/format';

const PAGE_SIZE = 10;
const RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const PRIORITY_TONE = { critical: 'critical', high: 'critical', medium: 'warning', low: 'neutral' };

const ISSUES = {
    reorder: { label: 'Reorder', tone: 'warning' },
    stockout: { label: 'Stockout risk', tone: 'critical' },
    expiry: { label: 'Expiry risk', tone: 'critical' },
    dead: { label: 'Slow stock', tone: 'neutral' },
    markdown: { label: 'Markdown', tone: 'info' },
    on_sale: { label: 'On sale', tone: 'violet' },
};

export default function InventoryView({ feeds, isOwner, onRetry, onApplyDiscount, onEndDiscount }) {
    const [params, setParams] = useSearchParams();
    const filter = params.get('filter');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [sort, setSort] = useState('priority');
    const [page, setPage] = useState(0);
    const [dialog, setDialog] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [toast, setToast] = useState('');

    const inv = feeds.inventory.data;
    const rows = useMemo(() => (inv ? buildRows(inv) : []), [inv]);
    const categories = useMemo(() => [...new Set(rows.map(r => r.category).filter(Boolean))].sort(), [rows]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = rows.filter(r =>
            (!filter || r.issues.has(filter)) &&
            (category === 'all' || r.category === category) &&
            (!q || r.name.toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q)));
        const by = {
            priority: (a, b) => a.rank - b.rank || b.impact - a.impact,
            impact: (a, b) => b.impact - a.impact,
            stock: (a, b) => a.stock - b.stock,
            name: (a, b) => a.name.localeCompare(b.name),
        }[sort];
        return list.sort(by);
    }, [rows, filter, category, search, sort]);

    useEffect(() => { setPage(0); }, [filter, category, search, sort]);
    useEffect(() => {
        if (!toast) return undefined;
        const t = setTimeout(() => setToast(''), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    function setFilter(next) {
        const p = new URLSearchParams(params);
        if (!next || next === filter) p.delete('filter'); else p.set('filter', next);
        setParams(p, { replace: true });
    }

    async function confirmDiscount(body) {
        const item = dialog;
        await onApplyDiscount(item.product_id, body);
        setDialog(null);
        setToast(`${item.name} is on sale at ${formatCurrency(body.sale_price)}. Phones get it on their next sync.`);
    }

    async function endSale(row) {
        setBusyId(row.product_id);
        try {
            await onEndDiscount(row.product_id);
            setToast(`${row.name} is back to ${formatCurrency(row.onSale.regular_price)}.`);
        } catch (err) {
            setToast(err.message || 'Could not end the sale.');
        } finally {
            setBusyId(null);
        }
    }

    if (feeds.inventory.loading && !inv) return <div className="page"><LoadingBlock label="Analysing stock…" /></div>;
    if (feeds.inventory.error && !inv) return <div className="page"><ErrorBlock message={feeds.inventory.error} onRetry={onRetry} /></div>;

    const s = {
        reorder: inv.reorder?.summary || {},
        stock: inv.stock_risk?.summary || {},
        expiry: inv.expiry_risk?.summary || {},
        dead: inv.dead_stock?.summary || {},
        markdown: inv.markdowns?.summary || {},
        onSale: inv.on_sale?.summary || {},
    };
    const kpis = [
        { key: 'reorder', icon: 'alert', tone: 'critical', label: 'Critical reorders', value: formatCompactNumber(s.reorder.critical_count), hint: 'Need restocking now' },
        { key: 'stockout', icon: 'box', tone: 'warning', label: 'Stockout risk', value: formatCompactNumber(s.stock.stockout_7d), hint: 'May run out this week' },
        { key: 'expiry', icon: 'clock', tone: 'violet', label: 'Expiring soon', value: formatCurrency(s.expiry.value_at_risk_sale), hint: 'Sales value at risk' },
        { key: 'dead', icon: 'stack', tone: 'info', label: 'Dead stock', value: formatCurrency(s.dead.blocked_cost_value), hint: 'Capital in slow items' },
        { key: 'markdown', icon: 'tag', tone: 'primary', label: 'Suggested markdowns', value: formatCompactNumber(s.markdown.markdown_count), hint: 'Discount, stay profitable' },
        { key: 'on_sale', icon: 'cart', tone: 'neutral', label: 'On sale now', value: formatCompactNumber(s.onSale.on_sale_count), hint: 'Currently discounted' },
    ];

    const pageRows = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
    const markdowns = inv.markdowns?.items || [];
    const onSale = inv.on_sale?.items || [];

    return (
        <div className="page">
            <div className="page-head">
                <h1>Inventory intelligence</h1>
                <p>Prioritise stock decisions before they cost you money.</p>
            </div>

            <div className="grid grid--kpi6">
                {kpis.map(k => (
                    <KpiCard key={k.key} compact icon={k.icon} tone={k.tone} label={k.label} value={k.value} hint={k.hint}
                        isActive={filter === k.key} onClick={() => setFilter(k.key)} />
                ))}
            </div>

            <div className="grid grid--inventory">
                <div className="stack">
                    <Panel
                        flush
                        className="panel--toolbar"
                        title="Needs attention first"
                        subtitle="Every stock, expiry and sales signal for a product, ranked in one list."
                        action={(
                            <div className="toolbar">
                                <label className="search">
                                    <Icon name="search" size={17} />
                                    <input type="search" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search products" />
                                </label>
                                <select className="control" value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
                                    <option value="all">All categories</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select className="control" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort">
                                    <option value="priority">Sort: Priority</option>
                                    <option value="impact">Sort: Impact (₹)</option>
                                    <option value="stock">Sort: Lowest stock</option>
                                    <option value="name">Sort: Name</option>
                                </select>
                            </div>
                        )}
                    >
                        {filter && (
                            <div style={{ padding: '0 22px 12px' }}>
                                <span className={`filter-chip tone-${ISSUES[filter]?.tone || 'neutral'}`}>
                                    {ISSUES[filter]?.label || filter}
                                    <button type="button" onClick={() => setFilter(null)} aria-label="Clear filter"><Icon name="close" size={14} /></button>
                                </span>
                            </div>
                        )}
                        {visible.length === 0 ? (
                            <EmptyBlock title="Nothing here" subtitle={filter || search ? 'No products match these filters.' : 'No stock issues right now.'} />
                        ) : (
                            <>
                                <div className="table-wrap">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Priority</th>
                                                <th>Product</th>
                                                <th>Stock / cover</th>
                                                <th>Recommendation</th>
                                                <th className="num">Impact</th>
                                                {isOwner && <th />}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pageRows.map(r => (
                                                <tr key={r.product_id}>
                                                    <td><span className={`pill pill--sq tone-${PRIORITY_TONE[r.priority]}`}>{cap(r.priority)}</span></td>
                                                    <td><div className="cell-main"><strong>{r.name}</strong><span>{r.category}</span></div></td>
                                                    <td>
                                                        <div className="cell-main">
                                                            <strong>{formatCompactNumber(r.stock)} {r.unit || 'units'}</strong>
                                                            {r.expiryDays != null
                                                                ? <span className="cell-warn">{r.expiryDays <= 0 ? 'Expired' : `${r.expiryDays} days to expiry`}</span>
                                                                : <span>{coverText(r.cover)}</span>}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="cell-main">
                                                            <strong style={{ fontSize: 13.5 }}>{r.recommendation}</strong>
                                                            <div className="tag-list" style={{ marginTop: 4 }}>
                                                                {[...r.issues].map(i => <span key={i} className={`pill tone-${ISSUES[i].tone}`}>{ISSUES[i].label}</span>)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="num">
                                                        <div className="cell-main"><strong>{formatCurrency(r.impact)}</strong><span>{r.impactLabel}</span></div>
                                                    </td>
                                                    {isOwner && (
                                                        <td className="num">
                                                            <RowAction row={r} busy={busyId === r.product_id} onDiscount={setDialog} onEndSale={endSale} />
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="pager">
                                    <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, visible.length)} of {visible.length} products</span>
                                    <div>
                                        <button type="button" className="btn btn--ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}><Icon name="chevronLeft" size={16} /> Prev</button>
                                        <button type="button" className="btn btn--ghost" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Next <Icon name="chevronRight" size={16} /></button>
                                    </div>
                                </div>
                            </>
                        )}
                    </Panel>

                    <Panel flush title="Markdown opportunities" subtitle="Discounts that clear slow stock while staying profitable.">
                        {markdowns.length === 0 ? <EmptyBlock title="No markdowns needed" subtitle="Nothing slow enough to discount profitably right now." /> : (
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr><th>Product</th><th className="num">Current</th><th className="num">Suggested</th><th>Discount</th><th>Margin after</th>{isOwner && <th />}</tr>
                                    </thead>
                                    <tbody>
                                        {markdowns.map(m => (
                                            <tr key={m.product_id}>
                                                <td><div className="cell-main"><strong>{m.name}</strong><span>{m.category} · {m.current_stock} in stock · {m.status === 'dead_stock' ? 'not selling' : 'slow'}</span></div></td>
                                                <td className="num">{formatCurrency(m.selling_price)}</td>
                                                <td className="num"><strong>{formatCurrency(Math.round(m.suggested_price))}</strong></td>
                                                <td><span className="pill pill--sq tone-warning">{Math.round(m.discount_pct)}% off</span></td>
                                                <td><span className="pill pill--sq tone-primary">{Math.round(m.margin_pct_after)}%</span></td>
                                                {isOwner && (
                                                    <td className="num">
                                                        <button type="button" className="btn btn--primary" onClick={() => setDialog(markdownDialog(m))}>
                                                            <Icon name="tag" size={15} /> Apply
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>

                    <Panel flush title="On sale now" subtitle="Discounts applied from here or the shop app, and whether they're working.">
                        {onSale.length === 0 ? <EmptyBlock title="Nothing on sale" subtitle="Apply a markdown above to start one." /> : (
                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr><th>Product</th><th className="num">Price</th><th>Discount</th><th className="num">Sold (7 days)</th><th>Ends</th>{isOwner && <th />}</tr>
                                    </thead>
                                    <tbody>
                                        {onSale.map(o => (
                                            <tr key={o.product_id}>
                                                <td><div className="cell-main"><strong>{o.name}</strong><span>{o.category} · {o.current_stock} left</span></div></td>
                                                <td className="num"><span className="strike">{formatCurrency(o.regular_price)}</span><strong>{formatCurrency(o.sale_price)}</strong></td>
                                                <td><span className="pill pill--sq tone-violet">{Math.round(o.discount_pct)}% off</span></td>
                                                <td className="num">{formatCompactNumber(o.units_sold_7d)}</td>
                                                <td>{o.sale_until ? formatShortDate(o.sale_until) : <span className="muted">When ended</span>}</td>
                                                {isOwner && (
                                                    <td className="num">
                                                        <button type="button" className="btn btn--danger" disabled={busyId === o.product_id}
                                                            onClick={() => endSale({ product_id: o.product_id, name: o.name, onSale: o })}>
                                                            End sale
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>
                </div>

                <div className="stack">
                    <Panel title="Recommended next steps" subtitle="The biggest wins in your stock right now.">
                        <NextSteps s={s} onPick={setFilter} />
                    </Panel>
                    {!isOwner && (
                        <Panel title="Prices are owner-only" subtitle="Log in as the shop owner to apply or end discounts." />
                    )}
                </div>
            </div>

            <Panel title="Product opportunities" subtitle="Where demand is growing across categories.">
                {(inv.opportunities?.items || []).length === 0 ? (
                    <EmptyBlock title="No opportunities yet" subtitle="More sales history helps spot category trends." />
                ) : (
                    <div className="opps">
                        {inv.opportunities.items.map((o, i) => (
                            <div key={`${o.type}-${i}`} className="opp">
                                <span className="pill tone-primary">{o.type.replaceAll('_', ' ')}</span>
                                <strong>{o.title}</strong>
                                <p>{o.explanation}</p>
                                <small>{o.recommended_action}</small>
                            </div>
                        ))}
                    </div>
                )}
            </Panel>

            {dialog && <DiscountDialog item={dialog} onConfirm={confirmDiscount} onClose={() => setDialog(null)} />}
            {toast && <div className="toast" role="status">{toast}</div>}
        </div>
    );
}

function RowAction({ row, busy, onDiscount, onEndSale }) {
    if (row.onSale) {
        return <button type="button" className="btn btn--danger" disabled={busy} onClick={() => onEndSale(row)}>End sale</button>;
    }
    if (row.markdown) {
        return (
            <button type="button" className="btn btn--primary" onClick={() => onDiscount(markdownDialog(row.markdown))}>
                Apply {formatCurrency(Math.round(row.markdown.suggested_price))}
            </button>
        );
    }
    if (row.expiryItem && row.expiryItem.selling_price > 0 && row.expiryDays > 0) {
        const e = row.expiryItem;
        // Clearance before expiry: 20% off, never below what the batch cost.
        const suggested = Math.max(Math.round(e.selling_price * 0.8), Math.ceil(e.cost_price));
        if (suggested < e.selling_price) {
            return (
                <button type="button" className="btn btn--ghost" onClick={() => onDiscount({
                    product_id: e.product_id, name: e.name, normal_price: e.selling_price,
                    suggested_price: suggested, cost_per_unit: e.cost_price,
                })}>
                    Clear stock
                </button>
            );
        }
    }
    return null;
}

function markdownDialog(m) {
    return { product_id: m.product_id, name: m.name, normal_price: m.selling_price, suggested_price: m.suggested_price, cost_per_unit: m.cost_per_unit };
}

function NextSteps({ s, onPick }) {
    const steps = [];
    if (s.reorder.critical_count) steps.push({ key: 'reorder', tone: 'critical', icon: 'alert', title: `Restock ${s.reorder.critical_count} critical item${s.reorder.critical_count === 1 ? '' : 's'}`, text: `About ${formatCurrency(s.reorder.estimated_purchase_value)} to bring stock back to healthy cover.` });
    if (s.expiry.at_risk_batches) steps.push({ key: 'expiry', tone: 'violet', icon: 'clock', title: `Clear ${s.expiry.at_risk_batches} expiry-risk batch${s.expiry.at_risk_batches === 1 ? '' : 'es'}`, text: 'Discount or bundle these before they become waste.' });
    if (s.markdown.markdown_count) steps.push({ key: 'markdown', tone: 'primary', icon: 'tag', title: `Check ${s.markdown.markdown_count} markdown suggestion${s.markdown.markdown_count === 1 ? '' : 's'}`, text: `Could turn ${formatCurrency(s.markdown.blocked_cost_value)} of stuck stock back into cash.` });
    if (s.onSale.on_sale_count) steps.push({ key: 'on_sale', tone: 'neutral', icon: 'cart', title: `Track ${s.onSale.on_sale_count} active sale${s.onSale.on_sale_count === 1 ? '' : 's'}`, text: 'End a discount once the stock has cleared.' });
    if (steps.length === 0) return <EmptyBlock title="Nothing urgent" subtitle="Stock, expiry and pricing all look healthy." />;
    return (
        <div className="steps">
            {steps.map(st => (
                <div key={st.key} className={`step tone-${st.tone}`}>
                    <span className="step__icon"><Icon name={st.icon} size={19} /></span>
                    <div>
                        <strong>{st.title}</strong>
                        <p>{st.text}</p>
                        <button type="button" className="link-btn" onClick={() => onPick(st.key)}>View list <Icon name="chevronRight" size={15} /></button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// One row per product, merging every signal the analytics returned for it.
// Priority is the most urgent signal; impact is the largest rupee figure.
function buildRows(inv) {
    const byId = new Map();
    const row = (id, base) => {
        if (!byId.has(id)) {
            byId.set(id, {
                product_id: id, name: base.name, category: base.category, unit: base.unit,
                stock: base.current_stock ?? base.remaining_units ?? 0, cover: null, expiryDays: null,
                issues: new Set(), priority: 'low', rank: RANK.low, impact: 0, impactLabel: '', recommendation: '',
                markdown: null, onSale: null, expiryItem: null,
            });
        }
        return byId.get(id);
    };
    const signal = (r, issue, priority, rec, impact, impactLabel) => {
        r.issues.add(issue);
        const rank = RANK[priority] ?? RANK.low;
        if (rank < r.rank || !r.recommendation) {
            r.rank = Math.min(rank, r.rank);
            r.priority = Object.keys(RANK).find(k => RANK[k] === r.rank);
            r.recommendation = rec;
        }
        if (impact > r.impact) { r.impact = impact; r.impactLabel = impactLabel; }
    };

    for (const it of inv.reorder?.items || []) {
        if (it.urgency === 'safe') continue;
        const r = row(it.product_id, it);
        r.cover = it.days_of_cover;
        r.unit = it.unit || r.unit;
        signal(r, 'reorder', it.urgency, `Reorder ${it.suggested_reorder_qty} ${it.unit || 'units'}`, it.estimated_reorder_cost, 'to restock');
    }
    for (const it of inv.stock_risk?.items || []) {
        const r = row(it.product_id, it);
        r.cover = it.days_of_cover;
        signal(r, 'stockout', it.risk_band, 'Restock before it runs out', it.estimated_revenue_risk, 'sales at risk');
    }
    for (const it of inv.expiry_risk?.items || []) {
        const r = row(it.product_id, it);
        r.expiryDays = r.expiryDays == null ? it.days_until_expiry : Math.min(r.expiryDays, it.days_until_expiry);
        if (!r.expiryItem || it.days_until_expiry < r.expiryItem.days_until_expiry) r.expiryItem = it;
        signal(r, 'expiry', it.risk_band, it.days_until_expiry <= 0 ? 'Remove expired stock' : 'Prioritise clearance', it.value_at_risk_cost, 'at risk (expiry)');
    }
    for (const it of inv.dead_stock?.items || []) {
        const r = row(it.product_id, it);
        signal(r, 'dead', it.status === 'dead_stock' ? 'medium' : 'low', 'Clear slow stock', it.stock_cost_value, 'tied up in stock');
    }
    for (const it of inv.markdowns?.items || []) {
        const r = row(it.product_id, it);
        r.markdown = it;
        signal(r, 'markdown', 'medium', `Discount to ${formatCurrency(Math.round(it.suggested_price))}`, it.blocked_cost_value, 'tied up in stock');
    }
    for (const it of inv.on_sale?.items || []) {
        const r = row(it.product_id, it);
        r.onSale = it;
        signal(r, 'on_sale', 'low', `On sale at ${formatCurrency(it.sale_price)}`, 0, '');
    }
    return [...byId.values()];
}

function coverText(days) {
    if (days == null) return 'No recent sales';
    const d = Math.round(days);
    if (d <= 0) return 'Out of stock';
    return `${d} day${d === 1 ? '' : 's'} cover`;
}

function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
