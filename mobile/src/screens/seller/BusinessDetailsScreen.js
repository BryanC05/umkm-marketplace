import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, FlatList, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../api/api';
import { getImageUrl, formatPrice } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';
import { BusinessDetailSkeleton } from '../../components/LoadingSkeleton';

export default function BusinessDetailsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { sellerId } = route.params;

    const [seller, setSeller] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('products');

    useEffect(() => {
        fetchSellerDetails();
    }, [sellerId]);

    const fetchSellerDetails = async () => {
        try {
            const [sellerRes, productsRes] = await Promise.all([
                api.get(`/users/seller/${sellerId}`),
                api.get(`/products/seller/${sellerId}`)
            ]);
            setSeller(sellerRes.data);
            setProducts(productsRes.data || []);
        } catch (error) {
            console.error('Failed to fetch seller:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <BusinessDetailSkeleton />;

    if (!seller) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Business Details</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Seller not found</Text>
                </View>
            </View>
        );
    }

    const businessTypeLabel = seller.isSeller ? ({
        micro: 'Micro Enterprise',
        small: 'Small Enterprise',
        medium: 'Medium Enterprise',
    }[seller.businessType] || 'Seller') : 'User';

    const renderProduct = ({ item }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => navigation.navigate('ProductsTab', {
                screen: 'ProductDetail',
                params: { productId: item._id }
            })}
        >
            {item.images?.[0] ? (
                <Image
                    source={{ uri: getImageUrl(item.images[0]) }}
                    style={styles.productImage}
                />
            ) : (
                <View style={styles.productImage} />
            )}
            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
            </View>
        </TouchableOpacity>
    );

    const handleShareStore = () => {
        if (!seller?.location?.coordinates) {
            Alert.alert('Error', 'Store location not available');
            return;
        }
        
        const [lng, lat] = seller.location.coordinates;
        const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`;
        const shareText = `Check out ${seller.businessName || seller.name}!\n${mapUrl}`;
        
        Alert.alert(
            'Share Store Location',
            shareText,
            [
                { text: 'OK' }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{seller.businessName || seller.name}</Text>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShareStore}>
                    <Ionicons name="share-social" size={22} color="#333" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Business Header */}
                <View style={styles.businessHeader}>
                    {seller.profileImage ? (
                        <Image source={{ uri: getImageUrl(seller.profileImage) }} style={styles.businessImage} />
                    ) : (
                        <View style={styles.businessImagePlaceholder}>
                            <Ionicons name={seller.isSeller ? "storefront" : "person"} size={40} color="#9ca3af" />
                        </View>
                    )}
                    <Text style={styles.businessName}>{seller.businessName || seller.name}</Text>
                    <View style={styles.badges}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{businessTypeLabel}</Text>
                        </View>
                        {seller.isVerified && (
                            <View style={[styles.badge, styles.verifiedBadge]}>
                                <Ionicons name="checkmark-circle" size={12} color="#fff" />
                                <Text style={styles.verifiedText}>Verified</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Location */}
                {seller.location?.address && (
                    <TouchableOpacity
                        style={styles.locationCard}
                        onPress={() => navigation.navigate('MapView', {
                            location: seller.location,
                            title: seller.businessName || seller.name,
                        })}
                    >
                        <View style={styles.locationIcon}>
                            <Ionicons name="location" size={20} color="#3b82f6" />
                        </View>
                        <View style={styles.locationInfo}>
                            <Text style={styles.locationAddress} numberOfLines={2}>
                                {seller.location.address}
                            </Text>
                            <Text style={styles.locationHint}>Tap to view on map</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                )}

                {/* Tabs */}
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'products' && styles.tabActive]}
                        onPress={() => setActiveTab('products')}
                    >
                        <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
                            Products ({products.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'info' && styles.tabActive]}
                        onPress={() => setActiveTab('info')}
                    >
                        <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>
                            Info
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {activeTab === 'products' ? (
                    products.length > 0 ? (
                        <View style={styles.productsGrid}>
                            {products.map(item => (
                                <View key={item._id} style={styles.productWrapper}>
                                    {renderProduct({ item })}
                                </View>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyProducts}>
                            <Ionicons name="cube-outline" size={48} color="#d1d5db" />
                            <Text style={styles.emptyText}>No products available</Text>
                        </View>
                    )
                ) : (
                    <View style={styles.infoSection}>
                        <View style={styles.infoItem}>
                            <Ionicons name="person-outline" size={20} color="#6b7280" />
                            <Text style={styles.infoLabel}>Name:</Text>
                            <Text style={styles.infoValue}>{seller.name}</Text>
                        </View>
                        {seller.email && (
                            <View style={styles.infoItem}>
                                <Ionicons name="mail-outline" size={20} color="#6b7280" />
                                <Text style={styles.infoLabel}>Email:</Text>
                                <Text style={styles.infoValue}>{seller.email}</Text>
                            </View>
                        )}
                        {seller.phone && (
                            <View style={styles.infoItem}>
                                <Ionicons name="call-outline" size={20} color="#6b7280" />
                                <Text style={styles.infoLabel}>Phone:</Text>
                                <Text style={styles.infoValue}>{seller.phone}</Text>
                            </View>
                        )}
                        {seller.rating != null && (
                            <View style={styles.infoItem}>
                                <Ionicons name="star-outline" size={20} color="#6b7280" />
                                <Text style={styles.infoLabel}>Rating:</Text>
                                <Text style={styles.infoValue}>{seller.rating.toFixed(1)} / 5</Text>
                            </View>
                        )}
                        <View style={styles.infoItem}>
                            <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                            <Text style={styles.infoLabel}>Joined:</Text>
                            <Text style={styles.infoValue}>
                                {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'N/A'}
                            </Text>
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: 16, color: '#6b7280' },
    businessHeader: { alignItems: 'center', padding: 24, backgroundColor: '#fff', marginBottom: 8 },
    businessImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 12 },
    businessImagePlaceholder: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: '#f3f4f6',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    businessName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
    badges: { flexDirection: 'row', gap: 8 },
    badge: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#f3f4f6', borderRadius: 12 },
    badgeText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
    verifiedBadge: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', gap: 4 },
    verifiedText: { fontSize: 12, color: '#fff', fontWeight: '600' },
    locationCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16,
        marginHorizontal: 16, marginBottom: 8, borderRadius: 12,
    },
    locationIcon: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    locationInfo: { flex: 1 },
    locationAddress: { fontSize: 14, color: '#374151' },
    locationHint: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
    tabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#e5e7eb' },
    tabActive: { borderBottomColor: '#3b82f6' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
    tabTextActive: { color: '#3b82f6' },
    productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
    productWrapper: { width: '50%', padding: 4 },
    productCard: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
    productImage: { width: '100%', height: 120, backgroundColor: '#f3f4f6' },
    productInfo: { padding: 10 },
    productName: { fontSize: 13, fontWeight: '600', color: '#111827', height: 36 },
    productPrice: { fontSize: 14, fontWeight: '700', color: '#3b82f6', marginTop: 4 },
    emptyProducts: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 8 },
    infoSection: { padding: 16 },
    infoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8 },
    infoLabel: { fontSize: 14, color: '#6b7280', marginLeft: 12, marginRight: 4 },
    infoValue: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
});
