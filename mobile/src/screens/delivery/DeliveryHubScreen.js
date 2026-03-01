import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useDriverStore } from '../../store/driverStore';
import { useTheme } from '../../theme/ThemeContext';
import AvailableOrdersScreen from './AvailableOrdersScreen';
import EarningsScreen from './EarningsScreen';
import DeliveryHistoryScreen from './DeliveryHistoryScreen';
import ActiveDeliveryScreen from './ActiveDeliveryScreen';
import LocationService from '../../services/LocationService';

function DriverModePrompt() {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { toggleDriverMode } = useDriverStore();
    const [loading, setLoading] = useState(false);

    const handleEnable = async () => {
        setLoading(true);
        const result = await toggleDriverMode(true);
        setLoading(false);
        if (!result?.success) {
            Alert.alert(t.error || 'Error', result?.error || 'Failed to activate driver mode');
        }
    };

    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background,
            padding: 24,
        },
        iconContainer: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: `${colors.primary}20`,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24,
        },
        title: {
            fontSize: 22,
            fontWeight: '800',
            color: colors.text,
            marginBottom: 12,
            textAlign: 'center',
        },
        description: {
            fontSize: 15,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            marginBottom: 32,
        },
        enableBtn: {
            backgroundColor: colors.primary,
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 12,
            minWidth: 200,
            alignItems: 'center',
        },
        enableBtnText: {
            color: colors.card,
            fontSize: 16,
            fontWeight: '700',
        },
    }), [colors]);

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Text style={{ fontSize: 48 }}>🛵</Text>
            </View>
            <Text style={styles.title}>{t.driverMode || 'Driver Mode'}</Text>
            <Text style={styles.description}>
                {t.driverModeDesc || 'Enable driver mode to start delivering orders and earning money. You can toggle this anytime from your profile.'}
            </Text>
            <TouchableOpacity style={styles.enableBtn} onPress={handleEnable} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color={colors.card} />
                ) : (
                    <Text style={styles.enableBtnText}>{t.enableDriverMode || 'Enable Driver Mode'}</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

export default function DeliveryHubScreen() {
    const { colors, isDarkMode } = useThemeStore();
    const { t } = useTranslation();
    const { isDriverMode, activeDelivery, fetchActiveDelivery, currentLocation, updateLocation } = useDriverStore();
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        if (isDriverMode) {
            fetchActiveDelivery();

            const initLocation = async () => {
                const location = await LocationService.getCurrentLocation();
                if (location) {
                    updateLocation(location.latitude, location.longitude);
                }
            };
            initLocation();
        }
    }, [isDriverMode]);

    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        tabContainer: {
            flexDirection: 'row',
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        tab: {
            flex: 1,
            paddingVertical: 14,
            alignItems: 'center',
        },
        tabActive: {
            borderBottomWidth: 2,
            borderBottomColor: colors.primary,
        },
        tabText: {
            fontSize: 13,
            fontWeight: '600',
            color: colors.textSecondary,
        },
        tabTextActive: {
            color: colors.primary,
        },
        content: {
            flex: 1,
        },
    }), [colors, isDarkMode]);

    if (!isDriverMode) {
        return <DriverModePrompt />;
    }

    if (activeDelivery) {
        return <ActiveDeliveryScreen />;
    }

    const tabs = [
        { key: 'available', label: t.availableOrders || 'Available', component: AvailableOrdersScreen },
        { key: 'earnings', label: t.earnings || 'Earnings', component: EarningsScreen },
        { key: 'history', label: t.history || 'History', component: DeliveryHistoryScreen },
    ];

    const ActiveComponent = tabs[activeTab].component;

    return (
        <View style={styles.container}>
            <View style={styles.tabContainer}>
                {tabs.map((tab, idx) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === idx && styles.tabActive]}
                        onPress={() => setActiveTab(idx)}
                    >
                        <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <View style={styles.content}>
                <ActiveComponent />
            </View>
        </View>
    );
}
