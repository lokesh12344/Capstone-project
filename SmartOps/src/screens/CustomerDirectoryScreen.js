import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    StyleSheet, RefreshControl, Modal, KeyboardAvoidingView, Platform, Keyboard, Alert, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    getAllCustomersDirectory, createCustomer, updateCustomerDetails,
    getCustomerBalance, getCustomerOrderSummary,
    findPossibleDuplicates, setCustomerArchived,
} from '../database/actions';
import { openWhatsApp } from '../services/share';
import { PrimaryButton, GhostButton, EmptyState } from '../../components/UI';
import { AppIcon } from '../theme/icons';
import { colors, spacing, radius, font } from '../theme';

export default function CustomerDirectoryScreen({ navigation, route }) {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [showArchived, setShowArchived] = useState(false);

    const [editing, setEditing] = useState(null);   // existing customer, or {} for "new"
    const [form, setForm] = useState({ name: '', phone: '', address: '' });
    const [profile, setProfile] = useState(null);   // { balance, orderCount, totalSpend }
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        const rows = await getAllCustomersDirectory({ includeArchived: showArchived });
        setCustomers(rows);
        return rows;
    }, [showArchived]);

    // Other screens (Khata's "Edit details") can open one customer directly.
    const openId = route?.params?.openId;
    useFocusEffect(useCallback(() => {
        load().then(rows => {
            if (!openId) return;
            const match = rows.find(c => c.id === openId);
            if (match) openCustomer(match);
            navigation.setParams({ openId: undefined });
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, openId]));

    async function onRefresh() {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }

    const filtered = customers.filter(c => {
        if (showArchived !== !!c.archivedAt) return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
            c.name?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.address?.toLowerCase().includes(q)
        );
    });

    async function openCustomer(customer) {
        setForm({ name: customer.name || '', phone: customer.phone || '', address: customer.address || '' });
        setProfile(null);
        setEditing(customer);
        const [balance, summary] = await Promise.all([
            getCustomerBalance(customer.id),
            getCustomerOrderSummary(customer.id),
        ]);
        setProfile({ balance, ...summary });
    }

    function openNewCustomer() {
        setForm({ name: '', phone: '', address: '' });
        setProfile(null);
        setEditing({});   // truthy with no id → "add" mode
    }

    function closeModal() {
        setEditing(null);
        setForm({ name: '', phone: '', address: '' });
        setProfile(null);
    }

    async function saveCustomer({ skipDuplicateCheck = false } = {}) {
        const name = form.name.trim();
        const phone = form.phone.trim();
        if (!name) return Alert.alert('Name required', 'Enter a customer name.');
        if (phone && phone.replace(/\D/g, '').length !== 10) {
            return Alert.alert('Check the phone number', 'Enter a 10-digit number, or leave it empty.');
        }

        if (!skipDuplicateCheck) {
            const dupes = await findPossibleDuplicates({ name, phone, excludeId: editing?.id });
            if (dupes.length > 0) {
                const d = dupes[0];
                return Alert.alert(
                    'Customer may already exist',
                    `${d.name}${d.phone ? ` · ${d.phone}` : ''} is already saved. Add anyway?`,
                    [
                        { text: 'Open existing', onPress: () => openCustomer(d) },
                        { text: 'Save anyway', onPress: () => saveCustomer({ skipDuplicateCheck: true }) },
                        { text: 'Cancel', style: 'cancel' },
                    ]
                );
            }
        }

        setSaving(true);
        try {
            if (editing?.id) {
                await updateCustomerDetails({
                    customerId: editing.id,
                    name,
                    phone,
                    address: form.address.trim(),
                });
            } else {
                await createCustomer({
                    name,
                    phone,
                    address: form.address.trim(),
                });
            }
            closeModal();
            await load();
        } catch (e) {
            Alert.alert('Error', 'Could not save customer. Please try again.');
            console.error(e);
        } finally {
            setSaving(false);
        }
    }

    function toggleArchived() {
        const customer = editing;
        const archiving = !customer.archivedAt;
        if (!archiving) {
            return setCustomerArchived(customer.id, false).then(() => { closeModal(); load(); });
        }
        Alert.alert(
            'Remove customer',
            `${customer.name} will be hidden from customer lists and search. Their past bills stay in Records. You can restore them later.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove', style: 'destructive', onPress: async () => {
                        try {
                            await setCustomerArchived(customer.id, true);
                            closeModal();
                            load();
                        } catch (e) {
                            if (e.code === 'HAS_BALANCE') {
                                Alert.alert('Khata still open', `${customer.name} still owes money. Settle their khata first.`);
                            } else {
                                Alert.alert('Error', 'Could not remove customer.');
                            }
                        }
                    },
                },
            ]
        );
    }

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
                    <Text style={s.title}>Customers</Text>
                    <TouchableOpacity onPress={openNewCustomer}>
                        <Text style={s.addBtn}>+ Add</Text>
                    </TouchableOpacity>
                </View>

                <TextInput
                    style={s.search}
                    placeholder="Search name, phone, or address"
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />

                <TouchableOpacity onPress={() => setShowArchived(v => !v)} style={s.archivedToggle}>
                    <Text style={s.archivedToggleText}>
                        {showArchived ? '‹ Back to active customers' : 'Show removed customers'}
                    </Text>
                </TouchableOpacity>

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={<AppIcon name="customers" size={40} color={colors.textMuted} />}
                        title={showArchived ? 'No removed customers' : 'No customers yet'}
                        subtitle={showArchived ? 'Customers you remove show up here.' : "Add one here, or they'll be added automatically during a sale."}
                    />
                ) : (
                    filtered.map(c => (
                        <TouchableOpacity key={c.id} style={s.row} activeOpacity={0.75} onPress={() => openCustomer(c)}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.rowName} numberOfLines={1}>{c.name}</Text>
                                <Text style={s.rowSub} numberOfLines={1}>
                                    {[c.phone, c.address].filter(Boolean).join(' · ') || 'No phone or address on file'}
                                </Text>
                            </View>
                            <AppIcon name="chevron" size="inline" />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Add / edit customer */}
            <Modal visible={!!editing} transparent animationType="slide" onRequestClose={closeModal}>
                <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <TouchableOpacity
                        style={s.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => { Keyboard.dismiss(); closeModal(); }}
                    >
                        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.modalBox}>
                            <View style={s.modalHeader}>
                                <Text style={s.modalTitle}>{editing?.id ? 'Edit Customer' : 'Add Customer'}</Text>
                                <TouchableOpacity onPress={closeModal}>
                                    <AppIcon name="close" size="chip" color={colors.red} />
                                </TouchableOpacity>
                            </View>

                            {!!editing?.phone && (
                                <View style={s.contactRow}>
                                    <TouchableOpacity style={s.contactBtn} onPress={() => Linking.openURL(`tel:${editing.phone}`)}>
                                        <AppIcon name="phone" size="chip" color={colors.teal} />
                                        <Text style={s.contactBtnText}>Call</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={s.contactBtn} onPress={() => openWhatsApp(editing.phone, `Namaste ${editing.name} ji,`)}>
                                        <AppIcon name="whatsapp" size="chip" color={colors.teal} />
                                        <Text style={s.contactBtnText}>WhatsApp</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {profile && (
                                <View style={s.profileRow}>
                                    <View style={s.profileStat}>
                                        <Text style={s.profileStatValue}>{profile.orderCount}</Text>
                                        <Text style={s.profileStatLabel}>orders</Text>
                                    </View>
                                    <View style={s.profileStat}>
                                        <Text style={s.profileStatValue}>₹{profile.totalSpend.toFixed(0)}</Text>
                                        <Text style={s.profileStatLabel}>lifetime spend</Text>
                                    </View>
                                    <View style={s.profileStat}>
                                        <Text style={[s.profileStatValue, profile.balance > 0 && { color: colors.amber }]}>
                                            ₹{profile.balance.toFixed(0)}
                                        </Text>
                                        <Text style={s.profileStatLabel}>khata due</Text>
                                    </View>
                                </View>
                            )}

                            <Text style={s.inputLabel}>NAME</Text>
                            <TextInput
                                style={s.input}
                                value={form.name}
                                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                                placeholder="Customer name"
                                placeholderTextColor={colors.textMuted}
                            />

                            <Text style={s.inputLabel}>PHONE (OPTIONAL)</Text>
                            <TextInput
                                style={s.input}
                                value={form.phone}
                                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                                placeholder="10-digit phone number"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />

                            <Text style={s.inputLabel}>ADDRESS (OPTIONAL)</Text>
                            <TextInput
                                style={s.input}
                                value={form.address}
                                onChangeText={v => setForm(f => ({ ...f, address: v }))}
                                placeholder="e.g. Sunrise Society, Flat 302"
                                placeholderTextColor={colors.textMuted}
                            />

                            <PrimaryButton label="Save" onPress={() => saveCustomer()} loading={saving} style={{ marginTop: spacing.lg }} />
                            {editing?.id ? (
                                <GhostButton
                                    label={editing.archivedAt ? 'Restore customer' : 'Remove customer'}
                                    color={editing.archivedAt ? colors.teal : colors.red}
                                    onPress={toggleArchived}
                                    style={{ marginTop: spacing.sm }}
                                />
                            ) : (
                                <GhostButton label="Cancel" onPress={closeModal} style={{ marginTop: spacing.sm }} />
                            )}
                        </TouchableOpacity>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>
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
    addBtn: { color: colors.teal, fontSize: font.md, fontWeight: '700' },

    search: {
        backgroundColor: colors.bgInput,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        color: colors.textPrimary, fontSize: font.md,
        paddingHorizontal: spacing.md, paddingVertical: 12,
        marginBottom: spacing.lg,
    },

    archivedToggle: { alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.md },
    archivedToggleText: { color: colors.textSecondary, fontSize: font.xs, fontWeight: '600' },

    contactRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    contactBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
        backgroundColor: colors.tealFaint, borderRadius: radius.md, paddingVertical: spacing.sm,
    },
    contactBtnText: { color: colors.teal, fontSize: font.sm, fontWeight: '700' },

    row: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        padding: spacing.md, marginBottom: spacing.sm,
    },
    rowName: { color: colors.textPrimary, fontSize: font.md, fontWeight: '600', marginBottom: 2 },
    rowSub: { color: colors.textMuted, fontSize: font.xs },
    chevron: { color: colors.textMuted, fontSize: 22, paddingHorizontal: spacing.xs },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalBackdrop: { flex: 1, width: '100%', justifyContent: 'flex-end' },
    modalBox: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
        borderWidth: 1, borderColor: colors.border,
        padding: spacing.xl, paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: { color: colors.textPrimary, fontSize: font.xl, fontWeight: '700' },
    modalClose: { color: colors.red, fontSize: font.lg, padding: 4 },

    profileRow: {
        flexDirection: 'row',
        backgroundColor: colors.bgInput,
        borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        padding: spacing.md, marginBottom: spacing.lg,
    },
    profileStat: { flex: 1, alignItems: 'center' },
    profileStatValue: { color: colors.textPrimary, fontSize: font.md, fontWeight: '700' },
    profileStatLabel: { color: colors.textMuted, fontSize: font.xs, marginTop: 2 },

    inputLabel: {
        color: colors.textMuted, fontSize: font.xs, fontWeight: '700', letterSpacing: 1,
        marginBottom: spacing.xs, marginTop: spacing.md,
    },
    input: {
        backgroundColor: colors.bgInput,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        color: colors.textPrimary, fontSize: font.md,
        paddingHorizontal: spacing.md, paddingVertical: 13,
    },
});
