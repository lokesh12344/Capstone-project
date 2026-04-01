import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getLowStockProducts, getNearExpiryBatches } from '../database/actions';
import { Card, SectionHeader, Badge, EmptyState } from '../../components/UI';
import { colors, spacing, radius, font } from '../theme';

export default function AlertsScreen({ navigation }) {
    const [lowStock, setLowStock] = useState([]);
    const [nearExpiry, setNearExpiry] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState('expiry');  // 'expiry' | 'stock'

    async function load() {
        const [ls, ne] = await Promise.all([
            getLowStockProducts(),
            getNearExpiryBatches(30),
        ]);
        setLowStock(ls);
        setNearExpiry(ne);
    }

    useFocusEffect(useCallback(() => { load(); }, []));

    async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

    function expiryColor(days) {
        if (days < 0) return colors.red;
        if (days < 7) return colors.red;
        if (days < 30) return colors.amber;
        return colors.teal;
    }

    function stockColor(stock, reorder) {
        if (stock === 0) return colors.red;
        if (stock <= reorder / 2) return colors.red;
        return colors.amber;
    }

    return (
        <View style={s.root}>
            <ScrollView
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={s.back}>‹ Back</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>Alerts</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Summary pills */}
                <View style={s.summaryRow}>
                    <View style={[s.summaryPill, { borderColor: colors.amber + '50', backgroundColor: colors.amber + '10' }]}>
                        <Text style={[s.summaryNum, { color: colors.amber }]}>{lowStock.length}</Text>
                        <Text style={[s.summaryLabel, { color: colors.amber }]}>low stock</Text>
                    </View>
                    <View style={[s.summaryPill, { borderColor: colors.red + '50', backgroundColor: colors.red + '10' }]}>
                        <Text style={[s.summaryNum, { color: colors.red }]}>{nearExpiry.filter(b => b.daysUntilExpiry < 7).length}</Text>
                        <Text style={[s.summaryLabel, { color: colors.red }]}>expire soon</Text>
                    </View>
                    <View style={[s.summaryPill, { borderColor: colors.teal + '50', backgroundColor: colors.teal + '10' }]}>
                        <Text style={[s.summaryNum, { color: colors.teal }]}>{nearExpiry.length}</Text>
                        <Text style={[s.summaryLabel, { color: colors.teal }]}>in 30 days</Text>
                    </View>
                </View>

                {/* Tab switcher */}
                <View style={s.tabs}>
                    <TouchableOpacity
                        style={[s.tab, tab === 'expiry' && s.tabActive]}
                        onPress={() => setTab('expiry')}
                    >
                        <Text style={[s.tabText, tab === 'expiry' && s.tabTextActive]}>
                            Near expiry  {nearExpiry.length > 0 && `(${nearExpiry.length})`}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[s.tab, tab === 'stock' && s.tabActive]}
                        onPress={() => setTab('stock')}
                    >
                        <Text style={[s.tabText, tab === 'stock' && s.tabTextActive]}>
                            Low stock  {lowStock.length > 0 && `(${lowStock.length})`}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Near expiry list */}
                {tab === 'expiry' && (
                    nearExpiry.length === 0
                        ? <EmptyState icon="✓" title="No near-expiry items" subtitle="All batches are within safe date range" />
                        : nearExpiry
                            .sort((a, b) => a.expiryDate - b.expiryDate)
                            .map(batch => {
                                const days = batch.daysUntilExpiry;
                                const color = expiryColor(days);
                                return (
                                    <Card key={batch.id} style={[s.alertCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
                                        <View style={s.alertTop}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.alertName}>{batch.productId}</Text>
                                                <Text style={s.alertSub}>Batch {batch.batchNo} · {batch.quantity} units</Text>
                                            </View>
                                            <Badge
                                                label={days < 0 ? 'EXPIRED' : days === 0 ? 'TODAY' : `${days}d left`}
                                                color={color}
                                            />
                                        </View>
                                        <TouchableOpacity
                                            style={[s.actionHint, { borderColor: color + '40' }]}
                                            onPress={() => navigation.navigate('NewOrder')}
                                        >
                                            <Text style={[s.actionHintText, { color }]}>
                                                {days < 0 ? '→ Mark as wastage' : '→ Create discounted order to clear'}
                                            </Text>
                                        </TouchableOpacity>
                                    </Card>
                                );
                            })
                )}

                {/* Low stock list */}
                {tab === 'stock' && (
                    lowStock.length === 0
                        ? <EmptyState icon="✓" title="All products are stocked" subtitle="Nothing below reorder level" />
                        : lowStock.map(({ product, stock }) => {
                            const color = stockColor(stock, product.reorderLevel);
                            return (
                                <Card key={product.id} style={[s.alertCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
                                    <View style={s.alertTop}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.alertName}>{product.name}</Text>
                                            <Text style={s.alertSub}>{product.category} · reorder at {product.reorderLevel} {product.unit}</Text>
                                        </View>
                                        <Badge
                                            label={stock === 0 ? 'OUT' : `${stock} left`}
                                            color={color}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        style={[s.actionHint, { borderColor: color + '40' }]}
                                        onPress={() => navigation.navigate('StockIn')}
                                    >
                                        <Text style={[s.actionHintText, { color }]}>→ Record stock-in</Text>
                                    </TouchableOpacity>
                                </Card>
                            );
                        })
                )}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: 100 },

    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.xl, marginBottom: spacing.xl,
    },
    back: { color: colors.teal, fontSize: font.md, fontWeight: '600' },
    title: { color: colors.textPrimary, fontSize: font.lg, fontWeight: '700' },

    summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
    summaryPill: {
        flex: 1, borderRadius: radius.md, borderWidth: 1,
        padding: spacing.md, alignItems: 'center',
    },
    summaryNum: { fontSize: font.xxl, fontWeight: '700' },
    summaryLabel: { fontSize: font.xs, fontWeight: '600', marginTop: 2 },

    tabs: {
        flexDirection: 'row', backgroundColor: colors.bgCard,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        padding: 4, marginBottom: spacing.lg,
    },
    tab: {
        flex: 1, paddingVertical: spacing.sm,
        borderRadius: radius.sm - 2, alignItems: 'center',
    },
    tabActive: { backgroundColor: colors.bgInput },
    tabText: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
    tabTextActive: { color: colors.textPrimary },

    alertCard: {
        marginBottom: spacing.sm, gap: spacing.sm,
        borderRadius: radius.lg, borderWidth: 1,
        borderColor: colors.border, backgroundColor: colors.bgCard,
        padding: spacing.lg,
    },
    alertTop: { flexDirection: 'row', alignItems: 'flex-start' },
    alertName: { color: colors.textPrimary, fontSize: font.md, fontWeight: '600', marginBottom: 2 },
    alertSub: { color: colors.textMuted, fontSize: font.sm },

    actionHint: {
        borderRadius: radius.sm, borderWidth: 1,
        paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.sm,
        alignSelf: 'flex-start',
    },
    actionHintText: { fontSize: font.sm, fontWeight: '600' },
});