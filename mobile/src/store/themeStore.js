import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const lightColors = {
    background: '#f8fafc',
    card: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    primary: '#3b82f6',
    input: '#f9fafb',
    tabBar: '#ffffff',
    tabBorder: '#f3f4f6',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    white: '#ffffff',
};

const darkColors = {
    background: '#111827',
    card: '#1f2937',
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    border: '#374151',
    primary: '#3b82f6',
    input: '#374151',
    tabBar: '#1f2937',
    tabBorder: '#374151',
    success: '#10b981',
    danger: '#ef4444',
    warning: '#f59e0b',
    white: '#1f2937',
};

export const useThemeStore = create((set, get) => ({
    isDarkMode: false,
    colors: lightColors,

    initTheme: async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('theme');
            if (savedTheme === 'dark') {
                set({ isDarkMode: true, colors: darkColors });
            }
        } catch (error) {
            console.error('Failed to load theme:', error);
        }
    },

    toggleTheme: async () => {
        const newDarkMode = !get().isDarkMode;
        try {
            await AsyncStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
        
        set({ isDarkMode: newDarkMode, colors: newDarkMode ? darkColors : lightColors });
    },
}));
