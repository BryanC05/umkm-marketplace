import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator, ScrollView, Dimensions, StyleSheet, Animated, PanResponder, Pressable, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Map from '../../components/Map';
import api from '../../api/api';
import { DEFAULT_LOCATION, DEFAULT_RADIUS_METERS } from '../../utils/constants';
import { haversineDistanceKm } from '../../utils/helpers';
import { SellerListSkeleton, NearbySellersSkeleton } from '../../components/LoadingSkeleton';

const { width, height } = Dimensions.get('window');
const MIN_SHEET_HEIGHT = 70; // Just the drag handle (collapsible to show only handle)
const SHEET_ITEM_HEIGHT = 82; // Height of each seller card + margin
const HEADER_CONTENT_HEIGHT = 140; // Search box + radius chips + padding
const DRAG_HANDLE_HEIGHT = 50;
const BASE_SHEET_HEIGHT = DRAG_HANDLE_HEIGHT + HEADER_CONTENT_HEIGHT;
const DEFAULT_FALLBACK_LOCATION = {
    lat: DEFAULT_LOCATION.Bekasi.lat,
    lng: DEFAULT_LOCATION.Bekasi.lng,
    latitude: DEFAULT_LOCATION.Bekasi.lat,
    longitude: DEFAULT_LOCATION.Bekasi.lng,
};
const NAVIGATION_UPDATE_MS = 10000;
const NAVIGATION_DISTANCE_INTERVAL_METERS = 10;

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const getSellerCoordinates = (seller) => {
    if (!Array.isArray(seller?.location?.coordinates) || seller.location.coordinates.length !== 2) {
        return null;
    }

    const lng = toNumber(seller.location.coordinates[0]);
    const lat = toNumber(seller.location.coordinates[1]);
    if (lng == null || lat == null) return null;
    if (lng === 0 && lat === 0) return null;

    return { lat, lng };
};

