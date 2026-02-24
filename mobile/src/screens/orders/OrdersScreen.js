import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    RefreshControl, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/api';
import { getImageUrl, formatPrice, formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import DriverRatingModal from '../../components/DriverRatingModal';
import { OrdersListSkeleton } from '../../components/LoadingSkeleton';

const DELIVERY_STATUSES = ['claimed', 'picked_up', 'on_the_way', 'arrived'];

export default function OrdersScreen({ navigation }) {
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
    const { user } = useAuthStore();
    const STATUS_COLORS = {
        pending: { bg: '#fef3c7', text: '#92400e', label: t.pending },
        confirmed: { bg: '#dbeafe', text: '#1e40af', label: t.confirmed },
        preparing: { bg: '#e0e7ff', text: '#3730a3', label: t.preparing },
        ready: { bg: '#e0e7ff', text: '#3730a3', label: t.ready },
        claimed: { bg: '#fef3c7', text: '#92400e', label: t.claimed || 'Claimed' },
        picked_up: { bg: '#ddd6fe', text: '#6d28d9', label: t.pickedUp || 'Picked Up' },
        on_the_way: { bg: '#cffafe', text: '#0e7490', label: t.onTheWay || 'On the Way' },
        arrived: { bg: '#d1fae5', text: '#065f46', label: t.arrived || 'Arrived' },
        delivered: { bg: '#d1fae5', text: '#065f46', label: t.delivered },
        cancelled: { bg: '#fee2e2', text: '#991b1b', label: t.cancelled },
        // Scheduled delivery statuses
        pending_seller_review: { bg: '#fef3c7', text: '#92400e', label: t.waitingForSeller || 'Waiting for Seller' },
        seller_accepted: { bg: '#dbeafe', text: '#1e40af', label: t.awaitingConfirmation || 'Awaiting Confirmation' },
        seller_declined: { bg: '#fee2e2', text: '#991b1b', label: t.requestDeclined || 'Request Declined' },
        awaiting_buyer_confirm: { bg: '#fef3c7', text: '#92400e', label: t.reviewRequired || 'Review Required' },
    };
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedOrders, setExpandedOrders] = useState({});
    const [ratingModal, setRatingModal] = useState({ visible: false, orderId: null, driverName: null });
    const [ratedOrders, setRatedOrders] = useState({});

    const fetchOrders = useCallback(async () => {
        try {
            const response = await api.get('/orders/my-orders');
            setOrders(response.data || []);
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchOrders();
        setRefreshing(false);
    };

    const toggleExpand = (orderId) => {
        setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
    };

    const handleSellerResponse = async (orderId, action, notes = '') => {
        try {
            await api.put(`/orders/${orderId}/seller-response`, { action, notes });
            Alert.alert(t.success || 'Success', `${t.orderActionSuccessPrefix || 'Order'} ${action} ${t.orderActionSuccessSuffix || 'successfully'}`);
            fetchOrders();
        } catch (error) {
            Alert.alert(t.error || 'Error', error.response?.data?.message || t.failedRespondOrder || 'Failed to respond to order');
        }
    };

    const handleBuyerConfirm = async (orderId, confirm = true) => {
        try {
            await api.put(`/orders/${orderId}/buyer-confirm`, { confirm });
            Alert.alert(
                t.success || 'Success',
                confirm
                    ? (t.orderConfirmedProceedPayment || 'Order confirmed! Please proceed to payment.')
                    : (t.orderDeclined || 'Order declined.')
            );
            fetchOrders();
        } catch (error) {
            Alert.alert(t.error || 'Error', error.response?.data?.message || t.failedConfirmOrder || 'Failed to confirm order');
        }
    };

    const showSellerResponseModal = (order) => {
        Alert.alert(
            t.respondToRequest || 'Respond to Request',
            t.chooseActionForScheduledRequest || 'Choose an action for this scheduled delivery request',
            [
                { text: t.accept || 'Accept', onPress: () => handleSellerResponse(order._id, 'accept') },
                { text: t.requestChanges || 'Request Changes', onPress: () => {
                    Alert.prompt(
                        t.requestChanges || 'Request Changes',
                        t.enterReasonForChanges || 'Enter reason for changes:',
                        (notes) => handleSellerResponse(order._id, 'request_changes', notes)
                    );
                }},
                { text: t.decline || 'Decline', onPress: () => handleSellerResponse(order._id, 'decline'), style: 'destructive' },
                { text: t.cancel || 'Cancel', style: 'cancel' },
            ]
        );
    };

    const isSeller = (order) => {
        const sellerId = order.seller?._id || order.seller;
        return sellerId === user?._id;
    };

    if (loading) return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <OrdersListSkeleton count={4} />
        </View>
    );

    const styles = {
        container: { flex: 1, backgroundColor: colors.background },
        list: { padding: 16, paddingBottom: 30 },
        orderCard: {
            backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
            borderWidth: 1,
            borderColor: colors.border,
        },
        orderCardDelivery: {
            borderLeftWidth: 4,
            borderLeftColor: '#2563eb',
        },
        orderCardPickup: {
            borderLeftWidth: 4,
            borderLeftColor: '#16a34a',
        },
        orderHeader: {
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingBottom: 10,
        },
        orderHeaderLeft: { flex: 1 },
        orderHeaderMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        orderId: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
        orderDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
        orderTypePill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 999,
        },
        orderTypeText: {
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.2,
        },
        orderHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
        statusText: { fontSize: 11, fontWeight: '700' },
        totalCompact: { fontSize: 14, fontWeight: '700', color: colors.text },
        expandIcon: { padding: 4 },
        // Expanded content
        expandedContent: {
            borderTopWidth: 1, borderColor: colors.border, paddingTop: 12,
        },
        // Delivery info styles
        deliveryInfo: {
            flexDirection: 'row', alignItems: 'center', backgroundColor: colors.input, 
            padding: 10, borderRadius: 10, marginBottom: 12,
        },
        pickupInfo: {
            flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '10', 
            padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.primary + '30',
        },
        deliveryIcon: { marginRight: 8 },
        deliveryText: { fontSize: 13, fontWeight: '600', color: colors.text, flex: 1 },
        deliveryTime: { fontSize: 12, color: colors.primary, fontWeight: '700' },
        // Seller info
        sellerInfo: {
            flexDirection: 'row', alignItems: 'center', marginBottom: 12,
        },
        sellerIcon: { marginRight: 6 },
        sellerName: { fontSize: 13, fontWeight: '600', color: colors.text },
        // Notes
        notesBox: {
            backgroundColor: colors.input, padding: 10, borderRadius: 10, marginBottom: 12,
        },
        notesLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 2 },
        notesText: { fontSize: 12, color: colors.text, fontStyle: 'italic' },
        orderItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
        orderImage: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.border },
        orderItemInfo: { flex: 1, marginLeft: 10 },
        orderItemName: { fontSize: 13, fontWeight: '600', color: colors.text },
        orderItemQty: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
        orderItemPrice: { fontSize: 13, fontWeight: '600', color: colors.text },
        orderFooter: {
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 4,
        },
        totalLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
        totalValue: { fontSize: 16, fontWeight: '800', color: colors.text },
        trackBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.primary, paddingVertical: 10, borderRadius: 10,
            marginTop: 12, gap: 6,
        },
        trackBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
        rateBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.success, paddingVertical: 10, borderRadius: 10,
            marginTop: 8, gap: 6,
        },
        rateBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
        ratedBadge: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.success + '20', paddingVertical: 8, borderRadius: 10,
            marginTop: 8, gap: 4,
        },
        ratedText: { color: colors.success, fontSize: 13, fontWeight: '600' },
        // Preorder special styles
        preorderCard: {
            backgroundColor: '#fef3c7',
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
            borderWidth: 2,
            borderColor: '#f59e0b',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        preorderHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
        },
        preorderBadge: {
            backgroundColor: '#f59e0b',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 12,
        },
        preorderBadgeText: {
            color: '#fff',
            fontSize: 11,
            fontWeight: '700',
        },
        preorderDate: {
            fontSize: 18,
            fontWeight: '800',
            color: '#92400e',
        },
        preorderTime: {
            fontSize: 14,
            color: '#92400e',
            marginTop: 2,
        },
        preorderCountdown: {
            fontSize: 12,
            color: '#b45309',
            marginTop: 8,
            backgroundColor: 'rgba(255,255,255,0.5)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            alignSelf: 'flex-start',
        },
        preorderProof: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: 'rgba(146, 64, 14, 0.2)',
        },
        preorderProofText: {
            fontSize: 11,
            color: '#92400e',
            flex: 1,
        },
        empty: { alignItems: 'center', paddingTop: 80 },
        emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 12 },
        emptyText: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    };

    const renderOrder = ({ item: order }) => {
        const displayStatus = order.requestStatus || order.status;
        const statusInfo = STATUS_COLORS[displayStatus] || STATUS_COLORS.pending;
        const isPickup = order.deliveryType === 'pickup';
        const isExpanded = !!expandedOrders[order._id];
        const orderIdShort = order._id.slice(-8).toUpperCase();
        
        // Check if this is a scheduled delivery with a future date
        const isScheduled = order.isPreorder && order.deliveryDate;
        const scheduledDateFormatted = isScheduled ? formatDate(order.deliveryDate) : '';
        
        // Show special preorder card for scheduled deliveries
        if (isScheduled) {
            return (
                <View style={styles.preorderCard}>
                    {/* Preorder Header */}
                    <View style={styles.preorderHeader}>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="calendar" size={24} color="#f59e0b" />
                                <Text style={{ fontSize: 14, fontWeight: '700', color: '#92400e' }}>
                                    {t.preorder || 'PREORDER'}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.preorderBadge, { backgroundColor: displayStatus === 'pending_seller_review' ? '#f59e0b' : displayStatus === 'seller_accepted' ? '#10b981' : displayStatus === 'seller_declined' ? '#ef4444' : '#6b7280' }]}>
                            <Text style={styles.preorderBadgeText}>
                                {displayStatus === 'pending_seller_review'
                                    ? (t.waitingApproval || 'WAITING APPROVAL')
                                    : displayStatus === 'seller_accepted'
                                        ? (t.approved || 'APPROVED')
                                        : displayStatus === 'seller_declined'
                                            ? (t.declinedUpper || 'DECLINED')
                                            : displayStatus === 'awaiting_buyer_confirm'
                                                ? (t.actionNeeded || 'ACTION NEEDED')
                                                : (t.pendingUpper || 'PENDING')}
                            </Text>
                        </View>
                    </View>
                    
                    {/* Scheduled Date & Time */}
                    <Text style={styles.preorderDate}>{scheduledDateFormatted}</Text>
                    <Text style={styles.preorderTime}>{t.atLabel || 'at'} {order.preorderTime}</Text>
                    
                    {/* Products Preview */}
                    <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="cube-outline" size={16} color="#92400e" />
                        <Text style={{ fontSize: 13, color: '#92400e', flex: 1 }}>
                            {order.products?.length || 0} {t.items || 'items'} • {formatPrice(order.totalAmount)}
                        </Text>
                    </View>
                    
                    {/* Order ID for proof */}
                    <View style={styles.preorderProof}>
                        <Ionicons name="receipt-outline" size={14} color="#92400e" />
                        <Text style={styles.preorderProofText}>
                            {t.orderLabel || 'Order'} #{orderIdShort} • {formatDate(order.createdAt) || (t.justNow || 'Just now')}
                        </Text>
                    </View>
                    
                    {/* Action Buttons */}
                    {displayStatus === 'seller_accepted' && (
                        <TouchableOpacity 
                            style={[styles.trackBtn, { backgroundColor: '#10b981', marginTop: 12 }]}
                            onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.trackBtnText}>{t.confirmAndPay || 'Confirm & Pay'}</Text>
                        </TouchableOpacity>
                    )}
                    
                    {displayStatus === 'pending_seller_review' && (
                        <View style={[styles.preorderCountdown, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                            <Ionicons name="time-outline" size={12} color="#b45309" />
                            <Text style={{ fontSize: 12, color: '#b45309' }}>{t.waitingSellerResponse || 'Waiting for seller to respond'}</Text>
                        </View>
                    )}
                    
                    {displayStatus === 'seller_declined' && (
                        <View style={{ marginTop: 12, padding: 10, backgroundColor: '#fee2e2', borderRadius: 8 }}>
                            <Text style={{ color: '#991b1b', fontSize: 13 }}>{t.requestDeclined || 'Request declined'}</Text>
                            {order.sellerResponseNotes && (
                                <Text style={{ color: '#991b1b', fontSize: 12, marginTop: 4 }}>{order.sellerResponseNotes}</Text>
                            )}
                        </View>
                    )}
                    
                    <TouchableOpacity 
                        style={{ marginTop: 10, alignItems: 'center' }}
                        onPress={() => toggleExpand(order._id)}
                    >
                        <Text style={{ color: '#92400e', fontSize: 12, textDecorationLine: 'underline' }}>
                            {isExpanded ? (t.hideDetails || 'Hide details') : (t.viewDetails || 'View details')}
                        </Text>
                    </TouchableOpacity>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(146, 64, 14, 0.2)' }}>
                            {/* Seller Info */}
                            {order.seller && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <Ionicons name="storefront-outline" size={16} color="#92400e" />
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>
                                        {order.seller.businessName || order.seller.name}
                                    </Text>
                                </View>
                            )}
                            
                            {/* Delivery Notes */}
                            {order.scheduledNotes && (
                                <View style={{ backgroundColor: 'rgba(255,255,255,0.5)', padding: 10, borderRadius: 8, marginBottom: 10 }}>
                                    <Text style={{ fontSize: 12, color: '#92400e' }}>
                                        📝 {order.scheduledNotes}
                                    </Text>
                                </View>
                            )}
                            
                            {/* Products */}
                            {order.products?.map((item, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 12, color: '#92400e' }}>• {item.product?.name || (t.productLabel || 'Product')} x{item.quantity}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            );
        }
        
        // Regular order card
        return (
            <View style={[styles.orderCard, isPickup ? styles.orderCardPickup : styles.orderCardDelivery]}>
                {/* Header - Clickable */}
                <TouchableOpacity style={styles.orderHeader} onPress={() => toggleExpand(order._id)}>
                    <View style={styles.orderHeaderLeft}>
                        <View style={styles.orderHeaderMeta}>
                            <Text style={styles.orderId}>#{orderIdShort}</Text>
                            <View
                                style={[
                                    styles.orderTypePill,
                                    {
                                        backgroundColor: isPickup ? 'rgba(34, 197, 94, 0.16)' : 'rgba(37, 99, 235, 0.14)',
                                    },
                                ]}
                            >
                                <Ionicons
                                    name={isPickup ? 'storefront' : 'car'}
                                    size={11}
                                    color={isPickup ? '#166534' : '#1e40af'}
                                />
                                <Text style={[styles.orderTypeText, { color: isPickup ? '#166534' : '#1e40af' }]}>
                                    {isPickup ? (t.pickupLabel || 'PICKUP') : (t.deliveryLabel || 'DELIVERY')}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.orderDate}>{formatDate(order.createdAt) || (t.justNow || 'Just now')}</Text>
                    </View>
                    <View style={styles.orderHeaderRight}>
                        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                            <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                        </View>
                        <Text style={styles.totalCompact}>{formatPrice(order.totalAmount)}</Text>
                        <View style={styles.expandIcon}>
                            <Ionicons 
                                name={isExpanded ? "chevron-up" : "chevron-down"} 
                                size={20} 
                                color={colors.text} 
                            />
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Expanded Content */}
                {isExpanded && (
                    <View style={styles.expandedContent}>
                        {/* Seller Info */}
                        {order.seller && (
                            <View style={styles.sellerInfo}>
                                <Ionicons name="storefront-outline" size={16} color={colors.primary} style={styles.sellerIcon} />
                                <Text style={styles.sellerName}>{order.seller.businessName || order.seller.name}</Text>
                            </View>
                        )}

                        {/* Delivery/Pickup Info */}
                        {isPickup ? (
                            <View style={styles.pickupInfo}>
                                <Ionicons name="storefront" size={18} color={colors.primary} style={styles.deliveryIcon} />
                                <Text style={styles.deliveryText}>🏪 {t.pickupAtStore || 'Pickup at Store'}</Text>
                                {order.preorderTime && (
                                    <Text style={styles.deliveryTime}>{order.preorderTime}</Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.deliveryInfo}>
                                <Ionicons name="car" size={18} color={colors.textSecondary} style={styles.deliveryIcon} />
                                <Text style={styles.deliveryText}>🚗 {t.deliveryLabel || 'Delivery'}</Text>
                                {order.preorderTime && (
                                    <Text style={styles.deliveryTime}>{order.preorderTime}</Text>
                                )}
                            </View>
                        )}

                        {/* Scheduled Delivery Info */}
                        {order.isPreorder && order.deliveryDate && (
                            <View style={{ 
                                backgroundColor: colors.primary + '10', 
                                padding: 12, 
                                borderRadius: 10, 
                                marginBottom: 12,
                                borderWidth: 1,
                                borderColor: colors.primary + '30',
                            }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="calendar" size={18} color={colors.primary} />
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                                        {t.scheduledDelivery || 'Scheduled Delivery'}
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 13, color: colors.text, marginTop: 4 }}>
                                    📅 {order.deliveryDate} {t.atLabel || 'at'} {order.preorderTime}
                                </Text>
                                {order.scheduledNotes && (
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                                        📝 {order.scheduledNotes}
                                    </Text>
                                )}
                                {order.requestDeadline && (
                                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6 }}>
                                        ⏰ {t.sellerRespond24Hours || 'Seller has to respond within 24 hours'}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Notes */}
                        {order.notes && (
                            <View style={styles.notesBox}>
                                <Text style={styles.notesLabel}>{t.noteLabel || 'Note'}:</Text>
                                <Text style={styles.notesText}>{order.notes}</Text>
                            </View>
                        )}

                        {/* Products */}
                        {order.products?.map((item, idx) => {
                            const img = item.product?.images?.[0] ? getImageUrl(item.product.images[0]) : '';
                            return (
                                <View key={idx} style={styles.orderItem}>
                                    {img ? (
                                        <Image source={{ uri: img }} style={styles.orderImage} />
                                    ) : (
                                        <View style={styles.orderImage} />
                                    )}
                                    <View style={styles.orderItemInfo}>
                                        <Text style={styles.orderItemName} numberOfLines={1}>{item.product?.name || (t.productLabel || 'Product')}</Text>
                                        {item.variantName ? (
                                            <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{item.variantName}</Text>
                                        ) : null}
                                        {item.selectedOptions?.length > 0 ? (
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 1 }}>
                                                {item.selectedOptions.map((opt, oi) => (
                                                    <Text key={oi} style={{ fontSize: 9, backgroundColor: colors.input || colors.border, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, color: colors.textSecondary }}>
                                                        {opt.groupName}: {opt.chosen?.join(', ')}
                                                    </Text>
                                                ))}
                                            </View>
                                        ) : null}
                                        <Text style={styles.orderItemQty}>{t.qtyLabel || 'Qty'}: {item.quantity}</Text>
                                    </View>
                                    <Text style={styles.orderItemPrice}>{formatPrice(item.price * item.quantity)}</Text>
                                </View>
                            );
                        })}

                        {/* Footer */}
                        <View style={styles.orderFooter}>
                            <Text style={styles.totalLabel}>{t.total}</Text>
                            <Text style={styles.totalValue}>{formatPrice(order.totalAmount)}</Text>
                        </View>

                        {/* Track Delivery Button */}
                        {DELIVERY_STATUSES.includes(order.status) && order.claimedBy && (
                            <TouchableOpacity 
                                style={styles.trackBtn}
                                onPress={() => navigation.navigate('LiveTracking', { orderId: order._id })}
                            >
                                <Ionicons name="location" size={18} color="#fff" />
                                <Text style={styles.trackBtnText}>{t.trackDelivery || 'Track Delivery'}</Text>
                            </TouchableOpacity>
                        )}

                        {/* Rate Driver Button */}
                        {order.status === 'delivered' && order.claimedBy && !order.driverRating && !ratedOrders[order._id] && (
                            <TouchableOpacity 
                                style={styles.rateBtn}
                                onPress={() => setRatingModal({
                                    visible: true,
                                    orderId: order._id,
                                    driverName: order.driverName,
                                })}
                            >
                                <Ionicons name="star" size={18} color="#fff" />
                                <Text style={styles.rateBtnText}>{t.rateDriver || 'Rate Driver'}</Text>
                            </TouchableOpacity>
                        )}

                        {/* Scheduled Delivery Actions for Buyer */}
                        {order.requestStatus === 'seller_accepted' && (
                            <TouchableOpacity 
                                style={[styles.trackBtn, { backgroundColor: '#10b981' }]}
                            onPress={() => handleBuyerConfirm(order._id, true)}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.trackBtnText}>{t.confirmAndPay || 'Confirm & Pay'}</Text>
                        </TouchableOpacity>
                    )}

                        {order.requestStatus === 'awaiting_buyer_confirm' && (
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                <TouchableOpacity 
                                    style={[styles.trackBtn, { flex: 1, backgroundColor: '#10b981' }]}
                                    onPress={() => handleBuyerConfirm(order._id, true)}
                                >
                                    <Text style={styles.trackBtnText}>{t.acceptChanges || 'Accept Changes'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.trackBtn, { flex: 1, backgroundColor: '#ef4444' }]}
                                    onPress={() => handleBuyerConfirm(order._id, false)}
                                >
                                    <Text style={styles.trackBtnText}>{t.decline || 'Decline'}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* SELLER ACTIONS - Scheduled Delivery Request */}
                        {order.requestStatus === 'pending_seller_review' && isSeller(order) && (
                            <View style={{ gap: 8, marginTop: 12 }}>
                                <View style={{ 
                                    backgroundColor: '#fef3c7', 
                                    padding: 10, 
                                    borderRadius: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 8,
                                }}>
                                    <Ionicons name="time" size={18} color="#92400e" />
                                    <Text style={{ color: '#92400e', fontSize: 13, flex: 1 }}>
                                        {t.newScheduledRequest || 'New scheduled delivery request'}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity 
                                        style={[styles.trackBtn, { flex: 1, backgroundColor: '#10b981' }]}
                                        onPress={() => handleSellerResponse(order._id, 'accept')}
                                    >
                                        <Ionicons name="checkmark" size={18} color="#fff" />
                                        <Text style={styles.trackBtnText}>{t.accept || 'Accept'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.trackBtn, { flex: 1, backgroundColor: '#6b7280' }]}
                                        onPress={() => showSellerResponseModal(order)}
                                    >
                                        <Ionicons name="chatbubble" size={18} color="#fff" />
                                        <Text style={styles.trackBtnText}>{t.chatChanges || 'Chat/Changes'}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.trackBtn, { flex: 1, backgroundColor: '#ef4444' }]}
                                        onPress={() => handleSellerResponse(order._id, 'decline')}
                                    >
                                        <Ionicons name="close" size={18} color="#fff" />
                                        <Text style={styles.trackBtnText}>{t.decline || 'Decline'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {order.requestStatus === 'seller_declined' && (
                            <View style={{ 
                                backgroundColor: '#fee2e2', 
                                padding: 12, 
                                borderRadius: 10, 
                                marginTop: 12 
                            }}>
                                <Text style={{ color: '#991b1b', fontWeight: '600' }}>
                                    {t.requestDeclinedBySeller || 'Request declined by seller'}
                                </Text>
                                {order.sellerResponseNotes && (
                                    <Text style={{ color: '#991b1b', fontSize: 12, marginTop: 4 }}>
                                        {t.reasonLabel || 'Reason'}: {order.sellerResponseNotes}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Already Rated Badge */}
                        {(order.driverRating || ratedOrders[order._id]) && (
                            <View style={styles.ratedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                <Text style={styles.ratedText}>
                                    {t.rated || 'Rated'} ⭐ {order.driverRating || ratedOrders[order._id]}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={orders}
                keyExtractor={(item) => item._id}
                renderItem={renderOrder}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
                        <Text style={styles.emptyTitle}>{t.noOrders}</Text>
                        <Text style={styles.emptyText}>{t.noOrdersDesc}</Text>
                    </View>
                }
            />

            <DriverRatingModal
                visible={ratingModal.visible}
                orderId={ratingModal.orderId}
                driverName={ratingModal.driverName}
                onClose={() => setRatingModal({ visible: false, orderId: null, driverName: null })}
                onRated={(rating) => {
                    setRatedOrders(prev => ({ ...prev, [ratingModal.orderId]: rating }));
                }}
            />
        </View>
    );
}
