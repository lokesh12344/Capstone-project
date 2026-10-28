import { useCallback, useEffect, useState } from 'react';
import { authedMutation, authedRequest } from '../lib/api';
import { normalizeNumber } from '../lib/format';

const EMPTY = { loading: true, data: null, error: '' };

// Every feed the dashboard shows, loaded once and shared by all three views.
// Daily sales (90 days) are fetched once; ranges and weekly/monthly views are
// derived from them client-side.
export function useDashboardData(token, onUnauthorized) {
    const [feeds, setFeeds] = useState({
        summary: EMPTY, sales: EMPTY, topProducts: EMPTY, customers: EMPTY, inventory: EMPTY,
    });
    const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const request = useCallback(async path => {
        try {
            return await authedRequest(path, token);
        } catch (err) {
            if (err.status === 401) onUnauthorized();
            throw err;
        }
    }, [token, onUnauthorized]);

    const loadFeed = useCallback(async (key, path, shape = x => x) => {
        setFeeds(f => ({ ...f, [key]: { ...f[key], loading: !f[key].data, error: '' } }));
        try {
            const data = shape(await request(path));
            setFeeds(f => ({ ...f, [key]: { loading: false, data, error: '' } }));
        } catch (err) {
            setFeeds(f => ({ ...f, [key]: { loading: false, data: f[key].data, error: err.message || 'Failed to load' } }));
        }
    }, [request]);

    const loadInventory = useCallback(
        () => loadFeed('inventory', '/analytics/inventory/intelligence?limit=100'),
        [loadFeed]
    );

    const loadAll = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            loadFeed('summary', '/analytics/dashboard'),
            loadFeed('sales', '/analytics/sales?period=daily', payload => (payload.data || [])
                .map(row => ({
                    period: row.period,
                    orderCount: normalizeNumber(row.order_count),
                    revenue: normalizeNumber(row.revenue),
                    cash: normalizeNumber(row.cash),
                    upi: normalizeNumber(row.upi),
                    credit: normalizeNumber(row.credit),
                }))
                .reverse()),
            loadFeed('topProducts', '/analytics/top-products?limit=10', payload => (payload.top_products || [])
                .map(p => ({ ...p, unitsSold: normalizeNumber(p.units_sold), revenue: normalizeNumber(p.revenue) }))),
            loadFeed('customers', '/analytics/customers', payload => ({
                summary: payload.summary || {},
                customers: (payload.customers || []).map(c => ({
                    ...c,
                    orderCount30d: normalizeNumber(c.order_count_30d),
                    spend30d: normalizeNumber(c.spend_30d),
                })),
            })),
            loadInventory(),
        ]);
        setLastUpdatedAt(Date.now());
        setRefreshing(false);
    }, [loadFeed, loadInventory]);

    useEffect(() => { loadAll(); }, [loadAll]);

    // Discounts are the dashboard's one write: owner-only on the server, and
    // the shop's phones pick the new price up on their next sync.
    const applyDiscount = useCallback(async (productId, body) => {
        await authedMutation(`/products/${productId}/discount`, token, 'POST', body);
        await loadInventory();
    }, [token, loadInventory]);

    const endDiscount = useCallback(async productId => {
        await authedMutation(`/products/${productId}/discount`, token, 'DELETE');
        await loadInventory();
    }, [token, loadInventory]);

    return { feeds, lastUpdatedAt, refreshing, refresh: loadAll, loadInventory, applyDiscount, endDiscount };
}
