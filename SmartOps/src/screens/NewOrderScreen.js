import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    TextInput, StyleSheet, Alert, Modal, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { getProductByBarcode, recordSale, searchCustomers, createCustomer, updateCustomerDetails, getCustomerBalance, pickSaleBatch, getProductsByIds, getCustomersByIds, findPossibleDuplicates } from '../database/actions';
import { useAppBadges } from '../hooks/useAppBadges';
import { shareBillPdf, sendBillOnWhatsApp } from '../services/share';
import BarcodeScanner from '../../components/BarcodeScanner';
import { Card, PrimaryButton, GhostButton, Divider, EmptyState } from '../../components/UI';
import { AppIcon } from '../theme/icons';
import { colors, spacing, radius, font } from '../theme';

export default function NewOrderScreen({ navigation, route }) {
    const [scanning, setScanning] = useState(false);
    const [cart, setCart] = useState([]);           // [{ product, quantity, unitPrice, batchId }]
    const [customerQuery, setCustomerQuery] = useState('');       // name search text
    const [customerMatches, setCustomerMatches] = useState([]);   // live search results
    const [selectedCustomer, setSelectedCustomer] = useState(null); // chosen or newly-created customer
    const [creditPhone, setCreditPhone] = useState('');            // inline phone capture, only when credit needs one
    const [paymentMode, setPaymentMode] = useState('cash');
    const [loading, setLoading] = useState(false);
    const { refresh: refreshBadges } = useAppBadges();
    const [notFoundBarcode, setNotFoundBarcode] = useState(null);  // triggers "add product?" prompt
    const [draftPriceItem, setDraftPriceItem] = useState(null);    // triggers "set price" prompt for legacy test data
    const [existingBalance, setExistingBalance] = useState(null);  // current khata balance for the selected customer
    const [priceEdit, setPriceEdit] = useState(null);              // { index, value } — discount / price override

    // Live customer search as the shopkeeper types a name (or phone/address —
    // searchCustomers matches all three). Cleared once a customer is selected.
    useEffect(() => {
        let active = true;
        (async () => {
            if (selectedCustomer || !customerQuery.trim()) { setCustomerMatches([]); return; }
            const matches = await searchCustomers(customerQuery);
            if (active) setCustomerMatches(matches);
        })();
        return () => { active = false; };
    }, [customerQuery, selectedCustomer]);

    // Look up the selected customer's current khata balance.
    useEffect(() => {
        let active = true;
        (async () => {
            if (!selectedCustomer) { setExistingBalance(null); return; }
            const balance = await getCustomerBalance(selectedCustomer.id);
            if (active) setExistingBalance(balance);
        })();
        return () => { active = false; };
    }, [selectedCustomer]);

    // Cart pre-filled by voice entry: route.params.prefill =
    //   { lines: [{ productId, quantity }], customerId?, paymentMode? }
    // Everything still goes through this screen's normal review + checkout.
    const prefill = route?.params?.prefill;
    useEffect(() => {
        if (!prefill) return;
        (async () => {
            const productMap = await getProductsByIds(prefill.lines.map(l => l.productId));
            const rows = [];
            for (const line of prefill.lines) {
                const product = productMap.get(line.productId);
                if (!product) continue;
                const batch = await pickSaleBatch(product);
                rows.push({
                    product,
                    quantity: Math.max(1, Math.round(line.quantity)),
                    unitPrice: product.sellingPrice || 0,
                    batchId: batch?.id ?? null,
                });
            }
            setCart(rows);
            if (prefill.customerId) {
                const c = (await getCustomersByIds([prefill.customerId])).get(prefill.customerId);
                if (c) selectCustomer(c);
            }
            if (prefill.paymentMode) setPaymentMode(prefill.paymentMode);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefill]);

    function selectCustomer(customer) {
        setSelectedCustomer(customer);
        setCustomerQuery('');
        setCustomerMatches([]);
    }

    function clearCustomer() {
        setSelectedCustomer(null);
        setCustomerQuery('');
        setCustomerMatches([]);
        setCreditPhone('');
    }

    // The search above already gave the shopkeeper a chance to pick an existing
    // match — reaching here means this is genuinely a new person.
    // Still double-check exact name matches: the dropdown is easy to skim past,
    // and two "Ramesh" records split one person's khata in half.
    async function addNewCustomer({ skipDuplicateCheck = false } = {}) {
        const name = customerQuery.trim();
        if (!name) return;
        if (!skipDuplicateCheck) {
            const dupes = await findPossibleDuplicates({ name });
            if (dupes.length > 0) {
                const d = dupes[0];
                return Alert.alert(
                    `${d.name} already exists`,
                    [d.phone, d.address].filter(Boolean).join(' · ') || 'Saved earlier with no phone or address.',
                    [
                        { text: 'Use existing', onPress: () => selectCustomer(d) },
                        { text: 'Add new anyway', onPress: () => addNewCustomer({ skipDuplicateCheck: true }) },
                        { text: 'Cancel', style: 'cancel' },
                    ]
                );
            }
        }
        const created = await createCustomer({ name });
        selectCustomer(created);
    }

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

        // Earliest-expiry batch (FEFO); no-expiry loose goods sell last.
        const validBatch = await pickSaleBatch(product);

        // If already in cart, just increment with same price
        const existingRow = cart.find(i => i.product.id === product.id);
        if (existingRow) {
            addToCart(product, validBatch, existingRow.unitPrice);
            return;
        }

        // If legacy test data has 0 selling price, prompt user
        if (!product.sellingPrice) {
            setDraftPriceItem({ product, batch: validBatch, priceInput: '' });
            setScanning(false);
            return;
        }

        addToCart(product, validBatch, product.sellingPrice);
    }

    // ── Cart operations ────────────────────────────────────────────────────────
    function addToCart(product, batch, forcedPrice) {
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
                unitPrice: forcedPrice !== undefined ? forcedPrice : (product.sellingPrice || 0),
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

    // ── Price override / discount ────────────────────────────────────────────────
    function openPriceEdit(index) {
        setPriceEdit({ index, value: String(cart[index].unitPrice) });
    }

    function savePriceEdit() {
        const p = parseFloat(priceEdit.value);
        if (isNaN(p) || p < 0) return Alert.alert('Invalid price', 'Enter a valid price.');
        setCart(prev => {
            const updated = [...prev];
            updated[priceEdit.index] = { ...updated[priceEdit.index], unitPrice: p };
            return updated;
        });
        setPriceEdit(null);
    }

    // ── Checkout ───────────────────────────────────────────────────────────────
    async function handleCheckout() {
        if (cart.length === 0) return;

        // Credit sales must be attributed to a customer so the khata balance can be
        // tracked, and that customer needs a phone number to actually be reachable
        // about it — cash/UPI sales need neither.
        let phoneForCredit = null;
        if (paymentMode === 'credit') {
            if (!selectedCustomer) {
                return Alert.alert(
                    'Customer required for credit',
                    'Select or add a customer so you can track what they owe.'
                );
            }
            phoneForCredit = selectedCustomer.phone || creditPhone.trim();
            if (phoneForCredit.length < 10) {
                return Alert.alert(
                    'Phone needed for credit',
                    `Enter a 10-digit phone number for ${selectedCustomer.name} to start a khata.`
                );
            }
        }

        setLoading(true);

        try {
            const customerId = selectedCustomer ? selectedCustomer.id : null;

            // If this credit sale just captured a phone number inline, save it onto
            // the customer record so future sales/repayments don't ask again.
            if (paymentMode === 'credit' && selectedCustomer && !selectedCustomer.phone) {
                await updateCustomerDetails({ customerId, phone: phoneForCredit });
            }

            // recordSale uses database.write() — atomic, conflict-safe for multi-user
            const order = await recordSale({
                customerId,
                paymentMode,
                items: cart.map(i => ({
                    productId: i.product.id,
                    batchId: i.batchId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                })),
            });
            refreshBadges();

            const finish = () => { setCart([]); clearCustomer(); navigation.goBack(); };
            Alert.alert(
                'Order complete',
                `₹${cartTotal.toFixed(2)} · ${paymentMode.toUpperCase()}`,
                [
                    // sendBillOnWhatsApp asks for a number itself when there isn't one.
                    { text: 'WhatsApp bill', onPress: async () => { await sendBillOnWhatsApp(order.id); finish(); } },
                    { text: 'Share PDF bill', onPress: async () => { await shareBillPdf(order.id); finish(); } },
                    { text: 'Done', onPress: finish },
                ]
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
                    <AppIcon name="scan" size="chip" color={colors.teal} />
                    <Text style={s.scanLabel}>Scan barcode to add item</Text>
                    <Text style={s.scanHint}>or tap item below to adjust qty</Text>
                </TouchableOpacity>

                {/* Cart */}
                {cart.length === 0 ? (
                    <EmptyState icon={<AppIcon name="cart" size={40} color={colors.textMuted} />} title="Cart is empty" subtitle="Scan a product barcode to start" />
                ) : (
                    <>
                        <Text style={s.sectionLabel}>ITEMS  ·  {cart.length}</Text>
                        {cart.map((item, i) => (
                            <Card key={item.product.id} style={s.cartItem}>
                                <View style={s.cartItemTop}>
                                    <View style={s.cartItemInfo}>
                                        <Text style={s.cartItemName}>
                                            {item.product.name}
                                            {item.product.onSale && <Text style={s.saleTag}>  SALE</Text>}
                                        </Text>
                                        <TouchableOpacity onPress={() => openPriceEdit(i)} activeOpacity={0.7}>
                                            <Text style={s.cartItemSub}>
                                                {item.product.category} · ₹{item.unitPrice} each · <Text style={s.editPriceLink}>edit price</Text>
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity onPress={() => removeItem(i)} style={s.removeBtn}>
                                        <AppIcon name="close" size="inline" color={colors.red} />
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

                        {/* Customer — search by name, or add a new one on the spot */}
                        <Text style={s.sectionLabel}>
                            CUSTOMER  ·  {paymentMode === 'credit' ? 'REQUIRED FOR CREDIT' : 'OPTIONAL'}
                        </Text>

                        {selectedCustomer ? (
                            <View style={s.customerChip}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.customerChipName}>{selectedCustomer.name}</Text>
                                    {!!selectedCustomer.address && (
                                        <Text style={s.customerChipSub}>{selectedCustomer.address}</Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={clearCustomer} style={{ padding: spacing.xs }}>
                                    <AppIcon name="close" size="inline" color={colors.red} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <TextInput
                                    style={s.input}
                                    placeholder="Search or add customer by name"
                                    placeholderTextColor={colors.textMuted}
                                    value={customerQuery}
                                    onChangeText={setCustomerQuery}
                                />
                                {customerQuery.trim().length > 0 && (
                                    <View style={s.customerDropdown}>
                                        {customerMatches.map(c => (
                                            <TouchableOpacity key={c.id} style={s.customerRow} onPress={() => selectCustomer(c)}>
                                                <Text style={s.customerRowName}>{c.name}</Text>
                                                {!!(c.phone || c.address) && (
                                                    <Text style={s.customerRowSub}>{[c.phone, c.address].filter(Boolean).join(' · ')}</Text>
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity style={s.customerRow} onPress={() => addNewCustomer()}>
                                            <Text style={s.customerAddNew}>+ Add &quot;{customerQuery.trim()}&quot; as new customer</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}

                        {/* Only asked for when a credit sale actually needs it */}
                        {paymentMode === 'credit' && selectedCustomer && !selectedCustomer.phone && (
                            <TextInput
                                style={[s.input, { marginTop: spacing.sm }]}
                                placeholder="Phone number (needed for khata)"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="phone-pad"
                                value={creditPhone}
                                onChangeText={setCreditPhone}
                                maxLength={10}
                            />
                        )}

                        {existingBalance !== null && existingBalance > 0 && (
                            <View style={s.balanceHint}>
                                <AppIcon name="khata" size="inline" color={colors.amber} />
                                <Text style={s.balanceHintText}>
                                    Existing khata balance: ₹{existingBalance.toFixed(2)}
                                </Text>
                            </View>
                        )}

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
            <Modal visible={!!notFoundBarcode} transparent animationType="slide" onRequestClose={() => setNotFoundBarcode(null)}>
                <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setNotFoundBarcode(null)}>
                    <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.modalBox}>
                        <Text style={s.modalTitle}>Product not found</Text>
                        <Text style={s.modalText}>
                            Barcode <Text style={{ color: colors.amber }}>{notFoundBarcode}</Text> isn&apos;t in your inventory yet.
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
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Draft Price Modal for Test Data */}
            <Modal visible={!!draftPriceItem} transparent animationType="slide" onRequestClose={() => setDraftPriceItem(null)}>
                <KeyboardAvoidingView
                    style={s.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableOpacity
                        style={s.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => { Keyboard.dismiss(); setDraftPriceItem(null); }}
                    >
                    <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.modalBox}>
                        <Text style={s.modalTitle}>Set Item Price</Text>
                        <Text style={s.modalText}>
                            <Text style={{ fontWeight: '700', color: colors.teal }}>{draftPriceItem?.product?.name}</Text> has a price of ₹0 in the database (old test data). Setting a price is required for checkout.
                        </Text>
                        <TextInput
                            style={[s.input, { marginTop: spacing.lg, fontSize: font.xxl, paddingVertical: spacing.lg, textAlign: 'center' }]}
                            placeholder="₹0.00"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                            autoFocus
                            value={draftPriceItem?.priceInput || ''}
                            onChangeText={v => setDraftPriceItem(prev => ({ ...prev, priceInput: v }))}
                        />
                        <PrimaryButton
                            label="Add to cart"
                            onPress={() => {
                                const p = parseFloat(draftPriceItem.priceInput);
                                if (!p || p <= 0) return Alert.alert('Invalid Price', 'Please enter a valid price amount');
                                addToCart(draftPriceItem.product, draftPriceItem.batch, p);
                                setDraftPriceItem(null);
                            }}
                        />
                        <GhostButton
                            label="Cancel"
                            onPress={() => setDraftPriceItem(null)}
                            style={{ marginTop: spacing.sm }}
                        />
                    </TouchableOpacity>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>

            {/* Price override / discount modal */}
            <Modal visible={priceEdit !== null} transparent animationType="slide" onRequestClose={() => setPriceEdit(null)}>
                <KeyboardAvoidingView
                    style={s.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableOpacity
                        style={s.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => { Keyboard.dismiss(); setPriceEdit(null); }}
                    >
                    <TouchableOpacity activeOpacity={1} onPress={() => {}} style={s.modalBox}>
                        <Text style={s.modalTitle}>Edit price</Text>
                        <Text style={s.modalText}>
                            Set the selling price for{' '}
                            <Text style={{ fontWeight: '700', color: colors.teal }}>
                                {priceEdit !== null ? cart[priceEdit.index]?.product?.name : ''}
                            </Text>
                            {' '}— e.g. a discount to clear near-expiry stock.
                        </Text>
                        <TextInput
                            style={[s.input, { marginTop: spacing.lg, fontSize: font.xxl, paddingVertical: spacing.lg, textAlign: 'center' }]}
                            placeholder="₹0.00"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                            autoFocus
                            value={priceEdit?.value ?? ''}
                            onChangeText={v => setPriceEdit(prev => ({ ...prev, value: v }))}
                        />
                        <PrimaryButton label="Save price" onPress={savePriceEdit} />
                        <GhostButton
                            label="Cancel"
                            onPress={() => setPriceEdit(null)}
                            style={{ marginTop: spacing.sm }}
                        />
                    </TouchableOpacity>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
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
    saleTag: { color: colors.blue, fontSize: font.xs, fontWeight: '800' },
    cartItemName: { color: colors.textPrimary, fontSize: font.md, fontWeight: '600', marginBottom: 2 },
    cartItemSub: { color: colors.textMuted, fontSize: font.sm },
    editPriceLink: { color: colors.teal, fontWeight: '600' },
    removeBtn: { padding: spacing.xs },
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

    balanceHint: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
        marginTop: -spacing.md, marginBottom: spacing.lg,
    },
    balanceHintText: { color: colors.amber, fontSize: font.sm, fontWeight: '600' },

    customerChip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.bgInput,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.teal + '55',
        padding: spacing.md, marginBottom: spacing.lg,
    },
    customerChipName: { color: colors.textPrimary, fontSize: font.md, fontWeight: '700' },
    customerChipSub: { color: colors.textMuted, fontSize: font.xs, marginTop: 2 },

    customerDropdown: {
        backgroundColor: colors.bgInput,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        marginTop: -spacing.md, marginBottom: spacing.lg, overflow: 'hidden',
    },
    customerRow: {
        paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    customerRowName: { color: colors.textPrimary, fontSize: font.md, fontWeight: '600' },
    customerRowSub: { color: colors.textMuted, fontSize: font.xs, marginTop: 2 },
    customerAddNew: { color: colors.teal, fontSize: font.sm, fontWeight: '700' },

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
    modalBackdrop: { flex: 1, width: '100%', justifyContent: 'flex-end' },
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