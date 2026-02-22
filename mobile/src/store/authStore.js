import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';

// Base64 decode function for React Native
const decodeBase64 = (input) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let str = input.replace(/=+$/, '');
    let output = '';
    if (str.length % 4 === 1) {
        throw new Error('Invalid base64 string');
    }
    for (let bc = 0, bs, buffer, idx = 0; idx < str.length; idx++) {
        buffer = str.charAt(idx);
        if (buffer === '=') break;
        if ((bs = chars.indexOf(buffer)) === -1) continue;
        bc = (bc % 4) ? (bc * 64 + bs) : bs;
        if (bc % 4) output += String.fromCharCode(255 & (bc >> ((-2 * bc) & 6)));
    }
    return output;
};

export const useAuthStore = create((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,

    setAuth: async (user, token) => {
        await AsyncStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true });
    },

    setUser: (user) => {
        set({ user });
    },

    logout: async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('cart-storage');
        set({ user: null, token: null, isAuthenticated: false });
    },

    initializeAuth: async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                // Decode JWT to check expiry
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeBase64(base64);
                const payload = JSON.parse(jsonPayload);

                if (payload.exp * 1000 > Date.now()) {
                    // Token is valid, fetch user profile
                    try {
                        const response = await api.get('/users/profile');
                        set({ user: response.data, token, isAuthenticated: true, isLoading: false });
                    } catch {
                        // Token rejected by server (e.g. revoked/invalid) -> force fresh login
                        await AsyncStorage.removeItem('token');
                        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
                    }
                } else {
                    await AsyncStorage.removeItem('token');
                    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
                }
            } else {
                set({ user: null, token: null, isAuthenticated: false, isLoading: false });
            }
        } catch {
            await AsyncStorage.removeItem('token');
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
    },

    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { token, user } = response.data;
        await get().setAuth(user, token);
        return user;
    },

    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        const { token, user } = response.data;
        await get().setAuth(user, token);
        return user;
    },
}));
