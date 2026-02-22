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
import { PLACEHOLDER_IMAGE } from '../../config';
import LoadingSpinner from '../../components/LoadingSpinner';
import DriverRatingModal from '../../components/DriverRatingModal';

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
        pending_seller_review: { bg: '#fef3c7', text: '#92400e', label: 'Waiting for Seller' },
        seller_accepted: { bg: '#dbeafe', text: '#1e40af', label: 'Awaiting Confirmation' },
        seller_declined: { bg: '#fee2e2', text: '#991b1b', label: 'Request Declined' },
        awaiting_buyer_confirm: { bg: '#fef3c7', text: '#92400e', label: 'Review Required' },
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
            Alert.alert('Success', `Order ${action} successfully`);
            fetchOrders();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to respond to order');
        }
    };

    const showSellerResponseModal = (order) => {
        Alert.alert(
            'Respond to Request',
            'Choose an action for this scheduled delivery request',
            [
                { text: 'Accept', onPress: () => handleSellerResponse(order._id, 'accept') },
                { text: 'Request Changes', onPress: () => {
                    Alert.prompt(
                        'Request Changes',
                        'Enter reason for changes:',
                        (notes) => handleSellerResponse(order._id, 'request_changes', notes)
                    );
                }},
                { text: 'Decline', onPress: () => handleSellerResponse(order._id, 'decline'), style: 'destructive' },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const isSeller = (order) => {
        const sellerId = order.seller?._id || order.seller;
        return sellerId === user?._id;
    };

    if (loading) return <LoadingSpinner />;

    const styles = {
        container: { flex: 1, backgroundColor: colors.background },
        list: { padding: 16, paddingBottom: 30 },
        orderCard: {
            backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
        },
        orderHeader: {
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingBottom: 10,
        },
        orderHeaderLeft: { flex: 1 },
        orderId: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
        orderDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
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
        
        return (
            <View style={styles.orderCard}>
                {/* Header - Clickable */}
                <TouchableOpacity style={styles.orderHeader} onPress={() => toggleExpand(order._id)}>
                    <View style={styles.orderHeaderLeft}>
                        <Text style={styles.orderId}>#{orderIdShort}</Text>
                        <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
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
                                <Text style={styles.deliveryText}>🏪 Pickup at Store</Text>
                                {order.preorderTime && (
                                    <Text style={styles.deliveryTime}>{order.preorderTime}</Text>
                                )}
                            </View>
                        ) : (
                            <View style={styles.deliveryInfo}>
                                <Ionicons name="car" size={18} color={colors.textSecondary} style={styles.deliveryIcon} />
                                <Text style={styles.deliveryText}>🚗 Delivery</Text>
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
                                        Scheduled Delivery
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 13, color: colors.text, marginTop: 4 }}>
                                    📅 {order.deliveryDate} at {order.preorderTime}
                                </Text>
                                {order.scheduledNotes && (
                                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' }}>
                                        📝 {order.scheduledNotes}
                                    </Text>
                                )}
                                {order.requestDeadline && (
                                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6 }}>
                                        ⏰ Seller has to respond within 24 hours
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Notes */}
                        {order.notes && (
                            <View style={styles.notesBox}>
                                <Text style={styles.notesLabel}>Note:</Text>
                                <Text style={styles.notesText}>{order.notes}</Text>
                            </View>
                        )}

                        {/* Products */}
                        {order.products?.map((item, idx) => {
                            const img = item.product?.images?.[0] ? getImageUrl(item.product.images[0]) : PLACEHOLDER_IMAGE;
                            return (
                                <View key={idx} style={styles.orderItem}>
                                    <Image source={{ uri: img }} style={styles.orderImage} />
                                    <View style={styles.orderItemInfo}>
                                        <Text style={styles.orderItemName} numberOfLines={1}>{item.product?.name || 'Product'}</Text>
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
                                        <Text style={styles.orderItemQty}>Qty: {item.quantity}</Text>
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
                                onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })}
                            >
                                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                <Text style={styles.trackBtnText}>Confirm & Pay</Text>
                            </TouchableOpacity>
                        )}

                        {order.requestStatus === 'awaiting_buyer_confirm' && (
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                <TouchableOpacity 
                                    style={[styles.trackBtn, { flex: 1, backgroundColor: '#10b981' }]}
                                    onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })}
                                >
                                    <Text style={styles.trackBtnText}>Accept Changes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.trackBtn, { flex: 1, backgroundColor: '#ef4444' }]}
                                    onPress={() => navigation.navigate('OrderDetail', { orderId: order._id })}
                                >
                                    <Text style={styles.trackBtnText}>Decline</Text>
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
                                        New scheduled delivery request
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity 
                                        style={[styles.trackBtn, { flex: 1, backgroundColor: '#10b981' }]}
                                        onPress={() => handleSellerResponse(order._id, 'accept')}
                                    >
                                        <Ionicons name="checkmark" size={18} color="#fff" />
                                        <Text style={styles.trackBtnText}>Accept</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.trackBtn, { flex: 1, backgroundColor: '#6b7280' }]}
                                        onPress={() => showSellerResponseModal(order)}
                                    >
                                        <Ionicons name="chatbubble" size={18} color="#fff" />
                                        <Text style={styles.trackBtnText}>Chat/Changes</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.trackBtn, { flex: 1, backgroundColor: '#ef4444' }]}
                                        onPress={() => handleSellerResponse(order._id, 'decline')}
                                    >
                                        <Ionicons name="close" size={18} color="#fff" />
                                        <Text style={styles.trackBtnText}>Decline</Text>
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
                                    Request declined by seller
                                </Text>
                                {order.sellerResponseNotes && (
                                    <Text style={{ color: '#991b1b', fontSize: 12, marginTop: 4 }}>
                                        Reason: {order.sellerResponseNotes}
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
