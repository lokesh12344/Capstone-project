import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, ScrollView, Alert, Modal,
    TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    getSuppliers, saveSupplier, getSupplierPurchases, getPurchaseOrders, setPurchaseOrderStatus,
    setSupplierArchived,
} from '../database/actions';
import { openWhatsApp } from '../services/share';
import { PrimaryButton, GhostButton, Card, Badge, EmptyState } from '../../components/UI';
import { AppIcon } from '../theme/icons';
import { colors, spacing, radius, font } from '../theme';

const STATUS_COLOR = { draft: colors.textMuted, sent: colors.blue, received: colors.teal, cancelled: colors.red };

// Suppliers and the purchase orders sent to them. Fully offline — suppliers and
// orders live in the local DB and sync like everything else.
export default function SuppliersScreen({ navigation, route }) {
    const [suppliers, setSuppliers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [editing, setEditing] = useState(null);     // { id?, name, phone, note }
    const [viewing, setViewing] = useState(null);     // supplier
    const [purchases, setPurchases] = useState([]);

    const load = useCallback(async () => {
        // Archived suppliers are kept so old purchase orders still show their name.
        const [sp, po] = await Promise.all([getSuppliers({ includeArchived: true }), getPurchaseOrders()]);
        setSuppliers(sp);
        setOrders(po);
    }, []);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    // Opened from Stock In's "+ New supplier" chip: go straight to the add form.
    useEffect(() => {
        if (route?.params?.addNew) setEditing({ name: '', phone: '', note: '' });
    }, [route?.params?.addNew]);

    async function save() {
        if (!editing.name.trim()) return Alert.alert('Enter supplier name');
        await saveSupplier({
            supplierId: editing.id,
            name: editing.name.trim(),
            phone: editing.phone.trim(),
            note: editing.note.trim(),
        });
        setEditing(null);
        load();
        if (route?.params?.addNew) navigation.goBack();
    }

    async function openSupplier(sp) {
        setViewing(sp);
        setPurchases(await getSupplierPurchases(sp.id));
    }

    const supplierName = id => suppliers.find(s => s.id === id)?.name || 'No supplier';
    const activeSuppliers = suppliers.filter(sp => !sp.archivedAt);

    function removeSupplier() {
        const sp = viewing;
        Alert.alert(
            'Remove supplier',
            `${sp.name} will be hidden from supplier lists. Past purchase orders and stock records keep their name.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove', style: 'destructive', onPress: async () => {
                        await setSupplierArchived(sp.id, true);
                        setViewing(null);
                        load();
                    },
                },
            ]
        );
    }

    return (
        <View style={s.root}>
            <ScrollView contentContainerStyle={s.scroll}>
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={s.back}>‹ Back</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>Suppliers</Text>
                    <TouchableOpacity onPress={() => setEditing({ name: '', phone: '', note: '' })}>
                        <Text style={s.back}>+ Add</Text>
                    </TouchableOpacity>
                </View>

                {activeSuppliers.length === 0 ? (
                    <EmptyState icon={<AppIcon name="suppliers" size={40} />} title="No suppliers yet"
                        subtitle="Add the distributors you buy from to send them orders on WhatsApp." />
                ) : activeSuppliers.map(sp => (
                    <TouchableOpacity key={sp.id} activeOpacity={0.8} onPress={() => openSupplier(sp)}>
                        <Card style={s.row}>
                            <AppIcon name="suppliers" size="chip" color={colors.blue} />
                            <View style={{ flex: 1 }}>
                                <Text style={s.name}>{sp.name}</Text>
                                <Text style={s.sub}>{sp.phone || 'No phone'}{sp.note ? ` · ${sp.note}` : ''}</Text>
                            </View>
                            <AppIcon name="chevron" />
                        </Card>
                    </TouchableOpacity>
                ))}

                <PrimaryButton label="New purchase order" onPress={() => navigation.navigate('PurchaseOrder')}
                    style={{ marginTop: spacing.lg }} />

                <Text style={s.section}>PURCHASE ORDERS</Text>
                {orders.length === 0 ? (
                    <Text style={s.sub}>No orders yet. Create one here or from Smart Restock.</Text>
                ) : orders.map(po => (
                    <Card key={po.id} style={s.poCard}>
                        <View style={s.poTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.name}>{supplierName(po.supplierId)}</Text>
                                <Text style={s.sub}>
                                    {new Date(po.orderedAt).toLocaleDateString('en-IN')} · {po.items.length} items
                                </Text>
                            </View>
                            <Badge label={po.status} color={STATUS_COLOR[po.status] || colors.textMuted} />
                        </View>
                        <Text style={s.poItems} numberOfLines={2}>
                            {po.items.map(i => `${i.name} × ${i.quantity}`).join(', ')}
                        </Text>
                        {po.status === 'sent' && (
                            <View style={s.poActions}>
                                <TouchableOpacity onPress={async () => { await setPurchaseOrderStatus(po.id, 'received'); load(); }}>
                                    <Text style={[s.link, { color: colors.teal }]}>Mark received</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={async () => { await setPurchaseOrderStatus(po.id, 'cancelled'); load(); }}>
                                    <Text style={[s.link, { color: colors.red }]}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </Card>
                ))}
            </ScrollView>

            {/* Add / edit supplier */}
            <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
                <KeyboardAvoidingView style={s.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View style={s.sheet}>
                        <Text style={s.sheetTitle}>{editing?.id ? 'Edit supplier' : 'New supplier'}</Text>
                        <TextInput style={s.input} placeholder="Name (e.g. Gupta Traders)" placeholderTextColor={colors.textMuted}
                            value={editing?.name} onChangeText={v => setEditing(e => ({ ...e, name: v }))} />
                        <TextInput style={s.input} placeholder="WhatsApp number" placeholderTextColor={colors.textMuted}
                            keyboardType="phone-pad" value={editing?.phone} onChangeText={v => setEditing(e => ({ ...e, phone: v }))} />
                        <TextInput style={s.input} placeholder="Note (what they supply, credit terms…)" placeholderTextColor={colors.textMuted}
                            value={editing?.note} onChangeText={v => setEditing(e => ({ ...e, note: v }))} />
                        <PrimaryButton label="Save" onPress={save} />
                        <GhostButton label="Cancel" onPress={() => setEditing(null)} style={{ marginTop: spacing.sm }} />
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Supplier detail */}
            <Modal visible={!!viewing} transparent animationType="slide" onRequestClose={() => setViewing(null)}>
                <View style={s.backdrop}>
                    <View style={[s.sheet, { maxHeight: '80%' }]}>
                        <View style={s.poTop}>
                            <Text style={[s.sheetTitle, { flex: 1 }]}>{viewing?.name}</Text>
                            <TouchableOpacity onPress={() => setViewing(null)}>
                                <AppIcon name="close" size="chip" color={colors.red} />
                            </TouchableOpacity>
                        </View>
                        <View style={s.poActions}>
                            {viewing?.phone ? (
                                <TouchableOpacity onPress={() => openWhatsApp(viewing.phone, `Namaste ${viewing.name},`)}>
                                    <Text style={[s.link, { color: colors.teal }]}>WhatsApp</Text>
                                </TouchableOpacity>
                            ) : null}
                            <TouchableOpacity onPress={() => { const sp = viewing; setViewing(null); setEditing({ id: sp.id, name: sp.name, phone: sp.phone || '', note: sp.note || '' }); }}>
                                <Text style={s.link}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { const id = viewing.id; setViewing(null); navigation.navigate('PurchaseOrder', { supplierId: id }); }}>
                                <Text style={s.link}>New order</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={removeSupplier}>
                                <Text style={[s.link, { color: colors.red }]}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={s.section}>RECENT STOCK FROM THIS SUPPLIER</Text>
                        <ScrollView>
                            {purchases.length === 0 ? (
                                <Text style={s.sub}>Nothing yet. Pick this supplier on Stock In to track purchases.</Text>
                            ) : purchases.map(({ batch, product }) => (
                                <View key={batch.id} style={s.purchaseRow}>
                                    <Text style={[s.name, { flex: 1, fontSize: font.sm }]}>{product?.name ?? 'Product'}</Text>
                                    <Text style={s.sub}>
                                        {batch.quantity} × ₹{batch.costPrice} · {new Date(batch.createdAt).toLocaleDateString('en-IN')}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: 80 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: spacing.xl, marginBottom: spacing.xl,
    },
    back: { color: colors.teal, fontSize: font.md, fontWeight: '600' },
    title: { color: colors.textPrimary, fontSize: font.lg, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
    name: { color: colors.textPrimary, fontSize: font.md, fontWeight: '700' },
    sub: { color: colors.textMuted, fontSize: font.sm },
    section: { color: colors.textMuted, fontSize: font.xs, fontWeight: '700', letterSpacing: 1, marginTop: spacing.xl, marginBottom: spacing.sm },
    poCard: { marginBottom: spacing.sm },
    poTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    poItems: { color: colors.textSecondary, fontSize: font.sm, marginTop: spacing.sm },
    poActions: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md },
    link: { color: colors.blue, fontWeight: '700', fontSize: font.sm },
    purchaseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
    backdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
    sheetTitle: { color: colors.textPrimary, fontSize: font.lg, fontWeight: '800', marginBottom: spacing.md },
    input: {
        backgroundColor: colors.bgInput, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        color: colors.textPrimary, fontSize: font.md, paddingHorizontal: spacing.md, paddingVertical: 13,
        marginBottom: spacing.sm,
    },
});
