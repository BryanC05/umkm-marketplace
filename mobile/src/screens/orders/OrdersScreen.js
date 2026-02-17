import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import api from '../../api/api';
import { getImageUrl, formatPrice, formatDate } from '../../utils/helpers';
import { PLACEHOLDER_IMAGE } from '../../config';
import LoadingSpinner from '../../components/LoadingSpinner';



export default function OrdersScreen() {
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
    const STATUS_COLORS = {
        pending: { bg: '#fef3c7', text: '#92400e', label: t.pending },
        confirmed: { bg: '#dbeafe', text: '#1e40af', label: t.confirmed },
        preparing: { bg: '#e0e7ff', text: '#3730a3', label: t.confirmed },
        ready: { bg: '#e0e7ff', text: '#3730a3', label: t.confirmed },
        delivered: { bg: '#d1fae5', text: '#065f46', label: t.delivered },
        cancelled: { bg: '#fee2e2', text: '#991b1b', label: t.cancelled },
    };
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
            borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 10,
        },
        orderDate: { fontSize: 12, color: colors.textSecondary },
        statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
        statusText: { fontSize: 11, fontWeight: '700' },
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
        empty: { alignItems: 'center', paddingTop: 80 },
        emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 12 },
        emptyText: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    };

    const renderOrder = ({ item: order }) => {
        const statusInfo = STATUS_COLORS[order.status] || STATUS_COLORS.pending;
        return (
            <View style={styles.orderCard}>
                <View style={styles.orderHeader}>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                    </View>
                </View>
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
                <View style={styles.orderFooter}>
                    <Text style={styles.totalLabel}>{t.total}</Text>
                    <Text style={styles.totalValue}>{formatPrice(order.totalAmount)}</Text>
                </View>
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
        </View>
    );
}
