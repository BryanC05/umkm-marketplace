import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, Image, TouchableOpacity,
    RefreshControl, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/api';
import { useThemeStore } from '../../store/themeStore';
import { getImageUrl, formatPrice } from '../../utils/helpers';
import { WishlistScreenSkeleton } from '../../components/LoadingSkeleton';

export default function WishlistScreen({ navigation }) {
    const { colors } = useThemeStore();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSaved = async () => {
        try {
            const res = await api.get('/users/saved-products');
            setProducts(res.data || []);
        } catch (e) {
            console.error('Failed to fetch saved products:', e);
        }
        setLoading(false);
    };

    useFocusEffect(useCallback(() => {
        fetchSaved();
    }, []));

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchSaved();
        setRefreshing(false);
    };

    const handleUnsave = async (productId) => {
        try {
            await api.delete(`/users/saved-products/${productId}`);
            setProducts(prev => prev.filter(p => p._id !== productId));
        } catch (e) {
            console.error('Failed to unsave:', e);
        }
    };

    const styles = makeStyles(colors);

    const renderItem = ({ item }) => {
        const img = item.images?.[0];
        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
                activeOpacity={0.7}
            >
                <Image
                    source={{ uri: getImageUrl(img) }}
                    style={styles.cardImage}
                    resizeMode="cover"
                />
                <View style={styles.cardContent}>
                    <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
                    {item.rating > 0 && (
                        <View style={styles.ratingRow}>
                            <Ionicons name="star" size={12} color="#f59e0b" />
                            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity style={styles.heartBtn} onPress={() => handleUnsave(item._id)}>
                    <Ionicons name="heart" size={20} color="#ef4444" />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Ionicons name="heart" size={20} color="#ef4444" />
                <Text style={styles.headerTitle}>Saved Products</Text>
            </View>

            {loading ? (
                <WishlistScreenSkeleton count={4} />
            ) : products.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="heart-outline" size={56} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                    <Text style={styles.emptyTitle}>No saved products</Text>
                    <Text style={styles.emptyText}>Browse and save products you love!</Text>
                    <TouchableOpacity
                        style={styles.browseBtn}
                        onPress={() => navigation.navigate('HomeTab')}
                    >
                        <Text style={styles.browseBtnText}>Browse Products</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                />
            )}
        </SafeAreaView>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    backBtn: { padding: 4, marginRight: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    list: { padding: 16 },
    card: {
        flexDirection: 'row', alignItems: 'center', padding: 10,
        backgroundColor: colors.card, borderRadius: 14, marginBottom: 10,
        borderWidth: 1, borderColor: colors.border,
    },
    cardImage: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.border },
    cardContent: { flex: 1, marginLeft: 12 },
    cardName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
    cardPrice: { fontSize: 15, fontWeight: '700', color: colors.primary },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    ratingText: { fontSize: 12, fontWeight: '600', color: '#f59e0b' },
    heartBtn: { padding: 8 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 },
    emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    browseBtn: {
        marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
        backgroundColor: colors.primary, borderRadius: 12,
    },
    browseBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
