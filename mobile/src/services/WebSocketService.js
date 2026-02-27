import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState } from 'react-native';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';

class WebSocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.listeners = new Map();
    }

    async connect() {
        if (this.socket?.connected) {
            return this.socket;
        }

        const token = await SecureStore.getItemAsync('token');
        if (!token) {
            return null;
        }

        return new Promise((resolve, reject) => {
            this.socket = io(API_URL.replace('/api', ''), {
                transports: ['websocket'],
                auth: { token },
                query: { token },
            });

            this.socket.on('connect', () => {
                this.connected = true;
                console.log('Socket.IO connected');

                // Keep-alive heartbeat loop
                if (this.pingInterval) clearInterval(this.pingInterval);
                this.pingInterval = setInterval(() => {
                    if (this.socket?.connected) {
                        this.socket.emit('ping', { timestamp: Date.now() });
                    }
                }, 25000);

                resolve(this.socket);
            });

            this.socket.on('disconnect', () => {
                this.connected = false;
                if (this.pingInterval) clearInterval(this.pingInterval);
                console.log('Socket.IO disconnected');
            });

            this.socket.on('connect_error', (error) => {
                console.error('WebSocket connection error:', error);
                reject(error);
            });

            this.socket.on('driver-location-update', (data) => {
                const listeners = this.listeners.get('driver-location') || [];
                listeners.forEach(cb => cb(data));
            });

            this.socket.on('order-status-update', (data) => {
                const listeners = this.listeners.get('order-status') || [];
                listeners.forEach(cb => cb(data));
            });

            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    disconnect() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
        }
    }

    joinOrderTracking(orderId) {
        this.emit('join-order-tracking', orderId);
    }

    leaveOrderTracking(orderId) {
        this.emit('leave-order-tracking', orderId);
    }

    updateDriverLocation(orderId, latitude, longitude) {
        this.emit('driver-location', {
            orderId,
            latitude,
            longitude,
        });
    }
}

const wsService = new WebSocketService();

export function useWebSocket() {
    const connect = useCallback(async () => {
        try {
            await wsService.connect();
            return true;
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            return false;
        }
    }, []);

    const disconnect = useCallback(() => {
        wsService.disconnect();
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && !wsService.connected) {
                console.log('🔄 [Socket.IO] App awakened, forcing reconnect...');
                connect();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [connect]);

    return {
        connect,
        disconnect,
        socket: wsService.socket,
        isConnected: wsService.connected,
        wsService,
    };
}

export function useDriverTracking(orderId) {
    const [driverLocation, setDriverLocation] = useState(null);
    const { connect, wsService } = useWebSocket();

    useEffect(() => {
        if (!orderId) return;

        const setupTracking = async () => {
            await connect();
            wsService.joinOrderTracking(orderId);
        };

        setupTracking();

        const handleLocationUpdate = (data) => {
            if (data.orderId === orderId) {
                setDriverLocation({
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: data.timestamp,
                });
            }
        };

        wsService.on('driver-location', handleLocationUpdate);

        return () => {
            wsService.off('driver-location', handleLocationUpdate);
            wsService.leaveOrderTracking(orderId);
        };
    }, [orderId, connect, wsService]);

    return { driverLocation };
}

export function useDriverLocationBroadcast(orderId) {
    const { connect, wsService } = useWebSocket();
    const lastSent = useRef(0);

    useEffect(() => {
        connect();
    }, [connect]);

    const broadcastLocation = useCallback((latitude, longitude) => {
        const now = Date.now();
        if (now - lastSent.current < 5000) {
            return;
        }
        lastSent.current = now;
        wsService.updateDriverLocation(orderId, latitude, longitude);
    }, [orderId, wsService]);

    return { broadcastLocation };
}

export default wsService;
