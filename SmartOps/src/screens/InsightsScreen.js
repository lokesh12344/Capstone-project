import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AnalyticsAPI } from '../services/api';
import { getProductsByIds, setProductDiscount } from '../database/actions';
import { useSession } from '../services/session';
import { Badge, EmptyState } from '../../components/UI';
import { AppIcon } from '../theme/icons';
import { colors, spacing, radius, font } from '../theme';

// The server's inventory analytics, turned into one-tap actions: discount slow
// or expiring stock, see what isn't selling, and restock what's about to run
// out. Analytics need a connection; applying a discount works offline (it's a
// local price change that syncs like any other edit).
const TABS = [
    { key: 'discounts', label: 'Discounts' },
    { key: 'expiry', label: 'Expiring' },
    { key: 'dead', label: 'Not selling' },
    { key: 'risk', label: 'Running out' },
];

const BAND_COLORS = { critical: colors.red, high: colors.amber, medium: colors.blue, low: colors.textMuted };

// Expiring stock: 20% off by default, never below what the batch cost.
function expirySalePrice(item) {
    const target = Math.round(item.selling_price * 0.8);
    return Math.max(target, Math.ceil(item.cost_price));
}

export default function InsightsScreen({ navigation }) {
    const [tab, setTab] = useState('discounts');
    const [data, setData] = useState({ discounts: null, expiry: null, dead: null, risk: null });
    const [onSale, setOnSale] = useState(new Set());   // product ids already discounted locally
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const owner = useSession().role !== 'staff';

    const load = useCallback(async () => {
        try {
            const [discounts, expiry, dead, risk] = await Promise.all([
                AnalyticsAPI.markdowns(), AnalyticsAPI.expiryRisk(),
                AnalyticsAPI.deadStock(), AnalyticsAPI.stockRisk(),
            ]);
            setData({ discounts, expiry, dead, risk });
            // The server learns about a discount only after the next sync, so
            // also check the phone's own copy before offering one again.
            const ids = [...(discounts.items || []), ...(expiry.items || [])].map(i => i.product_id);
            const local = await getProductsByIds(ids);
            setOnSale(new Set([...local.values()].filter(p => p.onSale).map(p => p.id)));
            setError('');
        } catch (e) {
            setError(e.status
                ? 'Could not load insights. Please try again.'
                : 'You are offline. Shop insights need a connection.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    async function onRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    function confirmDiscount({ productId, name, from, to, why }) {
        Alert.alert(
            `Put ${name} on sale?`,
            `₹${from} → ₹${to}. ${why}\n\nA 7-day sale goes back to ₹${from} on its own; otherwise end it from Inventory.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Until I end it', onPress: () => apply(productId, to, null) },
                { text: 'For 7 days', onPress: () => apply(productId, to, 7) },
            ]
        );
    }

    async function apply(productId, price, days) {
        try {
            await setProductDiscount(productId, price, { days });
            setOnSale(prev => new Set(prev).add(productId));
        } catch (e) {
            Alert.alert('Error', 'Could not apply the discount.');
            console.error(e);
        }
    }

    function DiscountButton({ productId, label, onPress }) {
        if (!owner) return null;
        if (onSale.has(productId)) {
            return <Badge label="ON SALE" color={colors.blue} />;
        }
        return (
            <TouchableOpacity style={s.applyBtn} onPress={onPress} activeOpacity={0.85}>
                <AppIcon name="sale" size="inline" color={colors.bg} />
                <Text style={s.applyBtnText}>{label}</Text>
            </TouchableOpacity>
        );
    }

    function renderDiscounts() {
        const { items = [], summary } = data.discounts || {};
        if (items.length === 0) {
            return <EmptyState icon={<AppIcon name="allClear" size={40} color={colors.teal} />} title="No discounts needed"
                subtitle="Nothing is slow enough to clear, or there's no room to discount and still make a profit." />;
        }
        return (<>
            {summary && (
                <Text style={s.summaryLine}>
                    ₹{Math.round(summary.blocked_cost_value)} of stock is stuck. Discounting could bring back ~₹{Math.round(summary.potential_recovery_value)}.
                </Text>
            )}
            {items.map(item => (
                <View key={item.product_id} style={s.card}>
                    <View style={s.cardTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.name}>{item.name}</Text>
                            <Text style={s.sub}>
                                {item.current_stock} {item.unit} in stock · {item.days_since_last_sale == null ? 'never sold' : `last sold ${item.days_since_last_sale}d ago`}
                            </Text>
                        </View>
                        <Badge label={item.status === 'dead_stock' ? 'not selling' : 'slow'} color={item.status === 'dead_stock' ? colors.red : colors.amber} />
                    </View>
                    <View style={s.priceRow}>
                        <Text style={s.oldPrice}>₹{item.selling_price}</Text>
                        <Text style={s.newPrice}>₹{item.suggested_price}</Text>
                        <Text style={s.priceNote}>{item.discount_pct}% off · still {item.margin_pct_after}% profit</Text>
                    </View>
                    <DiscountButton productId={item.product_id} label="Apply discount" onPress={() => confirmDiscount({
                        productId: item.product_id, name: item.name, from: item.selling_price, to: item.suggested_price,
                        why: `You still make ${item.margin_pct_after}% on each one.`,
                    })} />
                </View>
            ))}
        </>);
    }

    function renderExpiry() {
        const { items = [] } = data.expiry || {};
        if (items.length === 0) {
            return <EmptyState icon={<AppIcon name="allClear" size={40} color={colors.teal} />} title="Nothing expiring unsold"
                subtitle="No batch is expected to expire before it sells." />;
        }
        return items.map(item => {
            const to = expirySalePrice(item);
            const canDiscount = to < item.selling_price;
            return (
                <View key={item.batch_id} style={[s.card, { borderLeftColor: BAND_COLORS[item.risk_band] || colors.amber, borderLeftWidth: 3 }]}>
                    <View style={s.cardTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.name}>{item.name}</Text>
                            <Text style={s.sub}>
                                {item.days_until_expiry <= 0 ? 'Expired' : `Expires in ${item.days_until_expiry}d`} · ~{item.likely_unsold_units} of {item.remaining_units} may not sell
                            </Text>
                        </View>
                        <Badge label={item.risk_band} color={BAND_COLORS[item.risk_band] || colors.amber} />
                    </View>
                    <Text style={s.reason}>{item.recommended_action}</Text>
                    {canDiscount && item.days_until_expiry > 0 && (
                        <DiscountButton productId={item.product_id} label={`Sell at ₹${to}`} onPress={() => confirmDiscount({
                            productId: item.product_id, name: item.name, from: item.selling_price, to,
                            why: `Clearing it before expiry saves ~₹${Math.round(item.value_at_risk_cost)} of stock.`,
                        })} />
                    )}
                </View>
            );
        });
    }

    function renderDead() {
        const { items = [], summary } = data.dead || {};
        if (items.length === 0) {
            return <EmptyState icon={<AppIcon name="allClear" size={40} color={colors.teal} />} title="Everything is moving"
                subtitle="No products have stalled." />;
        }
        return (<>
            {summary && (
                <Text style={s.summaryLine}>
                    {summary.dead_stock_count} not selling, {summary.slow_mover_count} slow · ₹{Math.round(summary.blocked_cost_value)} tied up
                </Text>
            )}
            {items.map(item => (
                <TouchableOpacity key={item.product_id} style={s.card} activeOpacity={0.8} onPress={() => setTab('discounts')}>
                    <View style={s.cardTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.name}>{item.name}</Text>
                            <Text style={s.sub}>
                                {item.current_stock} in stock · {item.units_sold_30d} sold in 30d · {item.days_since_last_sale == null ? 'never sold' : `last sale ${item.days_since_last_sale}d ago`}
                            </Text>
                        </View>
                        <Badge label={item.status === 'dead_stock' ? 'not selling' : 'slow'} color={item.status === 'dead_stock' ? colors.red : colors.amber} />
                    </View>
                    <Text style={s.reason}>{item.recommended_action}</Text>
                </TouchableOpacity>
            ))}
        </>);
    }

    function renderRisk() {
        const { items = [], summary } = data.risk || {};
        if (items.length === 0) {
            return <EmptyState icon={<AppIcon name="allClear" size={40} color={colors.teal} />} title="No stockouts coming"
                subtitle="Nothing is projected to run out soon." />;
        }
        return (<>
            {summary && (
                <Text style={s.summaryLine}>
                    {summary.stockout_7d} may run out this week · ₹{Math.round(summary.revenue_at_risk)} of sales at risk
                </Text>
            )}
            {items.map(item => (
                <TouchableOpacity key={item.product_id} style={[s.card, { borderLeftColor: BAND_COLORS[item.risk_band] || colors.amber, borderLeftWidth: 3 }]}
                    activeOpacity={0.8} onPress={() => navigation.navigate('StockIn', { productId: item.product_id })}>
                    <View style={s.cardTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.name}>{item.name}</Text>
                            <Text style={s.sub}>
                                {item.current_stock} left · sells ~{item.daily_demand}/day
                                {item.days_of_cover != null ? ` · ~${item.days_of_cover}d left` : ''}
                            </Text>
                        </View>
                        <Badge label={item.risk_band} color={BAND_COLORS[item.risk_band] || colors.amber} />
                    </View>
                    <Text style={s.action}>Tap to record stock-in ›</Text>
                </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.linkBtn} onPress={() => navigation.navigate('Reorder')}>
                <Text style={s.linkBtnText}>See reorder quantities ›</Text>
            </TouchableOpacity>
        </>);
    }

    const counts = {
        discounts: data.discounts?.items?.length,
        expiry: data.expiry?.items?.length,
        dead: data.dead?.items?.length,
        risk: data.risk?.items?.length,
    };

    return (
        <View style={s.root}>
            <ScrollView
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
                showsVerticalScrollIndicator={false}
            >
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={s.back}>‹ Back</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>Shop Insights</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
                    {TABS.map(t => (
                        <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabOn]} onPress={() => setTab(t.key)}>
                            <Text style={[s.tabText, tab === t.key && s.tabTextOn]}>
                                {t.label}{counts[t.key] ? ` (${counts[t.key]})` : ''}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {!owner && tab !== 'risk' && (
                    <Text style={s.staffNote}>Only the owner can change prices.</Text>
                )}

                {loading ? (
                    <View style={s.loadingState}>
                        <ActivityIndicator color={colors.teal} />
                        <Text style={s.loadingText}>Analysing sales & stock…</Text>
                    </View>
                ) : error ? (
                    <EmptyState icon={<AppIcon name="offline" size={40} color={colors.textMuted} />} title="Can't load insights" subtitle={error} />
                ) : tab === 'discounts' ? renderDiscounts()
                    : tab === 'expiry' ? renderExpiry()
                        : tab === 'dead' ? renderDead()
                            : renderRisk()}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: 100 },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: spacing.xl, marginBottom: spacing.lg,
    },
    back: { color: colors.teal, fontSize: font.md, fontWeight: '600' },
    title: { color: colors.textPrimary, fontSize: font.lg, fontWeight: '700' },

    tabs: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.lg },
    tab: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full,
        borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard,
    },
    tabOn: { borderColor: colors.teal, backgroundColor: colors.tealFaint },
    tabText: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
    tabTextOn: { color: colors.teal },

    staffNote: { color: colors.amber, fontSize: font.xs, marginBottom: spacing.md },
    summaryLine: { color: colors.textSecondary, fontSize: font.sm, marginBottom: spacing.md },

    loadingState: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
    loadingText: { color: colors.textMuted, fontSize: font.sm },

    card: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        padding: spacing.lg, marginBottom: spacing.sm, gap: spacing.sm,
    },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    name: { color: colors.textPrimary, fontSize: font.md, fontWeight: '700', marginBottom: 2 },
    sub: { color: colors.textMuted, fontSize: font.xs },
    reason: { color: colors.textSecondary, fontSize: font.sm },
    action: { color: colors.teal, fontSize: font.xs, fontWeight: '600' },

    priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
    oldPrice: { color: colors.textMuted, fontSize: font.md, textDecorationLine: 'line-through' },
    newPrice: { color: colors.teal, fontSize: font.xl, fontWeight: '800' },
    priceNote: { color: colors.textSecondary, fontSize: font.xs },

    applyBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: colors.teal, borderRadius: radius.md, paddingVertical: 10,
    },
    applyBtnText: { color: colors.bg, fontSize: font.sm, fontWeight: '800' },

    linkBtn: { alignItems: 'center', paddingVertical: spacing.md },
    linkBtnText: { color: colors.teal, fontSize: font.sm, fontWeight: '700' },
});
