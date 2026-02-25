import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Image, Alert, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { getImageUrl, formatPrice } from '../../utils/helpers';
import api from '../../api/api';

const PAYMENT_METHODS = [
    { id: 'cash', name: 'Cash on Delivery', icon: 'cash-outline', description: 'Pay when you receive' },
    { id: 'card', name: 'Credit/Debit Card', icon: 'card-outline', description: 'Pay with card (coming soon)' },
    { id: 'ewallet', name: 'E-Wallet', icon: 'wallet-outline', description: 'Pay with e-wallet (coming soon)' },
];

const DELIVERY_TYPES = [
    { id: 'delivery', name: 'Delivery', icon: 'car', description: 'Delivered by driver' },
    { id: 'pickup', name: 'Pickup', icon: 'storefront', description: 'Pick up at store' },
];

export default function CartScreen({ navigation }) {
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
    const { items, updateQuantity, removeFromCart, clearSellerCart, loadCart, isLoaded, getItemsBySeller, getSellerTotal } = useCartStore();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [selectedPayment, setSelectedPayment] = useState('cash');
    const [deliveryType, setDeliveryType] = useState('pickup'); // Delivery disabled
    const [preorderTime, setPreorderTime] = useState('');
    const [notes, setNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [expandedSellers, setExpandedSellers] = useState({});

    // Scheduled delivery states
    const [enableScheduledDelivery, setEnableScheduledDelivery] = useState(false);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [scheduledNotes, setScheduledNotes] = useState('');

    useEffect(() => {
        if (!isLoaded) loadCart();
    }, [isLoaded]);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    const styles = {
        container: { flex: 1, backgroundColor: colors.background },
        list: { padding: 16, paddingBottom: 100 },
        empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
        emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
        emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
        browseBtn: {
            marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
        },
        browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
        // Seller section styles
        sellerSection: {
            backgroundColor: colors.card, borderRadius: 16, marginBottom: 16,
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        },
        sellerHeader: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
        },
        sellerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
        sellerIcon: {
            width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15',
            justifyContent: 'center', alignItems: 'center', marginRight: 12,
        },
        sellerName: { fontSize: 16, fontWeight: '700', color: colors.text },
        sellerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
        sellerTotal: { fontSize: 16, fontWeight: '700', color: colors.primary },
        // Cart item styles
        cartItem: {
            flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
        },
        itemImage: { width: 70, height: 70, borderRadius: 10, backgroundColor: colors.border },
        itemInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
        itemName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
        itemVariant: { fontSize: 11, color: colors.primary, fontWeight: '600', marginBottom: 2 },
        itemPrice: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 6 },
        quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        qtyBtn: {
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: colors.input, justifyContent: 'center', alignItems: 'center',
        },
        qtyText: { fontSize: 13, fontWeight: '700', color: colors.text, minWidth: 18, textAlign: 'center' },
        removeBtn: { padding: 4 },
        // Checkout button
        checkoutBtnContainer: {
            padding: 12, paddingBottom: 28, backgroundColor: colors.card,
            borderTopWidth: 1, borderColor: colors.border,
        },
        checkoutBtn: {
            backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
        },
        checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
        // Modal styles
        modalOverlay: {
            flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
        },
        modalContent: {
            backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 20, paddingBottom: 40, maxHeight: '90%',
        },
        modalHeader: {
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
        },
        modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
        // Section styles
        section: { marginBottom: 20 },
        sectionLabel: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
        // Option card styles
        optionCard: {
            flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12,
            borderWidth: 2, marginBottom: 10,
        },
        optionSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
        optionUnselected: { borderColor: colors.border, backgroundColor: colors.input },
        optionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        optionInfo: { flex: 1 },
        optionName: { fontSize: 15, fontWeight: '600', color: colors.text },
        optionDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
        checkIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
        // Input styles
        inputContainer: { marginTop: 12 },
        inputLabel: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
        timeInput: {
            borderWidth: 1, borderColor: colors.border, borderRadius: 12,
            padding: 14, fontSize: 16, color: colors.text, backgroundColor: colors.input,
        },
        noteInput: {
            borderWidth: 1, borderColor: colors.border, borderRadius: 12,
            padding: 14, fontSize: 14, color: colors.text, backgroundColor: colors.input,
            minHeight: 80, textAlignVertical: 'top',
        },
        infoBox: {
            backgroundColor: colors.primary + '10', borderRadius: 12, padding: 12,
            marginTop: 12, flexDirection: 'row', alignItems: 'flex-start',
        },
        infoText: { fontSize: 13, color: colors.text, flex: 1, marginLeft: 8 },
        // Summary styles
        summaryBox: {
            backgroundColor: colors.input, borderRadius: 12, padding: 16, marginBottom: 20,
        },
        summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
        summaryLabel: { fontSize: 14, color: colors.textSecondary },
        summaryValue: { fontSize: 14, fontWeight: '600', color: colors.text },
        summaryTotal: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
        // Pay button
        payBtn: {
            backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
            alignItems: 'center', marginTop: 10,
        },
        payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
        payBtnDisabled: { opacity: 0.6 },
    };

    const toggleSellerExpand = (sellerId) => {
        setExpandedSellers(prev => ({ ...prev, [sellerId]: !prev[sellerId] }));
    };

    const startCheckout = (seller) => {
        setSelectedSeller(seller);
        setSelectedPayment('cash');
        setDeliveryType('pickup'); // Delivery disabled
        setPreorderTime('');
        setNotes('');
        setShowCheckoutModal(true);
    };

    const sellerGroups = getItemsBySeller();

    const processOrder = async () => {
        if (!selectedSeller) return;

        setProcessing(true);
        try {
            const orderProducts = selectedSeller.items.map((item) => ({
                productId: item.product._id,
                quantity: item.quantity,
                variantName: item.variant?.name || null,
                selectedOptions: (item.selectedOptions || []).map(o => ({
                    groupName: o.groupName,
                    chosen: o.chosen
                }))
            }));

            const orderData = {
                products: orderProducts,
                paymentMethod: selectedPayment,
                deliveryType,
                preorderTime: preorderTime || null,
                notes: notes || '',
                deliveryDate: enableScheduledDelivery ? scheduledDate : '',
                scheduledNotes: enableScheduledDelivery ? scheduledNotes : '',
                deliveryAddress: deliveryType === 'delivery' ? {
                    address: 'Default Address',
                    coordinates: [0, 0]
                } : {
                    address: 'Pickup at store',
                    coordinates: [0, 0]
                },
            };

            await api.post('/orders', orderData);
            await clearSellerCart(selectedSeller.sellerId);
            setShowCheckoutModal(false);
            setSelectedSeller(null);
            Alert.alert(t.orderPlaced, t.orderSuccess, [
                { text: 'View Orders', onPress: () => navigation.navigate('ProfileTab', { screen: 'Orders' }) },
                { text: 'OK' },
            ]);
        } catch (error) {
            console.error('Checkout error:', error);
            Alert.alert(t.error, error.response?.data?.message || 'Failed to place order');
        } finally {
            setProcessing(false);
        }
    };

    const renderCartItem = (item) => {
        const imageUrl = item.product.images?.[0] ? getImageUrl(item.product.images[0]) : '';
        const unitPrice = item.variant ? item.variant.price : item.product.price;
        const optionAdjust = (item.selectedOptions || []).reduce((s, o) => s + (o.priceAdjust || 0), 0);
        const linePrice = unitPrice + optionAdjust;

        return (
            <View style={styles.cartItem}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.itemImage} />
                ) : (
                    <View style={styles.itemImage} />
                )}
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                    {item.variant && (
                        <Text style={styles.itemVariant}>{item.variant.name}</Text>
                    )}
                    <Text style={styles.itemPrice}>{formatPrice(linePrice)}</Text>
                    <View style={styles.quantityRow}>
                        <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => updateQuantity(item.product._id, item.quantity - 1, item.variant, item.selectedOptions)}
                        >
                            <Ionicons name="remove" size={16} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => updateQuantity(item.product._id, item.quantity + 1, item.variant, item.selectedOptions)}
                        >
                            <Ionicons name="add" size={16} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => {
                        Alert.alert(t.removeItem, t.removeItemConfirm, [
                            { text: t.cancel },
                            { text: t.delete, style: 'destructive', onPress: () => removeFromCart(item.product._id, item.variant, item.selectedOptions) },
                        ]);
                    }}
                >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        );
    };

    const renderSellerSection = ({ item: seller }) => {
        const isExpanded = expandedSellers[seller.sellerId] !== false;
        const sellerTotal = getSellerTotal(seller.sellerId);
        const hasStoreName = seller.sellerName !== seller.sellerRealName && seller.sellerRealName !== 'Unknown';

        return (
            <View style={styles.sellerSection}>
                <TouchableOpacity style={styles.sellerHeader} onPress={() => toggleSellerExpand(seller.sellerId)}>
                    <View style={styles.sellerInfo}>
                        <View style={styles.sellerIcon}>
                            <Ionicons name="storefront" size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sellerName} numberOfLines={1}>{seller.sellerName}</Text>
                            {hasStoreName && (
                                <Text style={styles.sellerSubtitle}>by {seller.sellerRealName}</Text>
                            )}
                            <Text style={styles.sellerSubtitle}>{seller.items.length} items</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={styles.sellerTotal}>{formatPrice(sellerTotal)}</Text>
                        <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={20}
                            color={colors.text}
                        />
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View>
                        {seller.items.map((item, index) => (
                            <View key={`${item.product._id}-${index}`}>
                                {renderCartItem(item)}
                            </View>
                        ))}
                        <TouchableOpacity
                            style={[styles.checkoutBtn, { margin: 16 }]}
                            onPress={() => startCheckout(seller)}
                        >
                            <Text style={styles.checkoutBtnText}>{t.checkout}</Text>
                            <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (items.length === 0) {
        return (
            <View style={styles.empty}>
                <Ionicons name="cart-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyTitle}>{t.cartEmpty}</Text>
                <Text style={styles.emptyText}>{t.cartEmptyDesc}</Text>
                <TouchableOpacity
                    style={styles.browseBtn}
                    onPress={() => navigation.navigate('ProductsTab')}
                >
                    <Text style={styles.browseBtnText}>{t.browseProducts}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={sellerGroups}
                keyExtractor={(item) => item.sellerId}
                renderItem={renderSellerSection}
                contentContainerStyle={styles.list}
            />

            {/* Checkout Modal */}
            <Modal
                visible={showCheckoutModal}
                animationType="slide"
                transparent
                onRequestClose={() => setShowCheckoutModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <ScrollView style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t.checkout}</Text>
                            <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Store Info */}
                        {selectedSeller && (
                            <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
                                <Ionicons name="storefront" size={20} color={colors.primary} />
                                <Text style={styles.infoText}>
                                    Ordering from: <Text style={{ fontWeight: '700' }}>{selectedSeller.sellerName}</Text>
                                </Text>
                            </View>
                        )}

                        {/* Pickup confirmation */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Pickup Details</Text>
                            <View style={{
                                backgroundColor: '#ecfdf5',
                                borderWidth: 1.5,
                                borderColor: '#a7f3d0',
                                borderRadius: 14,
                                padding: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 14,
                            }}>
                                <View style={{
                                    width: 44, height: 44, borderRadius: 22,
                                    backgroundColor: '#d1fae5',
                                    justifyContent: 'center', alignItems: 'center',
                                }}>
                                    <Ionicons name="storefront" size={22} color="#059669" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#065f46' }}>
                                        Pickup at {selectedSeller?.sellerName}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                                        Collect your order from the store — no extra fees!
                                    </Text>
                                </View>
                                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                            </View>
                        </View>

                        {/* Preorder Time */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>
                                Pickup Time
                            </Text>

                            {/* Schedule for later toggle */}
                            <TouchableOpacity
                                style={[styles.optionCard, { marginBottom: 12 }]}
                                onPress={() => setEnableScheduledDelivery(!enableScheduledDelivery)}
                            >
                                <View style={styles.optionIcon}>
                                    <Ionicons name="calendar-outline" size={22} color={enableScheduledDelivery ? '#10b981' : colors.primary} />
                                </View>
                                <View style={styles.optionInfo}>
                                    <Text style={[styles.optionName, { color: enableScheduledDelivery ? '#10b981' : colors.text }]}>
                                        Schedule for another day
                                    </Text>
                                    <Text style={styles.optionDesc}>
                                        Pick up on a specific date & time
                                    </Text>
                                </View>
                                <View style={[
                                    styles.checkIcon,
                                    { backgroundColor: enableScheduledDelivery ? '#10b981' : colors.border }
                                ]}>
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                </View>
                            </TouchableOpacity>

                            {enableScheduledDelivery && (
                                <View style={{ gap: 12 }}>
                                    {/* Date Selection */}
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Pickup Date</Text>
                                        <TouchableOpacity
                                            style={styles.timeInput}
                                            onPress={() => {
                                                // Generate next 30 days
                                                const today = new Date();
                                                const maxDate = new Date();
                                                maxDate.setDate(today.getDate() + 30);

                                                // For simplicity, set a default date (tomorrow)
                                                const tomorrow = new Date();
                                                tomorrow.setDate(tomorrow.getDate() + 1);
                                                const dateStr = tomorrow.toISOString().split('T')[0];
                                                setScheduledDate(dateStr);
                                            }}
                                        >
                                            <Text style={{ fontSize: 16, color: scheduledDate ? colors.text : colors.textSecondary }}>
                                                {scheduledDate || 'Select date'}
                                            </Text>
                                            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                                            Maximum 30 days ahead
                                        </Text>
                                    </View>

                                    {/* Time Selection */}
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Pickup Time</Text>
                                        <TouchableOpacity
                                            style={styles.timeInput}
                                            onPress={() => {
                                                // Default to 19:00
                                                setScheduledTime('19:00');
                                            }}
                                        >
                                            <Text style={{ fontSize: 16, color: scheduledTime ? colors.text : colors.textSecondary }}>
                                                {scheduledTime || 'Select time'}
                                            </Text>
                                            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Scheduled Delivery Notes */}
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Pickup Notes (optional)</Text>
                                        <TouchableOpacity
                                            style={styles.noteInput}
                                            onPress={() => {
                                                // In real app, show text input
                                            }}
                                        >
                                            <Text style={{ fontSize: 14, color: scheduledNotes ? colors.text : colors.textSecondary }}>
                                                {scheduledNotes || 'e.g., Leave at door, Ring bell...'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={[styles.infoBox, { backgroundColor: '#dbeafe' }]}>
                                        <Ionicons name="information-circle" size={20} color="#2563eb" />
                                        <Text style={[styles.infoText, { color: '#1e40af' }]}>
                                            The seller will confirm your scheduled pickup before preparation
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {!enableScheduledDelivery && (
                                <View style={styles.timeInput}>
                                    <TouchableOpacity
                                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                                        onPress={() => {
                                            setPreorderTime('14:00');
                                        }}
                                    >
                                        <Text style={{ fontSize: 16, color: preorderTime ? colors.text : colors.textSecondary }}>
                                            {preorderTime || 'Tap to select time'}
                                        </Text>
                                        <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Note for Seller */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Note for Seller (optional)</Text>
                            <View style={styles.inputContainer}>
                                <TouchableOpacity
                                    style={styles.noteInput}
                                    onPress={() => {
                                        // In real app, show text input modal
                                        // For now, set a sample note
                                        setNotes('');
                                    }}
                                >
                                    <Text style={{ fontSize: 14, color: notes ? colors.text : colors.textSecondary }}>
                                        {notes || 'Any special requests? e.g., extra spicy, no onions...'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Payment Methods */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Payment Method</Text>
                            {PAYMENT_METHODS.map((method) => (
                                <TouchableOpacity
                                    key={method.id}
                                    style={[
                                        styles.optionCard,
                                        selectedPayment === method.id ? styles.optionSelected : styles.optionUnselected
                                    ]}
                                    onPress={() => setSelectedPayment(method.id)}
                                    disabled={method.id !== 'cash'}
                                >
                                    <View style={styles.optionIcon}>
                                        <Ionicons name={method.icon} size={22} color={colors.primary} />
                                    </View>
                                    <View style={styles.optionInfo}>
                                        <Text style={styles.optionName}>{method.name}</Text>
                                        <Text style={styles.optionDesc}>{method.description}</Text>
                                    </View>
                                    {selectedPayment === method.id && (
                                        <View style={styles.checkIcon}>
                                            <Ionicons name="checkmark" size={16} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Order Summary */}
                        {selectedSeller && (
                            <View style={styles.summaryBox}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Items ({selectedSeller.items.length})</Text>
                                    <Text style={styles.summaryValue}>{formatPrice(getSellerTotal(selectedSeller.sellerId))}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Store Pickup</Text>
                                    <Text style={[styles.summaryValue, { color: '#10b981' }]}>✓ Free</Text>
                                </View>
                                <View style={[styles.summaryRow, styles.summaryTotal]}>
                                    <Text style={styles.summaryLabel}>{t.total}</Text>
                                    <Text style={styles.summaryValue}>
                                        {formatPrice(getSellerTotal(selectedSeller.sellerId))}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Pay Button */}
                        <TouchableOpacity
                            style={[styles.payBtn, processing && styles.payBtnDisabled]}
                            onPress={processOrder}
                            disabled={processing}
                        >
                            <Text style={styles.payBtnText}>
                                {processing
                                    ? 'Processing...'
                                    : enableScheduledDelivery
                                        ? 'Send Request'
                                        : 'Place Order'
                                }
                            </Text>
                        </TouchableOpacity>

                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
