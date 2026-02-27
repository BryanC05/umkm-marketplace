import React from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import api from '../api/api';

let notificationHandlerSet = false;

class NotificationService {
    constructor() {
        this.expoPushToken = null;
        this.notificationListener = null;
        this.responseListener = null;
        this.initialized = false;
    }

    // Initialize notification handler - call this before using notifications
    async initialize() {
        if (this.initialized) return true;

        try {
            // Set up the notification handler first
            await Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: true,
                    priority: Notifications.AndroidNotificationPriority.MAX,
                }),
            });

            // Request permissions for local notifications (required on iOS)
            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                console.log('📱 Current notification permission status:', existingStatus);

                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync({
                        ios: {
                            allowAlert: true,
                            allowBadge: true,
                            allowSound: true,
                        },
                    });
                    console.log('📱 Notification permission requested, new status:', status);

                    if (status !== 'granted') {
                        console.log('⚠️ Notification permissions not granted');
                        return false;
                    }
                }
            }

            notificationHandlerSet = true;
            this.initialized = true;
            console.log('✅ Notification handler initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Notification handler initialization failed:', error.message);
            return false;
        }
    }

    async registerForPushNotifications() {
        let token;

        // Initialize notification handler first
        const initialized = await this.initialize();
        if (!initialized) {
            console.log('Notifications not supported in this environment');
            return null;
        }

        try {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('high_importance_channel', {
                    name: 'High Importance Notifications',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#3b82f6',
                });
            }

            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus !== 'granted') {
                    console.log('Push notification permission not granted');
                    return null;
                }

                // Skip remote push token fetching inside Expo Go as SDK 53 removed support
                if (Constants.appOwnership !== 'expo') {
                    try {
                        const tokenData = await Notifications.getExpoPushTokenAsync({
                            // Only pass projectId if you have a valid UUID from EAS Config
                            projectId: Constants?.expoConfig?.extra?.eas?.projectId,
                        });
                        token = tokenData.data;
                        this.expoPushToken = token;

                        await this.saveTokenToServer(token);
                    } catch (error) {
                        console.log('Skipped fetching push token:', error.message);
                    }
                } else {
                    console.log('Skipping remote push token fetch for Expo Go');
                }
            } else {
                console.log('Must use physical device for Push Notifications');
            }
        } catch (error) {
            console.log('Push notification registration failed:', error.message);
        }

        return token;
    }

    async saveTokenToServer(token) {
        try {
            await api.put('/driver/push-token', { pushToken: token });
        } catch (error) {
            console.error('Failed to save push token:', error);
        }
    }

    async getStoredToken() {
        try {
            return await AsyncStorage.getItem('pushToken');
        } catch {
            return null;
        }
    }

    setupNotificationListeners(onNotification, onResponse) {
        if (!notificationHandlerSet) return () => { };

        try {
            this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
                console.log('Notification received:', notification);
                if (onNotification) {
                    onNotification(notification);
                }
            });

            this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
                console.log('Notification response:', response);
                if (onResponse) {
                    onResponse(response);
                }
            });
        } catch (error) {
            console.log('Setup notification listeners failed:', error.message);
        }

        return () => {
            if (this.notificationListener) {
                this.notificationListener.remove();
            }
            if (this.responseListener) {
                this.responseListener.remove();
            }
        };
    }

    async scheduleLocalNotification(title, body, data = {}, seconds = 1) {
        console.log('🔔 [LocalNotification] Triggering locally:', title, body);

        // Try to initialize if not already done
        if (!notificationHandlerSet) {
            const initialized = await this.initialize();
            if (!initialized) {
                console.log('❌ Notifications not available - handler could not be initialized');
                return;
            }
        }

        // Ensure Android notification channel exists
        if (Platform.OS === 'android') {
            try {
                await Notifications.setNotificationChannelAsync('high_importance_channel', {
                    name: 'High Importance Notifications',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#3b82f6',
                });
            } catch (channelError) {
                console.log('Channel setup (may already exist):', channelError.message);
            }
        }

        try {
            // Use null trigger for immediate delivery
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    sound: true,
                    priority: Platform.OS === 'android' ? Notifications.AndroidNotificationPriority.MAX : undefined,
                    ...(Platform.OS === 'android' && { channelId: 'high_importance_channel' }),
                },
                trigger: null, // Immediate delivery
            });
            console.log('🔔 [LocalNotification] Scheduled successfully');
        } catch (error) {
            console.error('🔔 [LocalNotification] Schedule notification failed:', error);
        }
    }

    async sendNewOrderNotificationToDrivers(orderData, nearbyDriverTokens) {
        if (!nearbyDriverTokens || nearbyDriverTokens.length === 0) {
            return;
        }

        const message = {
            to: nearbyDriverTokens,
            sound: 'default',
            title: 'New Delivery Available!',
            body: `Rp ${orderData.deliveryFee?.toLocaleString('id-ID')} - ${orderData.distance?.toFixed(1)}km - ${orderData.storeName}`,
            data: {
                type: 'new_order',
                orderId: orderData.orderId,
            },
        };

        try {
            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
            });
        } catch (error) {
            console.error('Failed to send push notification:', error);
        }
    }

    async clearAllNotifications() {
        if (!notificationHandlerSet) return;
        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            await Notifications.dismissAllNotificationsAsync();
        } catch (error) {
            console.log('Clear notifications failed:', error.message);
        }
    }

    async setBadgeCount(count) {
        if (!notificationHandlerSet) return;
        try {
            await Notifications.setBadgeCountAsync(count);
        } catch (error) {
            console.log('Set badge count failed:', error.message);
        }
    }
}

const notificationService = new NotificationService();
export default notificationService;

export function usePushNotifications() {
    const [token, setToken] = React.useState(null);
    const [notification, setNotification] = React.useState(null);
    const [initialized, setInitialized] = React.useState(false);

    React.useEffect(() => {
        const init = async () => {
            // Try to initialize notification handler
            const isInitialized = await notificationService.initialize();
            setInitialized(isInitialized);

            if (!isInitialized) {
                console.log('Notifications not available on this device');
                return;
            }

            try {
                const pushToken = await notificationService.registerForPushNotifications();
                setToken(pushToken);
            } catch (error) {
                console.log('Push registration error:', error.message);
            }
        };

        init();

        // Only setup listeners if initialization succeeded
        if (!initialized) return;

        const cleanup = notificationService.setupNotificationListeners(
            (notif) => setNotification(notif),
            (response) => {
                const data = response.notification.request.content.data;
                if (data?.type === 'new_order' && data?.orderId) {
                    // Navigate to order details or available orders
                }
            }
        );

        return cleanup;
    }, [initialized]);

    return {
        token,
        notification,
        initialized,
        scheduleNotification: notificationService.scheduleLocalNotification,
        clearNotifications: notificationService.clearAllNotifications,
    };
}
