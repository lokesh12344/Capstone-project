import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTodaySales, getRecentOrders } from '../database/actions';
import { useAppBadges } from '../hooks/useAppBadges';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { AppIcon } from '../theme/icons';
import { colors, spacing, radius, font } from '../theme';

// A glance screen only: greeting, today's number, one consolidated alert row,
// recent activity. Everything else now lives in a tab or a sub-screen of one —
// see the Inventory/Khata/Records tabs and their header actions.
export default function HomeScreen({ navigation, name }) {
    const { stockAlertCount, khataDueTotal } = useAppBadges();
    const [todaySales, setTodaySales] = useState({ count: 0, total: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [amountHidden, setAmountHidden] = useState(false);
    const { online, syncing, hasPending } = useSyncStatus();

    async function load() {
        const [sales, recent] = await Promise.all([
            getTodaySales(),
            getRecentOrders(4),
        ]);
        setTodaySales(sales);
        setRecentOrders(recent);
    }

    useFocusEffect(useCallback(() => { load(); }, []));

    async function onRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    function paymentColor(mode) {
        if (mode === 'upi') return colors.blue;
        if (mode === 'credit') return colors.amber;
        return colors.teal;
    }

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
                    <View style={s.headerLeft}>
                        <Text style={s.greeting}>Good {getGreeting()} 👋</Text>
                        <Text style={s.shopName}>{name}</Text>
                    </View>
                    <TouchableOpacity
                        style={[s.profileBtn, { marginRight: 10 }]}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('VoiceEntry')}
                        accessibilityLabel="Voice entry"
                    >
                        <AppIcon name="mic" size="chip" color={colors.teal} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={s.profileBtn}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <Text style={s.profileInitial}>{name.charAt(0).toUpperCase()}</Text>
                    </TouchableOpacity>
                </View>

                {/* Only shown when data isn't fully on the server yet — offline,
                    or writes still queued. Tapping opens Profile's Sync now. */}
                {(!online || hasPending) && (
                    <TouchableOpacity style={s.syncPill} onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
                        <AppIcon name={online ? 'pending' : 'offline'} size="inline" color={colors.amber} />
                        <Text style={s.syncPillText}>
                            {!online ? 'Offline · sales are saved on this phone'
                                : syncing ? 'Uploading changes…' : 'Changes waiting to upload'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Today's number — the whole card opens Day Summary; the eye
                    toggle is a nested touchable and swallows its own taps. */}
                <TouchableOpacity
                    style={s.revenueCard}
                    onPress={() => navigation.navigate('DaySummary')}
                    activeOpacity={0.85}
                >
                    <View style={s.revenueHeaderRow}>
                        <Text style={s.revenueLabel}>TODAY&apos;S REVENUE</Text>
                        <TouchableOpacity
                            onPress={() => setAmountHidden(h => !h)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <AppIcon name={amountHidden ? 'hide' : 'show'} size="inline" color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                    <Text style={s.revenueValue}>{amountHidden ? '₹••••' : `₹${todaySales.total.toFixed(0)}`}</Text>
                    <View style={s.revenueFooterRow}>
                        <Text style={s.revenueSub}>{todaySales.count} orders today</Text>
                        <View style={s.revenueFooterHint}>
                            <Text style={s.daySummaryLink}>Day summary</Text>
                            <AppIcon name="chevron" size="inline" color={colors.teal} />
                        </View>
                    </View>
                </TouchableOpacity>

                {/* One consolidated alert row — each number lives on the tab it
                    belongs to; this is a link into that tab, not a restated count. */}
                {(stockAlertCount > 0 || khataDueTotal > 0) && (
                    <View style={s.alertRow}>
                        {stockAlertCount > 0 && (
                            <TouchableOpacity
                                style={s.alertChip}
                                onPress={() => navigation.navigate('Inventory')}
                                activeOpacity={0.8}
                            >
                                <AppIcon name="alerts" size="chip" color={colors.amber} />
                                <Text style={s.alertChipText}>{stockAlertCount} stock alert{stockAlertCount === 1 ? '' : 's'}</Text>
                                <AppIcon name="chevron" size="inline" color={colors.amber} />
                            </TouchableOpacity>
                        )}
                        {khataDueTotal > 0 && (
                            <TouchableOpacity
                                style={s.alertChip}
                                onPress={() => navigation.navigate('Khata')}
                                activeOpacity={0.8}
                            >
                                <AppIcon name="khata" size="chip" color={colors.amber} />
                                <Text style={s.alertChipText}>₹{khataDueTotal.toFixed(0)} due</Text>
                                <AppIcon name="chevron" size="inline" color={colors.amber} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Recent activity */}
                <View style={s.sectionHeaderRow}>
                    <Text style={s.sectionTitle}>RECENT ACTIVITY</Text>
                    {recentOrders.length > 0 && (
                        <TouchableOpacity onPress={() => navigation.navigate('OrderHistory')}>
                            <Text style={s.sectionAction}>View all ›</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {recentOrders.length === 0 ? (
                    <View style={s.emptyActivity}>
                        <AppIcon name="allClear" size={28} color={colors.textMuted} />
                        <Text style={s.emptyActivityText}>No orders yet — tap + to make your first sale</Text>
                    </View>
                ) : (
                    recentOrders.map(({ order, itemCount, customerName }) => {
                        const isCredit = order.paymentMode === 'credit';
                        return (
                            <TouchableOpacity
                                key={order.id}
                                style={s.activityRow}
                                onPress={() => navigation.navigate('OrderHistory')}
                                activeOpacity={0.75}
                            >
                                <View style={[s.activityStripe, { backgroundColor: paymentColor(order.paymentMode) }]} />
                                <View style={s.activityMain}>
                                    <Text style={s.activityPrimary} numberOfLines={1}>
                                        {isCredit ? (customerName || 'Khata sale') : `${itemCount} item${itemCount === 1 ? '' : 's'}`}
                                    </Text>
                                    <Text style={s.activityTime}>
                                        {order.paymentMode.toUpperCase()} · {formatDateTime(order.saleAt)}
                                    </Text>
                                </View>
                                <Text style={s.activityAmount}>₹{order.totalAmount.toFixed(0)}</Text>
                            </TouchableOpacity>
                        );
                    })
                )}
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

// The list is sorted correctly (newest sale_at first) even when it spans
// multiple days — but a bare time-of-day (e.g. "5:32 PM") looks unsorted
// once entries cross a day boundary. Naming the day removes the ambiguity.
function formatDateTime(ms) {
    const d = new Date(ms);
    const now = new Date();
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (d.toDateString() === now.toDateString()) return `Today, ${time}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;

    return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: 40 },
    syncPill: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start',
        backgroundColor: colors.amberFaint, borderRadius: radius.full,
        paddingHorizontal: spacing.md, paddingVertical: 6, marginBottom: spacing.md,
    },
    syncPillText: { color: colors.amber, fontSize: font.xs, fontWeight: '600' },

    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: spacing.xl,
        paddingTop: spacing.xl,
    },
    greeting: { color: colors.textSecondary, fontSize: font.sm, marginBottom: 4, letterSpacing: 0.5 },
    headerLeft: { flex: 1, marginRight: spacing.md },
    shopName: { color: colors.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    profileBtn: {
        width: 44, height: 44, borderRadius: 22,
        flexShrink: 0,
        backgroundColor: colors.bgInput,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: colors.borderLight,
    },
    profileInitial: { color: colors.textPrimary, fontSize: font.lg, fontWeight: '700' },

    revenueCard: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl,
        padding: spacing.xl,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        shadowColor: colors.teal,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 5,
    },
    revenueHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    revenueLabel: { color: colors.textSecondary, fontSize: font.xs, fontWeight: '700', letterSpacing: 1.5 },
    revenueValue: { color: colors.white, fontSize: 44, fontWeight: '800', letterSpacing: -1 },
    revenueFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
    revenueSub: { color: colors.textMuted, fontSize: font.sm },
    revenueFooterHint: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    daySummaryLink: { color: colors.teal, fontSize: font.xs, fontWeight: '700' },

    alertRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    alertChip: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        backgroundColor: colors.amber + '10',
        borderWidth: 1, borderColor: colors.amber + '40',
        borderRadius: radius.lg,
        paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    },
    alertChipText: { flex: 1, color: colors.amber, fontSize: font.xs, fontWeight: '700' },

    sectionHeaderRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: spacing.md, marginTop: spacing.sm,
    },
    sectionTitle: { color: colors.textSecondary, fontSize: font.sm, fontWeight: '600', letterSpacing: 0.8 },
    sectionAction: { color: colors.teal, fontSize: font.sm, fontWeight: '600' },

    emptyActivity: {
        alignItems: 'center', gap: spacing.sm,
        paddingVertical: spacing.xxl,
    },
    emptyActivityText: { color: colors.textMuted, fontSize: font.sm, textAlign: 'center' },

    activityRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        marginBottom: spacing.sm, overflow: 'hidden',
    },
    activityStripe: { width: 4, alignSelf: 'stretch' },
    activityMain: { flex: 1, padding: spacing.md },
    activityPrimary: { color: colors.textPrimary, fontSize: font.sm, fontWeight: '700', marginBottom: 2 },
    activityTime: { color: colors.textMuted, fontSize: font.xs },
    activityAmount: { color: colors.textPrimary, fontSize: font.md, fontWeight: '700', paddingRight: spacing.md },
});
