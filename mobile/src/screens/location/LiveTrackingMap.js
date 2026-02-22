import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import api from '../../api/api';

export default function LiveTrackingMap() {
    const route = useRoute();
    const navigation = useNavigation();
    const mapRef = useRef(null);
    const { colors, isDarkMode } = useThemeStore();
    const { t } = useLanguageStore();
    
    const { orderId, destination, title } = route.params || {};
    
    const [userLocation, setUserLocation] = useState(null);
    const [driverLocation, setDriverLocation] = useState(null);
    const [order, setOrder] = useState(null);
    const [routePath, setRoutePath] = useState([]);
    const [routeSummary, setRouteSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        if (orderId) {
            loadOrder();
            const interval = setInterval(loadOrder, 10000);
            return () => clearInterval(interval);
        }
    }, [orderId]);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                setLoading(false);
                return;
            }

            const currentLocation = await Location.getCurrentPositionAsync({});
            setUserLocation(currentLocation.coords);
            
            const subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 10,
                },
                (newLocation) => {
                    setUserLocation(newLocation.coords);
                }
            );

            setLoading(false);
            return () => subscription.remove();
        })();
    }, []);

    const loadOrder = async () => {
        if (!orderId) return;
        try {
            const response = await api.get(`/orders/${orderId}`);
            const orderData = response.data;
            setOrder(orderData);
            
            if (orderData.driverLocation) {
                setDriverLocation({
                    latitude: orderData.driverLocation.latitude,
                    longitude: orderData.driverLocation.longitude,
                });
            }
        } catch (error) {
            console.error('Failed to load order:', error);
        }
    };

    const handleCall = (phone) => {
        if (!phone) return;
        const url = `tel:${phone}`;
        Linking.canOpenURL(url).then(supported => {
            if (supported) Linking.openURL(url);
        });
    };

    const destinationCoords = useMemo(() => {
        if (order?.deliveryAddress?.coordinates) {
            return {
                latitude: order.deliveryAddress.coordinates[1],
                longitude: order.deliveryAddress.coordinates[0],
                address: order.deliveryAddress.address,
            };
        }
        if (destination?.coordinates) {
            return {
                latitude: destination.coordinates[1],
                longitude: destination.coordinates[0],
                address: destination.address,
            };
        }
        return null;
    }, [order, destination]);

    const storeCoords = useMemo(() => {
        if (order?.seller?.location?.coordinates) {
            return {
                latitude: order.seller.location.coordinates[1],
                longitude: order.seller.location.coordinates[0],
            };
        }
        return null;
    }, [order]);

    useEffect(() => {
        if (!destinationCoords) {
            setRoutePath([]);
            setRouteSummary(null);
            return;
        }

        const fallbackOrigin = userLocation
            ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
            : null;
        const origin = driverLocation || storeCoords || fallbackOrigin;
        if (!origin) {
            setRoutePath([]);
            setRouteSummary(null);
            return;
        }

        let isActive = true;

        const fetchRoute = async () => {
            try {
                const response = await api.get('/navigation/route', {
                    params: {
                        originLat: origin.latitude,
                        originLng: origin.longitude,
                        destinationLat: destinationCoords.latitude,
                        destinationLng: destinationCoords.longitude,
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
            } catch (error) {
                console.warn('Failed to fetch routed path, falling back to straight line:', error?.message || error);
                if (!isActive) return;
                setRoutePath([origin, destinationCoords]);
                setRouteSummary(null);
            }
        };

        fetchRoute();
        const interval = setInterval(fetchRoute, 10000);

        return () => {
            isActive = false;
            clearInterval(interval);
        };
    }, [
        driverLocation?.latitude,
        driverLocation?.longitude,
        destinationCoords?.latitude,
        destinationCoords?.longitude,
        storeCoords?.latitude,
        storeCoords?.longitude,
        userLocation?.latitude,
        userLocation?.longitude,
    ]);

    const routePolylineCoordinates = useMemo(() => {
        if (routePath.length > 1) {
            return routePath;
        }
        if (driverLocation && destinationCoords) {
            return [driverLocation, destinationCoords];
        }
        if (storeCoords && destinationCoords) {
            return [storeCoords, destinationCoords];
        }
        return [];
    }, [routePath, driverLocation, storeCoords, destinationCoords]);

    const routeDistanceKm = useMemo(() => {
        if (routeSummary?.distanceMeters) {
            return routeSummary.distanceMeters / 1000;
        }
        const origin = driverLocation || storeCoords;
        if (!origin || !destinationCoords) return null;
        return calculateDistance(
            origin.latitude,
            origin.longitude,
            destinationCoords.latitude,
            destinationCoords.longitude
        );
    }, [routeSummary, driverLocation, storeCoords, destinationCoords]);

    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        map: { flex: 1 },
        header: {
            position: 'absolute',
            top: 50,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 16,
        },
        backBtn: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.card,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        headerTitle: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
            backgroundColor: colors.card,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
        },
        errorContainer: {
            position: 'absolute',
            top: 120,
            left: 20,
            right: 20,
            backgroundColor: '#FEE2E2',
            padding: 12,
            borderRadius: 8,
        },
        errorText: { color: '#DC2626', textAlign: 'center' },
        infoCard: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.card,
            padding: 16,
            paddingBottom: 34,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
        },
        infoRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
        },
        infoText: {
            marginLeft: 8,
            fontSize: 14,
            color: colors.text,
            flex: 1,
        },
        driverInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        driverAvatar: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        driverAvatarText: {
            color: '#fff',
            fontSize: 20,
            fontWeight: '700',
        },
        driverDetails: {
            flex: 1,
        },
        driverName: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
        },
        driverStatus: {
            fontSize: 13,
            color: colors.textSecondary,
            marginTop: 2,
        },
        callBtn: {
            backgroundColor: colors.success,
            width: 44,
            height: 44,
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
        },
        statusBadge: {
            backgroundColor: colors.primary + '20',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 10,
            alignSelf: 'flex-start',
            marginBottom: 8,
        },
        statusText: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.primary,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
        },
        destinationMarker: {
            backgroundColor: colors.danger,
            padding: 10,
            borderRadius: 20,
        },
        storeMarker: {
            backgroundColor: colors.success,
            padding: 8,
            borderRadius: 16,
        },
        driverMarker: {
            backgroundColor: colors.primary,
            padding: 8,
            borderRadius: 16,
        },
    }), [colors, isDarkMode]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const mapRegion = {
        latitude: driverLocation?.latitude || userLocation?.latitude || -6.2088,
        longitude: driverLocation?.longitude || userLocation?.longitude || 106.8456,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass
                initialRegion={mapRegion}
            >
                {storeCoords && (
                    <Marker
                        coordinate={storeCoords}
                        title={order?.seller?.businessName || 'Store'}
                    >
                        <View style={styles.storeMarker}>
                            <Ionicons name="storefront" size={18} color="#fff" />
                        </View>
                    </Marker>
                )}

                {driverLocation && (
                    <Marker
                        coordinate={driverLocation}
                        title="Driver"
                    >
                        <View style={styles.driverMarker}>
                            <Ionicons name="bicycle" size={18} color="#fff" />
                        </View>
                    </Marker>
                )}

                {destinationCoords && (
                    <Marker
                        coordinate={destinationCoords}
                        title={t.deliverTo || 'Delivery Location'}
                        description={destinationCoords.address}
                    >
                        <View style={styles.destinationMarker}>
                            <Ionicons name="location" size={22} color="#fff" />
                        </View>
                    </Marker>
                )}

                {routePolylineCoordinates.length > 1 && (
                    <Polyline
                        coordinates={routePolylineCoordinates}
                        strokeColor={colors.primary}
                        strokeWidth={3}
                    />
                )}
            </MapView>

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.trackDelivery || 'Track Delivery'}</Text>
                <View style={{ width: 40 }} />
            </View>

            {errorMsg && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}

            <View style={styles.infoCard}>
                {order?.claimedBy && (
                    <View style={styles.driverInfo}>
                        <View style={styles.driverAvatar}>
                            <Text style={styles.driverAvatarText}>
                                {(order.driverName || 'D').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.driverDetails}>
                            <Text style={styles.driverName}>{order.driverName || 'Driver'}</Text>
                            <Text style={styles.driverStatus}>{t.driverOnTheWay || 'Driver is on the way'}</Text>
                        </View>
                        {order.driverPhone && (
                            <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(order.driverPhone)}>
                                <Ionicons name="call" size={20} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {order?.status && (
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>
                            {t[order.status] || order.status}
                        </Text>
                    </View>
                )}

                {destinationCoords && (
                    <View style={styles.infoRow}>
                        <Ionicons name="location" size={20} color={colors.danger} />
                        <Text style={styles.infoText} numberOfLines={2}>
                            {destinationCoords.address}
                        </Text>
                    </View>
                )}

                {routeDistanceKm && (
                    <View style={styles.infoRow}>
                        <Ionicons name="navigate" size={20} color={colors.primary} />
                        <Text style={styles.infoText}>
                            {routeDistanceKm.toFixed(2)} km
                            {routeSummary?.durationSeconds
                                ? ` • ~${Math.round(routeSummary.durationSeconds / 60)} min`
                                : ''}
                            {' '}{t.distance || 'away'}
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}