export default function NearbySellersScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
    const [location, setLocation] = useState(null);
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [radius, setRadius] = useState(DEFAULT_RADIUS_METERS);
    const [error, setError] = useState(null);
    const [locationWarning, setLocationWarning] = useState(null);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [routePath, setRoutePath] = useState([]);
    const [routeSummary, setRouteSummary] = useState(null);
    const [trackingLocation, setTrackingLocation] = useState(null);
    const [navigationError, setNavigationError] = useState(null);
    const mapRef = useRef(null);
    const locationWatchRef = useRef(null);

    const handleGoBack = useCallback(() => {
        try {
            const canGoBack = navigation.canGoBack();
            if (canGoBack) {
                navigation.goBack();
            } else {
                // Fallback: navigate to Home if can't go back
                navigation.navigate('HomeTab');
            }
        } catch (error) {
            console.warn('Navigation goBack error:', error);
            try {
                navigation.navigate('HomeTab');
            } catch (e) {
                console.warn('Fallback navigation failed:', e);
            }
        }
    }, [navigation]);
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

    useEffect(() => {
        return () => {
            if (locationWatchRef.current) {
                locationWatchRef.current.remove();
                locationWatchRef.current = null;
            }
        };
    }, []);

    const getUserLocation = useCallback(async () => {
        try {
            setError(null);
            setLocationWarning(null);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLocationWarning(t.locationPermissionDeniedFallback || 'Location permission denied. Using default location for nearby sellers.');
                setLocation(DEFAULT_FALLBACK_LOCATION);
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
            console.warn('Failed to get location, using default fallback:', err);
            setLocationWarning(t.locationDetectFailedFallback || 'Failed to get your current location. Using default location.');
            setLocation(DEFAULT_FALLBACK_LOCATION);
        }
    }, [t.locationPermissionDeniedFallback, t.locationDetectFailedFallback]);

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
            const normalized = sellersData
                .map((seller) => {
                    const sellerId = getSellerId(seller);
                    const coordinates = getSellerCoordinates(seller);
                    if (!sellerId || !coordinates) return null;
                    return {
                        ...seller,
                        _id: sellerId,
                        id: sellerId,
                        location: {
                            ...seller.location,
                            type: seller.location?.type || 'Point',
                            coordinates: [coordinates.lng, coordinates.lat],
                        },
                    };
                })
                .filter(Boolean);

            console.log('Nearby sellers fetched:', normalized.length);
            setSellers(normalized);
        } catch (err) {
            console.error('Failed to fetch nearby sellers:', err);
            setSellers([]);
        } finally {
            setLoading(false);
        }
    };

    const getSellerId = (seller) => {
        const raw = seller?._id || seller?.id;
        if (!raw) return null;
        return typeof raw === 'string' ? raw : String(raw);
    };

    const getSellerDisplayName = (seller) => {
        const businessName = typeof seller?.businessName === 'string' ? seller.businessName.trim() : '';
        const username = typeof seller?.name === 'string' ? seller.name.trim() : '';
        return businessName || username || t.seller || 'Seller';
    };

    const getSellerSubtitle = (seller) => {
        const businessType = typeof seller?.businessType === 'string' ? seller.businessType.trim().toLowerCase() : '';
        if (businessType === 'micro') return t.microBusiness || 'Micro Business';
        if (businessType === 'small') return t.smallBusiness || 'Small Business';
        if (businessType === 'medium') return t.mediumBusiness || 'Medium Business';
        return t.localSeller || 'Local Seller';
    };

    const stopNavigation = useCallback(() => {
        if (locationWatchRef.current) {
            locationWatchRef.current.remove();
            locationWatchRef.current = null;
        }
        setIsNavigating(false);
        setTrackingLocation(null);
        setRoutePath([]);
        setRouteSummary(null);
        setNavigationError(null);
    }, []);

    const startNavigation = useCallback(async (seller) => {
        if (!seller) {
            return;
        }

        try {
            const coords = getSellerCoordinates(seller);
            if (!coords) {
                Alert.alert(t.error || 'Error', t.sellerLocationUnavailable || 'Seller location not available');
                return;
            }

            setSelectedSeller(seller);
            setIsNavigating(true);
            setNavigationError(null);

            if (locationWatchRef.current) {
                locationWatchRef.current.remove();
                locationWatchRef.current = null;
            }

            locationWatchRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: NAVIGATION_DISTANCE_INTERVAL_METERS,
                },
                (newLocation) => {
                    const nextLocation = {
                        lat: newLocation.coords.latitude,
                        lng: newLocation.coords.longitude,
                        latitude: newLocation.coords.latitude,
                        longitude: newLocation.coords.longitude,
                    };
                    setTrackingLocation(nextLocation);
                }
            );
        } catch (error) {
            console.error('Navigation error:', error);
            setNavigationError(t.unableStartNavigation || 'Unable to start live navigation.');
            setIsNavigating(false);
        }
    }, [t.error, t.sellerLocationUnavailable, t.unableStartNavigation]);

    const activeLocation = trackingLocation || location;

    const calculateDistance = (sellerLocation) => {
        if (!activeLocation) return null;
        const coords = getSellerCoordinates({ location: sellerLocation });
        if (!coords) return null;
        const distance = haversineDistanceKm(activeLocation, coords);
        return distance.toFixed(1);
    };

    useEffect(() => {
        if (!isNavigating || !selectedSeller || !activeLocation) {
            return;
        }

        const sellerCoords = getSellerCoordinates(selectedSeller);
        if (!sellerCoords) return;

        let isActive = true;

        const fetchRoute = async () => {
            try {
                const response = await api.get('/navigation/route', {
                    params: {
                        originLat: activeLocation.lat,
                        originLng: activeLocation.lng,
                        destinationLat: sellerCoords.lat,
                        destinationLng: sellerCoords.lng,
                        profile: 'driving',
                    },
                });

                if (!isActive) return;

                const apiPath = Array.isArray(response?.data?.path) ? response.data.path : [];
                const normalizedPath = apiPath
                    .map((point) => ({
                        latitude: point?.lat,
                        longitude: point?.lng,
                    }))
                    .filter(
                        (point) =>
                            Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
                    );

                setRoutePath(normalizedPath);
                setRouteSummary({
                    distanceMeters: response?.data?.distanceMeters || 0,
                    durationSeconds: response?.data?.durationSeconds || 0,
                });
                setNavigationError(null);
            } catch (err) {
                console.warn('Failed to fetch navigation route:', err?.message || err);
                if (!isActive) return;
                setRoutePath([
                    { latitude: activeLocation.lat, longitude: activeLocation.lng },
                    { latitude: sellerCoords.lat, longitude: sellerCoords.lng },
                ]);
                setRouteSummary(null);
                setNavigationError(t.fallbackRouteWarning || 'Using fallback route line. Live route is temporarily unavailable.');
            }
        };

        fetchRoute();
        const interval = setInterval(fetchRoute, NAVIGATION_UPDATE_MS);

        return () => {
            isActive = false;
            clearInterval(interval);
        };
    }, [isNavigating, selectedSeller, activeLocation?.lat, activeLocation?.lng]);

    const mapRegion = useMemo(() => {
        if (!activeLocation) return null;

        if (isNavigating && selectedSeller) {
            const destination = getSellerCoordinates(selectedSeller);
            if (destination) {
                const latitude = (activeLocation.lat + destination.lat) / 2;
                const longitude = (activeLocation.lng + destination.lng) / 2;
                const latDiff = Math.abs(activeLocation.lat - destination.lat) + 0.02;
                const lngDiff = Math.abs(activeLocation.lng - destination.lng) + 0.02;
                return {
                    latitude,
                    longitude,
                    latitudeDelta: Math.max(0.01, latDiff * 1.8),
                    longitudeDelta: Math.max(0.01, lngDiff * 1.8),
                };
            }
        }

        const radiusInDegrees = radius / 111000;
        return {
            latitude: activeLocation.lat,
            longitude: activeLocation.lng,
            latitudeDelta: radiusInDegrees * 2.5,
            longitudeDelta: radiusInDegrees * 2.5 * (width / height),
        };
    }, [activeLocation, radius, isNavigating, selectedSeller]);

    const mapMarkers = useMemo(() => {
        return sellers
            .filter((s) => getSellerCoordinates(s) && getSellerId(s))
            .map((seller, index) => {
                const sellerId = getSellerId(seller);
                const coords = getSellerCoordinates(seller);
                if (!coords) return null;
                const { lat, lng } = coords;
                const distance = calculateDistance(seller.location);
                return {
                    id: sellerId,
                    coordinate: { latitude: lat, longitude: lng },
                    title: getSellerDisplayName(seller),
                    description: distance ? `${distance} ${t.km || 'km'}` : '',
                    number: index + 1,
                };
            })
            .filter(Boolean);
    }, [sellers, activeLocation, t.km]);

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

    const remainingDistanceKm = useMemo(() => {
        if (!isNavigating || !selectedSeller || !activeLocation) return null;
        const sellerCoords = getSellerCoordinates(selectedSeller);
        if (!sellerCoords) return null;
        if (routeSummary?.distanceMeters) {
            return routeSummary.distanceMeters / 1000;
        }
        return haversineDistanceKm(activeLocation, sellerCoords);
    }, [isNavigating, selectedSeller, activeLocation, routeSummary]);

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
                    <View style={styles.sellerMetaStack}>
                        {ratingText && (
                            <View style={[styles.distanceBadge, styles.metaBadge, { backgroundColor: '#f59e0b' }]}>
                                <Ionicons name="star" size={11} color="#fff" />
                                <Text style={styles.distance}>{ratingText}</Text>
                            </View>
                        )}
                        {distance && (
                            <View style={[styles.distanceBadge, styles.metaBadge, { backgroundColor: colors.primary }]}>
                                <Ionicons name="location" size={11} color="#fff" />
                                <Text style={styles.distance}>{distance} km</Text>
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        {/* Share Button */}
                        {item.location?.coordinates && (
                            <TouchableOpacity 
                                style={[styles.navigateBtn, { backgroundColor: '#6366f1' }]}
                                onPress={() => {
                                    const coords = getSellerCoordinates(item);
                                    if (coords) {
                                        const mapUrl = `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}&zoom=16`;
                                        const shareText = `${t.checkOutStore || 'Check out'} ${displayName}!\n${mapUrl}`;
                                        
                                        // Try native share, fallback to clipboard
                                        if (navigator.share) {
                                            navigator.share({
                                                title: displayName,
                                                text: shareText,
                                            }).catch(() => {
                                                // User cancelled or error
                                            });
                                        } else {
                                            // For React Native, use Clipboard or Alert
                                            Alert.alert(t.storeLocation || 'Store Location', `${t.locationLink || 'Location link'}:\n${mapUrl}`);
                                        }
                                    }
                                }}
                            >
                                <Ionicons name="share-social" size={16} color="#fff" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={[styles.navigateBtn, { backgroundColor: '#22c55e' }]}
                            onPress={() => startNavigation(item)}
                        >
                            <Ionicons name="navigate" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (!location || loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 12 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{t.nearbySellersTitle || 'Nearby Sellers'}</Text>
                    <View style={styles.placeholder} />
                </View>
                <NearbySellersSkeleton />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 12 }]}>
                    <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{t.nearbySellersTitle || 'Nearby Sellers'}</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.errorContainer}>
                    <Ionicons name="location-outline" size={64} color={colors.danger || '#ef4444'} />
                    <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                        onPress={getUserLocation}
                    >
                        <Text style={styles.retryText}>{t.retry || 'Retry'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 12 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t.nearbySellersTitle || 'Nearby Sellers'}</Text>
                <View style={styles.placeholder} />
            </View>

            {locationWarning && (
                <View style={[styles.warningBanner, { backgroundColor: '#fef3c7', top: insets.top + 68 }]}>
                    <Ionicons name="warning-outline" size={14} color="#92400e" />
                    <Text style={styles.warningText}>{locationWarning}</Text>
                </View>
            )}

            {/* Map Container - Directly below header with no gap */}
            <View style={[styles.mapWrapper, { top: insets.top + 60 }]}>
                <Map
                    ref={mapRef}
                    region={mapRegion}
                    userLocation={{ latitude: activeLocation.lat, longitude: activeLocation.lng }}
                    radius={radius}
                    markers={mapMarkers}
                    polylineCoordinates={isNavigating ? routePath : []}
                    polylineColor="#22c55e"
                    polylineWidth={5}
                    onMarkerPress={(marker) => {
                        const seller = sellers.find((s) => getSellerId(s) === marker.id);
                        setSelectedSeller(seller);
                    }}
                    selectedMarkerId={getSellerId(selectedSeller)}
                />

                {isNavigating && selectedSeller && (
                    <View style={[styles.navigationCard, { backgroundColor: colors.card }]}>
                        <View style={styles.navigationCardHeader}>
                            <View style={styles.navigationTitleWrap}>
                                <Ionicons name="navigate-circle" size={20} color="#22c55e" />
                                <View>
                                    <Text style={[styles.navigationTitle, { color: colors.text }]}>Navigating to</Text>
                                    <Text style={[styles.navigationSeller, { color: colors.text }]} numberOfLines={1}>
                                        {getSellerDisplayName(selectedSeller)}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={stopNavigation} style={styles.stopBtn}>
                                <Ionicons name="close" size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.navigationMeta, { color: colors.textSecondary }]}>
                            {remainingDistanceKm ? `${remainingDistanceKm.toFixed(2)} km` : '--'}
                            {routeSummary?.durationSeconds ? ` • ~${Math.round(routeSummary.durationSeconds / 60)} min` : ''}
                        </Text>
                        {navigationError && (
                            <Text style={styles.navigationWarning}>{navigationError}</Text>
                        )}
                    </View>
                )}

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
                            {sellers.length} {t.sellersLabel || 'sellers'}
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
                                                const coords = getSellerCoordinates(seller);
                                                if (coords) {
                                                    const { lat, lng } = coords;
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
                                                            {seller.rating ? seller.rating.toFixed(1) : (t.notAvailableShort || 'N/A')}
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
                                            {t.noNearbySellers || 'No sellers found nearby'}
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
                        {sellers.length === 0
                            ? (t.noNearbySellers || 'No sellers nearby')
                            : `${t.swipeDownCollapse || 'Swipe down to collapse'} • ${sellers.length} ${t.foundLabel || 'found'}`}
                    </Text>
                </View>

                {/* Search and Filter Section - Always visible */}
                <View style={[styles.searchSection, { borderColor: colors.border }]}>
                    <View style={[styles.searchBox, { backgroundColor: colors.input }]}>
                        <Ionicons name="search" size={18} color={colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.text }]}
                            placeholder={t.searchSellers || 'Search sellers...'}
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
                                {t.noNearbySellers || 'No sellers found nearby'}
                            </Text>
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                {t.expandRadius || 'Try expanding the search radius'}
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
    warningBanner: {
        position: 'absolute',
        left: 12,
        right: 12,
        top: 72,
        zIndex: 20,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    warningText: {
        flex: 1,
        fontSize: 12,
        color: '#92400e',
        fontWeight: '500',
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
    navigationCard: {
        position: 'absolute',
        top: 64,
        right: 12,
        left: 12,
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 11,
    },
    navigationCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    navigationTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    navigationTitle: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 8,
    },
    navigationSeller: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 8,
    },
    navigationMeta: {
        marginTop: 8,
        fontSize: 13,
        fontWeight: '600',
    },
    navigationWarning: {
        marginTop: 6,
        fontSize: 12,
        color: '#b45309',
    },
    stopBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
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
        alignItems: 'flex-start',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        minHeight: 92,
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
        minWidth: 0,
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
        justifyContent: 'space-between',
        minHeight: 72,
        marginLeft: 8,
        flexShrink: 0,
    },
    sellerMetaStack: {
        alignItems: 'flex-end',
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    metaBadge: {
        marginBottom: 6,
    },
    distance: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
        marginLeft: 4,
    },
    navigateBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
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
