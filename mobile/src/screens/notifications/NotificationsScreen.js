import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationStore } from '../../store/notificationStore';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../hooks/useTranslation';
import api from '../../api/api';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import notificationService from '../../services/NotificationService';

const getFilters = (t) => [
    { key: 'all', label: t('notificationFilters.all') },
    { key: 'orders', label: t('notificationFilters.orders'), types: ['new_order', 'order_status'] },
    { key: 'messages', label: t('notificationFilters.messages'), types: ['new_message'] },
    { key: 'payments', label: t('notificationFilters.payments'), types: ['payment_update'] },
    { key: 'delivery', label: t('notificationFilters.delivery'), types: ['delivery_update'] },
];

const NOTIFICATION_ACTION_TIMEOUT_MS = 25000;

function formatTimeAgo(dateStr, t) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return t('justNowNotif');
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function getNotifIcon(type) {
    switch (type) {
        case 'new_order':
        case 'order_status':
            return { name: 'bag-handle', color: '#14b8a6', bg: '#ccfbf1' };
        case 'new_message':
            return { name: 'chatbubble', color: '#10b981', bg: '#ecfdf5' };
        case 'payment_update':
            return { name: 'card', color: '#f59e0b', bg: '#fffbeb' };
        case 'delivery_update':
            return { name: 'bicycle', color: '#8b5cf6', bg: '#f5f3ff' };
        default:
            return { name: 'information-circle', color: '#6b7280', bg: '#f9fafb' };
    }
}

