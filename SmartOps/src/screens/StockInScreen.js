import React, { useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { getProductByBarcode, recordStockIn } from '../database/actions';
import BarcodeScanner from '../../components/BarcodeScanner';
import { Card, PrimaryButton, GhostButton } from '../../components/UI';
import { colors, spacing, radius, font } from '../theme';

const INIT_FORM = {
    quantity: '', batchNo: '', expiryDate: '', costPrice: '',
};

export default function StockInScreen({ navigation }) {
    const [scanning, setScanning] = useState(false);
    const [product, setProduct] = useState(null);
    const [form, setForm] = useState(INIT_FORM);
    const [loading, setLoading] = useState(false);

    async function handleScan(barcode) {
        const found = await getProductByBarcode(barcode);
        setScanning(false);

        if (!found) {
            Alert.alert(
                'Not in master',
                'Register this product first before receiving stock.',
                [
                    { text: 'Register', onPress: () => navigation.navigate('ProductRegistration', { barcode }) },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
            return;
        }
        setProduct(found);
    }

    function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

    function validateExpiry(val) {
        // Accept DD/MM/YYYY or YYYY-MM-DD
        set('expiryDate', val);
    }

    function parseExpiryToTimestamp(str) {
        // handle DD/MM/YYYY
        if (str.includes('/')) {
            const [d, m, y] = str.split('/');
            return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`).getTime();
        }
        return new Date(str).getTime();
    }

    async function handleSubmit() {
        const { quantity, batchNo, expiryDate, costPrice } = form;

        if (!product) return Alert.alert('Scan a product first');
        if (!quantity || isNaN(+quantity)) return Alert.alert('Enter a valid quantity');
        if (!batchNo.trim()) return Alert.alert('Enter batch number');
        if (!expiryDate.trim()) return Alert.alert('Enter expiry date');

        const expiry = parseExpiryToTimestamp(expiryDate);
        if (isNaN(expiry)) return Alert.alert('Invalid date format. Use DD/MM/YYYY');

        setLoading(true);
        try {
            await recordStockIn({
                productId: product.id,
                quantity: parseInt(quantity, 10),
                batchNo: batchNo.trim(),
                expiryDate: expiry,
                costPrice: parseFloat(costPrice) || 0,
            });

            Alert.alert(
                'Stock recorded ✓',
                `${quantity} units of ${product.name} added.`,
                [{ text: 'Done', onPress: reset }, { text: 'Add more', onPress: () => { setForm(INIT_FORM); setScanning(true); } }]
            );
        } catch (e) {
            Alert.alert('Error', 'Could not save. Please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    function reset() {
        setProduct(null);
        setForm(INIT_FORM);
    }

    if (scanning) {
        return (
            <BarcodeScanner
                hint="Scan product barcode to receive stock"
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
                    <Text style={s.title}>Stock In</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Step 1 — product */}
                <View style={s.step}>
                    <Text style={s.stepLabel}>STEP 1 · PRODUCT</Text>
                    {product ? (
                        <Card style={s.productCard}>
                            <View style={s.productInfo}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.productName}>{product.name}</Text>
                                    <Text style={s.productSub}>{product.category} · {product.unit}</Text>
                                </View>
                                <TouchableOpacity onPress={() => { setProduct(null); setScanning(true); }} style={s.changeBtn}>
                                    <Text style={s.changeBtnText}>Change</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    ) : (
                        <TouchableOpacity style={s.scanBtn} onPress={() => setScanning(true)} activeOpacity={0.8}>
                            <Text style={s.scanIcon}>▣</Text>
                            <Text style={s.scanLabel}>Scan product barcode</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Step 2 — batch details */}
                {product && (
                    <View style={s.step}>
                        <Text style={s.stepLabel}>STEP 2 · BATCH DETAILS</Text>

                        <Text style={s.inputLabel}>Quantity received *</Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. 48"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numeric"
                            value={form.quantity}
                            onChangeText={v => set('quantity', v)}
                        />

                        <Text style={s.inputLabel}>Batch number *</Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. BT2024-001"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="characters"
                            value={form.batchNo}
                            onChangeText={v => set('batchNo', v)}
                        />

                        <Text style={s.inputLabel}>Expiry date * (DD/MM/YYYY)</Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. 31/12/2025"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="numbers-and-punctuation"
                            value={form.expiryDate}
                            onChangeText={validateExpiry}
                        />

                        <Text style={s.inputLabel}>Cost price per unit  (optional)</Text>
                        <TextInput
                            style={s.input}
                            placeholder="₹ 0.00"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                            value={form.costPrice}
                            onChangeText={v => set('costPrice', v)}
                        />

                        {/* Expiry warning preview */}
                        {form.expiryDate.length >= 8 && (() => {
                            const ts = parseExpiryToTimestamp(form.expiryDate);
                            const days = Math.floor((ts - Date.now()) / 86400000);
                            if (isNaN(days)) return null;
                            const color = days < 30 ? colors.red : days < 90 ? colors.amber : colors.teal;
                            return (
                                <View style={[s.expiryHint, { borderColor: color + '40', backgroundColor: color + '12' }]}>
                                    <Text style={[s.expiryHintText, { color }]}>
                                        {days < 0
                                            ? '⚠ This batch is already expired!'
                                            : days < 30
                                                ? `⚠ Expires in ${days} days — consider discounting`
                                                : `✓ Expires in ${days} days`}
                                    </Text>
                                </View>
                            );
                        })()}

                        <PrimaryButton
                            label="Save Stock"
                            onPress={handleSubmit}
                            loading={loading}
                            style={{ marginTop: spacing.xl }}
                        />
                        <GhostButton
                            label="Cancel"
                            onPress={reset}
                            style={{ marginTop: spacing.sm }}
                        />
                    </View>
                )}
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

    step: { marginBottom: spacing.xl },
    stepLabel: {
        color: colors.textMuted, fontSize: font.xs,
        fontWeight: '700', letterSpacing: 1,
        marginBottom: spacing.md,
    },

    scanBtn: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        borderWidth: 1.5, borderColor: colors.blue + '55',
        borderStyle: 'dashed',
        paddingVertical: spacing.xxl,
        alignItems: 'center', gap: spacing.sm,
    },
    scanIcon: { fontSize: 28, color: colors.blue },
    scanLabel: { color: colors.blue, fontSize: font.md, fontWeight: '700' },

    productCard: { borderColor: colors.teal + '40' },
    productInfo: { flexDirection: 'row', alignItems: 'center' },
    productName: { color: colors.textPrimary, fontSize: font.md, fontWeight: '700' },
    productSub: { color: colors.textMuted, fontSize: font.sm, marginTop: 2 },
    changeBtn: {
        borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6,
    },
    changeBtnText: { color: colors.textSecondary, fontSize: font.sm },

    inputLabel: {
        color: colors.textSecondary, fontSize: font.sm,
        fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.md,
    },
    input: {
        backgroundColor: colors.bgInput,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        color: colors.textPrimary, fontSize: font.md,
        paddingHorizontal: spacing.md, paddingVertical: 13,
    },

    expiryHint: {
        borderRadius: radius.md, borderWidth: 1,
        padding: spacing.md, marginTop: spacing.md,
    },
    expiryHintText: { fontSize: font.sm, fontWeight: '600' },
});