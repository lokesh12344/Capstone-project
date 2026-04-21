import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authedRequest } from '../lib/api';
import {
    formatCompactNumber,
    formatCurrency,
    formatDate,
    formatDateTime,
    normalizeNumber,
} from '../lib/format';
import Shell from '../components/Shell';
import Panel from '../components/Panel';
import KpiCard from '../components/KpiCard';
import SegmentedControl from '../components/SegmentedControl';
import SalesChart from '../components/SalesChart';
import PaymentDonut from '../components/PaymentDonut';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../components/StatusBlock';

const PERIOD_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
];

export default function DashboardPage({ auth }) {
    const { token, business } = auth.session;
    const [period, setPeriod] = useState('daily');
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const [state, setState] = useState({
        dashboard: { loading: true, data: null, error: '' },
        sales: { loading: true, data: [], error: '' },
        topProducts: { loading: true, data: [], error: '' },
        customers: { loading: true, data: null, error: '' },
    });

    const withUnauthorizedGuard = useCallback(async (task) => {
        try {
            return await task();
        } catch (err) {
            if (err.status === 401) {
                auth.logout();
            }
            throw err;
        }
    }, [auth]);

    const loadDashboard = useCallback(async () => {
        setState(current => ({
            ...current,
            dashboard: { ...current.dashboard, loading: true, error: '' },
        }));

        try {
            const data = await withUnauthorizedGuard(() => authedRequest('/analytics/dashboard', token));
            setState(current => ({
                ...current,
                dashboard: { loading: false, data, error: '' },
            }));
        } catch (err) {
            setState(current => ({
                ...current,
                dashboard: { loading: false, data: current.dashboard.data, error: err.message || 'Failed to load overview' },
            }));
        }
    }, [token, withUnauthorizedGuard]);

    const loadSales = useCallback(async (nextPeriod) => {
        setState(current => ({
            ...current,
            sales: { ...current.sales, loading: true, error: '' },
        }));

        try {
            const payload = await withUnauthorizedGuard(() => authedRequest(`/analytics/sales?period=${nextPeriod}`, token));
            const data = (payload.data || [])
                .map(item => ({
                    period: item.period,
                    orderCount: normalizeNumber(item.order_count),
                    revenue: normalizeNumber(item.revenue),
                    cash: normalizeNumber(item.cash),
                    upi: normalizeNumber(item.upi),
                    credit: normalizeNumber(item.credit),
                }))
                .reverse();

            setState(current => ({
                ...current,
                sales: { loading: false, data, error: '' },
            }));
            setLastUpdatedAt(Date.now());
        } catch (err) {
            setState(current => ({
                ...current,
                sales: { loading: false, data: current.sales.data, error: err.message || 'Failed to load sales trends' },
            }));
        }
    }, [token, withUnauthorizedGuard]);

    const loadTopProducts = useCallback(async () => {
        setState(current => ({
            ...current,
            topProducts: { ...current.topProducts, loading: true, error: '' },
        }));

        try {
            const payload = await withUnauthorizedGuard(() => authedRequest('/analytics/top-products?limit=8', token));
            const data = (payload.top_products || []).map(item => ({
                ...item,
                unitsSold: normalizeNumber(item.units_sold),
                revenue: normalizeNumber(item.revenue),
            }));

            setState(current => ({
                ...current,
                topProducts: { loading: false, data, error: '' },
            }));
        } catch (err) {
            setState(current => ({
                ...current,
                topProducts: { loading: false, data: current.topProducts.data, error: err.message || 'Failed to load top products' },
            }));
        }
    }, [token, withUnauthorizedGuard]);

    const loadCustomers = useCallback(async () => {
        setState(current => ({
            ...current,
            customers: { ...current.customers, loading: true, error: '' },
        }));

        try {
            const payload = await withUnauthorizedGuard(() => authedRequest('/analytics/customers', token));
            const customers = (payload.customers || []).map(customer => ({
                ...customer,
                orderCount30d: normalizeNumber(customer.order_count_30d),
                spend30d: normalizeNumber(customer.spend_30d),
            }));

            setState(current => ({
                ...current,
                customers: {
                    loading: false,
                    data: {
                        summary: payload.summary || {},
                        customers,
                    },
                    error: '',
                },
            }));
        } catch (err) {
            setState(current => ({
                ...current,
                customers: {
                    loading: false,
                    data: current.customers.data,
                    error: err.message || 'Failed to load customer insights',
                },
            }));
        }
    }, [token, withUnauthorizedGuard]);

    const loadAll = useCallback(async () => {
        await Promise.all([
            loadDashboard(),
            loadSales(period),
            loadTopProducts(),
            loadCustomers(),
        ]);
        setLastUpdatedAt(Date.now());
    }, [loadCustomers, loadDashboard, loadSales, loadTopProducts, period]);

    useEffect(() => {
        loadDashboard();
        loadTopProducts();
        loadCustomers();
    }, [loadCustomers, loadDashboard, loadTopProducts]);

    useEffect(() => {
        loadSales(period);
    }, [loadSales, period]);

    const topCustomerRows = useMemo(() => {
        const customers = state.customers.data?.customers || [];
        return customers
            .slice()
            .sort((a, b) => b.spend30d - a.spend30d)
            .slice(0, 6);
    }, [state.customers.data]);

    const topProductPreview = state.dashboard.data?.top_products_week?.[0];
    const chartData = useMemo(() => getChartDataForPeriod(state.sales.data, period), [period, state.sales.data]);
    const paymentTotals = useMemo(() => {
        return chartData.reduce((acc, item) => ({
            cash: acc.cash + item.cash,
            upi: acc.upi + item.upi,
            credit: acc.credit + item.credit,
        }), { cash: 0, upi: 0, credit: 0 });
    }, [chartData]);

    return (
        <Shell
            title={`${business.name} Dashboard`}
            subtitle={lastUpdatedAt ? `Last updated ${formatDateTime(lastUpdatedAt)}` : 'Connecting to analytics feeds'}
            actions={(
                <>
                    <button className="button button--ghost" type="button" onClick={loadAll}>Refresh</button>
                    <button className="button button--secondary" type="button" onClick={auth.logout}>Log out</button>
                </>
            )}
        >
            <div className="dashboard-grid">
                <div className="kpi-grid">
                    <KpiCard
                        label="Today's Revenue"
                        value={formatCurrency(state.dashboard.data?.today?.revenue)}
                        hint="Revenue booked today"
                    />
                    <KpiCard
                        label="Today's Orders"
                        value={formatCompactNumber(state.dashboard.data?.today?.orders)}
                        hint="Orders completed today"
                        tone="blue"
                    />
                    <KpiCard
                        label="Low Stock Alerts"
                        value={formatCompactNumber(state.dashboard.data?.alerts?.low_stock)}
                        hint="Products at or below reorder level"
                        tone="amber"
                    />
                    <KpiCard
                        label="Near Expiry"
                        value={formatCompactNumber(state.dashboard.data?.alerts?.near_expiry)}
                        hint="Batches requiring date attention"
                        tone="rose"
                    />
                    <KpiCard
                        label="Top Product This Week"
                        value={topProductPreview?.name || 'No sales yet'}
                        hint={topProductPreview ? `${formatCompactNumber(topProductPreview.units)} units in the last 7 days` : 'Preview from dashboard summary'}
                        tone="slate"
                    />
                </div>

                <div className="dashboard-main">
                    <Panel
                        title="Sales Performance"
                        subtitle={getSalesSubtitle(period)}
                        action={<SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />}
                    >
                        {state.sales.loading ? <LoadingBlock label="Loading sales trend..." /> : null}
                        {!state.sales.loading && state.sales.error ? <ErrorBlock message={state.sales.error} onRetry={() => loadSales(period)} /> : null}
                        {!state.sales.loading && !state.sales.error && chartData.length === 0 ? (
                            <EmptyBlock title="No sales data yet" subtitle="Complete a few orders to populate trend charts." />
                        ) : null}
                        {!state.sales.loading && !state.sales.error && chartData.length > 0 ? (
                            <>
                                <SalesChart data={chartData} />
                                <div className="sales-metrics">
                                    <Metric label="Visible Revenue" value={formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))} />
                                    <Metric label="Visible Orders" value={formatCompactNumber(chartData.reduce((sum, item) => sum + item.orderCount, 0))} />
                                    <Metric label="Average Ticket" value={formatCurrency(getAverageTicket(chartData))} />
                                </div>
                            </>
                        ) : null}
                    </Panel>

                    <Panel title="Payment Insights" subtitle="How customers are paying across the selected sales period">
                        {state.sales.loading ? <LoadingBlock label="Loading payment mix..." /> : null}
                        {!state.sales.loading && state.sales.error ? <ErrorBlock message={state.sales.error} onRetry={() => loadSales(period)} /> : null}
                        {!state.sales.loading && !state.sales.error && totalPayments(paymentTotals) === 0 ? (
                            <EmptyBlock title="No payment data yet" subtitle="Payment mix will appear after your first completed orders." />
                        ) : null}
                        {!state.sales.loading && !state.sales.error && totalPayments(paymentTotals) > 0 ? (
                            <PaymentDonut totals={paymentTotals} />
                        ) : null}
                    </Panel>

                    <div className="dashboard-split">
                        <Panel title="Top Products" subtitle="Best-selling products in the last 30 days">
                            {state.topProducts.loading ? <LoadingBlock label="Loading product rankings..." /> : null}
                            {!state.topProducts.loading && state.topProducts.error ? <ErrorBlock message={state.topProducts.error} onRetry={loadTopProducts} /> : null}
                            {!state.topProducts.loading && !state.topProducts.error && state.topProducts.data.length === 0 ? (
                                <EmptyBlock title="No ranked products yet" subtitle="Sales activity will surface top products automatically." />
                            ) : null}
                            {!state.topProducts.loading && !state.topProducts.error && state.topProducts.data.length > 0 ? (
                                <div className="rank-list">
                                    {state.topProducts.data.map((product, index) => (
                                        <div key={product.id} className="rank-list__row">
                                            <div className="rank-list__title">
                                                <span className="rank-list__badge">{String(index + 1).padStart(2, '0')}</span>
                                                <div>
                                                    <strong>{product.name}</strong>
                                                    <span>{product.category} · {product.unit}</span>
                                                </div>
                                            </div>
                                            <div className="rank-list__stats">
                                                <strong>{formatCompactNumber(product.unitsSold)} units</strong>
                                                <span>{formatCurrency(product.revenue)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </Panel>

                        <Panel title="Customer Intelligence" subtitle="High-value customers and segment mix">
                            {state.customers.loading ? <LoadingBlock label="Loading customer insights..." /> : null}
                            {!state.customers.loading && state.customers.error ? <ErrorBlock message={state.customers.error} onRetry={loadCustomers} /> : null}
                            {!state.customers.loading && !state.customers.error && !state.customers.data?.customers?.length ? (
                                <EmptyBlock title="No customer analytics yet" subtitle="Customer segment insights appear once customer-linked orders exist." />
                            ) : null}
                            {!state.customers.loading && !state.customers.error && state.customers.data?.customers?.length ? (
                                <>
                                    <div className="segment-grid">
                                        {['regular', 'occasional', 'dormant', 'new'].map(segment => (
                                            <div key={segment} className="segment-pill">
                                                <span>{segment}</span>
                                                <strong>{state.customers.data.summary?.[segment] || 0}</strong>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="table-wrap">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Customer</th>
                                                    <th>Orders (30d)</th>
                                                    <th>Spend (30d)</th>
                                                    <th>Last Order</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {topCustomerRows.map(customer => (
                                                    <tr key={customer.id}>
                                                        <td>
                                                            <div className="customer-cell">
                                                                <strong>{customer.name}</strong>
                                                                <span>{customer.phone}</span>
                                                            </div>
                                                        </td>
                                                        <td>{customer.orderCount30d}</td>
                                                        <td>{formatCurrency(customer.spend30d)}</td>
                                                        <td>{formatDate(customer.last_order_at)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : null}
                        </Panel>
                    </div>
                </div>
            </div>
        </Shell>
    );
}

function Metric({ label, value }) {
    return (
        <div className="metric">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function getAverageTicket(data) {
    const revenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const orders = data.reduce((sum, item) => sum + item.orderCount, 0);
    return orders > 0 ? revenue / orders : 0;
}

function getChartDataForPeriod(data, period) {
    if (period === 'daily') return data.slice(-14);
    if (period === 'weekly') return data.slice(-12);
    return data;
}

function getSalesSubtitle(period) {
    if (period === 'daily') return 'Track revenue and order flow over the last 14 days';
    if (period === 'weekly') return 'Track revenue and order flow over recent weeks';
    return 'Track revenue and order flow over recent months';
}

function totalPayments(totals) {
    return totals.cash + totals.upi + totals.credit;
}
