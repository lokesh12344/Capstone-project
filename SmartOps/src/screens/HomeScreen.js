import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, RefreshControl, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getLowStockProducts, getNearExpiryBatches, getTodaySales } from '../database/actions';
import { Card, SectionHeader, Badge } from '../../components/UI';
import { colors, spacing, radius, font } from '../theme';

export default function HomeScreen({ navigation }) {
    const [stats, setStats] = useState({ sales: 0, revenue: 0, lowStock: 0, expiry: 0 });
    const [refreshing, setRefreshing] = useState(false);

    async function load() {
        const [lowStock, expiry, todaySales] = await Promise.all([
            getLowStockProducts(),
            getNearExpiryBatches(7),
            getTodaySales(),
        ]);
        setStats({
            lowStock: lowStock.length,
            expiry: expiry.length,
            sales: todaySales.count,
            revenue: todaySales.total,
        });
    }

    useFocusEffect(useCallback(() => { load(); }, []));

    async function onRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    const quickActions = [
        { label: 'New Order', icon: '🛒', screen: 'NewOrder', color: colors.teal },
        { label: 'Stock In', icon: '📦', screen: 'StockIn', color: colors.blue },
        { label: 'Add Product', icon: '＋', screen: 'ProductRegistration', color: colors.amber },
        { label: 'Inventory', icon: '📋', screen: 'Alerts', color: colors.textSecondary },
    ];

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

            <ScrollView
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={s.header}>
                    <View>
                        <Text style={s.greeting}>Good {getGreeting()}</Text>
                        <Text style={s.shopName}>BizOps Dashboard</Text>
                    </View>
                    <View style={s.syncDot} />
                </View>

                {/* Today stat strip */}
                <View style={s.statStrip}>
                    <View style={s.stat}>
                        <Text style={s.statValue}>₹{stats.revenue.toFixed(0)}</Text>
                        <Text style={s.statLabel}>Today's revenue</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.stat}>
                        <Text style={s.statValue}>{stats.sales}</Text>
                        <Text style={s.statLabel}>Orders today</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.stat}>
                        <Text style={[s.statValue, stats.lowStock > 0 && { color: colors.amber }]}>
                            {stats.lowStock}
                        </Text>
                        <Text style={s.statLabel}>Low stock</Text>
                    </View>
                </View>

                {/* Alerts banner */}
                {(stats.lowStock > 0 || stats.expiry > 0) && (
                    <TouchableOpacity style={s.alertBanner} onPress={() => navigation.navigate('Alerts')}>
                        <Text style={s.alertIcon}>⚠️</Text>
                        <Text style={s.alertText}>
                            {[
                                stats.lowStock > 0 && `${stats.lowStock} low stock`,
                                stats.expiry > 0 && `${stats.expiry} expiring in 7 days`,
                            ].filter(Boolean).join(' · ')}
                        </Text>
                        <Text style={s.alertArrow}>›</Text>
                    </TouchableOpacity>
                )}

                {/* Quick actions */}
                <SectionHeader title="Quick Actions" />
                <View style={s.actionsGrid}>
                    {quickActions.map(a => (
                        <TouchableOpacity
                            key={a.screen}
                            style={[s.actionCard, { borderColor: a.color + '40' }]}
                            onPress={() => navigation.navigate(a.screen)}
                            activeOpacity={0.75}
                        >
                            <Text style={s.actionIcon}>{a.icon}</Text>
                            <Text style={[s.actionLabel, { color: a.color }]}>{a.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>
        </View>
    );
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: 100 },

    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: spacing.xl,
        paddingTop: spacing.xl,
    },
    greeting: { color: colors.textMuted, fontSize: font.sm, marginBottom: 2 },
    shopName: { color: colors.textPrimary, fontSize: font.xxl, fontWeight: '700' },
    syncDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: colors.teal, marginTop: 8,
    },

    statStrip: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { color: colors.textPrimary, fontSize: font.xl, fontWeight: '700', marginBottom: 2 },
    statLabel: { color: colors.textMuted, fontSize: font.xs },
    statDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },

    alertBanner: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.amber + '15',
        borderWidth: 1, borderColor: colors.amber + '40',
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.xl, gap: spacing.sm,
    },
    alertIcon: { fontSize: 16 },
    alertText: { flex: 1, color: colors.amber, fontSize: font.sm, fontWeight: '500' },
    alertArrow: { color: colors.amber, fontSize: font.lg, fontWeight: '600' },

    actionsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
        marginBottom: spacing.xl,
    },
    actionCard: {
        width: '47%',
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        borderWidth: 1,
        padding: spacing.xl,
        alignItems: 'center', gap: spacing.sm,
    },
    actionIcon: { fontSize: 28 },
    actionLabel: { fontSize: font.sm, fontWeight: '700', letterSpacing: 0.3 },

    tipCard: { borderColor: colors.teal + '30' },
    tipTitle: { color: colors.teal, fontSize: font.sm, fontWeight: '700', marginBottom: 6 },
    tipText: { color: colors.textSecondary, fontSize: font.sm, lineHeight: 20 },
});