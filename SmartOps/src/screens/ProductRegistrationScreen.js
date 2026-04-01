import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, StyleSheet, Alert, Switch,
    KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { registerProduct, getProductByBarcode } from '../database/actions';
import BarcodeScanner from '../../components/BarcodeScanner';
import { PrimaryButton, GhostButton, Card, Badge } from '../../components/UI';
import { colors, spacing, radius, font } from '../theme';

const CATEGORIES = ['Grocery', 'Beverage', 'Snack', 'Dairy', 'Medicine', 'Personal Care', 'Household', 'Other'];
const UNITS = ['pcs', 'kg', 'g', 'L', 'mL', 'pack', 'box', 'dozen'];

const INIT = {
    barcode: '', name: '', brand: '', category: '', unit: 'pcs',
    reorderLevel: '5', scheduleH: false, sellingPrice: '',
};

export default function ProductRegistrationScreen({ navigation, route }) {
    const [scanning, setScanning] = useState(false);
    const [form, setForm] = useState({ ...INIT, barcode: route.params?.barcode || '' });
    const [lookingUp, setLookingUp] = useState(false);
    const [source, setSource] = useState(null);  // 'catalog' | 'manual'
    const [loading, setLoading] = useState(false);

    // Auto-lookup if barcode passed from NewOrder
    useEffect(() => {
        if (route.params?.barcode) lookupBarcode(route.params.barcode);
    }, []);

    function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

    async function handleScan(barcode) {
        setScanning(false);
        set('barcode', barcode);
        await lookupBarcode(barcode);
    }

    async function lookupBarcode(barcode) {
        if (!barcode) return;

        // Check if already in our DB
        const existing = await getProductByBarcode(barcode);
        if (existing) {
            Alert.alert('Already registered', `${existing.name} is already in your inventory.`, [
                { text: 'View inventory', onPress: () => navigation.goBack() },
                { text: 'Continue anyway', style: 'cancel' },
            ]);
            return;
        }

        // Try backend catalog (your 21K OFF India entries)
        setLookingUp(true);
        try {
            const res = await fetch(`https://your-backend.com/api/barcode/${barcode}`);
            if (res.ok) {
                const data = await res.json();
                setForm(f => ({
                    ...f,
                    barcode: data.barcode || barcode,
                    name: data.name || '',
                    brand: data.brand || '',
                    category: mapOFFCategory(data.category) || '',
                }));
                setSource('catalog');
            } else {
                setSource('manual');
            }
        } catch {
            // Offline — manual entry
            setSource('manual');
        } finally {
            setLookingUp(false);
        }
    }

    // Map OpenFoodFacts category tag to our simple categories
    function mapOFFCategory(tag) {
        if (!tag) return 'Other';
        const t = tag.toLowerCase();
        if (t.includes('beverage') || t.includes('drink')) return 'Beverage';
        if (t.includes('snack') || t.includes('chip')) return 'Snack';
        if (t.includes('dairy') || t.includes('milk')) return 'Dairy';
        if (t.includes('medicine') || t.includes('drug')) return 'Medicine';
        if (t.includes('grocery') || t.includes('grain')) return 'Grocery';
        if (t.includes('personal') || t.includes('hygiene')) return 'Personal Care';
        return 'Other';
    }

    async function handleSave() {
        if (!form.name.trim()) return Alert.alert('Enter product name');
        if (!form.category) return Alert.alert('Select a category');
        if (!form.unit) return Alert.alert('Select a unit');

        setLoading(true);
        try {
            await registerProduct({
                barcode: form.barcode.trim(),
                name: form.name.trim(),
                brand: form.brand.trim(),
                category: form.category,
                unit: form.unit,
                reorderLevel: parseInt(form.reorderLevel) || 5,
                scheduleH: form.scheduleH,
                sellingPrice: parseFloat(form.sellingPrice) || 0,
                businessId: 'default',
            });

            Alert.alert('Product added ✓', form.name, [
                { text: 'Add stock now', onPress: () => navigation.replace('StockIn') },
                { text: 'Done', onPress: () => navigation.goBack() },
            ]);
        } catch (e) {
            Alert.alert('Error', 'Could not save product.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (scanning) {
        return (
            <BarcodeScanner
                hint="Scan the product barcode"
                onScan={handleScan}
                onClose={() => setScanning(false)}
            />
        );
    }

    return (
        <KeyboardAvoidingView
            style={s.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={s.back}>‹ Back</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>Add Product</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Barcode field */}
                <Text style={s.label}>BARCODE</Text>
                <View style={s.barcodeRow}>
                    <TextInput
                        style={[s.input, { flex: 1 }]}
                        placeholder="Scan or type barcode"
                        placeholderTextColor={colors.textMuted}
                        value={form.barcode}
                        onChangeText={v => set('barcode', v)}
                        keyboardType="numeric"
                    />
                    <TouchableOpacity style={s.scanIconBtn} onPress={() => setScanning(true)}>
                        <Text style={s.scanIconBtnText}>▣</Text>
                    </TouchableOpacity>
                </View>

                {/* Lookup status */}
                {lookingUp && (
                    <View style={s.lookupRow}>
                        <ActivityIndicator size="small" color={colors.teal} />
                        <Text style={s.lookupText}>Looking up barcode...</Text>
                    </View>
                )}
                {source === 'catalog' && !lookingUp && (
                    <View style={s.sourcePill}>
                        <Text style={s.sourcePillText}>✓ Auto-filled from product catalog — verify details below</Text>
                    </View>
                )}
                {source === 'manual' && !lookingUp && (
                    <View style={[s.sourcePill, { borderColor: colors.textMuted + '40', backgroundColor: colors.textMuted + '10' }]}>
                        <Text style={[s.sourcePillText, { color: colors.textMuted }]}>Not in catalog — enter details manually</Text>
                    </View>
                )}

                {/* Product name */}
                <Text style={s.label}>PRODUCT NAME *</Text>
                <TextInput
                    style={s.input}
                    placeholder="e.g. Parle-G Biscuit 100g"
                    placeholderTextColor={colors.textMuted}
                    value={form.name}
                    onChangeText={v => set('name', v)}
                />

                {/* Brand */}
                <Text style={s.label}>BRAND</Text>
                <TextInput
                    style={s.input}
                    placeholder="e.g. Parle"
                    placeholderTextColor={colors.textMuted}
                    value={form.brand}
                    onChangeText={v => set('brand', v)}
                />

                {/* Category picker */}
                <Text style={s.label}>CATEGORY *</Text>
                <View style={s.chipRow}>
                    {CATEGORIES.map(c => (
                        <TouchableOpacity
                            key={c}
                            style={[s.chip, form.category === c && s.chipActive]}
                            onPress={() => set('category', c)}
                        >
                            <Text style={[s.chipText, form.category === c && s.chipTextActive]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Unit picker */}
                <Text style={s.label}>UNIT *</Text>
                <View style={s.chipRow}>
                    {UNITS.map(u => (
                        <TouchableOpacity
                            key={u}
                            style={[s.chip, form.unit === u && s.chipActive]}
                            onPress={() => set('unit', u)}
                        >
                            <Text style={[s.chipText, form.unit === u && s.chipTextActive]}>{u}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Selling price */}
                <Text style={s.label}>SELLING PRICE (₹)</Text>
                <TextInput
                    style={s.input}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={form.sellingPrice}
                    onChangeText={v => set('sellingPrice', v)}
                />

                {/* Reorder level */}
                <Text style={s.label}>REORDER LEVEL (units)</Text>
                <TextInput
                    style={s.input}
                    placeholder="5"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={form.reorderLevel}
                    onChangeText={v => set('reorderLevel', v)}
                />

                {/* Schedule H toggle (pharmacy) */}
                <Card style={s.toggleCard}>
                    <View style={s.toggleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.toggleTitle}>Schedule H drug</Text>
                            <Text style={s.toggleSub}>Requires prescription (pharmacy only)</Text>
                        </View>
                        <Switch
                            value={form.scheduleH}
                            onValueChange={v => set('scheduleH', v)}
                            trackColor={{ false: colors.border, true: colors.teal + '80' }}
                            thumbColor={form.scheduleH ? colors.teal : colors.textMuted}
                        />
                    </View>
                </Card>

                <PrimaryButton
                    label="Add to Inventory"
                    onPress={handleSave}
                    loading={loading}
                    style={{ marginTop: spacing.xl }}
                />
                <GhostButton
                    label="Cancel"
                    onPress={() => navigation.goBack()}
                    style={{ marginTop: spacing.sm }}
                />
            </ScrollView>
        </KeyboardAvoidingView>
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

    label: {
        color: colors.textMuted, fontSize: font.xs,
        fontWeight: '700', letterSpacing: 1,
        marginBottom: spacing.xs, marginTop: spacing.lg,
    },

    barcodeRow: { flexDirection: 'row', gap: spacing.sm },
    scanIconBtn: {
        backgroundColor: colors.teal,
        borderRadius: radius.md, width: 50,
        alignItems: 'center', justifyContent: 'center',
    },
    scanIconBtnText: { fontSize: 22, color: colors.bg },

    input: {
        backgroundColor: colors.bgInput,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        color: colors.textPrimary, fontSize: font.md,
        paddingHorizontal: spacing.md, paddingVertical: 13,
    },

    lookupRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: spacing.sm, marginTop: spacing.sm,
    },
    lookupText: { color: colors.textMuted, fontSize: font.sm },

    sourcePill: {
        borderRadius: radius.md, borderWidth: 1,
        borderColor: colors.teal + '40', backgroundColor: colors.teal + '10',
        padding: spacing.sm, marginTop: spacing.sm,
    },
    sourcePillText: { color: colors.teal, fontSize: font.sm, fontWeight: '600' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        borderRadius: radius.full, borderWidth: 1,
        borderColor: colors.border, backgroundColor: colors.bgInput,
        paddingHorizontal: 14, paddingVertical: 7,
    },
    chipActive: { borderColor: colors.teal, backgroundColor: colors.teal + '20' },
    chipText: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
    chipTextActive: { color: colors.teal },

    toggleCard: { marginTop: spacing.lg },
    toggleRow: { flexDirection: 'row', alignItems: 'center' },
    toggleTitle: { color: colors.textPrimary, fontSize: font.md, fontWeight: '600' },
    toggleSub: { color: colors.textMuted, fontSize: font.sm, marginTop: 2 },
});