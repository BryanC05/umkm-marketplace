import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    RefreshControl, Dimensions, StyleSheet, ActivityIndicator,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../hooks/useTranslation';
import api from '../../api/api';
import ProductCard from '../../components/ProductCard';
import ForumPostCard from '../../components/ForumPostCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { HomeScreenSkeleton } from '../../components/LoadingSkeleton';
import { CATEGORIES_EN, CATEGORIES_ID } from '../../config';
import { DEFAULT_LOCATION } from '../../utils/constants';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
    const { colors, isDarkMode } = useThemeStore();
    const { t, language } = useTranslation();
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ sellers: 0, products: 0 });
    const [categoryCounts, setCategoryCounts] = useState({});
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [forumPosts, setForumPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [nearbySellers, setNearbySellers] = useState([]);
    const [nearbyLoading, setNearbyLoading] = useState(true);
    const [userLocation, setUserLocation] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const allCategories = language === 'id' ? CATEGORIES_ID : CATEGORIES_EN;
    const categories = allCategories.filter((c) => c.id !== 'all');

    const fetchData = useCallback(async () => {
        let coords = userLocation;
        
        if (!coords) {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    coords = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    };
                    setUserLocation(coords);
                }
            } catch (error) {
                console.log('Location error:', error);
            }
        }
        
        if (!coords) {
            coords = { latitude: DEFAULT_LOCATION.Bekasi.lat, longitude: DEFAULT_LOCATION.Bekasi.lng };
        }
        
        try {
            
            const [productsRes, forumRes, countsRes, sellersRes, nearbyRes] = await Promise.allSettled([
                api.get('/products?limit=6&sort=newest'),
                api.get('/forum?limit=3'),
                api.get('/products/categories/counts'),
                api.get('/users/sellers/count'),
                api.get('/users/nearby-sellers', {
                    params: {
                        lat: coords.latitude,
                        lng: coords.longitude,
                        radius: 25000,
                        limit: 5,
                    },
                }),
            ]);

            if (productsRes.status === 'fulfilled') {
                setFeaturedProducts(productsRes.value.data.products || []);
                setStats((p) => ({ ...p, products: productsRes.value.data.pagination?.total || 0 }));
            }
            if (forumRes.status === 'fulfilled') {
                setForumPosts(forumRes.value.data.threads || []);
            }
            if (countsRes.status === 'fulfilled') {
                setCategoryCounts(countsRes.value.data || {});
            }
            if (sellersRes.status === 'fulfilled') {
                setStats((p) => ({ ...p, sellers: sellersRes.value.data.count || 0 }));
            }
            if (nearbyRes.status === 'fulfilled') {
                const payload = nearbyRes.value.data;
                const sellersData = Array.isArray(payload) ? payload : (payload?.sellers || []);
                setNearbySellers(sellersData.slice(0, 5));
            }
        } catch (error) {
            console.error('Error fetching home data:', error);
        } finally {
            setLoading(false);
            setNearbyLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const handleSearch = () => {
        navigation.navigate('Browse', { screen: 'Products', params: { search: searchQuery } });
    };

    const styles = {
        container: { flex: 1, backgroundColor: colors.background },
        hero: {
            paddingHorizontal: 20,
            paddingTop: insets.top + 16,
            paddingBottom: 32,
            backgroundColor: isDarkMode ? '#0f172a' : '#f3f5f7',
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
        },
        heroBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.primary + '15',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            alignSelf: 'center',
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.primary + '40',
        },
        heroBadgeDot: {
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.primary,
        },
        heroBadgeText: {
            fontSize: 11,
            color: colors.primary,
            fontWeight: '600',
            letterSpacing: 0.5,
        },
        heroTitle: { 
            fontSize: 32, 
            fontWeight: '800', 
            color: colors.text, 
            lineHeight: 40, 
            marginBottom: 8,
            textAlign: 'center',
        },
        heroHighlight: { color: colors.primary },
        heroSubtitle: { 
            fontSize: 15, 
            color: colors.textSecondary, 
            lineHeight: 22, 
            marginBottom: 20,
            textAlign: 'center',
            maxWidth: '90%',
            alignSelf: 'center',
        },
        searchContainer: {
            flexDirection: 'row',
            gap: 10,
            maxWidth: '100%',
            marginBottom: 16,
        },
        searchInput: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 10,
            paddingHorizontal: 14,
            height: 48,
            borderWidth: 1,
            borderColor: colors.border,
        },
        searchIcon: { marginRight: 10 },
        searchTextInput: {
            flex: 1,
            fontSize: 14,
            color: colors.text,
            padding: 0,
        },
        searchBtn: {
            backgroundColor: colors.primary,
            borderRadius: 10,
            paddingHorizontal: 20,
            justifyContent: 'center',
            alignItems: 'center',
            height: 48,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        },
        nearbyMapSection: {
            marginBottom: 24,
            paddingHorizontal: 20,
        },
        nearbyMapCard: {
            backgroundColor: colors.card,
            borderRadius: 12,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.border,
        },
        nearbyMapHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        nearbyMapTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        nearbyMapLabel: {
            fontSize: 12,
            color: colors.primary,
            fontWeight: '600',
            letterSpacing: 0.5,
        },
        nearbyMapTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
        },
        nearbyMapSubtitle: {
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 2,
        },
        nearbyMapBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: colors.primary + '15',
        },
        nearbyMapBtnText: {
            fontSize: 12,
            color: colors.primary,
            fontWeight: '600',
        },
        nearbySellersRow: {
            paddingHorizontal: 12,
            paddingVertical: 12,
            gap: 8,
        },
        nearbySellerItem: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 10,
            backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
            borderRadius: 10,
            gap: 12,
        },
        nearbySellerIcon: {
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: colors.primary + '15',
            justifyContent: 'center',
            alignItems: 'center',
        },
        nearbySellerInfo: {
            flex: 1,
        },
        nearbySellerName: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
        },
        nearbySellerLocation: {
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 2,
        },
        nearbySellerDistance: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            backgroundColor: colors.primary + '10',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
        },
        nearbySellerDistanceText: {
            fontSize: 11,
            color: colors.primary,
            fontWeight: '600',
        },
        categorySection: { marginBottom: 24, paddingHorizontal: 20 },
        sectionHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        sectionTitle: { 
            fontSize: 20, 
            fontWeight: '700', 
            color: colors.text,
            letterSpacing: 0.3,
        },
        seeAll: { 
            fontSize: 13, 
            color: colors.primary, 
            fontWeight: '600',
            flexDirection: 'row',
            alignItems: 'center',
        },
        catScroll: { gap: 12 },
        catCard: {
            backgroundColor: colors.card,
            borderRadius: 10,
            padding: 16,
            alignItems: 'center',
            width: 90,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        },
        catName: { 
            fontSize: 11, 
            fontWeight: '600', 
            color: colors.text, 
            textAlign: 'center', 
            marginTop: 6,
        },
        catCount: { 
            fontSize: 10, 
            color: colors.textSecondary, 
            marginTop: 2, 
        },
        catIcon: { fontSize: 28 },
        productsSection: { marginBottom: 24 },
        productScroll: { paddingHorizontal: 16 },
        nearbySection: { 
            marginBottom: 24, 
            paddingHorizontal: 20,
        },
        nearbyCard: {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
        },
        nearbyHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
        },
        nearbyLabel: {
            fontSize: 12,
            color: colors.primary,
            fontWeight: '600',
            letterSpacing: 0.5,
        },
        nearbyTitle: {
            fontSize: 22,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 8,
        },
        nearbyDesc: {
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: 16,
            lineHeight: 20,
        },
        nearbyBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.primary,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 8,
            alignSelf: 'flex-start',
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 3,
        },
        nearbyBtnText: {
            color: '#fff',
            fontWeight: '600',
            fontSize: 14,
        },
        ctaSection: { 
            marginBottom: 32, 
            paddingHorizontal: 20,
        },
        ctaCard: {
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
        },
        ctaTitle: {
            fontSize: 22,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 8,
            textAlign: 'center',
        },
        ctaHighlight: { color: colors.primary },
        ctaDesc: {
            fontSize: 14,
            color: colors.textSecondary,
            marginBottom: 16,
            textAlign: 'center',
            lineHeight: 20,
        },
        ctaBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: colors.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        },
        ctaBtnText: {
            color: '#fff',
            fontWeight: '700',
            fontSize: 15,
        },
    };

    if (loading) {
        return <HomeScreenSkeleton />;
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.hero}>
                <View style={styles.heroBadge}>
                    <View style={styles.heroBadgeDot} />
                    <Text style={styles.heroBadgeText}>{t('heroBadge')}</Text>
                </View>
                
                <Text style={styles.heroTitle}>
                    {t('heroTitle')}{'\n'}
                    <Text style={styles.heroHighlight}>{t('heroHighlight')}</Text>
                </Text>
                
                <Text style={styles.heroSubtitle}>
                    {t('heroSubtitle')}
                </Text>

                <View style={styles.searchContainer}>
                    <View style={styles.searchInput}>
                        <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchTextInput}
                            placeholder={t('searchProductsPlaceholder')}
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.searchBtn}
                        onPress={handleSearch}
                    >
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Nearby Sellers Mini Section */}
            <View style={styles.nearbyMapSection}>
                <View style={styles.nearbyMapCard}>
                    <View style={styles.nearbyMapHeader}>
                        <View>
                            <View style={styles.nearbyMapTitleRow}>
                                <Ionicons name="location" size={16} color={colors.primary} />
                                <Text style={styles.nearbyMapLabel}>{t('nearbySellersLabel')}</Text>
                            </View>
                            <Text style={styles.nearbyMapTitle}>
                                {t('nearbySellersTitle')}
                            </Text>
                            <Text style={styles.nearbyMapSubtitle}>
                                {nearbySellers.length} {t('nearbySellersCount')}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.nearbyMapBtn}
                            onPress={() => navigation.navigate('HomeTab', { screen: 'NearbySellers' })}
                        >
                            <Text style={styles.nearbyMapBtnText}>{t('seeAll')}</Text>
                            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    
                    {nearbyLoading ? (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : nearbySellers.length > 0 ? (
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.nearbySellersRow}
                        >
                            {nearbySellers.slice(0, 5).map((seller) => (
                                <TouchableOpacity
                                    key={seller._id}
                                    style={styles.nearbySellerItem}
                                    onPress={() => navigation.navigate('HomeTab', { 
                                        screen: 'BusinessDetails', 
                                        params: { sellerId: seller._id } 
                                    })}
                                >
                                    <View style={styles.nearbySellerIcon}>
                                        <Ionicons name="storefront" size={20} color={colors.primary} />
                                    </View>
                                    <View style={styles.nearbySellerInfo}>
                                        <Text style={styles.nearbySellerName} numberOfLines={1}>
                                            {seller.businessName || seller.name}
                                        </Text>
                                        <Text style={styles.nearbySellerLocation} numberOfLines={1}>
                                            {seller.location?.city || t('nearby')}
                                        </Text>
                                    </View>
                                    {seller.distanceKm && (
                                        <View style={styles.nearbySellerDistance}>
                                            <Ionicons name="navigate" size={10} color={colors.primary} />
                                            <Text style={styles.nearbySellerDistanceText}>
                                                {seller.distanceKm.toFixed(1)} km
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                                {t('noNearbySellersFound')}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            {categories.filter((cat) => (categoryCounts[cat.id] || 0) > 0).length > 0 && (
                <View style={styles.categorySection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t('categories')}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Browse')}>
                            <Text style={styles.seeAll}>{t('seeAllLower')}</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                        {categories
                            .filter((cat) => (categoryCounts[cat.id] || 0) > 0)
                            .slice(0, 8)
                            .map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={styles.catCard}
                                    onPress={() => navigation.navigate('Browse', { screen: 'Products', params: { category: cat.id, reset: true } })}
                                >
                                    <Text style={styles.catIcon}>{cat.icon}</Text>
                                    <Text style={styles.catName}>{cat.name}</Text>
                                    <Text style={styles.catCount}>{categoryCounts[cat.id]}</Text>
                                </TouchableOpacity>
                            ))}
                    </ScrollView>
                </View>
            )}

            <View style={styles.productsSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t('featuredProducts')}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Browse')}>
                        <Text style={styles.seeAll}>{t('seeAllLower')}</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productScroll}>
                    {featuredProducts.map((item) => (
                        <View key={item._id} style={{ width: (width - 56) / 2, marginRight: 12 }}>
                            <ProductCard
                                product={item}
                                onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
                            />
                        </View>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.nearbySection}>
                <View style={styles.nearbyCard}>
                    <View style={styles.nearbyHeader}>
                        <Ionicons name="location" size={16} color={colors.primary} />
                        <Text style={styles.nearbyLabel}>{t('nearbySellersLabel')}</Text>
                    </View>
                    <Text style={styles.nearbyTitle}>{t('discoverNearbyTitle')}</Text>
                    <Text style={styles.nearbyDesc}>
                        {t('discoverNearbyDesc')}
                    </Text>
                    <TouchableOpacity
                        style={styles.nearbyBtn}
                        onPress={() => navigation.navigate('HomeTab', { screen: 'NearbySellers' })}
                    >
                        <Text style={styles.nearbyBtnText}>{t('openMap')}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.ctaSection}>
                <View style={styles.ctaCard}>
                    <Text style={styles.ctaTitle}>
                        {t('startSellingOn')} <Text style={styles.ctaHighlight}>TroliToko</Text>
                    </Text>
                    <Text style={styles.ctaDesc}>
                        {t('registerBusinessDesc')}
                    </Text>
                    <TouchableOpacity
                        style={styles.ctaBtn}
                        onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
                    >
                        <Text style={styles.ctaBtnText}>{t('registerNow')}</Text>
                        <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ height: 32 }} />
        </ScrollView>
    );
}
