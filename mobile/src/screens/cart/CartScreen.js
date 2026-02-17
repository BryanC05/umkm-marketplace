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
import { PLACEHOLDER_IMAGE } from '../../config';
import api from '../../api/api';

const PAYMENT_METHODS = [
    { id: 'cash', name: 'Cash on Delivery', icon: 'cash-outline', description: 'Pay when you receive' },
    { id: 'card', name: 'Credit/Debit Card', icon: 'card-outline', description: 'Pay with card (coming soon)' },
    { id: 'ewallet', name: 'E-Wallet', icon: 'wallet-outline', description: 'Pay with e-wallet (coming soon)' },
];

export default function CartScreen({ navigation }) {
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
    const { items, updateQuantity, removeFromCart, clearCart, loadCart, isLoaded } = useCartStore();
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState('cash');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!isLoaded) loadCart();
    }, [isLoaded]);

    const totalPrice = items.reduce((sum, item) => {
        let unitPrice = item.variant ? item.variant.price : item.product.price;
        if (item.selectedOptions?.length > 0) {
            unitPrice += item.selectedOptions.reduce((s, o) => s + (o.priceAdjust || 0), 0);
        }
        return sum + unitPrice * item.quantity;
    }, 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    const styles = {
        container: { flex: 1, backgroundColor: colors.background },
        list: { padding: 16, paddingBottom: 100 },
        cartItem: {
            flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, padding: 12,
            marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
        },
        itemImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: colors.border },
        itemInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
        itemName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
        itemPrice: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 8 },
        quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        qtyBtn: {
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: colors.input, justifyContent: 'center', alignItems: 'center',
        },
        qtyText: { fontSize: 14, fontWeight: '700', color: colors.text, minWidth: 20, textAlign: 'center' },
        removeBtn: { justifyContent: 'center', paddingLeft: 8 },
        checkoutBar: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            padding: 16, paddingBottom: 32, backgroundColor: colors.card,
            borderTopWidth: 1, borderColor: colors.border,
        },
        checkoutInfo: {},
        checkoutLabel: { fontSize: 12, color: colors.textSecondary },
        checkoutTotal: { fontSize: 20, fontWeight: '800', color: colors.text },
        checkoutBtn: {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14,
            shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
        },
        checkoutBtnDisabled: { opacity: 0.7 },
        checkoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
        empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
        emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 16 },
        emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
        browseBtn: {
            marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
        },
        browseBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
        // Modal styles
        modalOverlay: {
            flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
        },
        modalContent: {
            backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 20, paddingBottom: 40, maxHeight: '80%',
        },
        modalHeader: {
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
        },
        modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
        orderSummary: {
            backgroundColor: colors.input, borderRadius: 12, padding: 16, marginBottom: 20,
        },
        summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
        summaryLabel: { fontSize: 14, color: colors.textSecondary },
        summaryValue: { fontSize: 14, fontWeight: '600', color: colors.text },
        summaryTotal: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
        paymentSection: { marginBottom: 20 },
        sectionLabel: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
        paymentOption: {
            flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12,
            borderWidth: 2, marginBottom: 10,
        },
        paymentOptionSelected: {
            borderColor: colors.primary, backgroundColor: colors.primary + '10',
        },
        paymentOptionUnselected: {
            borderColor: colors.border, backgroundColor: colors.input,
        },
        paymentIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        paymentInfo: { flex: 1 },
        paymentName: { fontSize: 15, fontWeight: '600', color: colors.text },
        paymentDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
        checkIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
        payBtn: {
            backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16,
            alignItems: 'center', marginTop: 10,
        },
        payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    };

    const handleCheckout = () => {
        if (!isAuthenticated) {
            Alert.alert(t.error, 'Please login to checkout');
            return;
        }
        if (items.length === 0) {
            Alert.alert(t.error, t.cartEmpty);
            return;
        }
        setShowPaymentModal(true);
    };

    const processOrder = async () => {
        setProcessing(true);
        try {
            const orderProducts = items.map((item) => ({
                productId: item.product._id,
                quantity: item.quantity,
                variantName: item.variant?.name || null,
                selectedOptions: (item.selectedOptions || []).map(o => ({
                    groupName: o.groupName,
                    chosen: o.chosen
                }))
            }));
            console.log('Placing order with products:', orderProducts, 'Payment:', selectedPayment);
            await api.post('/orders', {
                products: orderProducts,
                paymentMethod: selectedPayment,
                deliveryAddress: {
                    address: 'Default Address',
                    coordinates: [0, 0]
                },
            });
            await clearCart();
            setShowPaymentModal(false);
            Alert.alert(t.orderPlaced, t.orderSuccess, [
                { text: 'View Orders', onPress: () => navigation.navigate('ProfileTab', { screen: 'Orders' }) },
                { text: 'OK' },
            ]);
        } catch (error) {
            console.error('Checkout error:', error);
            if (error.response?.status === 401) {
                Alert.alert(
                    'Session Expired',
                    'Your session has expired. Please login again.',
                    [
                        { text: 'Login', onPress: () => navigation.navigate('Auth') },
                        { text: 'Cancel' }
                    ]
                );
            } else {
                Alert.alert(t.error, error.response?.data?.message || 'Failed to place order');
            }
        } finally {
            setProcessing(false);
        }
    };

    const renderItem = ({ item }) => {
        const imageUrl = item.product.images?.[0] ? getImageUrl(item.product.images[0]) : PLACEHOLDER_IMAGE;
        const unitPrice = item.variant ? item.variant.price : item.product.price;
        const optionAdjust = (item.selectedOptions || []).reduce((s, o) => s + (o.priceAdjust || 0), 0);
        const linePrice = unitPrice + optionAdjust;
        return (
            <View style={styles.cartItem}>
                <Image source={{ uri: imageUrl }} style={styles.itemImage} />
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.product.name}</Text>
                    {item.variant && (
                        <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600', marginBottom: 2 }}>
                            {item.variant.name}
                        </Text>
                    )}
                    {item.selectedOptions?.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                            {item.selectedOptions.map((opt, i) => (
                                <Text key={i} style={{ fontSize: 10, backgroundColor: colors.input, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, color: colors.textSecondary }}>
                                    {opt.groupName}: {opt.chosen?.join(', ')}
                                </Text>
                            ))}
                        </View>
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
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
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
                data={items}
                keyExtractor={(item) => item.product._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
            />
            {/* Checkout Bar */}
            <View style={styles.checkoutBar}>
                <View style={styles.checkoutInfo}>
                    <Text style={styles.checkoutLabel}>{totalItems} items</Text>
                    <Text style={styles.checkoutTotal}>{formatPrice(totalPrice)}</Text>
                </View>
                <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                    <Text style={styles.checkoutBtnText}>{t.checkout}</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Payment Method Modal */}
            <Modal visible={showPaymentModal} animationType="slide" transparent onRequestClose={() => setShowPaymentModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t.checkout}</Text>
                            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Order Summary */}
                        <View style={styles.orderSummary}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Items ({totalItems})</Text>
                                <Text style={styles.summaryValue}>{formatPrice(totalPrice)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                                <Text style={styles.summaryValue}>Free</Text>
                            </View>
                            <View style={[styles.summaryRow, styles.summaryTotal]}>
                                <Text style={styles.summaryLabel}>{t.total}</Text>
                                <Text style={styles.summaryValue}>{formatPrice(totalPrice)}</Text>
                            </View>
                        </View>

                        {/* Payment Methods */}
                        <View style={styles.paymentSection}>
                            <Text style={styles.sectionLabel}>Payment Method</Text>
                            <ScrollView>
                                {PAYMENT_METHODS.map((method) => (
                                    <TouchableOpacity
                                        key={method.id}
                                        style={[
                                            styles.paymentOption,
                                            selectedPayment === method.id ? styles.paymentOptionSelected : styles.paymentOptionUnselected
                                        ]}
                                        onPress={() => setSelectedPayment(method.id)}
                                        disabled={method.id !== 'cash'}
                                    >
                                        <View style={styles.paymentIcon}>
                                            <Ionicons name={method.icon} size={20} color={colors.primary} />
                                        </View>
                                        <View style={styles.paymentInfo}>
                                            <Text style={styles.paymentName}>{method.name}</Text>
                                            <Text style={styles.paymentDesc}>{method.description}</Text>
                                        </View>
                                        {selectedPayment === method.id && (
                                            <View style={styles.checkIcon}>
                                                <Ionicons name="checkmark" size={16} color="#fff" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Pay Button */}
                        <TouchableOpacity
                            style={[styles.payBtn, processing && styles.checkoutBtnDisabled]}
                            onPress={processOrder}
                            disabled={processing}
                        >
                            <Text style={styles.payBtnText}>
                                {processing ? 'Processing...' : `Pay ${formatPrice(totalPrice)}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
