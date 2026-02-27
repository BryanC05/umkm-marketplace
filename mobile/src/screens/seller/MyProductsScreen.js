import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import { getImageUrl, formatPrice } from '../../utils/helpers';
import { useThemeStore } from '../../store/themeStore';
import LoadingSkeleton from '../../components/LoadingSkeleton';

export default function MyProductsScreen({ navigation }) {
    const { user } = useAuthStore();
    const { colors, isDarkMode } = useThemeStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchProducts = useCallback(async () => {
        if (!user?._id) {
            setLoading(false);
            return;
        }
        try {
            const response = await api.get(`/products/seller/${user._id}`);
            setProducts(response.data || []);
        } catch (error) {
            console.error('Failed to fetch seller products:', error);
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    const renderItem = ({ item }) => {
        const imageUrl = item.images?.[0] ? getImageUrl(item.images[0]) : '';
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
            >
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.image} />
                ) : (
                    <View style={[styles.image, { backgroundColor: colors.border }]} />
                )}
                <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.price}>{formatPrice(item.price)}</Text>
                    <View style={[
                        styles.stockBadge,
                        item.stock > 5 ? styles.inStock : styles.lowStock
                    ]}>
                        <Text style={[
                            styles.stockText,
                            item.stock > 5 ? styles.inStockText : styles.lowStockText
                        ]}>
                            {item.stock} {item.unit}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item._id)}
                >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </TouchableOpacity>
            </TouchableOpacity >
        );
    };

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

    const styles = useMemo(() => {
        if (!colors) return {};
        return StyleSheet.create({
            container: { flex: 1, backgroundColor: colors.background },
            center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
            list: { padding: 16, paddingBottom: 80 },
            card: {
                flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 12,
                marginBottom: 12, alignItems: 'center',
                shadowColor: isDarkMode ? '#000' : '#e2e8f0', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDarkMode ? 0.3 : 0.8, shadowRadius: 4, elevation: 2,
            },
            image: { width: 60, height: 60, borderRadius: 8, backgroundColor: colors.input },
            info: { flex: 1, marginLeft: 12, marginRight: 8 },
            name: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
            price: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 4 },
            stockBadge: {
                alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2,
                borderRadius: 6, backgroundColor: colors.input
            },
            inStock: { backgroundColor: colors.successLight },
            lowStock: { backgroundColor: colors.dangerLight },
            stockText: { fontSize: 11, fontWeight: '600' },
            inStockText: { color: colors.success },
            lowStockText: { color: colors.danger },
            deleteBtn: { padding: 8 },
            fab: {
                position: 'absolute', bottom: 24, right: 24,
                width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary,
                justifyContent: 'center', alignItems: 'center',
                shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            },
            empty: { alignItems: 'center', paddingTop: 60 },
            emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 12 },
            emptyText: { fontSize: 13, color: colors.textTertiary, marginTop: 4 },
        });
    }, [colors, isDarkMode]);

    if (loading || !colors) {
        return <LoadingSkeleton variant="products" />;
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
                        <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
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
