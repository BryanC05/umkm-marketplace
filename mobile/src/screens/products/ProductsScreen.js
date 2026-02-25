import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    FlatList, RefreshControl, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import api from '../../api/api';
import ProductCard from '../../components/ProductCard';
import { ProductsListSkeleton } from '../../components/LoadingSkeleton';
import { CATEGORIES_EN, CATEGORIES_ID, SORT_OPTIONS_EN, SORT_OPTIONS_ID } from '../../config';

const { width } = Dimensions.get('window');

export default function ProductsScreen({ navigation, route }) {
    const { colors, isDarkMode } = useThemeStore();
    const { t, language } = useLanguageStore();
    const initialCategory = route?.params?.category || 'all';
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState(initialCategory);
    const [sortBy, setSortBy] = useState('newest');
    const [showSort, setShowSort] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Get categories and sort options based on language
    const categories = language === 'id' ? CATEGORIES_ID : CATEGORIES_EN;
    const sortOptions = language === 'id' ? SORT_OPTIONS_ID : SORT_OPTIONS_EN;

    const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
        try {
            const params = {
                sort: sortBy,
                page: pageNum,
                limit: 20,
            };
            if (search) params.search = search;
            if (category && category !== 'all') params.category = category;

            const response = await api.get('/products', { params });
            const newProducts = response.data.products || [];
            const pagination = response.data.pagination || {};

            if (append) {
                setProducts((prev) => [...prev, ...newProducts]);
            } else {
                setProducts(newProducts);
            }
            setTotalPages(pagination.pages || 1);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [search, category, sortBy]);

    useEffect(() => {
        setLoading(true);
        fetchProducts(1);
    }, [fetchProducts]);

    useEffect(() => {
        if (route?.params?.category) {
            setCategory(route.params.category);
        }
    }, [route?.params?.category]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchProducts(1);
        setRefreshing(false);
    };

    const onEndReached = () => {
        if (!loadingMore && page < totalPages) {
            setLoadingMore(true);
            fetchProducts(page + 1, true);
        }
    };

    const renderHeader = () => (
        <View>
            {/* Search */}
            <View style={styles.searchRow}>
                <View style={styles.searchWrap}>
                    <Ionicons name="search" size={18} color="#9ca3af" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t.searchProducts || 'Search products...'}
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                        returnKeyType="search"
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(!showSort)}>
                    <Ionicons name="funnel-outline" size={18} color="#3b82f6" />
                </TouchableOpacity>
            </View>

            {/* Sort dropdown */}
            {showSort && (
                <View style={styles.sortDropdown}>
                    {sortOptions.map((opt) => (
                        <TouchableOpacity
                            key={opt.id}
                            style={[styles.sortOption, sortBy === opt.id && styles.sortOptionActive]}
                            onPress={() => { setSortBy(opt.id); setShowSort(false); }}
                        >
                            <Text style={[styles.sortOptionText, sortBy === opt.id && styles.sortOptionTextActive]}>
                                {opt.name}
                            </Text>
                            {sortBy === opt.id && <Ionicons name="checkmark" size={16} color="#3b82f6" />}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Category chips */}
            <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.catRow}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.catChip, category === item.id && styles.catChipActive]}
                        onPress={() => setCategory(item.id)}
                    >
                        <Text style={[styles.catChipText, category === item.id && styles.catChipTextActive]}>
                            {item.icon} {item.name}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>{t.noProductsFound || 'No products found'}</Text>
            <Text style={styles.emptyText}>{t.tryAdjustingFilters || 'Try adjusting your filters'}</Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {loading && products.length === 0 ? (
                <ProductsListSkeleton count={8} />
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={(item) => item._id}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={renderHeader}
                    ListEmptyComponent={!loading ? renderEmpty : null}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color="#3b82f6" /> : null}
                    renderItem={({ item }) => (
                        <ProductCard
                            product={item}
                            onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
                        />
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    list: { paddingBottom: 20 },
    row: { paddingHorizontal: 16, gap: 12 },
    searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },
    searchWrap: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, height: 44,
        borderWidth: 1, borderColor: '#e5e7eb',
    },
    searchInput: { flex: 1, fontSize: 14, color: '#111827' },
    sortBtn: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center',
    },
    sortDropdown: {
        marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12,
        borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8, overflow: 'hidden',
    },
    sortOption: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f3f4f6',
    },
    sortOptionActive: { backgroundColor: '#eff6ff' },
    sortOptionText: { fontSize: 14, color: '#374151' },
    sortOptionTextActive: { color: '#3b82f6', fontWeight: '600' },
    catRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
    catChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    },
    catChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    catChipText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
    catChipTextActive: { color: '#fff' },
    empty: { alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginTop: 12 },
    emptyText: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(248,250,252,0.8)',
    },
});
