import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { getBackendUrl } from '../config';

export function useNotifications() {
    const { token, isAuthenticated } = useAuthStore();
    const { fetchUnreadCount, addNotification } = useNotificationStore();
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    useEffect(() => {
        if (!isAuthenticated || !token) return;

        // Fetch initial unread count
        fetchUnreadCount();

        function connect() {
            const backendUrl = getBackendUrl();
            const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
            const wsHost = backendUrl.replace(/^https?:\/\//, '');
            const wsUrl = `${wsProtocol}://${wsHost}/ws?token=${token}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (message.type === 'notification' && message.data) {
                        addNotification(message.data);
                    }
                } catch (err) {
                    // Ignore non-JSON messages
                }
            };

            ws.onclose = () => {
                // Reconnect after 5 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    if (isAuthenticated && token) {
                        connect();
                    }
                }, 5000);
            };

            ws.onerror = () => {
                ws.close();
            };
        }

        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [isAuthenticated, token, fetchUnreadCount, addNotification]);
}
