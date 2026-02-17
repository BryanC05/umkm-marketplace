import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatPrice } from '../../utils/helpers';
import { useLanguageStore } from '../../store/languageStore';

export default function SellerDashboardScreen({ navigation }) {
    const { user } = useAuthStore();
    const { t } = useLanguageStore();
    const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            // Fetch products count
            const productsRes = await api.get(`/products/seller/${user._id}`);
            const productsCount = productsRes.data?.length || 0;

            // Fetch orders for revenue calculation
            const ordersRes = await api.get('/orders/my-orders');
            const myOrders = ordersRes.data || [];

            // Filter orders where user is seller
            const sellerOrders = myOrders.filter(o => o.seller?._id === user._id || o.seller === user._id);

            const revenue = sellerOrders
                .filter(o => o.status === 'delivered')
                .reduce((sum, o) => sum + o.totalAmount, 0);

            const pending = sellerOrders
                .filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status))
                .length;

            setStats({
                products: productsCount,
                orders: sellerOrders.length,
                revenue,
                pending
            });
        } catch (error) {
            console.error('Failed to fetch seller stats:', error);
        } finally {
            setLoading(false);
        }
    }, [user._id]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
        setRefreshing(false);
    };

    if (loading) return <LoadingSpinner />;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>{t.sellerDashboard}</Text>
                <Text style={styles.subtitle}>{user.businessName || user.name}</Text>
            </View>

            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <View style={[styles.iconBg, { backgroundColor: '#eff6ff' }]}>
                        <Ionicons name="cube" size={24} color="#3b82f6" />
                    </View>
                    <Text style={styles.statValue}>{stats.products}</Text>
                    <Text style={styles.statLabel}>{t.tabProducts}</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.iconBg, { backgroundColor: '#f0fdf4' }]}>
                        <Ionicons name="cash" size={24} color="#16a34a" />
                    </View>
                    <Text style={styles.statValue}>{formatPrice(stats.revenue)}</Text>
                    <Text style={styles.statLabel}>Revenue</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.iconBg, { backgroundColor: '#fff7ed' }]}>
                        <Ionicons name="receipt" size={24} color="#f97316" />
                    </View>
                    <Text style={styles.statValue}>{stats.orders}</Text>
                    <Text style={styles.statLabel}>Total Orders</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.iconBg, { backgroundColor: '#fef2f2' }]}>
                        <Ionicons name="time" size={24} color="#ef4444" />
                    </View>
                    <Text style={styles.statValue}>{stats.pending}</Text>
                    <Text style={styles.statLabel}>{t.pending}</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('AddProduct')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#2563eb' }]}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.actionTitle}>{t.addNewProduct}</Text>
                        <Text style={styles.actionDesc}>List a new item for sale</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('MyProducts')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#4f46e5' }]}>
                        <Ionicons name="list" size={24} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.actionTitle}>{t.manageProducts}</Text>
                        <Text style={styles.actionDesc}>Edit stock and prices</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, backgroundColor: '#fff', paddingBottom: 20 },
    title: { fontSize: 24, fontWeight: '800', color: '#111827' },
    subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
    statsGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16,
    },
    statCard: {
        width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    iconBg: {
        width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
        marginBottom: 12
    },
    statValue: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 2 },
    statLabel: { fontSize: 12, color: '#6b7280' },
    actions: { padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        padding: 16, borderRadius: 16, marginBottom: 12, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    actionTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
    actionDesc: { fontSize: 13, color: '#6b7280' },
});
