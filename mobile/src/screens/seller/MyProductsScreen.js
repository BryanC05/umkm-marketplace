import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import { getImageUrl, formatPrice } from '../../utils/helpers';

export default function MyProductsScreen({ navigation }) {
    const { user } = useAuthStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchProducts = useCallback(async () => {
        try {
            const response = await api.get(`/products/seller/${user._id}`);
            setProducts(response.data || []);
        } catch (error) {
            console.error('Failed to fetch seller products:', error);
        } finally {
            setLoading(false);
        }
    }, [user._id]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchProducts);
        return unsubscribe;
    }, [navigation, fetchProducts]);

    const handleDelete = (productId) => {
        Alert.alert(
            'Delete Product',
            'Are you sure you want to delete this product?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/products/${productId}`);
                            fetchProducts();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete product');
                        }
                    }
                }
            ]
        );
    };

    const styles = {
        container: { flex: 1, backgroundColor: '#f8fafc' },
        center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        list: { padding: 16, paddingBottom: 80 },
        card: {
            flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12,
            marginBottom: 12, alignItems: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
        },
        image: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#f3f4f6' },
        info: { flex: 1, marginLeft: 12, marginRight: 8 },
        name: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
        price: { fontSize: 14, fontWeight: '700', color: '#3b82f6', marginBottom: 4 },
        stockBadge: {
            alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2,
            borderRadius: 6, backgroundColor: '#f3f4f6'
        },
        inStock: { backgroundColor: '#dcfce7' },
        lowStock: { backgroundColor: '#fee2e2' },
        stockText: { fontSize: 11, fontWeight: '600' },
        inStockText: { color: '#16a34a' },
        lowStockText: { color: '#b91c1c' },
        deleteBtn: { padding: 8 },
        fab: {
            position: 'absolute', bottom: 24, right: 24,
            width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6',
            justifyContent: 'center', alignItems: 'center',
            shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
        },
        empty: { alignItems: 'center', paddingTop: 60 },
        emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginTop: 12 },
        emptyText: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={products}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="cube-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>No products yet</Text>
                        <Text style={styles.emptyText}>Add your first product to start selling</Text>
                    </View>
                }
            />
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddProduct')}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}
