import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator,
    Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDriverStore } from '../../store/driverStore';
import { haversineDistanceKm } from '../../utils/helpers';
import { useTheme } from '../../theme/ThemeContext';
import LocationService from '../../services/LocationService';
import api from '../../api/api';

const DELIVERY_STEPS = [
    { status: 'picked_up', label: 'Picked Up', icon: 'cube' },
    { status: 'on_the_way', label: 'On the Way', icon: 'bicycle' },
    { status: 'arrived', label: 'Arrived', icon: 'location' },
    { status: 'delivered', label: 'Delivered', icon: 'checkmark-circle' },
];

export default function ActiveDeliveryScreen() {
    const { colors, isDarkMode } = useThemeStore();
    const { t } = useTranslation();
    const { 
        activeDelivery, 
        currentLocation, 
        updateLocation,
        updateDeliveryStatus,
        completeDelivery,
        fetchActiveDelivery,
    } = useDriverStore();

    const [updating, setUpdating] = useState(false);
    const [locationWatcher, setLocationWatcher] = useState(null);
    const [routePath, setRoutePath] = useState([]);
    const [routeSummary, setRouteSummary] = useState(null);

    useEffect(() => {
        fetchActiveDelivery();
        
        const startTracking = async () => {
            const watcher = await LocationService.startTracking((loc) => {
                updateLocation(loc.latitude, loc.longitude);
            });
            setLocationWatcher(watcher);
        };
        startTracking();

        return () => {
            if (locationWatcher) {
                locationWatcher.remove();
            }
        };
    }, []);

    const getCurrentStepIndex = () => {
        if (!activeDelivery?.status) return -1;
        const status = activeDelivery.status;
        if (status === 'claimed') return -1;
        return DELIVERY_STEPS.findIndex(s => s.status === status);
    };

    const handleStatusUpdate = async (status) => {
        if (status === 'delivered') {
            Alert.alert(
                t.completeDelivery || 'Complete Delivery',
                t.completeDeliveryConfirm || 'Are you sure you want to mark this order as delivered?',
                [
                    { text: t.cancel || 'Cancel', style: 'cancel' },
                    {
                        text: t.confirm || 'Confirm',
                        onPress: async () => {
                            setUpdating(true);
                            const result = await completeDelivery(activeDelivery._id);
                            setUpdating(false);
                            
                            if (result.success) {
                                Alert.alert(
                                    t.success || 'Success',
                                    `${t.deliveryComplete || 'Delivery completed!'}\n${t.earnings || 'Earnings'}: Rp ${result.earnings?.toLocaleString('id-ID') || '0'}`
                                );
                            } else {
                                Alert.alert(t.error || 'Error', result.error);
                            }
                        }
                    }
                ]
            );
        } else {
            setUpdating(true);
            const result = await updateDeliveryStatus(activeDelivery._id, status);
            setUpdating(false);
            
            if (!result.success) {
                Alert.alert(t.error || 'Error', result.error);
            }
        }
    };

    const handleCall = (phone) => {
        if (!phone) return;
        const url = `tel:${phone}`;
        Linking.canOpenURL(url).then(supported => {
            if (supported) Linking.openURL(url);
        });
    };

    const handleOpenMaps = (lat, lng, label) => {
        const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
        const url = Platform.select({
            ios: `maps:?daddr=${lat},${lng}`,
            android: `geo:${lat},${lng}?q=${lat},${lng}(${label})`
        });
        Linking.canOpenURL(url).then(supported => {
            if (supported) Linking.openURL(url);
        });
    };

    const currentStepIndex = getCurrentStepIndex();

    const storeCoords = activeDelivery?.store?.coordinates || 
        activeDelivery?.storeLocation?.coordinates;
    const deliveryCoords = activeDelivery?.deliveryAddress?.coordinates;

    const storeLat = storeCoords?.[1] || storeCoords?.latitude || -6.2;
    const storeLng = storeCoords?.[0] || storeCoords?.longitude || 106.8;
    const deliveryLat = deliveryCoords?.[1] || deliveryCoords?.latitude || -6.21;
    const deliveryLng = deliveryCoords?.[0] || deliveryCoords?.longitude || 106.81;

    const mapRegion = {
        latitude: currentLocation?.latitude || storeLat,
        longitude: currentLocation?.longitude || storeLng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
    };

    const originPoint = useMemo(() => {
        if (
            Number.isFinite(currentLocation?.latitude) &&
            Number.isFinite(currentLocation?.longitude)
        ) {
            return {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
            };
        }
        return {
            latitude: storeLat,
            longitude: storeLng,
        };
    }, [currentLocation?.latitude, currentLocation?.longitude, storeLat, storeLng]);

    const destinationPoint = useMemo(() => ({
        latitude: deliveryLat,
        longitude: deliveryLng,
    }), [deliveryLat, deliveryLng]);

    useEffect(() => {
        if (
            !Number.isFinite(originPoint?.latitude) ||
            !Number.isFinite(originPoint?.longitude) ||
            !Number.isFinite(destinationPoint?.latitude) ||
            !Number.isFinite(destinationPoint?.longitude)
        ) {
            setRoutePath([]);
            setRouteSummary(null);
            return;
        }

        let isActive = true;

        const fetchRoute = async () => {
            try {
                const response = await api.get('/navigation/route', {
                    params: {
                        originLat: originPoint.latitude,
                        originLng: originPoint.longitude,
                        destinationLat: destinationPoint.latitude,
                        destinationLng: destinationPoint.longitude,
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
                console.warn('Failed to fetch active delivery route, using fallback:', error?.message || error);
                if (!isActive) return;
                setRoutePath([originPoint, destinationPoint]);
                setRouteSummary(null);
            }
        };

        fetchRoute();
        const interval = setInterval(fetchRoute, 12000);

        return () => {
            isActive = false;
            clearInterval(interval);
        };
    }, [
        originPoint?.latitude,
        originPoint?.longitude,
        destinationPoint?.latitude,
        destinationPoint?.longitude,
    ]);

    const routePolylineCoordinates = useMemo(() => {
        if (routePath.length > 1) {
            return routePath;
        }
        return [originPoint, destinationPoint];
    }, [routePath, originPoint, destinationPoint]);

    const routeDistanceKm = useMemo(() => {
        if (routeSummary?.distanceMeters) {
            return routeSummary.distanceMeters / 1000;
        }
        return calculateDistance(
            originPoint.latitude,
            originPoint.longitude,
            destinationPoint.latitude,
            destinationPoint.longitude
        );
    }, [routeSummary, originPoint, destinationPoint]);

    const routeDurationMinutes = useMemo(() => {
        if (routeSummary?.durationSeconds) {
            return Math.round(routeSummary.durationSeconds / 60);
        }
        return null;
    }, [routeSummary]);

    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        map: {
            height: 280,
        },
        infoCard: {
            flex: 1,
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            marginTop: -20,
            paddingTop: 20,
            paddingHorizontal: 16,
        },
        orderId: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.textSecondary,
            marginBottom: 12,
            textAlign: 'center',
        },
        sectionLabel: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.textSecondary,
            letterSpacing: 1,
            marginBottom: 4,
        },
        addressCard: {
            backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
            borderRadius: 12,
            padding: 12,
            marginBottom: 12,
        },
        addressTitle: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 2,
        },
        addressText: {
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 18,
        },
        phoneRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 8,
        },
        phoneText: {
            fontSize: 13,
            color: colors.primary,
            marginLeft: 4,
        },
        stepsContainer: {
            marginTop: 16,
        },
        stepsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 12,
        },
        stepBtn: {
            alignItems: 'center',
            flex: 1,
            paddingVertical: 8,
        },
        stepIconContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDarkMode ? '#374151' : '#e5e7eb',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 6,
        },
        stepIconActive: {
            backgroundColor: colors.success,
        },
        stepIconCompleted: {
            backgroundColor: colors.primary,
        },
        stepLabel: {
            fontSize: 11,
            color: colors.textSecondary,
            textAlign: 'center',
        },
        stepLabelActive: {
            color: colors.text,
            fontWeight: '600',
        },
        actionBtn: {
            backgroundColor: colors.primary,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 8,
            marginBottom: 16,
            flexDirection: 'row',
            justifyContent: 'center',
        },
        actionBtnDisabled: {
            backgroundColor: colors.textSecondary,
        },
        actionBtnText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: '700',
            marginLeft: 6,
        },
        navBtn: {
            backgroundColor: isDarkMode ? '#374151' : '#f3f4f6',
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: 'center',
            marginBottom: 16,
            flexDirection: 'row',
            justifyContent: 'center',
        },
        navBtnText: {
            color: colors.text,
            fontSize: 14,
            fontWeight: '600',
            marginLeft: 6,
        },
    }), [colors, isDarkMode]);

    if (!activeDelivery) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const nextStep = DELIVERY_STEPS[currentStepIndex + 1];
    const isCompleted = currentStepIndex >= DELIVERY_STEPS.length - 1;

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                region={mapRegion}
                showsUserLocation
                showsMyLocationButton={false}
                loadingEnabled={true}
                loadingIndicatorColor={colors.primary}
            >
                <Marker
                    coordinate={{ latitude: storeLat, longitude: storeLng }}
                    title={activeDelivery.store?.name || 'Store'}
                    description={activeDelivery.store?.address}
                >
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 28 }}>🏪</Text>
                    </View>
                </Marker>

                <Marker
                    coordinate={{ latitude: deliveryLat, longitude: deliveryLng }}
                    title={t.deliverTo || 'Delivery'}
                    description={activeDelivery.deliveryAddress?.address}
                >
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 28 }}>🏠</Text>
                    </View>
                </Marker>

                <Polyline
                    coordinates={routePolylineCoordinates}
                    strokeColor={colors.primary}
                    strokeWidth={3}
                />
            </MapView>

            <View style={styles.infoCard}>
                    <Text style={styles.orderId}>
                        Order #{activeDelivery._id?.slice(-6)?.toUpperCase()}
                    </Text>
                    <Text style={[styles.addressText, { marginBottom: 8, textAlign: 'center' }]}>
                        {routeDistanceKm?.toFixed(2)} km
                        {routeDurationMinutes ? ` • ~${routeDurationMinutes} min` : ''}
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionLabel}>{t.pickup || 'PICKUP'}</Text>
                    <View style={styles.addressCard}>
                        <Text style={styles.addressTitle}>{activeDelivery.store?.name || 'Store'}</Text>
                        <Text style={styles.addressText}>{activeDelivery.store?.address}</Text>
                        <TouchableOpacity 
                            style={styles.navBtn}
                            onPress={() => handleOpenMaps(storeLat, storeLng, activeDelivery.store?.name)}
                        >
                            <Ionicons name="navigate" size={16} color={colors.text} />
                            <Text style={styles.navBtnText}>{t.navigate || 'Navigate'}</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionLabel}>{t.deliverTo || 'DELIVER TO'}</Text>
                    <View style={styles.addressCard}>
                        <Text style={styles.addressTitle}>{activeDelivery.buyer?.name || 'Customer'}</Text>
                        <Text style={styles.addressText}>{activeDelivery.deliveryAddress?.address}</Text>
                        {activeDelivery.buyer?.phone && (
                            <TouchableOpacity 
                                style={styles.phoneRow}
                                onPress={() => handleCall(activeDelivery.buyer.phone)}
                            >
                                <Ionicons name="call" size={14} color={colors.primary} />
                                <Text style={styles.phoneText}>{activeDelivery.buyer.phone}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={styles.navBtn}
                            onPress={() => handleOpenMaps(deliveryLat, deliveryLng, 'Delivery')}
                        >
                            <Ionicons name="navigate" size={16} color={colors.text} />
                            <Text style={styles.navBtnText}>{t.navigate || 'Navigate'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.stepsContainer}>
                        <Text style={styles.sectionLabel}>{t.status || 'STATUS'}</Text>
                        <View style={styles.stepsRow}>
                            {DELIVERY_STEPS.map((step, idx) => {
                                const isCompleted = idx < currentStepIndex;
                                const isCurrent = idx === currentStepIndex;
                                
                                return (
                                    <TouchableOpacity 
                                        key={step.status}
                                        style={styles.stepBtn}
                                        disabled
                                    >
                                        <View style={[
                                            styles.stepIconContainer,
                                            isCompleted && styles.stepIconCompleted,
                                            isCurrent && styles.stepIconActive
                                        ]}>
                                            <Ionicons 
                                                name={step.icon} 
                                                size={18} 
                                                color={isCompleted || isCurrent ? '#fff' : colors.textSecondary} 
                                            />
                                        </View>
                                        <Text style={[
                                            styles.stepLabel,
                                            (isCompleted || isCurrent) && styles.stepLabelActive
                                        ]}>
                                            {step.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {nextStep && (
                            <TouchableOpacity 
                                style={[styles.actionBtn, updating && styles.actionBtnDisabled]}
                                onPress={() => handleStatusUpdate(nextStep.status)}
                                disabled={updating}
                            >
                                {updating ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name={nextStep.icon} size={18} color="#fff" />
                                        <Text style={styles.actionBtnText}>
                                            {t.markAs || 'Mark as'} {nextStep.label}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        {currentStepIndex === DELIVERY_STEPS.length - 2 && (
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: colors.success }, updating && styles.actionBtnDisabled]}
                                onPress={() => handleStatusUpdate('delivered')}
                                disabled={updating}
                            >
                                {updating ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                                        <Text style={styles.actionBtnText}>{t.completeDelivery || 'Complete Delivery'}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    return haversineDistanceKm({ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 });
}
