import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    RefreshControl, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import api from '../../api/api';
import ProductCard from '../../components/ProductCard';
import ForumPostCard from '../../components/ForumPostCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CATEGORIES } from '../../config';

const { width } = Dimensions.get('window');

// Category name translations
const catTranslations = {
    'Food': 'catFood',
    'Fashion': 'catFashion',
    'Electronics': 'catElectronics',
    'Health': 'catHealth',
    'Home': 'catHome',
    'Beauty': 'catBeauty',
    'Sports': 'catSports',
    'Other': 'catOther',
};

export default function HomeScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { colors, isDarkMode } = useThemeStore();
    const { t } = useLanguageStore();
    const [refreshing, setRefreshing] = useState(false);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [forumPosts, setForumPosts] = useState([]);
    const [categoryCounts, setCategoryCounts] = useState({});
    const [stats, setStats] = useState({ sellers: 0, products: 0 });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [productsRes, forumRes, countsRes, sellersRes] = await Promise.allSettled([
                api.get('/products?limit=6&sort=newest'),
                api.get('/forum?limit=3'),
                api.get('/products/categories/counts'),
                api.get('/users/sellers/count'),
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
        } catch (error) {
            console.error('Error fetching home data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    if (loading) return <LoadingSpinner />;

    const categories = CATEGORIES.filter((c) => c.id !== 'all');

    const styles = {
        container: { flex: 1, backgroundColor: colors.background },
        hero: {
            paddingHorizontal: 20, paddingTop: insets.top + 20, paddingBottom: 24,
            backgroundColor: colors.primary, borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
        },
        heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', lineHeight: 36, marginBottom: 8 },
        heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 20, marginBottom: 16 },
        heroButtons: { flexDirection: 'row', gap: 10 },
        heroPrimary: {
            flex: 1,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: isDarkMode ? '#1f2937' : '#fff', paddingHorizontal: 18, paddingVertical: 12,
            borderRadius: 12,
        },
        heroPrimaryText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
        heroSecondary: {
            flex: 1,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            backgroundColor: isDarkMode ? '#374151' : '#eff6ff', paddingHorizontal: 18, paddingVertical: 12,
            borderRadius: 12,
        },
        heroSecondaryText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
        statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: -16, gap: 10, marginBottom: 20 },
        statCard: {
            flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center',
            shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        },
        statValue: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 4 },
        statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
        section: { marginBottom: 24 },
        sectionHeader: {
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingHorizontal: 20, marginBottom: 12,
        },
        sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
        seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },
        catScroll: { paddingHorizontal: 16, gap: 10 },
        catCard: {
            backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center', width: 100,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
            borderWidth: 1, borderColor: colors.border,
        },
        catIcon: { fontSize: 28, marginBottom: 6 },
        catName: { fontSize: 12, fontWeight: '700', color: colors.text, textAlign: 'center', lineHeight: 16 },
        catCount: { fontSize: 11, color: colors.textSecondary, marginTop: 3, fontWeight: '500' },
    };

    const statsData = [
        { key: 'sellers', icon: 'people', label: t.seller, value: stats.sellers },
        { key: 'products', icon: 'cube', label: t.tabProducts, value: stats.products },
        { key: 'categories', icon: 'grid', label: t.category, value: categories.length },
    ];

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.hero}>
                <Text style={styles.heroTitle}>{t.discoverProducts.split(' ').slice(0, 2).join(' ')}{'\n'}{t.tabProducts}</Text>
                <Text style={styles.heroSubtitle}>
                    {t.discoverProducts}
                </Text>
                <View style={styles.heroButtons}>
                    <TouchableOpacity
                        style={styles.heroPrimary}
                        onPress={() => navigation.navigate('ProductsTab')}
                    >
                        <Ionicons name="bag-handle" size={18} color={colors.primary} />
                        <Text style={styles.heroPrimaryText}>{t.browseProducts}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.heroSecondary}
                        onPress={() => navigation.navigate('ProductsTab', { screen: 'NearbySellers' })}
                    >
                        <Ionicons name="location" size={18} color={colors.primary} />
                        <Text style={styles.heroSecondaryText}>{t.nearbySellers}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statsRow}>
                {statsData.map((s) => (
                    <View key={s.key} style={styles.statCard}>
                        <Ionicons name={s.icon} size={22} color={colors.primary} />
                        <Text style={styles.statValue}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            {categories.filter((cat) => (categoryCounts[cat.id] || 0) > 0).length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t.category}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                        {categories
                            .filter((cat) => (categoryCounts[cat.id] || 0) > 0)
                            .map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={styles.catCard}
                                onPress={() => navigation.navigate('ProductsTab', { screen: 'Products', params: { category: cat.id } })}
                            >
                                <Text style={styles.catIcon}>{cat.icon}</Text>
                                <Text style={styles.catName}>{t[catTranslations[cat.name]] || cat.name}</Text>
                                <Text style={styles.catCount}>{categoryCounts[cat.id]}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t.featuredProducts}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('ProductsTab')}>
                        <Text style={styles.seeAll}>{t.seeAll}</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                    {featuredProducts.map((item) => (
                        <View key={item._id} style={{ width: (width - 64) / 2, marginRight: 12 }}>
                            <ProductCard
                                product={item}
                                onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
                            />
                        </View>
                    ))}
                </ScrollView>
            </View>

            {forumPosts.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>{t.communityForum}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('ProfileTab', { screen: 'Forum' })}>
                            <Text style={styles.seeAll}>{t.seeAll}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ paddingHorizontal: 16 }}>
                        {forumPosts.slice(0, 2).map((post) => (
                            <ForumPostCard
                                key={post._id}
                                post={post}
                                onPress={() => navigation.navigate('ProfileTab', { screen: 'ThreadDetail', params: { threadId: post._id } })}
                            />
                        ))}
                    </View>
                </View>
            )}

            <View style={{ height: 32 }} />
        </ScrollView>
    );
}