export default function NotificationsScreen({ navigation }) {
    const { colors } = useThemeStore();
    const { t } = useTranslation();
    const [activeFilter, setActiveFilter] = useState('all');
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sendingTest, setSendingTest] = useState(false);
    const FILTERS = getFilters(t);
    const {
        notifications,
        unreadCount,
        lastError,
        fetchNotifications,
        markAsRead,
        markAllRead,
        deleteNotification,
        deleteAllNotifications,
        addNotification,
        fetchUnreadCount,
    } = useNotificationStore();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const result = await fetchNotifications();
            setLoading(false);
            if (!result?.success && result?.error) {
                Alert.alert(t('notificationsUnavailable'), result.error);
            }
        };
        load();
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        const result = await fetchNotifications();
        setRefreshing(false);
        if (!result?.success && result?.error) {
            Alert.alert(t('refreshFailed'), result.error);
        }
    }, [fetchNotifications]);

    const sendTestNotification = async () => {
        setSendingTest(true);
        
        // First, try local notification
        try {
            await notificationService.initialize();
            await notificationService.scheduleLocalNotification(
                t('testNotification'),
                'This is a test notification from the app!',
                { type: 'test' },
                1
            );
            
            // Add to local notification store so it appears in the list
            const newNotification = {
                _id: 'test-' + Date.now(),
                title: t('testNotification'),
                message: 'This is a test notification from the app!',
                type: 'test',
                isRead: false,
                createdAt: new Date().toISOString(),
            };
            addNotification(newNotification);
            fetchUnreadCount();
            
            Alert.alert(t('success'), t('testNotificationSent'));
            setSendingTest(false);
            return;
        } catch (err) {
            console.log('Local notification failed, trying API:', err.message);
        }

        // Fallback to API notification
        try {
            await api.post(
                '/notifications/test',
                null,
                {
                    timeout: NOTIFICATION_ACTION_TIMEOUT_MS,
                    _skipRetry: true,
                    _suppressGlobalErrors: true,
                }
            );
            // Small delay to let WebSocket deliver it
            setTimeout(() => fetchNotifications(), 500);
        } catch (err) {
            console.error('🔴 Failed to send test notification:', err.message);
            const isTimeout = err?.code === 'ECONNABORTED';
            Alert.alert(
                t('testNotificationFailed'),
                isTimeout
                    ? t('requestTimedOut')
                    : (err?.response?.data?.error || err?.response?.data?.message || 'Could not send test notification.')
            );
            if (err.response) {
                console.error('🔴 Response data:', err.response.data);
                console.error('🔴 Response status:', err.response.status);
            } else if (err.request) {
                console.error('🔴 No response received. Request details:', err.request._response);
            }
        } finally {
            setSendingTest(false);
        }
    };

    const filtered = activeFilter === 'all'
        ? notifications
        : notifications.filter((n) => {
            const filterDef = FILTERS.find((f) => f.key === activeFilter);
            return filterDef?.types?.includes(n.type);
        });

    const handlePress = async (notif) => {
        if (!notif.isRead) {
            await markAsRead(notif._id);
        }
        const data = notif.data || {};
        if (data.orderId) {
            navigation.navigate('Orders');
        } else if (data.chatRoomId) {
            navigation.navigate('Messages');
        }
    };

    const confirmDelete = (id) => {
        Alert.alert(
            'Delete Notification',
            'Are you sure you want to delete this notification?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteNotification(id) }
            ]
        );
    };

    const confirmDeleteAll = () => {
        Alert.alert(
            'Clear All Notifications',
            'Are you sure you want to delete all your notifications? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear All', style: 'destructive', onPress: deleteAllNotifications }
            ]
        );
    };

    const styles = makeStyles(colors);

    const renderItem = ({ item: notif }) => {
        const icon = getNotifIcon(notif.type);
        return (
            <TouchableOpacity
                style={[styles.card, !notif.isRead && styles.cardUnread]}
                onPress={() => handlePress(notif)}
                onLongPress={() => confirmDelete(notif._id)}
                delayLongPress={500}
                activeOpacity={0.7}
            >
                <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
                    <Ionicons name={icon.name} size={20} color={icon.color} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.title} numberOfLines={1}>{notif.title}</Text>
                    <Text style={styles.message} numberOfLines={2}>{notif.message}</Text>
                    <Text style={styles.time}>{formatTimeAgo(notif.createdAt)}</Text>
                </View>
                {!notif.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>

                <View style={styles.headerActions}>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
                            <Text style={styles.markAllText}>Read all</Text>
                        </TouchableOpacity>
                    )}
                    {notifications.length > 0 && (
                        <TouchableOpacity onPress={confirmDeleteAll} style={styles.deleteAllBtn}>
                            <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter tabs */}
            <View style={styles.filterWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterContainer}
                    contentContainerStyle={styles.filterContent}
                >
                    {FILTERS.map((f) => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.filterTab, activeFilter === f.key && styles.filterActive]}
                            onPress={() => setActiveFilter(f.key)}
                        >
                            <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Test button - TEMPORARY */}
            <TouchableOpacity
                style={styles.testBtn}
                onPress={sendTestNotification}
                disabled={sendingTest}
                activeOpacity={0.7}
            >
                {sendingTest ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <>
                        <Ionicons name="flask" size={18} color="#fff" />
                        <Text style={styles.testBtnText}>Send Test Notification</Text>
                    </>
                )}
            </TouchableOpacity>

            {/* List */}
            {loading ? (
                <View style={{ flex: 1 }}>
                    <LoadingSkeleton variant="notifications" />
                </View>
            ) : filtered.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="notifications-off-outline" size={56} color={colors.textSecondary} style={{ opacity: 0.4 }} />
                    <Text style={styles.emptyText}>No notifications</Text>
                    {lastError ? <Text style={styles.errorText}>{lastError}</Text> : null}
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const makeStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backBtn: {
        padding: 4,
        marginRight: 12,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    markAllBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: colors.primary + '15',
        borderRadius: 16,
    },
    markAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deleteAllBtn: {
        padding: 6,
    },
    filterWrapper: {
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 12,
    },
    filterContainer: {
        flexGrow: 0,
    },
    filterContent: {
        paddingHorizontal: 16,
    },
    filterTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: '#fff',
    },
    list: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 14,
        marginBottom: 8,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardUnread: {
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        backgroundColor: colors.primary + '08',
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    message: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 4,
        lineHeight: 18,
    },
    time: {
        fontSize: 12,
        color: colors.textSecondary,
        opacity: 0.7,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
        marginTop: 6,
        marginLeft: 8,
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 60,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 12,
    },
    errorText: {
        marginTop: 8,
        fontSize: 13,
        color: colors.danger,
        textAlign: 'center',
    },
    testBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginBottom: 12,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#f59e0b',
    },
    testBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
});
