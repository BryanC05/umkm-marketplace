import React, { useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, FlatList, RefreshControl, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDriverStore } from '../../store/driverStore';
import { useTheme } from '../../theme/ThemeContext';
import LocationService from '../../services/LocationService';
import LoadingSkeleton from '../../components/LoadingSkeleton';

function OrderCard({ order, onClaim, claiming }) {
    const { colors, isDarkMode } = useTheme();
    const { t } = useTranslation();

    const styles = useMemo(() => StyleSheet.create({
        card: {
            backgroundColor: colors.card,
            borderRadius: 16,
            marginHorizontal: 16,
            marginVertical: 8,
            padding: 16,
            shadowColor: isDarkMode ? '#000' : '#e2e8f0',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDarkMode ? 0.3 : 0.8,
            shadowRadius: 8,
            elevation: 2,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 12,
        },
        storeName: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
            flex: 1,
        },
        fee: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.success,
        },
        routeContainer: {
            marginBottom: 12,
        },
        locationRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 8,
        },
        locationIcon: {
            width: 24,
            alignItems: 'center',
            marginRight: 8,
        },
        locationText: {
            flex: 1,
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 18,
        },
        locationLabel: {
            fontSize: 11,
            fontWeight: '600',
            color: colors.textSecondary,
            marginBottom: 2,
        },
        divider: {
            height: 1,
            backgroundColor: colors.border,
            marginVertical: 12,
        },
        statsRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 12,
        },
        statItem: {
            alignItems: 'center',
        },
        statValue: {
            fontSize: 14,
            fontWeight: '700',
            color: colors.text,
        },
        statLabel: {
            fontSize: 11,
            color: colors.textSecondary,
        },
        claimBtn: {
            backgroundColor: colors.primary,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
        },
        claimBtnDisabled: {
            backgroundColor: colors.textSecondary,
        },
        claimBtnText: {
            color: colors.card,
            fontSize: 15,
            fontWeight: '700',
            marginLeft: 6,
        },
    }), [colors, isDarkMode]);

    const distanceToStore = order.distance?.toFixed(1) || '0.0';
    const deliveryDistance = order.totalDistance?.toFixed(1) || '0.0';
    const fee = order.deliveryFee?.toLocaleString('id-ID') || '0';

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.storeName} numberOfLines={1}>{order.store?.name || 'Store'}</Text>
                <Text style={styles.fee}>Rp {fee}</Text>
            </View>

            <View style={styles.routeContainer}>
                <View style={styles.locationRow}>
                    <View style={styles.locationIcon}>
                        <Ionicons name="location" size={16} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.locationLabel}>{t.pickup || 'PICKUP'}</Text>
                        <Text style={styles.locationText} numberOfLines={2}>
                            {order.store?.address || t.storeAddress || 'Alamat Toko'}
                        </Text>
                    </View>
                </View>

                <View style={styles.locationRow}>
                    <View style={styles.locationIcon}>
                        <Ionicons name="location" size={16} color={colors.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.locationLabel}>{t.deliverTo || 'DELIVER TO'}</Text>
                        <Text style={styles.locationText} numberOfLines={2}>
                            {order.deliveryAddress?.address || t.deliveryAddress || 'Alamat Pengantaran'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{distanceToStore} km</Text>
                    <Text style={styles.statLabel}>{t.toStore || 'To Store'}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{deliveryDistance} km</Text>
                    <Text style={styles.statLabel}>{t.totalTrip || 'Total Trip'}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{order.items?.length || 0}</Text>
                    <Text style={styles.statLabel}>{t.items || 'Items'}</Text>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.claimBtn, claiming && styles.claimBtnDisabled]}
                onPress={onClaim}
                disabled={claiming}
            >
                {claiming ? (
                    <ActivityIndicator color={colors.card} size="small" />
                ) : (
                    <>
                        <Ionicons name="checkmark-circle" size={18} color={colors.card} />
                        <Text style={styles.claimBtnText}>{t.claimOrder || 'Claim Order'}</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

function EmptyState({ message }) {
    const { colors } = useTheme();

    const styles = useMemo(() => StyleSheet.create({
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 60,
        },
        emptyIcon: {
            fontSize: 64,
            marginBottom: 16,
        },
        emptyText: {
            fontSize: 16,
            textAlign: 'center',
            paddingHorizontal: 32,
            color: colors.textSecondary,
        },
    }), [colors]);

    return (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>{message}</Text>
        </View>
    );
}

export default function AvailableOrdersScreen() {
    const { colors, isDarkMode } = useTheme();
    const { t } = useTranslation();
    const {
        availableOrders,
        isLoadingOrders,
        currentLocation,
        fetchAvailableOrders,
        claimOrder
    } = useDriverStore();

    const [claimingId, setClaimingId] = React.useState(null);
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 30000);
        return () => clearInterval(interval);
    }, [currentLocation]);

    const loadOrders = useCallback(async () => {
        let lat = currentLocation?.latitude;
        let lng = currentLocation?.longitude;

        if (!lat || !lng) {
            const location = await LocationService.getCurrentLocation();
            if (location) {
                lat = location.latitude;
                lng = location.longitude;
            }
        }

        if (lat && lng) {
            await fetchAvailableOrders(lat, lng);
        }
    }, [currentLocation, fetchAvailableOrders]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadOrders();
        setRefreshing(false);
    }, [loadOrders]);

    const handleClaim = useCallback(async (orderId) => {
        setClaimingId(orderId);
        const result = await claimOrder(orderId);
        setClaimingId(null);

        if (!result.success) {
            Alert.alert(t.error || 'Error', result.error);
        }
    }, [claimOrder, t.error]);

    const renderOrder = useCallback(({ item }) => (
        <OrderCard
            order={item}
            onClaim={() => handleClaim(item._id)}
            claiming={claimingId === item._id}
        />
    ), [handleClaim, claimingId]);

    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        listContent: {
            paddingVertical: 8,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    }), [colors, isDarkMode]);

    if (isLoadingOrders && availableOrders.length === 0) {
        return <LoadingSkeleton variant="orders-list" />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={availableOrders}
                renderItem={renderOrder}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        message={t.noAvailableOrders || 'No orders available nearby. Check back soon!'}
                    />
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
