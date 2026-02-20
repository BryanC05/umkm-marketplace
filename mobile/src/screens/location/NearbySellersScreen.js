import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator, ScrollView, Dimensions, StyleSheet, Animated, PanResponder, Modal, Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Map from '../../components/Map';
import api from '../../api/api';

const { width, height } = Dimensions.get('window');
const MIN_SHEET_HEIGHT = 70; // Just the drag handle (collapsible to show only handle)
const SHEET_ITEM_HEIGHT = 82; // Height of each seller card + margin
const HEADER_CONTENT_HEIGHT = 140; // Search box + radius chips + padding
const DRAG_HANDLE_HEIGHT = 50;
const BASE_SHEET_HEIGHT = DRAG_HANDLE_HEIGHT + HEADER_CONTENT_HEIGHT;

export default function NearbySellersScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
    const [location, setLocation] = useState(null);
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [radius, setRadius] = useState(25000);
    const [error, setError] = useState(null);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const mapRef = useRef(null);

    // Calculate max sheet height based on content
    const calculatedMaxHeight = useMemo(() => {
        const contentHeight = BASE_SHEET_HEIGHT + (Math.min(sellers.length, 5) * SHEET_ITEM_HEIGHT);
        return Math.min(contentHeight, height * 0.7);
    }, [sellers.length]);

    // Current sheet height - starts showing ~3 items or less
    const initialHeight = useMemo(() => {
        return Math.max(MIN_SHEET_HEIGHT, Math.min(calculatedMaxHeight, BASE_SHEET_HEIGHT + (Math.min(sellers.length, 3) * SHEET_ITEM_HEIGHT)));
    }, [sellers.length, calculatedMaxHeight]);

    const sheetHeight = useRef(new Animated.Value(initialHeight)).current;
    const lastSheetHeight = useRef(initialHeight);
    const maxSheetHeightRef = useRef(calculatedMaxHeight);

    // Update refs when calculated height changes
    useEffect(() => {
        maxSheetHeightRef.current = calculatedMaxHeight;
        // Adjust current height if it exceeds new max
        const currentHeight = sheetHeight.__getValue();
        if (currentHeight > calculatedMaxHeight) {
            const newHeight = Math.max(MIN_SHEET_HEIGHT, calculatedMaxHeight);
            sheetHeight.setValue(newHeight);
            lastSheetHeight.current = newHeight;
        }
    }, [calculatedMaxHeight]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 3;
            },
            onPanResponderGrant: () => {
                lastSheetHeight.current = sheetHeight.__getValue();
            },
            onPanResponderMove: (_, gestureState) => {
                const newHeight = lastSheetHeight.current - gestureState.dy;
                const clampedHeight = Math.max(MIN_SHEET_HEIGHT, Math.min(maxSheetHeightRef.current, newHeight));
                sheetHeight.setValue(clampedHeight);
            },
            onPanResponderRelease: () => {
                lastSheetHeight.current = sheetHeight.__getValue();
            },
        })
    ).current;

    useEffect(() => {
        getUserLocation();
    }, []);

    useEffect(() => {
        if (location) {
            fetchNearbySellers();
        }
    }, [location, radius]);

    const getUserLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setError('Location permission denied');
                setLoading(false);
                return;
            }

            const userLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setLocation({
                lat: userLocation.coords.latitude,
                lng: userLocation.coords.longitude,
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
            });
        } catch (err) {
            setError('Failed to get location');
            setLoading(false);
        }
    };

    const fetchNearbySellers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/users/nearby-sellers', {
                params: {
                    lat: location.lat,
                    lng: location.lng,
                    radius: radius,
                },
            });
            const payload = response?.data;
            const sellersData = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.sellers)
                    ? payload.sellers
                    : [];
            setSellers(sellersData);
        } catch (err) {
            console.error('Failed to fetch nearby sellers:', err);
            setSellers([]);
        } finally {
            setLoading(false);
        }
    };

    const getSellerId = (seller) => seller?._id || seller?.id || null;

    const getSellerDisplayName = (seller) => {
        const businessName = typeof seller?.businessName === 'string' ? seller.businessName.trim() : '';
        const username = typeof seller?.name === 'string' ? seller.name.trim() : '';
        return businessName || username || 'Seller';
    };

    const getSellerSubtitle = (seller) => {
        const businessType = typeof seller?.businessType === 'string' ? seller.businessType.trim().toLowerCase() : '';
        if (businessType === 'micro') return 'Micro Business';
        if (businessType === 'small') return 'Small Business';
        if (businessType === 'medium') return 'Medium Business';
        return 'Local Seller';
    };

    const calculateDistance = (sellerLocation) => {
        if (!sellerLocation?.coordinates || !location) return null;
        const [lng, lat] = sellerLocation.coordinates;
        const R = 6371;
        const dLat = (lat - location.lat) * Math.PI / 180;
        const dLon = (lng - location.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(location.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(1);
    };

    const mapRegion = useMemo(() => {
        if (!location) return null;
        const radiusInDegrees = radius / 111000;
        return {
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: radiusInDegrees * 2.5,
            longitudeDelta: radiusInDegrees * 2.5 * (width / height),
        };
    }, [location, radius]);

    const mapMarkers = useMemo(() => {
        return sellers
            .filter((s) => s.location?.coordinates && getSellerId(s))
            .map((seller, index) => {
                const sellerId = getSellerId(seller);
                const [lng, lat] = seller.location.coordinates;
                const distance = calculateDistance(seller.location);
                return {
                    id: sellerId,
                    coordinate: { latitude: lat, longitude: lng },
                    title: getSellerDisplayName(seller),
                    description: `${distance} km away`,
                    number: index + 1,
                };
            });
    }, [sellers, location]);

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filteredSellers = sellers.filter((seller) => {
        if (!normalizedSearch) return true;
        const displayName = getSellerDisplayName(seller).toLowerCase();
        const city = (seller.location?.city || '').toLowerCase();
        return displayName.includes(normalizedSearch) || city.includes(normalizedSearch);
    });

    const sortedSellers = [...filteredSellers].sort((a, b) => {
        const distA = parseFloat(calculateDistance(a.location)) || 999;
        const distB = parseFloat(calculateDistance(b.location)) || 999;
        return distA - distB;
    });

    const renderSeller = ({ item, index }) => {
        const distance = calculateDistance(item.location);
        const sellerId = getSellerId(item);
        const isSelected = getSellerId(selectedSeller) === sellerId;
        const displayName = getSellerDisplayName(item);
        const subtitle = getSellerSubtitle(item);
        const ratingText = typeof item.rating === 'number' ? item.rating.toFixed(1) : null;

        return (
            <TouchableOpacity
                style={[styles.sellerCard, { backgroundColor: colors.card }, isSelected && styles.sellerCardSelected]}
                onPress={() => {
                    setSelectedSeller(item);
                    if (sellerId) {
                        navigation.navigate('BusinessDetails', { sellerId });
                    }
                }}
            >
                <View style={[styles.sellerNumber, { backgroundColor: colors.primary + '20' }, isSelected && { backgroundColor: colors.primary }]}>
                    <Text style={[styles.numberText, { color: colors.primary }, isSelected && { color: '#fff' }]}>{index + 1}</Text>
                </View>
                <View style={styles.sellerInfo}>
                    <Text style={[styles.sellerName, { color: colors.text }]} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <Text style={[styles.sellerType, { color: colors.textSecondary }]}>
                        {subtitle}
                    </Text>
                    {item.location?.address && (
                        <Text style={[styles.sellerAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.location.address}
                        </Text>
                    )}
                </View>
                <View style={styles.sellerRight}>
                    {ratingText && (
                        <View style={[styles.distanceBadge, { backgroundColor: '#f59e0b' }]}>
                            <Ionicons name="star" size={12} color="#fff" />
                            <Text style={styles.distance}>{ratingText}</Text>
                        </View>
                    )}
                    {distance && (
                        <View style={[styles.distanceBadge, { backgroundColor: colors.primary }]}>
                            <Ionicons name="location" size={12} color="#fff" />
                            <Text style={styles.distance}>{distance} km</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    if (!location || loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 12 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Nearby Sellers</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                        Getting your location...
                    </Text>
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 12 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Nearby Sellers</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="location-outline" size={64} color={colors.danger || '#ef4444'} />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                        onPress={getUserLocation}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 12 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Nearby Sellers</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Map Container - Directly below header with no gap */}
            <View style={[styles.mapWrapper, { top: insets.top + 60 }]}>
                <Map
                    ref={mapRef}
                    region={mapRegion}
                    userLocation={{ latitude: location.lat, longitude: location.lng }}
                    radius={radius}
                    markers={mapMarkers}
                    onMarkerPress={(marker) => {
                        const seller = sellers.find((s) => getSellerId(s) === marker.id);
                        setSelectedSeller(seller);
                    }}
                    selectedMarkerId={getSellerId(selectedSeller)}
                />

                {/* Close dropdown when tapping map */}
                {dropdownVisible && (
                    <Pressable
                        style={[StyleSheet.absoluteFill, { zIndex: 5 }]}
                        onPress={() => setDropdownVisible(false)}
                    />
                )}

                {/* Map Overlay - Sellers Badge & Dropdown */}
                <View style={[styles.mapOverlay, { zIndex: 10 }]}>
                    <TouchableOpacity
                        style={[styles.infoBadge, { backgroundColor: colors.card }]}
                        onPress={() => setDropdownVisible(!dropdownVisible)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="storefront" size={14} color={colors.primary} />
                        <Text style={[styles.infoText, { color: colors.text }]}>
                            {sellers.length} sellers
                        </Text>
                        <Ionicons
                            name={dropdownVisible ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={colors.textSecondary}
                            style={{ marginLeft: 4 }}
                        />
                    </TouchableOpacity>

                    {/* Sellers Dropdown */}
                    {dropdownVisible && (
                        <View style={[styles.dropdown, { backgroundColor: colors.card }]}>
                            <ScrollView
                                style={styles.dropdownScroll}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled
                            >
                                {sortedSellers.map((seller, index) => {
                                    const sellerId = getSellerId(seller);
                                    const distance = calculateDistance(seller.location);
                                    const isSelected = getSellerId(selectedSeller) === sellerId;
                                    const displayName = getSellerDisplayName(seller);
                                    return (
                                        <TouchableOpacity
                                            key={sellerId || `seller-${index}`}
                                            style={[
                                                styles.dropdownItem,
                                                { borderBottomColor: colors.border },
                                                isSelected && { backgroundColor: colors.primary + '15' },
                                                index === sortedSellers.length - 1 && { borderBottomWidth: 0 },
                                            ]}
                                            onPress={() => {
                                                setSelectedSeller(seller);
                                                setDropdownVisible(false);
                                                if (seller.location?.coordinates) {
                                                    const [lng, lat] = seller.location.coordinates;
                                                    mapRef.current?.animateToRegion({
                                                        latitude: lat,
                                                        longitude: lng,
                                                        latitudeDelta: 0.005,
                                                        longitudeDelta: 0.005,
                                                    }, 800);
                                                }
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.dropdownItemLeft}>
                                                <Text
                                                    style={[
                                                        styles.dropdownName,
                                                        { color: colors.text },
                                                        isSelected && { color: colors.primary },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {displayName}
                                                </Text>
                                                <View style={styles.dropdownMeta}>
                                                    <View style={styles.dropdownRating}>
                                                        <Ionicons name="star" size={12} color="#f59e0b" />
                                                        <Text style={[styles.dropdownMetaText, { color: colors.textSecondary }]}>
                                                            {seller.rating ? seller.rating.toFixed(1) : 'N/A'}
                                                        </Text>
                                                    </View>
                                                    {distance && (
                                                        <View style={styles.dropdownDistance}>
                                                            <Ionicons name="location" size={12} color={colors.primary} />
                                                            <Text style={[styles.dropdownMetaText, { color: colors.textSecondary }]}>
                                                                {distance} km
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                            <Ionicons name="navigate" size={16} color={colors.primary} />
                                        </TouchableOpacity>
                                    );
                                })}
                                {sortedSellers.length === 0 && (
                                    <View style={styles.dropdownEmpty}>
                                        <Text style={[styles.dropdownMetaText, { color: colors.textSecondary }]}>
                                            No sellers found
                                        </Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    )}
                </View>
            </View>

            {/* Bottom Sheet - Dynamic height based on content */}
            <Animated.View
                style={[
                    styles.bottomSheet,
                    {
                        backgroundColor: colors.card,
                        height: sheetHeight,
                    }
                ]}
            >
                {/* Drag Handle */}
                <View {...panResponder.panHandlers} style={styles.dragHandle}>
                    <View style={[styles.dragIndicator, { backgroundColor: colors.textSecondary }]} />
                    <Text style={[styles.dragText, { color: colors.textSecondary }]}>
                        {sellers.length === 0 ? 'No sellers nearby' : `Swipe down to collapse • ${sellers.length} found`}
                    </Text>
                </View>

                {/* Search and Filter Section - Always visible */}
                <View style={[styles.searchSection, { borderColor: colors.border }]}>
                    <View style={[styles.searchBox, { backgroundColor: colors.input }]}>
                        <Ionicons name="search" size={18} color={colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder="Search sellers..."
                            placeholderTextColor={colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.radiusContainer}>
                        {[5000, 10000, 25000, 50000].map((r) => (
                            <TouchableOpacity
                                key={`radius-${r}`}
                                style={[
                                    styles.radiusChip,
                                    radius === r && { backgroundColor: colors.primary }
                                ]}
                                onPress={() => setRadius(r)}
                            >
                                <Text style={[
                                    styles.radiusText,
                                    { color: radius === r ? '#fff' : colors.text }
                                ]}>
                                    {(r / 1000)}km
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Sellers List */}
                <FlatList
                    data={sortedSellers}
                    renderItem={renderSeller}
                    keyExtractor={(item, index) => getSellerId(item) || `seller-${index}`}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="storefront-outline" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                                No sellers found
                            </Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                Try increasing the search radius
                            </Text>
                        </View>
                    }
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        zIndex: 10,
        height: 60,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    placeholder: {
        width: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    mapWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    mapOverlay: {
        position: 'absolute',
        top: 12,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    infoText: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    dropdown: {
        position: 'absolute',
        top: 44,
        left: 0,
        width: 240,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
    },
    dropdownScroll: {
        maxHeight: 250,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    dropdownItemLeft: {
        flex: 1,
        marginRight: 8,
    },
    dropdownName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    dropdownMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownRating: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    dropdownDistance: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownMetaText: {
        fontSize: 12,
        marginLeft: 4,
    },
    dropdownEmpty: {
        padding: 16,
        alignItems: 'center',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 10,
    },
    dragHandle: {
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    dragIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginBottom: 8,
    },
    dragText: {
        fontSize: 11,
        fontWeight: '500',
    },
    searchSection: {
        padding: 12,
        borderBottomWidth: 1,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
    },
    radiusContainer: {
        marginTop: 10,
    },
    radiusChip: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    radiusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    list: {
        padding: 12,
        paddingBottom: 40,
    },
    sellerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        height: 72,
    },
    sellerCardSelected: {
        borderColor: 'rgba(59, 130, 246, 0.5)',
    },
    sellerNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    numberText: {
        fontSize: 14,
        fontWeight: '700',
    },
    sellerInfo: {
        flex: 1,
    },
    sellerName: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 2,
    },
    sellerType: {
        fontSize: 12,
        marginTop: 1,
    },
    sellerAddress: {
        fontSize: 11,
        marginTop: 2,
        opacity: 0.8,
    },
    sellerRight: {
        alignItems: 'flex-end',
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    distance: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
        marginLeft: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 20,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },
    emptyText: {
        fontSize: 13,
        marginTop: 4,
    },
});
