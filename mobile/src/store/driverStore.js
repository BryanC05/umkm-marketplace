import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';

export const useDriverStore = create((set, get) => ({
    isDriverMode: false,
    isAvailable: false,
    driverProfile: null,
    
    activeDelivery: null,
    claimedOrderId: null,
    
    availableOrders: [],
    isLoadingOrders: false,
    
    currentLocation: null,
    locationWatcher: null,
    
    stats: {
        totalDeliveries: 0,
        totalEarnings: 0,
        rating: 5,
        todayEarnings: 0,
        weekEarnings: 0,
        monthEarnings: 0,
    },

    earningsHistory: [],
    deliveryHistory: [],
    
    initDriverMode: async () => {
        try {
            const savedMode = await AsyncStorage.getItem('driverMode');
            if (savedMode === 'true') {
                set({ isDriverMode: true });
                await get().fetchDriverProfile();
                await get().fetchDriverStats();
            }
        } catch (error) {
            console.error('Failed to init driver mode:', error);
        }
    },

    toggleDriverMode: async (isActive) => {
        try {
            const nextActive = !!isActive;
            const response = await api.post('/driver/toggle', {
                isActive: nextActive,
                isAvailable: nextActive,
            });

            const resolvedIsActive = response?.data?.isActive ?? nextActive;
            const resolvedIsAvailable = response?.data?.isAvailable ?? resolvedIsActive;

            await AsyncStorage.setItem('driverMode', resolvedIsActive ? 'true' : 'false');
            set({ isDriverMode: resolvedIsActive, isAvailable: resolvedIsAvailable });
            
            if (resolvedIsActive) {
                await get().fetchDriverProfile();
                await get().fetchDriverStats();
            } else {
                set({ 
                    driverProfile: null, 
                    activeDelivery: null, 
                    availableOrders: [],
                    currentLocation: null,
                });
            }
            return { success: true };
        } catch (error) {
            console.error('Failed to toggle driver mode:', error);
            if (error?.response?.status === 401) {
                return { success: false, error: 'Session expired. Please log in again.' };
            }
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                error?.message ||
                'Failed to activate driver mode';
            return { success: false, error: message };
        }
    },

    fetchDriverProfile: async () => {
        try {
            const response = await api.get('/driver/profile');
            set({ driverProfile: response.data });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch driver profile:', error);
            return null;
        }
    },

    updateDriverProfile: async (data) => {
        try {
            const response = await api.put('/driver/profile', data);
            set({ driverProfile: response.data });
            return { success: true };
        } catch (error) {
            console.error('Failed to update driver profile:', error);
            return { success: false, error: error.response?.data?.error || 'Failed to update profile' };
        }
    },

    updateLocation: async (latitude, longitude) => {
        set({ currentLocation: { latitude, longitude } });
        
        try {
            await api.put('/driver/location', { latitude, longitude });
        } catch (error) {
            console.error('Failed to update location:', error);
        }
    },

    fetchDriverStats: async () => {
        try {
            const response = await api.get('/driver/stats');
            set({ stats: response.data });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch driver stats:', error);
            return null;
        }
    },

    fetchAvailableOrders: async (latitude, longitude, radius = 10) => {
        set({ isLoadingOrders: true });
        try {
            const response = await api.get('/driver/available-orders', {
                params: { lat: latitude, lng: longitude, radius }
            });

            const payload = response?.data;
            const rawOrders = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.orders)
                    ? payload.orders
                    : Array.isArray(payload?.data)
                        ? payload.data
                        : Array.isArray(payload?.data?.orders)
                            ? payload.data.orders
                            : [];

            const orders = rawOrders.map(item => ({
                _id: item.order?._id || item._id,
                store: {
                    name: item.seller?.businessName || item.seller?.name || 'Store',
                    address: item.seller?.address || '',
                    coordinates: item.seller?.coordinates || [],
                },
                deliveryAddress: {
                    address: item.order?.deliveryAddress?.address || '',
                    coordinates: item.order?.deliveryAddress?.coordinates || [],
                },
                distance: item.distanceToStore || item.distance || 0,
                totalDistance: item.totalDistance || 0,
                deliveryFee: item.deliveryFee || 0,
                driverEarnings: item.driverEarnings || 0,
                items: item.order?.items || [],
                totalAmount: item.order?.totalAmount || 0,
                buyer: item.order?.buyer || null,
                createdAt: item.order?.createdAt || item.createdAt,
            }));
            
            orders.sort((a, b) => (a.distance || 0) - (b.distance || 0));
            set({ availableOrders: orders });
            return orders;
        } catch (error) {
            console.error('Failed to fetch available orders:', error);
            set({ availableOrders: [] });
            return [];
        } finally {
            set({ isLoadingOrders: false });
        }
    },

    fetchActiveDelivery: async () => {
        try {
            const response = await api.get('/driver/active-delivery');
            const rawData = response.data || {};
            let activeDelivery = rawData.order || null;
            
            if (activeDelivery && rawData.seller) {
                activeDelivery.store = {
                    _id: rawData.seller._id,
                    name: rawData.seller.businessName || rawData.seller.name,
                    address: rawData.seller.location?.address || '',
                    coordinates: rawData.seller.location?.coordinates || [],
                };
            }
            
            if (activeDelivery && rawData.buyer) {
                activeDelivery.buyer = {
                    _id: rawData.buyer._id,
                    name: rawData.buyer.name,
                    phone: rawData.buyer.phone,
                };
            }
            
            set({ activeDelivery, claimedOrderId: activeDelivery?._id || null });
            return activeDelivery;
        } catch (error) {
            console.error('Failed to fetch active delivery:', error);
            return null;
        }
    },

    claimOrder: async (orderId) => {
        try {
            const response = await api.post(`/driver/claim/${orderId}`);
            const order = response.data;
            set({ 
                activeDelivery: order, 
                claimedOrderId: orderId,
                availableOrders: get().availableOrders.filter(o => o._id !== orderId)
            });
            return { success: true, order };
        } catch (error) {
            const message = error.response?.status === 409 
                ? 'Order already claimed by another driver'
                : error.response?.data?.error || 'Failed to claim order';
            return { success: false, error: message };
        }
    },

    updateDeliveryStatus: async (orderId, status, notes = '', location = null) => {
        try {
            const payload = { status, notes };
            if (location) {
                payload.location = location;
            }
            const response = await api.post(`/driver/status/${orderId}`, payload);
            
            if (status === 'delivered') {
                await get().fetchDriverStats();
                set({ activeDelivery: null, claimedOrderId: null });
            } else {
                set({ activeDelivery: response.data });
            }
            
            return { success: true, order: response.data };
        } catch (error) {
            console.error('Failed to update delivery status:', error);
            return { success: false, error: error.response?.data?.error || 'Failed to update status' };
        }
    },

    completeDelivery: async (orderId, notes = '') => {
        try {
            const response = await api.post(`/driver/complete/${orderId}`, { notes });
            await get().fetchDriverStats();
            set({ activeDelivery: null, claimedOrderId: null });
            return { success: true, earnings: response.data.earnings };
        } catch (error) {
            console.error('Failed to complete delivery:', error);
            return { success: false, error: error.response?.data?.error || 'Failed to complete delivery' };
        }
    },

    fetchDeliveryHistory: async (limit = 20, offset = 0) => {
        try {
            const response = await api.get('/driver/history', {
                params: { limit, offset }
            });
            set({ 
                deliveryHistory: response.data?.deliveries || [],
            });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch delivery history:', error);
            return { deliveries: [], total: 0 };
        }
    },

    fetchEarnings: async (period = 'week') => {
        try {
            const response = await api.get('/driver/earnings', {
                params: { period }
            });
            set({ earningsHistory: response.data || [] });
            return response.data;
        } catch (error) {
            console.error('Failed to fetch earnings:', error);
            return [];
        }
    },

    rateDriver: async (orderId, rating, comment = '') => {
        try {
            const response = await api.post(`/driver-rating/${orderId}`, {
                rating,
                comment,
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error('Failed to rate driver:', error);
            return { success: false, error: error.response?.data?.message || 'Failed to submit rating' };
        }
    },

    savePushToken: async (pushToken) => {
        try {
            await api.put('/driver/push-token', { pushToken });
            return { success: true };
        } catch (error) {
            console.error('Failed to save push token:', error);
            return { success: false };
        }
    },

    setLocationWatcher: (watcher) => {
        const existingWatcher = get().locationWatcher;
        if (existingWatcher) {
            existingWatcher.remove();
        }
        set({ locationWatcher: watcher });
    },

    clearLocationWatcher: () => {
        const watcher = get().locationWatcher;
        if (watcher) {
            watcher.remove();
        }
        set({ locationWatcher: null });
    },
}));
