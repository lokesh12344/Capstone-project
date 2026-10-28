import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, RefreshControl, TextInput, Modal, Alert,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAllProducts, getStockLevels, updateProduct, setProductArchived, setProductDiscount, endProductDiscount, expireEndedDiscounts } from '../database/actions';
import { useSession } from '../services/session';
import { Badge, EmptyState, PrimaryButton, GhostButton } from '../../components/UI';
import { useAppBadges } from '../hooks/useAppBadges';
import { AppIcon } from '../theme/icons';
import { colors, spacing, radius, font } from '../theme';

export default function InventoryScreen({ navigation }) {
    const [allProducts, setAllProducts] = useState([]);   // includes archived
    const [stocks, setStocks] = useState({});  // { productId: number }
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'low' | 'out' | 'sale' | 'archived'
    const [refreshing, setRefreshing] = useState(false);
    const [editing, setEditing] = useState(null);   // product being edited
    // Staff can't change the product's price (the server ignores it too).
    const staffMode = useSession().role === 'staff';
    const [editForm, setEditForm] = useState({ sellingPrice: '', reorderLevel: '' });
    const [saving, setSaving] = useState(false);
    const { refresh: refreshBadges, markLowStockSeen } = useAppBadges();

    const load = useCallback(async () => {
        await expireEndedDiscounts();
        const everything = await getAllProducts({ includeArchived: true });
        const stockMap = await getStockLevels(everything);  // one query instead of one per product
        setAllProducts(everything);
        setStocks(stockMap);
        const prods = everything.filter(p => !p.archivedAt);

        // Every low/out-of-stock product is visibly flagged in this list —
        // having looked at it once is enough to drop it off Home/the tab badge.
        const lowIds = prods.filter(p => (stockMap[p.id] ?? 0) <= p.reorderLevel).map(p => p.id);
        if (lowIds.length > 0) markLowStockSeen(lowIds);
    }, [markLowStockSeen]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

    function openEdit(product) {
        setEditForm({
            sellingPrice: String(product.sellingPrice ?? ''),
            reorderLevel: String(product.reorderLevel ?? ''),
        });
        setEditing(product);
    }

    async function saveEdit() {
        const price = parseFloat(editForm.sellingPrice);
        const reorder = parseInt(editForm.reorderLevel, 10);
        if (isNaN(price) || price < 0) return Alert.alert('Invalid price', 'Enter a valid selling price.');
        if (isNaN(reorder) || reorder < 0) return Alert.alert('Invalid reorder level', 'Enter a valid reorder level.');

        setSaving(true);
        try {
            await updateProduct({ productId: editing.id, sellingPrice: price, reorderLevel: reorder });
            setEditing(null);
            await load();
            refreshBadges();
        } catch (e) {
            Alert.alert('Error', 'Could not save changes. Please try again.');
            console.error(e);
        } finally {
            setSaving(false);
        }
    }

    const products = allProducts.filter(p => !p.archivedAt);
    const archived = allProducts.filter(p => p.archivedAt);
    const onSaleCount = products.filter(p => p.onSale).length;

    // Quick clearance from the product sheet: a % off the current price,
    // rounded to the rupee. Owner-only (staff can't change prices).
    function applyDiscount(pct) {
        const product = editing;
        const base = product.regularPrice || product.sellingPrice;
        const salePrice = Math.round(base * (1 - pct / 100));
        const apply = days => async () => {
            await setProductDiscount(product.id, salePrice, { days });
            setEditing(null);
            load();
        };
        Alert.alert(
            `${pct}% off ${product.name}?`,
            `Price goes from ₹${base} to ₹${salePrice}. A 7-day sale goes back to ₹${base} on its own.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Until I end it', onPress: apply(null) },
                { text: 'For 7 days', onPress: apply(7) },
            ]
        );
    }

    async function endDiscount() {
        await endProductDiscount(editing.id);
        setEditing(null);
        load();
    }

    function toggleArchive() {
        const product = editing;
        if (product.archivedAt) {
            return setProductArchived(product.id, false).then(() => { setEditing(null); load(); refreshBadges(); });
        }
        Alert.alert(
            'Archive product',
            `${product.name} will be hidden from Inventory, alerts, reorder and sales. Past bills keep it. You can restore it from the Archived filter.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Archive', style: 'destructive', onPress: async () => {
                        await setProductArchived(product.id, true);
                        setEditing(null);
                        await load();
                        refreshBadges();
                    },
                },
            ]
        );
    }

    const filtered = (filter === 'archived' ? archived : products).filter(p => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.brand || '').toLowerCase().includes(search.toLowerCase());
        const stock = stocks[p.id] ?? 0;
        const matchFilter =
            filter === 'all' ? true :
                filter === 'out' ? stock === 0 :
                    filter === 'low' ? stock > 0 && stock <= p.reorderLevel :
                        filter === 'sale' ? p.onSale :
                            true;
        return matchSearch && matchFilter;
    });

    const outCount = products.filter(p => (stocks[p.id] ?? 0) === 0).length;
    const lowCount = products.filter(p => {
        const s = stocks[p.id] ?? 0;
        return s > 0 && s <= p.reorderLevel;
    }).length;

    function stockBadge(stock, reorder) {
        if (stock === 0) return { label: 'OUT', color: colors.red };
        if (stock <= reorder) return { label: `${stock} left`, color: colors.amber };
        return { label: `${stock} left`, color: colors.teal };
    }

    return (
        <View style={s.root}>
            <ScrollView
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Header — Inventory is a tab root, so this carries entry points into
                    the rest of the stock domain (alerts, reorder) instead of a back button. */}
                <View style={s.header}>
                    <Text style={s.title}>Inventory</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.headerActions}>
                    {[
                        { label: 'Insights', icon: 'insights', color: colors.teal, to: 'Insights' },
                        { label: 'New product', icon: 'add', color: colors.teal, to: 'ProductRegistration' },
                        { label: 'Alerts', icon: 'alerts', color: (lowCount + outCount) > 0 ? colors.amber : colors.textMuted, to: 'Alerts' },
                        { label: 'Reorder', icon: 'restock', to: 'Reorder' },
                        { label: 'Purchase order', icon: 'purchaseOrder', to: 'PurchaseOrder' },
                    ].map(a => (
                        <TouchableOpacity key={a.to} style={s.actionChip} onPress={() => navigation.navigate(a.to)}>
                            <AppIcon name={a.icon} size="inline" color={a.color} />
                            <Text style={s.actionChipText}>{a.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Summary strip */}
                <View style={s.stripRow}>
                    <View style={s.strip}>
                        <Text style={s.stripVal}>{products.length}</Text>
                        <Text style={s.stripLabel}>Products</Text>
                    </View>
                    <View style={s.stripDivider} />
                    <View style={s.strip}>
                        <Text style={[s.stripVal, lowCount > 0 && { color: colors.amber }]}>{lowCount}</Text>
                        <Text style={s.stripLabel}>Low stock</Text>
                    </View>
                    <View style={s.stripDivider} />
                    <View style={s.strip}>
                        <Text style={[s.stripVal, outCount > 0 && { color: colors.red }]}>{outCount}</Text>
                        <Text style={s.stripLabel}>Out of stock</Text>
                    </View>
                </View>

                {/* Search */}
                <TextInput
                    style={s.search}
                    placeholder="Search products or brands..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />

                {/* Filter chips */}
                <View style={s.filterRow}>
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'low', label: `Low (${lowCount})` },
                        { key: 'out', label: `Out (${outCount})` },
                        ...(onSaleCount > 0 ? [{ key: 'sale', label: `On sale (${onSaleCount})` }] : []),
                        ...(archived.length > 0 ? [{ key: 'archived', label: `Archived (${archived.length})` }] : []),
                    ].map(f => (
                        <TouchableOpacity
                            key={f.key}
                            style={[s.filterChip, filter === f.key && s.filterChipActive]}
                            onPress={() => setFilter(f.key)}
                        >
                            <Text style={[s.filterChipText, filter === f.key && s.filterChipTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Product list */}
                {filtered.length === 0
                    ? <EmptyState icon={<AppIcon name="inventory" size={40} color={colors.textMuted} />} title="No products found" subtitle="Add products via the + button above" />
                    : filtered.map(p => {
                        const stock = stocks[p.id] ?? 0;
                        const badge = stockBadge(stock, p.reorderLevel);
                        return (
                            <TouchableOpacity
                                key={p.id}
                                style={s.productRow}
                                activeOpacity={0.75}
                                onPress={() => openEdit(p)}
                            >
                                <View style={s.productLeft}>
                                    <View style={[s.categoryDot, { backgroundColor: categoryColor(p.category) }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.productName} numberOfLines={1}>{p.name}</Text>
                                        <Text style={s.productMeta}>
                                            {p.brand ? `${p.brand} · ` : ''}{p.category} · ₹{p.sellingPrice ?? 0}/{p.unit}
                                            {p.onSale && <Text style={s.wasPrice}>  ₹{p.regularPrice}</Text>}
                                        </Text>
                                    </View>
                                </View>
                                <View style={s.productRight}>
                                    <Badge label={badge.label} color={badge.color} />
                                    {p.onSale && <Badge label="SALE" color={colors.blue} />}
                                    {stock <= p.reorderLevel && (
                                        <Text style={s.reorderHint}>reorder: {p.reorderLevel}</Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })
                }
            </ScrollView>

            {/* FAB — quick stock in */}
            <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('StockIn')} activeOpacity={0.85}>
                <Text style={s.fabText}>+ Stock In</Text>
            </TouchableOpacity>

            {/* Product edit modal */}
            <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
                <KeyboardAvoidingView
                    style={s.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setEditing(null)}>
                    <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.modalBox}>
                        <View style={s.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.modalTitle} numberOfLines={1}>{editing?.name}</Text>
                                <Text style={s.modalSub}>
                                    {editing?.brand ? `${editing.brand} · ` : ''}{editing?.category} · in stock: {stocks[editing?.id] ?? 0} {editing?.unit}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setEditing(null)}>
                                <AppIcon name="close" size="chip" color={colors.red} />
                            </TouchableOpacity>
                        </View>

                        <Text style={s.inputLabel}>SELLING PRICE (₹){staffMode ? '  · owner only' : ''}</Text>
                        <TextInput
                            editable={!staffMode}
                            style={[s.modalInput, staffMode && { opacity: 0.5 }]}
                            keyboardType="decimal-pad"
                            value={editForm.sellingPrice}
                            onChangeText={v => setEditForm(f => ({ ...f, sellingPrice: v }))}
                            placeholder="0.00"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={s.inputLabel}>REORDER LEVEL ({editing?.unit})</Text>
                        <TextInput
                            style={s.modalInput}
                            keyboardType="numeric"
                            value={editForm.reorderLevel}
                            onChangeText={v => setEditForm(f => ({ ...f, reorderLevel: v }))}
                            placeholder="5"
                            placeholderTextColor={colors.textMuted}
                        />

                        <PrimaryButton
                            label="Save changes"
                            onPress={saveEdit}
                            loading={saving}
                            style={{ marginTop: spacing.lg }}
                        />
                        <GhostButton
                            label="Add stock for this product"
                            onPress={() => { const id = editing.id; setEditing(null); navigation.navigate('StockIn', { productId: id }); }}
                            style={{ marginTop: spacing.sm }}
                        />
                        {!staffMode && !editing?.archivedAt && (
                            editing?.onSale ? (
                                <View style={s.saleBox}>
                                    <Text style={s.saleText}>
                                        On sale at ₹{editing.sellingPrice} (normally ₹{editing.regularPrice})
                                        {editing.saleUntil ? ` · ends ${new Date(editing.saleUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                                    </Text>
                                    <TouchableOpacity onPress={endDiscount}>
                                        <Text style={s.saleEnd}>End sale</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={s.saleBox}>
                                    <Text style={s.saleText}>Clearance discount</Text>
                                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                        {[10, 20, 30].map(pct => (
                                            <TouchableOpacity key={pct} style={s.pctChip} onPress={() => applyDiscount(pct)}>
                                                <Text style={s.pctChipText}>{pct}% off</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )
                        )}
                        {!staffMode && (
                            <GhostButton
                                label={editing?.archivedAt ? 'Restore product' : 'Archive product (discontinued)'}
                                color={editing?.archivedAt ? colors.teal : colors.red}
                                onPress={toggleArchive}
                                style={{ marginTop: spacing.sm }}
                            />
                        )}
                    </TouchableOpacity>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

function categoryColor(cat) {
    const map = {
        Grocery: '#1DB97A', Beverage: '#4A90E2', Snack: '#F0A500',
        Dairy: '#9B59B6', Medicine: '#E84545', 'Personal Care': '#E91E8C',
        Household: '#888780', Other: '#50556E',
    };
    return map[cat] || '#50556E';
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: 100 },

    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.xl, marginBottom: spacing.md,
    },
    title: { color: colors.textPrimary, fontSize: font.lg, fontWeight: '700' },
    headerActions: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.lg },
    actionChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        height: 36, paddingHorizontal: spacing.md, borderRadius: radius.full,
        backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    },
    actionChipText: { color: colors.textPrimary, fontSize: font.sm, fontWeight: '600' },

    stripRow: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        padding: spacing.lg, marginBottom: spacing.lg,
    },
    strip: { flex: 1, alignItems: 'center' },
    stripVal: { color: colors.textPrimary, fontSize: font.xl, fontWeight: '700', marginBottom: 2 },
    stripLabel: { color: colors.textMuted, fontSize: font.xs },
    stripDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing.sm },

    search: {
        backgroundColor: colors.bgInput,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        color: colors.textPrimary, fontSize: font.md,
        paddingHorizontal: spacing.md, paddingVertical: 12,
        marginBottom: spacing.md,
    },

    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    wasPrice: { textDecorationLine: 'line-through', color: colors.textMuted },
    saleBox: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm,
        backgroundColor: colors.blueFaint, borderRadius: radius.md,
        padding: spacing.md, marginTop: spacing.md,
    },
    saleText: { color: colors.blue, fontSize: font.sm, fontWeight: '600' },
    saleEnd: { color: colors.red, fontSize: font.sm, fontWeight: '700' },
    pctChip: { backgroundColor: colors.blue, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
    pctChipText: { color: colors.white, fontSize: font.xs, fontWeight: '700' },
    filterChip: {
        paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: radius.full, borderWidth: 1,
        borderColor: colors.border, backgroundColor: colors.bgInput,
    },
    filterChipActive: { borderColor: colors.teal, backgroundColor: colors.teal + '20' },
    filterChipText: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
    filterChipTextActive: { color: colors.teal },

    productRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
        padding: spacing.md, marginBottom: spacing.sm,
    },
    productLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md },
    categoryDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
    productName: { color: colors.textPrimary, fontSize: font.md, fontWeight: '600', marginBottom: 2 },
    productMeta: { color: colors.textMuted, fontSize: font.xs },
    productRight: { alignItems: 'flex-end', gap: 4 },
    reorderHint: { color: colors.textMuted, fontSize: font.xs },

    fab: {
        position: 'absolute', bottom: 28, right: 20,
        backgroundColor: colors.teal,
        borderRadius: radius.full,
        paddingHorizontal: spacing.xl, paddingVertical: 14,
    },
    fabText: { color: colors.bg, fontSize: font.md, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalBackdrop: { flex: 1, width: '100%', justifyContent: 'flex-end' },
    modalBox: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
        borderWidth: 1, borderColor: colors.border,
        padding: spacing.xl, paddingBottom: 40,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg },
    modalTitle: { color: colors.textPrimary, fontSize: font.xl, fontWeight: '700' },
    modalSub: { color: colors.textMuted, fontSize: font.sm, marginTop: 2 },
    inputLabel: {
        color: colors.textMuted, fontSize: font.xs, fontWeight: '700', letterSpacing: 1,
        marginBottom: spacing.xs, marginTop: spacing.md,
    },
    modalInput: {
        backgroundColor: colors.bgInput,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        color: colors.textPrimary, fontSize: font.md,
        paddingHorizontal: spacing.md, paddingVertical: 13,
    },
});