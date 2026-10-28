import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { syncWithServer, refreshPendingStatus } from '../sync/syncEngine';
import { useSyncStatus, formatSyncedAgo } from '../hooks/useSyncStatus';
import { AppIcon } from '../theme/icons';
import { colors, spacing, radius, font } from '../theme';
import { useSession } from '../services/session';

export default function ProfileScreen({ navigation, name, onLogout }) {
    const [loggingOut, setLoggingOut] = useState(false);
    const { online, syncing, lastSyncedAt, lastError, hasPending } = useSyncStatus();
    const { role, staff } = useSession();
    const owner = role !== 'staff';

    async function handleSyncNow() {
        if (!online) {
            return Alert.alert('You are offline', 'Your changes are saved on this phone and will sync when the internet is back.');
        }
        const res = await syncWithServer();
        if (res.ok) Alert.alert('Synced', 'Everything on this phone is backed up.');
        else if (!res.busy) Alert.alert('Sync failed', `${res.error || 'Could not reach the server.'}\n\nYour changes are still saved on this phone. Try again in a bit.`);
    }

    // Try one last push first; only warn when something is genuinely stuck on
    // the phone (offline, or the server rejected it).
    async function confirmLogout() {
        setLoggingOut(true);
        await syncWithServer();
        const pending = await refreshPendingStatus();
        setLoggingOut(false);
        if (pending) {
            return Alert.alert(
                'Changes not backed up',
                'Some sales or edits on this phone have not reached the server yet. If you log out now and someone else logs in here, they may be lost.\n\nConnect to the internet and tap Sync now first.',
                [
                    { text: 'Stay logged in', style: 'cancel' },
                    { text: 'Log out anyway', style: 'destructive', onPress: onLogout },
                ]
            );
        }
        Alert.alert('Log out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log out', style: 'destructive', onPress: onLogout },
        ]);
    }

    const syncSubtitle = syncing ? 'Syncing…'
        : hasPending ? (online ? 'Changes waiting to upload' : 'Offline · changes saved on phone')
            : lastError ? 'Last sync failed'
                : `Last synced ${formatSyncedAgo(lastSyncedAt)}`;

    return (
        <ScrollView style={s.root} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={s.back}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={s.title}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={s.identityCard}>
                <View style={s.avatar}>
                    <Text style={s.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={s.shopName}>{name}</Text>
                <View style={s.statusRow}>
                    <View style={[s.statusDot, { backgroundColor: online ? colors.teal : colors.textMuted }]} />
                    <Text style={s.statusText}>{online ? 'Online' : 'Offline · saved on device'}</Text>
                </View>
                {!owner && <Text style={s.staffTag}>Signed in as staff · {staff?.name}</Text>}
            </View>

            {owner && (
                <TouchableOpacity style={s.row} onPress={() => navigation.navigate('ShopSettings')} activeOpacity={0.7}>
                    <AppIcon name="shop" size="chip" />
                    <Text style={s.rowLabel}>Shop details & UPI</Text>
                    <AppIcon name="chevron" />
                </TouchableOpacity>
            )}
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Customers')} activeOpacity={0.7}>
                <AppIcon name="customers" size="chip" />
                <Text style={s.rowLabel}>Customers & phone numbers</Text>
                <AppIcon name="chevron" />
            </TouchableOpacity>
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Suppliers')} activeOpacity={0.7}>
                <AppIcon name="suppliers" size="chip" />
                <Text style={s.rowLabel}>Suppliers & purchase orders</Text>
                <AppIcon name="chevron" />
            </TouchableOpacity>
            {owner && (
                <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Staff')} activeOpacity={0.7}>
                    <AppIcon name="staff" size="chip" />
                    <Text style={s.rowLabel}>Staff accounts</Text>
                    <AppIcon name="chevron" />
                </TouchableOpacity>
            )}

            <TouchableOpacity style={s.row} onPress={handleSyncNow} disabled={syncing} activeOpacity={0.7}>
                <AppIcon name="sync" size="chip" />
                <View style={{ flex: 1 }}>
                    <Text style={[s.rowLabel, { flex: 0 }]}>Sync now</Text>
                    <Text style={[s.rowSub, (hasPending || lastError) && { color: colors.amber }]}>{syncSubtitle}</Text>
                </View>
                {syncing && <ActivityIndicator size="small" color={colors.teal} />}
            </TouchableOpacity>

            <TouchableOpacity style={s.row} onPress={confirmLogout} disabled={loggingOut} activeOpacity={0.7}>
                <AppIcon name="logout" size="chip" color={colors.red} />
                <Text style={[s.rowLabel, { color: colors.red }]}>{loggingOut ? 'Saving your data…' : 'Log out'}</Text>
                {loggingOut && <ActivityIndicator size="small" color={colors.red} />}
            </TouchableOpacity>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: spacing.xl, marginBottom: spacing.xl,
    },
    back: { color: colors.teal, fontSize: font.md, fontWeight: '600' },
    title: { color: colors.textPrimary, fontSize: font.lg, fontWeight: '700' },

    identityCard: {
        alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderLight,
        padding: spacing.xxl, marginBottom: spacing.xl,
    },
    avatar: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: colors.bgInput,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: colors.borderLight,
        marginBottom: spacing.md,
    },
    avatarInitial: { color: colors.textPrimary, fontSize: font.xxl, fontWeight: '700' },
    shopName: { color: colors.white, fontSize: font.xl, fontWeight: '800', textAlign: 'center' },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
    rowSub: { color: colors.textMuted, fontSize: font.xs, marginTop: 2 },
    staffTag: { color: colors.amber, fontSize: font.sm, fontWeight: '700', marginTop: spacing.sm },

    row: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        padding: spacing.lg, marginBottom: spacing.sm,
    },
    rowLabel: { flex: 1, color: colors.textPrimary, fontSize: font.md, fontWeight: '600' },
});
