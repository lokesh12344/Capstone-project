import React, { useState, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { getProductByBarcode, recordSale, upsertCustomer } from '../database/actions';
import BarcodeScanner from '../../components/BarcodeScanner';
import { Card, PrimaryButton, GhostButton, Divider, EmptyState } from '../../components/UI';
import { colors, spacing, radius, font } from '../theme';

export default function NewOrderScreen({ navigation }) {
    const [scanning, setScanning] = useState(false);
    const [cart, setCart] = useState([]);           // [{ product, quantity, unitPrice, batchId }]
    const [customerPhone, setCustomerPhone] = useState('');
    const [paymentMode, setPaymentMode] = useState('cash');
    const [loading, setLoading] = useState(false);
    const [notFoundBarcode, setNotFoundBarcode] = useState(null);  // triggers "add product?" prompt

    // ── Barcode scanned ────────────────────────────────────────────────────────
    async function handleScan(barcode) {
        const product = await getProductByBarcode(barcode);

        if (!product) {
            setScanning(false);
            setNotFoundBarcode(barcode);
            return;
        }

        const stock = await product.currentStock();
        if (stock <= 0) {
            Alert.alert('Out of stock', `${product.name} has no stock available.`);
            return;
        }

        // Get earliest-expiry batch for FEFO
        const batches = await product.stockBatches.fetch();
        const validBatch = batches
            .filter(b => b.daysUntilExpiry >= 0)
            .sort((a, b) => a.expiryDate - b.expiryDate)[0];

        addToCart(product, validBatch);
    }

    // ── Cart operations ────────────────────────────────────────────────────────
    function addToCart(product, batch) {
        setCart(prev => {
            const existing = prev.findIndex(i => i.product.id === product.id);
            if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
                return updated;
            }
            return [...prev, {
                product,
                quantity: 1,
                unitPrice: product.sellingPrice ?? 0,
                batchId: batch?.id ?? null,
            }];
        });
        setScanning(false);
    }

    function updateQty(index, delta) {
        setCart(prev => {
            const updated = [...prev];
            const newQty = updated[index].quantity + delta;
            if (newQty <= 0) {
                updated.splice(index, 1);
            } else {
                updated[index] = { ...updated[index], quantity: newQty };
            }
            return updated;
        });
    }

    function removeItem(index) {
        setCart(prev => prev.filter((_, i) => i !== index));
    }

    // ── Checkout ───────────────────────────────────────────────────────────────
    async function handleCheckout() {
        if (cart.length === 0) return;
        setLoading(true);

        try {
            let customerId = null;
            if (customerPhone.trim().length >= 10) {
                const customer = await upsertCustomer({
                    businessId: 'default',
                    name: customerPhone,
                    phone: customerPhone.trim(),
                });
                customerId = customer.id;
            }

            // recordSale uses database.write() — atomic, conflict-safe for multi-user
            await recordSale({
                businessId: 'default',
                customerId,
                paymentMode,
                items: cart.map(i => ({
                    productId: i.product.id,
                    batchId: i.batchId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                })),
            });

            Alert.alert(
                'Order complete',
                `₹${cartTotal.toFixed(2)} · ${paymentMode.toUpperCase()}`,
                [{ text: 'Done', onPress: () => { setCart([]); setCustomerPhone(''); navigation.goBack(); } }]
            );
        } catch (e) {
            Alert.alert('Error', 'Could not save order. Please try again.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const cartTotal = cart.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

    // ── Scanner modal ──────────────────────────────────────────────────────────
    if (scanning) {
        return (
            <BarcodeScanner
                hint="Scan product barcode to add to cart"
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

                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                        <Text style={s.backText}>‹ Back</Text>
                    </TouchableOpacity>
                    <Text style={s.title}>New Order</Text>
                    {cart.length > 0 && (
                        <TouchableOpacity onPress={() => setCart([])} style={s.clearBtn}>
                            <Text style={s.clearText}>Clear</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Scan button */}
                <TouchableOpacity style={s.scanBtn} onPress={() => setScanning(true)} activeOpacity={0.8}>
                    <Text style={s.scanIcon}>▣</Text>
                    <Text style={s.scanLabel}>Scan barcode to add item</Text>
                    <Text style={s.scanHint}>or tap item below to adjust qty</Text>
                </TouchableOpacity>

                {/* Cart */}
                {cart.length === 0 ? (
                    <EmptyState icon="🛒" title="Cart is empty" subtitle="Scan a product barcode to start" />
                ) : (
                    <>
                        <Text style={s.sectionLabel}>ITEMS  ·  {cart.length}</Text>
                        {cart.map((item, i) => (
                            <Card key={item.product.id} style={s.cartItem}>
                                <View style={s.cartItemTop}>
                                    <View style={s.cartItemInfo}>
                                        <Text style={s.cartItemName}>{item.product.name}</Text>
                                        <Text style={s.cartItemSub}>{item.product.category} · ₹{item.unitPrice} each</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => removeItem(i)} style={s.removeBtn}>
                                        <Text style={s.removeText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={s.cartItemBottom}>
                                    <View style={s.qtyControl}>
                                        <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(i, -1)}>
                                            <Text style={s.qtyBtnText}>−</Text>
                                        </TouchableOpacity>
                                        <Text style={s.qtyValue}>{item.quantity}</Text>
                                        <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(i, 1)}>
                                            <Text style={s.qtyBtnText}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={s.itemTotal}>₹{(item.quantity * item.unitPrice).toFixed(2)}</Text>
                                </View>
                            </Card>
                        ))}

                        <Divider />

                        {/* Customer phone (optional) */}
                        <Text style={s.sectionLabel}>CUSTOMER  ·  OPTIONAL</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Phone number"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="phone-pad"
                            value={customerPhone}
                            onChangeText={setCustomerPhone}
                            maxLength={10}
                        />

                        {/* Payment mode */}
                        <Text style={s.sectionLabel}>PAYMENT</Text>
                        <View style={s.paymentRow}>
                            {['cash', 'upi', 'credit'].map(mode => (
                                <TouchableOpacity
                                    key={mode}
                                    style={[s.paymentBtn, paymentMode === mode && s.paymentBtnActive]}
                                    onPress={() => setPaymentMode(mode)}
                                >
                                    <Text style={[s.paymentBtnText, paymentMode === mode && s.paymentBtnTextActive]}>
                                        {mode.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Total + checkout */}
                        <View style={s.totalRow}>
                            <Text style={s.totalLabel}>Total</Text>
                            <Text style={s.totalValue}>₹{cartTotal.toFixed(2)}</Text>
                        </View>

                        <PrimaryButton
                            label={`Confirm Order  ₹${cartTotal.toFixed(2)}`}
                            onPress={handleCheckout}
                            loading={loading}
                        />
                    </>
                )}
            </ScrollView>

            {/* Product not found modal */}
            <Modal visible={!!notFoundBarcode} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={s.modalBox}>
                        <Text style={s.modalTitle}>Product not found</Text>
                        <Text style={s.modalText}>
                            Barcode <Text style={{ color: colors.amber }}>{notFoundBarcode}</Text> isn't in your inventory yet.
                        </Text>
                        <PrimaryButton
                            label="Register new product"
                            onPress={() => {
                                setNotFoundBarcode(null);
                                navigation.navigate('ProductRegistration', { barcode: notFoundBarcode });
                            }}
                            style={{ marginTop: spacing.lg }}
                        />
                        <GhostButton
                            label="Skip"
                            onPress={() => { setNotFoundBarcode(null); setScanning(true); }}
                            style={{ marginTop: spacing.sm }}
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: 120 },

    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.xl, marginBottom: spacing.xl,
    },
    backBtn: {},
    backText: { color: colors.teal, fontSize: font.md, fontWeight: '600' },
    title: { color: colors.textPrimary, fontSize: font.lg, fontWeight: '700' },
    clearBtn: {},
    clearText: { color: colors.red, fontSize: font.sm, fontWeight: '600' },

    scanBtn: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        borderWidth: 1.5,
        borderColor: colors.teal + '55',
        borderStyle: 'dashed',
        paddingVertical: spacing.xxl,
        alignItems: 'center', gap: 4,
        marginBottom: spacing.xl,
    },
    scanIcon: { fontSize: 32, color: colors.teal, marginBottom: 6 },
    scanLabel: { color: colors.teal, fontSize: font.md, fontWeight: '700' },
    scanHint: { color: colors.textMuted, fontSize: font.sm },

    sectionLabel: {
        color: colors.textMuted, fontSize: font.xs,
        fontWeight: '700', letterSpacing: 1,
        marginBottom: spacing.sm, marginTop: spacing.md,
    },

    cartItem: { marginBottom: spacing.sm },
    cartItemTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
    cartItemInfo: { flex: 1 },
    cartItemName: { color: colors.textPrimary, fontSize: font.md, fontWeight: '600', marginBottom: 2 },
    cartItemSub: { color: colors.textMuted, fontSize: font.sm },
    removeBtn: { padding: spacing.xs },
    removeText: { color: colors.red, fontSize: font.md, fontWeight: '600' },
    cartItemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    qtyControl: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    qtyBtn: {
        backgroundColor: colors.bgInput,
        borderRadius: radius.sm,
        width: 34, height: 34,
        alignItems: 'center', justifyContent: 'center',
    },
    qtyBtnText: { color: colors.textPrimary, fontSize: font.lg, fontWeight: '600' },
    qtyValue: { color: colors.textPrimary, fontSize: font.lg, fontWeight: '700', minWidth: 24, textAlign: 'center' },
    itemTotal: { color: colors.teal, fontSize: font.md, fontWeight: '700' },

    input: {
        backgroundColor: colors.bgInput,
        borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        color: colors.textPrimary,
        fontSize: font.md, padding: spacing.md,
        marginBottom: spacing.lg,
    },

    paymentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
    paymentBtn: {
        flex: 1, paddingVertical: 12,
        borderRadius: radius.md, borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    paymentBtnActive: { backgroundColor: colors.teal + '20', borderColor: colors.teal },
    paymentBtnText: { color: colors.textMuted, fontSize: font.sm, fontWeight: '700' },
    paymentBtnTextActive: { color: colors.teal },

    totalRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: spacing.lg,
    },
    totalLabel: { color: colors.textSecondary, fontSize: font.lg },
    totalValue: { color: colors.textPrimary, fontSize: font.xxl, fontWeight: '700' },

    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end',
    },
    modalBox: {
        backgroundColor: colors.bgCard,
        borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
        borderWidth: 1, borderColor: colors.border,
        padding: spacing.xxl,
        paddingBottom: 40,
    },
    modalTitle: { color: colors.textPrimary, fontSize: font.xl, fontWeight: '700', marginBottom: spacing.sm },
    modalText: { color: colors.textSecondary, fontSize: font.md, lineHeight: 22 },
});