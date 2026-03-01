import React, { useEffect, useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDriverStore } from '../../store/driverStore';
import { useTheme } from '../../theme/ThemeContext';

function StatCard({ label, value, icon, color }) {
    const { colors, isDarkMode } = useTheme();
    const { t } = useTranslation();

    const styles = useMemo(() => StyleSheet.create({
        card: {
            flex: 1,
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 14,
            marginHorizontal: 4,
            alignItems: 'center',
            shadowColor: isDarkMode ? '#000' : '#e2e8f0',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDarkMode ? 0.3 : 0.8,
            shadowRadius: 4,
            elevation: 2,
        },
        iconContainer: {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${color}15`,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 8,
        },
        value: {
            fontSize: 16,
            fontWeight: '800',
            color: colors.text,
            marginBottom: 2,
        },
        label: {
            fontSize: 11,
            color: colors.textSecondary,
            textAlign: 'center',
        },
    }), [colors, color, isDarkMode]);

    return (
        <View style={styles.card}>
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={styles.value}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
        </View>
    );
}

function EarningsRow({ item }) {
    const { colors } = useTheme();

    const styles = useMemo(() => StyleSheet.create({
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 12,
            padding: 14,
            marginBottom: 8,
        },
        iconContainer: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${colors.success}15`,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
        },
        info: {
            flex: 1,
        },
        date: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
        },
        count: {
            fontSize: 12,
            color: colors.textSecondary,
            marginTop: 2,
        },
        amount: {
            fontSize: 15,
            fontWeight: '700',
            color: colors.success,
        },
    }), [colors]);

    const dateStr = item.date ? new Date(item.date).toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    }) : '-';

    return (
        <View style={styles.row}>
            <View style={styles.iconContainer}>
                <Ionicons name="wallet" size={18} color={colors.success} />
            </View>
            <View style={styles.info}>
                <Text style={styles.date}>{dateStr}</Text>
                <Text style={styles.count}>{item.orderCount || 0} {item.orderCount === 1 ? 'delivery' : 'deliveries'}</Text>
            </View>
            <Text style={styles.amount}>Rp {(item.amount || 0).toLocaleString('id-ID')}</Text>
        </View>
    );
}

export default function EarningsScreen() {
    const { colors, isDarkMode } = useThemeStore();
    const { t } = useTranslation();
    const { stats, earningsHistory, fetchDriverStats, fetchEarnings } = useDriverStore();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('week');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        await Promise.all([
            fetchDriverStats(),
            fetchEarnings(period),
        ]);
        setLoading(false);
    };

    const styles = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        scrollContent: {
            padding: 16,
        },
        mainCard: {
            backgroundColor: colors.primary,
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            alignItems: 'center',
        },
        mainLabel: {
            fontSize: 14,
            color: 'rgba(255,255,255,0.8)',
            marginBottom: 8,
        },
        mainValue: {
            fontSize: 36,
            fontWeight: '800',
            color: colors.card,
        },
        statsRow: {
            flexDirection: 'row',
            marginBottom: 24,
        },
        sectionTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
            marginBottom: 12,
        },
        periodTabs: {
            flexDirection: 'row',
            marginBottom: 16,
        },
        periodTab: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            marginRight: 8,
        },
        periodTabActive: {
            backgroundColor: colors.primary,
        },
        periodTabInactive: {
            backgroundColor: colors.input,
        },
        periodTabText: {
            fontSize: 13,
            fontWeight: '600',
        },
        periodTabTextActive: {
            color: colors.card,
        },
        periodTabTextInactive: {
            color: colors.textSecondary,
        },
        emptyContainer: {
            alignItems: 'center',
            paddingVertical: 40,
        },
        emptyIcon: {
            fontSize: 48,
            marginBottom: 12,
        },
        emptyText: {
            fontSize: 14,
            color: colors.textSecondary,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        },
    }), [colors, isDarkMode]);

    const formatCurrency = (value) => {
        return `Rp ${(value || 0).toLocaleString('id-ID')}`;
    };

    const periods = [
        { key: 'day', label: t.today || 'Today' },
        { key: 'week', label: t.thisWeek || 'This Week' },
        { key: 'month', label: t.thisMonth || 'This Month' },
    ];

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.mainCard}>
                <Text style={styles.mainLabel}>{t.totalEarnings || 'Total Earnings'}</Text>
                <Text style={styles.mainValue}>{formatCurrency(stats.totalEarnings)}</Text>
            </View>

            <View style={styles.statsRow}>
                <StatCard
                    label={t.today || 'Today'}
                    value={formatCurrency(stats.todayEarnings)}
                    icon="today"
                    color={colors.primary}
                />
                <StatCard
                    label={t.thisWeek || 'Week'}
                    value={formatCurrency(stats.weekEarnings)}
                    icon="calendar"
                    color={colors.textSecondary}
                />
                <StatCard
                    label={t.thisMonth || 'Month'}
                    value={formatCurrency(stats.monthEarnings)}
                    icon="stats-chart"
                    color={colors.warning}
                />
            </View>

            <View style={styles.statsRow}>
                <StatCard
                    label={t.deliveries || 'Deliveries'}
                    value={stats.totalDeliveries?.toString() || '0'}
                    icon="bicycle"
                    color={colors.success}
                />
                <StatCard
                    label={t.rating || 'Rating'}
                    value={stats.rating?.toFixed(1) || '5.0'}
                    icon="star"
                    color={colors.warning}
                />
            </View>

            <Text style={styles.sectionTitle}>{t.earningsHistory || 'Earnings History'}</Text>

            <View style={styles.periodTabs}>
                {periods.map(p => (
                    <View
                        key={p.key}
                        style={[
                            styles.periodTab,
                            period === p.key ? styles.periodTabActive : styles.periodTabInactive
                        ]}
                        onTouchEnd={() => {
                            setPeriod(p.key);
                            fetchEarnings(p.key);
                        }}
                    >
                        <Text
                            style={[
                                styles.periodTabText,
                                period === p.key ? styles.periodTabTextActive : styles.periodTabTextInactive
                            ]}
                        >
                            {p.label}
                        </Text>
                    </View>
                ))}
            </View>

            {earningsHistory.length > 0 ? (
                earningsHistory.map((item, idx) => (
                    <EarningsRow key={idx} item={item} />
                ))
            ) : (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>💰</Text>
                    <Text style={styles.emptyText}>{t.noEarningsYet || 'No earnings yet'}</Text>
                </View>
            )}
        </ScrollView>
    );
}
