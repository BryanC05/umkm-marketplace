import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    RefreshControl, Image, Alert, ScrollView, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/api';
import { getImageUrl, formatPrice, formatDate } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import DriverRatingModal from '../../components/DriverRatingModal';
import { OrdersListSkeleton } from '../../components/LoadingSkeleton';

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

const STATUS_LABELS = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

const STATUS_COLORS = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    confirmed: { bg: '#dbeafe', text: '#1e40af' },
    preparing: { bg: '#e0e7ff', text: '#3730a3' },
    ready: { bg: '#d1fae5', text: '#065f46' },
    delivered: { bg: '#d1fae5', text: '#065f46' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
};

export default function OrdersScreen({ navigation }) {
    const { colors } = useThemeStore();
    const { t, language } = useTranslation();
    const { user } = useAuthStore();
    
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [ratingModal, setRatingModal] = useState({ visible: false, orderId: null, driverName: null });
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const filteredOrders = activeFilter === 'all' 
        ? orders 
        : orders.filter(o => o.status === activeFilter);

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

    const isSeller = (order) => {
        const sellerId = order.seller?._id || order.seller;
        return sellerId === user?._id;
    };

    const isBuyer = (order) => {
        const buyerId = order.buyer?._id || order.buyer;
        return buyerId === user?._id;
    };

    const getNextStatus = (currentStatus) => {
        const currentIndex = STATUS_FLOW.indexOf(currentStatus);
        if (currentIndex < STATUS_FLOW.length - 1) {
            return STATUS_FLOW[currentIndex + 1];
        }
        return null;
    };

    const updateOrderStatus = async (orderId, newStatus) => {
        setUpdatingStatus(true);
        try {
            await api.put(`/orders/${orderId}/status`, { status: newStatus });
            Alert.alert('Success', `Order status updated to ${STATUS_LABELS[newStatus]}`);
            fetchOrders();
            setShowOrderModal(false);
        } catch (error) {
            console.error('Failed to update status:', error);
            Alert.alert('Error', 'Failed to update order status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const openOrderDetails = (order) => {
        setSelectedOrder(order);
        setShowOrderModal(true);
    };

    const renderOrder = ({ item: order }) => {
        const statusInfo = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
        const isPickup = order.deliveryType === 'pickup';
        const canUpdate = isSeller(order) && !['delivered', 'cancelled'].includes(order.status);
        const nextStatus = getNextStatus(order.status);
        
        return (
            <TouchableOpacity 
                style={{
                    backgroundColor: colors?.card, 
                    borderRadius: 14, 
                    padding: 16, 
                    marginBottom: 12,
                    borderLeftWidth: 4,
                    borderLeftColor: isPickup ? '#f59e0b' : '#0891b2',
                }}
                onPress={() => openOrderDetails(order)}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 13, color: colors?.textSecondary, fontWeight: '600' }}>
                        #{order._id?.slice(-8).toUpperCase()}
                    </Text>
                    <View style={[{}, { backgroundColor: statusInfo.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: statusInfo.text }}>
                            {STATUS_LABELS[order.status] || order.status}
                        </Text>
                    </View>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    {order.seller?.profileImage ? (
                        <Image source={{ uri: order.seller.profileImage }} style={{ width: 44, height: 44, borderRadius: 10 }} />
                    ) : (
                        <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: colors?.border }} />
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: colors?.text }}>
                            {order.seller?.name || order.seller?.businessName || 'Store'}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors?.textSecondary }}>
                            {order.items?.length || 0} item(s)
                        </Text>
                    </View>
                </View>

                {/* Show role badge */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                    {isSeller(order) && (
                        <View style={{ backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: '#1e40af', fontWeight: '600' }}>Seller</Text>
                        </View>
                    )}
                    {isBuyer(order) && (
                        <View style={{ backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: '#065f46', fontWeight: '600' }}>Buyer</Text>
                        </View>
                    )}
                    {isPickup && (
                        <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: '#92400e', fontWeight: '600' }}>Pickup</Text>
                        </View>
                    )}
                </View>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors?.border }}>
                    <Text style={{ fontSize: 13, color: colors?.textSecondary }}>Total</Text>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: colors?.text }}>
                        {formatPrice(order.totalAmount)}
                    </Text>
                </View>

                {/* Status update button for seller */}
                {canUpdate && nextStatus && (
                    <TouchableOpacity
                        style={{
                            marginTop: 12,
                            backgroundColor: colors?.primary,
                            paddingVertical: 10,
                            borderRadius: 8,
                            alignItems: 'center',
                        }}
                        onPress={() => updateOrderStatus(order._id, nextStatus)}
                    >
                        <Text style={{ color: '#fff', fontWeight: '600' }}>
                            Mark as {STATUS_LABELS[nextStatus]}
                        </Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    // Order Detail Modal
    const renderOrderModal = () => {
        if (!selectedOrder) return null;
        
        const order = selectedOrder;
        const statusInfo = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
        const canUpdate = isSeller(order) && !['delivered', 'cancelled'].includes(order.status);
        const nextStatus = getNextStatus(order.status);

        return (
            <Modal visible={showOrderModal} animationType="slide" transparent>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ 
                        backgroundColor: colors?.card, 
                        borderTopLeftRadius: 24, 
                        borderTopRightRadius: 24,
                        maxHeight: '90%',
                        padding: 20,
                    }}>
                        {/* Header */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: colors?.text }}>
                                Order Details
                            </Text>
                            <TouchableOpacity onPress={() => setShowOrderModal(false)}>
                                <Ionicons name="close" size={24} color={colors?.text} />
                            </TouchableOpacity>
                        </View>

                        {/* Order ID & Status */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 13, color: colors?.textSecondary }}>
                                Order #{order._id?.slice(-8).toUpperCase()}
                            </Text>
                            <View style={[{}, { backgroundColor: statusInfo.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 }]}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: statusInfo.text }}>
                                    {STATUS_LABELS[order.status] || order.status}
                                </Text>
                            </View>
                        </View>

                        {/* Store Info */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors?.textSecondary, marginBottom: 4 }}>Store</Text>
                            <Text style={{ fontSize: 16, fontWeight: '600', color: colors?.text }}>
                                {order.seller?.name || order.seller?.businessName || 'Store'}
                            </Text>
                        </View>

                        {/* Delivery Info */}
                        {order.deliveryType === 'pickup' ? (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, color: colors?.textSecondary, marginBottom: 4 }}>Pickup Address</Text>
                                <Text style={{ fontSize: 14, color: colors?.text }}>{order.pickupAddress || 'N/A'}</Text>
                            </View>
                        ) : (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, color: colors?.textSecondary, marginBottom: 4 }}>Delivery Address</Text>
                                <Text style={{ fontSize: 14, color: colors?.text }}>{order.deliveryAddress || 'N/A'}</Text>
                            </View>
                        )}

                        {/* Items */}
                        <View style={{ marginBottom: 16 }}>
                            <Text style={{ fontSize: 12, color: colors?.textSecondary, marginBottom: 8 }}>Items</Text>
                            {order.items?.map((item, index) => (
                                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: colors?.border, marginRight: 10 }} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors?.text }}>
                                            {item.name || 'Product'}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: colors?.textSecondary }}>
                                            x{item.quantity}
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors?.text }}>
                                        {formatPrice(item.price)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Price Breakdown */}
                        <View style={{ borderTopWidth: 1, borderTopColor: colors?.border, paddingTop: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={{ fontSize: 14, color: colors?.textSecondary }}>Subtotal</Text>
                                <Text style={{ fontSize: 14, color: colors?.text }}>{formatPrice(order.subtotal || order.totalAmount)}</Text>
                            </View>
                            {order.deliveryFee > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <Text style={{ fontSize: 14, color: colors?.textSecondary }}>Delivery Fee</Text>
                                    <Text style={{ fontSize: 14, color: colors?.text }}>{formatPrice(order.deliveryFee)}</Text>
                                </View>
                            )}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors?.border }}>
                                <Text style={{ fontSize: 16, fontWeight: '700', color: colors?.text }}>Total</Text>
                                <Text style={{ fontSize: 16, fontWeight: '800', color: colors?.primary }}>{formatPrice(order.totalAmount)}</Text>
                            </View>
                        </View>

                        {/* Status Update Button */}
                        {canUpdate && nextStatus && (
                            <TouchableOpacity
                                style={{
                                    marginTop: 20,
                                    backgroundColor: colors?.primary,
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                }}
                                onPress={() => updateOrderStatus(order._id, nextStatus)}
                                disabled={updatingStatus}
                            >
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                                    {updatingStatus ? 'Updating...' : `Mark as ${STATUS_LABELS[nextStatus]}`}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Show seller/buyer info */}
                        {!canUpdate && (
                            <View style={{ marginTop: 20, padding: 12, backgroundColor: colors?.background, borderRadius: 8 }}>
                                <Text style={{ fontSize: 13, color: colors?.textSecondary, textAlign: 'center' }}>
                                    {isSeller(order) ? 'You are the seller of this order' : 'You are the buyer of this order'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors?.background }}>
                <OrdersListSkeleton count={4} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors?.background }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors?.border }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors?.text, marginBottom: 12 }}>
                    {t.navOrders || 'Orders'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].map(filter => (
                        <TouchableOpacity
                            key={filter}
                            style={{
                                paddingHorizontal: 12, 
                                paddingVertical: 6, 
                                borderRadius: 16, 
                                backgroundColor: activeFilter === filter ? colors?.primary : colors?.border,
                                marginRight: 8,
                            }}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text style={{ 
                                fontSize: 12, 
                                fontWeight: '600', 
                                color: activeFilter === filter ? '#fff' : colors?.textSecondary 
                            }}>
                                {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
            <FlatList
                data={filteredOrders}
                keyExtractor={item => item._id}
                renderItem={renderOrder}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors?.primary} />}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', paddingTop: 60 }}>
                        <Ionicons name="receipt-outline" size={48} color={colors?.textSecondary} />
                        <Text style={{ fontSize: 16, fontWeight: '600', color: colors?.textSecondary, marginTop: 12 }}>
                            {t.noOrders || 'No orders yet'}
                        </Text>
                    </View>
                }
            />
            {renderOrderModal()}
            <DriverRatingModal
                visible={ratingModal.visible}
                orderId={ratingModal.orderId}
                driverName={ratingModal.driverName}
                onClose={() => setRatingModal({ visible: false, orderId: null, driverName: null })}
                onRated={() => {}}
            />
        </View>
    );
}
