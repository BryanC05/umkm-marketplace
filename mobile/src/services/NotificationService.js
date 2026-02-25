import React from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import api from '../api/api';

let notificationHandlerSet = false;

try {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
        }),
    });
    notificationHandlerSet = true;
} catch (error) {
    console.log('Notification handler setup failed:', error.message);
}

class NotificationService {
    constructor() {
        this.expoPushToken = null;
        this.notificationListener = null;
        this.responseListener = null;
    }

    async registerForPushNotifications() {
        let token;

        if (!notificationHandlerSet) {
            console.log('Notifications not supported in this environment');
            return null;
        }

        try {
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
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
        if (!notificationHandlerSet) {
            console.log('Notifications not available');
            return;
        }
        try {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data,
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    channelId: 'default',
                },
                trigger: null, // null fires immediately instead of requiring Android Exact Alarm permissions
            });
        } catch (error) {
            console.log('Schedule notification failed:', error.message);
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

    React.useEffect(() => {
        if (!notificationHandlerSet) return;

        const register = async () => {
            try {
                const pushToken = await notificationService.registerForPushNotifications();
                setToken(pushToken);
            } catch (error) {
                console.log('Push registration error:', error.message);
            }
        };

        register();

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
    }, []);

    return {
        token,
        notification,
        scheduleNotification: notificationService.scheduleLocalNotification,
        clearNotifications: notificationService.clearAllNotifications,
    };
}
