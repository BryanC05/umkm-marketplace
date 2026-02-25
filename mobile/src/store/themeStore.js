import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

const lightColors = {
    background: '#f8fafc',
    card: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    border: '#e2e8f0',
    primary: '#3b82f6',
    primaryLight: '#eff6ff',
    primaryDark: '#2563eb',
    input: '#f1f5f9',
    tabBar: '#ffffff',
    tabBorder: '#f1f5f9',
    success: '#10b981',
    successLight: '#ecfdf5',
    danger: '#ef4444',
    dangerLight: '#fef2f2',
    warning: '#f59e0b',
    warningLight: '#fffbeb',
    white: '#ffffff',
    placeholder: '#94a3b8',
    shadow: 'rgba(0, 0, 0, 0.06)',
};

const darkColors = {
    background: '#0f172a',
    card: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    border: '#334155',
    primary: '#60a5fa',
    primaryLight: '#1e3a5f',
    primaryDark: '#3b82f6',
    input: '#1e293b',
    tabBar: '#1e293b',
    tabBorder: '#334155',
    success: '#34d399',
    successLight: '#064e3b',
    danger: '#f87171',
    dangerLight: '#450a0a',
    warning: '#fbbf24',
    warningLight: '#451a03',
    white: '#1e293b',
    placeholder: '#64748b',
    shadow: 'rgba(0, 0, 0, 0.4)',
};

export const useThemeStore = create((set, get) => ({
    isDarkMode: false,
    colors: lightColors,

    initTheme: async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('theme');
            if (savedTheme === 'dark') {
                set({ isDarkMode: true, colors: darkColors });
            } else if (savedTheme === null) {
                // First launch: sync with system theme
                const systemScheme = Appearance.getColorScheme();
                if (systemScheme === 'dark') {
                    set({ isDarkMode: true, colors: darkColors });
                    await AsyncStorage.setItem('theme', 'dark');
                }
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
