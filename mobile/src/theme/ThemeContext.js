import React, { createContext, useContext, useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';

const ThemeContext = createContext();

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
    const { isDarkMode, colors } = useThemeStore();
    
    const theme = useMemo(() => ({
        isDarkMode,
        colors,
        spacing: (n) => n * 4,
    }), [isDarkMode, colors]);

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
}

export function ThemedView({ style, children, ...props }) {
    const { colors } = useTheme();
    return (
        <View style={[style, { backgroundColor: colors.background }]} {...props}>
            {children}
        </View>
    );
}

export function ThemedText({ style, children, ...props }) {
    const { colors } = useTheme();
    return (
        <Text style={[style, { color: colors.text }]} {...props}>
            {children}
        </Text>
    );
}

export function ThemedCard({ style, children, ...props }) {
    const { colors } = useTheme();
    return (
        <View style={[style, { backgroundColor: colors.card }]} {...props}>
            {children}
        </View>
    );
}
