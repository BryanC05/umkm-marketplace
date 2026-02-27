import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useDriverStore } from '../../store/driverStore';
import { useTheme } from '../../theme/ThemeContext';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const STATUS_CONFIG = {
    delivered: { icon: 'checkmark-circle', color: '#10b981', label: 'Delivered' }, // success color
    cancelled: { icon: 'close-circle', color: '#ef4444', label: 'Cancelled' }, // danger color
};

function HistoryCard({ item }) {
    const { colors, isDarkMode } = useThemeStore();
    const { t } = useLanguageStore();

    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.delivered;

    const styles = useMemo(() => StyleSheet.create({
        card: {
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 16,
            marginBottom: 10,
            marginHorizontal: 16,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
        },
        orderId: {
            fontSize: 13,
            fontWeight: '600',
            color: colors.textSecondary,
        },
        statusBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: `${statusConfig.color}15`,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 10,
        },
        statusText: {
            fontSize: 11,
            fontWeight: '600',
            color: statusConfig.color,
            marginLeft: 4,
        },
        storeRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 8,
        },
        storeName: {
            fontSize: 15,
            fontWeight: '700',
            color: colors.text,
            marginLeft: 8,
        },
        routeContainer: {
            borderLeftWidth: 2,
            borderLeftColor: colors.border,
            paddingLeft: 12,
            marginLeft: 8,
            marginBottom: 12,
        },
        routePoint: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 6,
        },
        routeDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            marginRight: 8,
            marginTop: 4,
        },
        routeText: {
            flex: 1,
            fontSize: 13,
            color: colors.textSecondary,
            lineHeight: 18,
        },
        footer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
        },
        date: {
            fontSize: 12,
            color: colors.textSecondary,
        },
        earnings: {
            fontSize: 16,
            fontWeight: '800',
            color: colors.success,
        },
    }), [colors, statusConfig]);

    const dateStr = item.deliveredAt || item.createdAt
        ? new Date(item.deliveredAt || item.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : '-';

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.orderId}>#{item._id?.slice(-6)?.toUpperCase()}</Text>
                <View style={styles.statusBadge}>
                    <Ionicons name={statusConfig.icon} size={12} color={statusConfig.color} />
                    <Text style={styles.statusText}>{statusConfig.label}</Text>
                </View>
            </View>

            <View style={styles.storeRow}>
                <Ionicons name="storefront" size={16} color={colors.primary} />
                <Text style={styles.storeName}>{item.store?.name || 'Store'}</Text>
            </View>

            <View style={styles.routeContainer}>
                <View style={styles.routePoint}>
                    <View style={[styles.routeDot, { backgroundColor: colors.success }]} />
                    <Text style={styles.routeText} numberOfLines={1}>{item.store?.address || 'Store'}</Text>
                </View>
                <View style={styles.routePoint}>
                    <View style={[styles.routeDot, { backgroundColor: colors.danger }]} />
                    <Text style={styles.routeText} numberOfLines={1}>{item.deliveryAddress?.address || 'Delivery'}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.date}>{dateStr}</Text>
                <Text style={styles.earnings}>
                    Rp {(item.driverEarnings || 0).toLocaleString('id-ID')}
                </Text>
            </View>
        </View>
    );
}

export default function DeliveryHistoryScreen() {
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
    const { deliveryHistory, fetchDeliveryHistory } = useDriverStore();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        await fetchDeliveryHistory(50, 0);
        setLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchDeliveryHistory(50, 0);
        setRefreshing(false);
    };

    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        listContent: {
            paddingVertical: 12,
        },
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
            color: colors.textSecondary,
            textAlign: 'center',
        },
        emptySubtext: {
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 4,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    }), [colors]);

    if (loading) {
        return <LoadingSkeleton variant="orders-list" />;
    }

    const renderItem = ({ item }) => <HistoryCard item={item} />;

    return (
        <View style={styles.container}>
            <FlatList
                data={deliveryHistory}
                renderItem={renderItem}
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
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>{t.noDeliveryHistory || 'No delivery history yet'}</Text>
                        <Text style={styles.emptySubtext}>{t.completeFirstDelivery || 'Complete your first delivery to see it here'}</Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
