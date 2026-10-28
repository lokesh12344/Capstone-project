import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Panel from '../components/Panel';
import KpiCard from '../components/KpiCard';
import Icon from '../components/Icon';
import { Segments } from './OverviewView';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StatusBlock';
import { formatAgo, formatCompactNumber, formatCurrency } from '../lib/format';

const PAGE_SIZE = 15;
const SEGMENT_TONE = { regular: 'primary', occasional: 'info', dormant: 'warning', new: 'violet' };

export default function CustomersView({ feeds, onRetry }) {
    const [params, setParams] = useSearchParams();
    const segment = params.get('segment');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);

    const data = feeds.customers.data;
    const list = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (data?.customers || []).filter(c =>
            (!segment || c.computed_segment === segment) &&
            (!q || c.name?.toLowerCase().includes(q) || c.phone?.includes(q)));
    }, [data, segment, search]);

    useEffect(() => { setPage(0); }, [segment, search]);

    if (feeds.customers.loading && !data) return <div className="page"><LoadingBlock label="Loading customers…" /></div>;
    if (feeds.customers.error && !data) return <div className="page"><ErrorBlock message={feeds.customers.error} onRetry={onRetry} /></div>;

    const customers = data?.customers || [];
    const active = customers.filter(c => c.orderCount30d > 0);
    const spend = active.reduce((sum, c) => sum + c.spend30d, 0);
    const pageRows = list.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));

    function pickSegment(seg) {
        const p = new URLSearchParams(params);
        if (seg === segment) p.delete('segment'); else p.set('segment', seg);
        setParams(p, { replace: true });
    }

    return (
        <div className="page">
            <div className="page-head">
                <h1>Customers</h1>
                <p>Who buys from you, how often, and who has gone quiet.</p>
            </div>

            <div className="grid grid--kpi4">
                <KpiCard icon="users" tone="primary" label="Customers" value={formatCompactNumber(customers.length)} hint="Saved in the shop app" />
                <KpiCard icon="cart" tone="info" label="Bought in last 30 days" value={formatCompactNumber(active.length)} hint="Customers with at least one bill" />
                <KpiCard icon="rupee" tone="violet" label="Spend (30 days)" value={formatCurrency(spend)} hint="From named customers" />
                <KpiCard icon="clock" tone="warning" label="Gone quiet" value={formatCompactNumber(data?.summary?.dormant)} hint="No bill in 30 days"
                    onClick={() => pickSegment('dormant')} />
            </div>

            <Panel
                flush
                className="panel--toolbar"
                title={segment ? `${segment[0].toUpperCase()}${segment.slice(1)} customers` : 'All customers'}
                subtitle="Sorted by spend in the last 30 days"
                action={(
                    <label className="search">
                        <Icon name="search" size={17} />
                        <input type="search" placeholder="Search name or phone…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search customers" />
                    </label>
                )}
            >
                <div style={{ padding: '0 22px' }}>
                    <Segments summary={data?.summary} active={segment} onPick={pickSegment} />
                </div>
                {list.length === 0 ? <EmptyBlock title="No customers match" subtitle="Try another segment or search." /> : (
                    <>
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr><th>Customer</th><th>Segment</th><th className="num">Orders (30d)</th><th className="num">Spend (30d)</th><th>Last bill</th></tr>
                                </thead>
                                <tbody>
                                    {pageRows.map(c => (
                                        <tr key={c.id}>
                                            <td><div className="cell-main"><strong>{c.name}</strong><span>{c.phone || 'No phone'}</span></div></td>
                                            <td><span className={`pill tone-${SEGMENT_TONE[c.computed_segment] || 'neutral'}`}>{c.computed_segment}</span></td>
                                            <td className="num">{c.orderCount30d}</td>
                                            <td className="num">{formatCurrency(c.spend30d)}</td>
                                            <td>{formatAgo(c.last_order_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="pager">
                            <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, list.length)} of {list.length}</span>
                            <div>
                                <button type="button" className="btn btn--ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}><Icon name="chevronLeft" size={16} /> Prev</button>
                                <button type="button" className="btn btn--ghost" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)}>Next <Icon name="chevronRight" size={16} /></button>
                            </div>
                        </div>
                    </>
                )}
            </Panel>
        </div>
    );
}
