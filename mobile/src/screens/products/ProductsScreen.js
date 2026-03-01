import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    FlatList, RefreshControl, Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../hooks/useTranslation';
import api from '../../api/api';
import ProductCard from '../../components/ProductCard';
import { ProductsListSkeleton } from '../../components/LoadingSkeleton';
import { CATEGORIES_EN, CATEGORIES_ID, SORT_OPTIONS_EN, SORT_OPTIONS_ID } from '../../config';

const { width } = Dimensions.get('window');

export default function ProductsScreen({ navigation, route }) {
    const { colors, isDarkMode } = useThemeStore();
    const { t, language } = useTranslation();
    const initialCategory = route?.params?.category || 'all';
    const initialSearch = route?.params?.search || '';
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchInput, setSearchInput] = useState(initialSearch);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [category, setCategory] = useState(initialCategory);
    const [sortBy, setSortBy] = useState('newest');
    const [showSort, setShowSort] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const searchTimeoutRef = useRef(null);

    const categories = language === 'id' ? CATEGORIES_ID : CATEGORIES_EN;
    const sortOptions = language === 'id' ? SORT_OPTIONS_ID : SORT_OPTIONS_EN;

    const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
        try {
            const params = {
                sort: sortBy,
                page: pageNum,
                limit: 20,
            };
            if (searchQuery) params.search = searchQuery;
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
    }, [searchQuery, category, sortBy]);

    useEffect(() => {
        setLoading(true);
        fetchProducts(1);
    }, [fetchProducts]);

    useEffect(() => {
        if (route?.params?.category) {
            setCategory(route.params.category);
        }
    }, [route?.params?.category]);

    useEffect(() => {
        if (route?.params?.search !== undefined) {
            setSearchInput(route.params.search);
            setSearchQuery(route.params.search);
        }
    }, [route?.params?.search]);

    const handleSearchChange = (text) => {
        setSearchInput(text);
        
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            setSearchQuery(text);
            setLoading(true);
            fetchProducts(1);
        }, 500);
    };

    const handleSearchClear = () => {
        setSearchInput('');
        setSearchQuery('');
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        setLoading(true);
        fetchProducts(1);
    };

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

    const styles = {
        container: { flex: 1, backgroundColor: colors.background },
        list: { paddingBottom: 20 },
        row: { paddingHorizontal: 16, gap: 12 },
        searchRow: { 
            flexDirection: 'row', 
            paddingHorizontal: 16, 
            paddingTop: 12, 
            paddingBottom: 8, 
            gap: 10 
        },
        searchWrap: {
            flex: 1, 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 10,
            backgroundColor: colors.card, 
            borderRadius: 10, 
            paddingHorizontal: 14, 
            height: 44,
            borderWidth: 1, 
            borderColor: colors.border,
        },
        searchInput: { 
            flex: 1, 
            fontSize: 14, 
            color: colors.text,
        },
        sortBtn: {
            width: 44, 
            height: 44, 
            borderRadius: 10,
            backgroundColor: colors.primary + '15', 
            justifyContent: 'center', 
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.primary + '30',
        },
        sortDropdown: {
            marginHorizontal: 16, 
            backgroundColor: colors.card, 
            borderRadius: 10,
            borderWidth: 1, 
            borderColor: colors.border, 
            marginBottom: 12, 
            overflow: 'hidden',
        },
        sortOption: {
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingHorizontal: 16, 
            paddingVertical: 12, 
            borderBottomWidth: 1, 
            borderColor: colors.border,
        },
        sortOptionText: { 
            fontSize: 14, 
            color: colors.text,
        },
        sortOptionTextActive: { 
            color: colors.primary, 
            fontWeight: '600' 
        },
        catRow: { 
            paddingHorizontal: 16, 
            paddingBottom: 16, 
            gap: 10 
        },
        catChip: {
            paddingHorizontal: 14, 
            paddingVertical: 8, 
            borderRadius: 20,
            backgroundColor: colors.card, 
            borderWidth: 1, 
            borderColor: colors.border,
        },
        catChipActive: { 
            backgroundColor: colors.primary, 
            borderColor: colors.primary 
        },
        catChipText: { 
            fontSize: 12, 
            color: colors.textSecondary, 
            fontWeight: '500' 
        },
        catChipTextActive: { 
            color: '#fff',
            fontWeight: '600',
        },
        empty: { 
            alignItems: 'center', 
            paddingTop: 60 
        },
        emptyTitle: { 
            fontSize: 16, 
            fontWeight: '600', 
            color: colors.textSecondary, 
            marginTop: 12 
        },
        emptyText: { 
            fontSize: 13, 
            color: colors.textTertiary, 
            marginTop: 4 
        },
    };

    const renderHeader = () => (
        <View>
            <View style={styles.searchRow}>
                <View style={styles.searchWrap}>
                    <Ionicons name="search" size={18} color={colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Cari produk..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchInput}
                        onChangeText={handleSearchChange}
                        returnKeyType="search"
                        blurOnSubmit={false}
                    />
                    {searchInput.length > 0 && (
                        <TouchableOpacity onPress={handleSearchClear}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity 
                    style={styles.sortBtn} 
                    onPress={() => setShowSort(!showSort)}
                >
                    <Ionicons name="funnel-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {showSort && (
                <View style={styles.sortDropdown}>
                    {sortOptions.map((opt) => (
                        <TouchableOpacity
                            key={opt.id}
                            style={[
                                styles.sortOption, 
                                sortBy === opt.id && { backgroundColor: colors.primary + '10' },
                            ]}
                            onPress={() => { setSortBy(opt.id); setShowSort(false); }}
                        >
                            <Text style={[
                                styles.sortOptionText, 
                                sortBy === opt.id && styles.sortOptionTextActive
                            ]}>
                                {opt.name}
                            </Text>
                            {sortBy === opt.id && (
                                <Ionicons name="checkmark" size={16} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.catRow}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.catChip, 
                            category === item.id && styles.catChipActive
                        ]}
                        onPress={() => setCategory(item.id)}
                    >
                        <Text style={[
                            styles.catChipText, 
                            category === item.id && styles.catChipTextActive
                        ]}>
                            {item.icon} {item.name}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Tidak ada produk</Text>
            <Text style={styles.emptyText}>Coba sesuaikan filter pencarian</Text>
        </View>
    );

    return (
        <View style={styles.container}>
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
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={onRefresh} 
                            tintColor={colors.primary} 
                        />
                    }
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={
                        loadingMore ? (
                            <ActivityIndicator 
                                style={{ padding: 16 }} 
                                color={colors.primary} 
                            />
                        ) : null
                    }
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
