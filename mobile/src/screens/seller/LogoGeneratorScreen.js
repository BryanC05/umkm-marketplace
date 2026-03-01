import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    ScrollView, Image, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../hooks/useTranslation';
import { getImageUrl } from '../../utils/helpers';
import { API_HOST } from '../../config';

const LOGO_SUGGESTIONS = [
    "Minimalist coffee shop logo, brown and cream colors, steaming cup icon",
    "Modern tech store logo, circuit patterns, blue gradient, futuristic",
    "Fresh juice bar logo, tropical fruits, bright green and orange",
    "Elegant boutique logo, floral elements, gold and pink colors",
    "Organic grocery logo, leaf and vegetable elements, green and earth tones",
    "Professional consulting logo, abstract geometric shape, navy blue",
    "Creative studio logo, brushstroke element, artistic, black and gold",
];

function formatCountdown(resetTimeISO) {
    if (!resetTimeISO) return null;
    const now = new Date();
    const reset = new Date(resetTimeISO);
    const diff = reset - now;
    if (diff <= 0) return 'Refreshing now...';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function formatResetTime(resetTimeISO) {
    if (!resetTimeISO) return '';
    const reset = new Date(resetTimeISO);
    return reset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function LogoGeneratorScreen({ navigation }) {
    const { user, setUser } = useAuthStore();
    const { colors } = useThemeStore();
    const { t } = useTranslation();
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [logos, setLogos] = useState([]);
    const [status, setStatus] = useState({ remaining: 5, limit: 5, resetTime: null });
    const [countdown, setCountdown] = useState('');
    const [selectedLogo, setSelectedLogo] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        fetchLogoHistory();
        fetchStatus();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    // Countdown timer
    useEffect(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (status.resetTime) {
            const tick = () => {
                const text = formatCountdown(status.resetTime);
                setCountdown(text);
                if (text === 'Refreshing now...') {
                    clearInterval(timerRef.current);
                    fetchStatus();
                }
            };
            tick();
            timerRef.current = setInterval(tick, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [status.resetTime]);

    const fetchLogoHistory = async () => {
        try {
            const response = await api.get('/logo/history');
            setLogos(response.data.logos || []);
        } catch (error) {
            console.error('Failed to fetch logo history:', error);
        }
    };

    const fetchStatus = async () => {
        try {
            const response = await api.get('/logo/status');
            setStatus(response.data.status || { remaining: 5, limit: 5, resetTime: null });
        } catch (error) {
            console.error('Failed to fetch status:', error);
        }
    };

    const generateLogo = async () => {
        if (!prompt.trim()) {
            Alert.alert(t.error, t.describeLogo);
            return;
        }
        if (status.remaining <= 0) {
            Alert.alert(t.limitReached, t.dailyLimitReached);
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/logo/generate', { prompt: prompt.trim() });
            if (response.data.success) {
                setLogos(prev => [response.data.logo, ...prev]);
                setStatus(prev => ({ ...prev, remaining: response.data.remainingGenerations }));
                setPrompt('');
                Alert.alert(t.success, t.logoGenerated);
            }
        } catch (error) {
            console.error('Logo generation error:', error);
            const message = error.response?.data?.message || error.message || 'Failed to generate logo';
            Alert.alert(t.error, message);
        } finally {
            setLoading(false);
        }
    };

    const resetLimit = async () => {
        setResetting(true);
        try {
            const response = await api.post('/logo/reset-limit');
            if (response.data.success) {
                setStatus(response.data.status);
                Alert.alert('✅', t.limitReset);
            }
        } catch (error) {
            Alert.alert(t.error, 'Failed to reset limit');
        } finally {
            setResetting(false);
        }
    };

    const selectAsBusinessLogo = async (logoId) => {
        try {
            const response = await api.put(`/logo/select/${logoId}`);
            if (response.data.success) {
                setUser({ ...user, businessLogo: response.data.businessLogo });
                Alert.alert(t.success, t.logoSelected);
            }
        } catch (error) {
            Alert.alert(t.error, 'Failed to select logo');
        }
    };

    const deleteLogoItem = async (logoId) => {
        Alert.alert(
            t.deleteLogo,
            t.deleteLogoConfirm,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.delete,
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/logo/${logoId}`);
                            setLogos(prev => prev.filter(l => (l.logoId || l._id) !== logoId));
                        } catch (error) {
                            Alert.alert(t.error, 'Failed to delete logo');
                        }
                    }
                }
            ]
        );
    };

    const renderLogoCard = (item) => {
        const logoUrl = item.url.startsWith('http') ? item.url : `${API_HOST}${item.url}`;
        const id = item.logoId || item._id;
        return (
            <View key={id} style={styles.logoCard}>
                <Image source={{ uri: logoUrl }} style={styles.logoImage} resizeMode="contain" />
                <Text style={styles.logoPrompt} numberOfLines={2}>{item.prompt}</Text>
                <View style={styles.logoActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.selectBtn]}
                        onPress={() => selectAsBusinessLogo(id)}
                    >
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={styles.actionBtnText}>Use</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn]}
                        onPress={() => deleteLogoItem(id)}
                    >
                        <Ionicons name="trash-outline" size={16} color={colors.danger || '#ef4444'} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const isLimitReached = status.remaining <= 0;

    const styles = {
        container: { flex: 1, backgroundColor: colors.background },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 50,
            paddingBottom: 16,
            backgroundColor: colors.card,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        backBtn: {
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: colors.input,
            justifyContent: 'center', alignItems: 'center',
        },
        headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
        statusBadge: {
            backgroundColor: isLimitReached ? '#ef4444' : colors.primary,
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
        },
        statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
        content: { flex: 1, padding: 16 },

        // Limit info card
        limitCard: {
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: isLimitReached ? '#fecaca' : colors.border,
        },
        limitRow: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        },
        limitLeft: { flex: 1 },
        limitLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
        limitValue: { fontSize: 22, fontWeight: '800', color: isLimitReached ? '#ef4444' : colors.primary },
        limitUnit: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
        limitDivider: { width: 1, height: 40, backgroundColor: colors.border, marginHorizontal: 16 },
        limitRight: { flex: 1, alignItems: 'flex-end' },
        resetLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
        resetCountdown: {
            fontSize: 16, fontWeight: '700',
            color: isLimitReached ? '#ef4444' : colors.text,
        },
        resetTime: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
        progressBar: {
            height: 6, borderRadius: 3,
            backgroundColor: colors.border,
            marginTop: 14,
            overflow: 'hidden',
        },
        progressFill: {
            height: 6, borderRadius: 3,
            backgroundColor: isLimitReached ? '#ef4444' : colors.primary,
        },
        resetBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 12, paddingVertical: 8, borderRadius: 8,
            backgroundColor: '#f59e0b20',
            borderWidth: 1, borderColor: '#f59e0b50',
        },
        resetBtnText: { fontSize: 12, fontWeight: '600', color: '#d97706' },

        inputSection: { marginBottom: 20 },
        label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 8 },
        input: {
            backgroundColor: colors.card, borderRadius: 12,
            borderWidth: 1, borderColor: colors.border,
            padding: 14, fontSize: 14, color: colors.text,
            minHeight: 80, textAlignVertical: 'top',
        },
        generateBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            backgroundColor: colors.primary, borderRadius: 12,
            paddingVertical: 14, marginTop: 12, gap: 8,
        },
        generateBtnDisabled: { opacity: 0.7 },
        generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
        suggestionsSection: { marginBottom: 20 },
        suggestionsScroll: { marginTop: 4 },
        sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
        suggestionChip: {
            backgroundColor: colors.card, borderRadius: 20,
            paddingHorizontal: 14, paddingVertical: 10,
            marginRight: 10, borderWidth: 1, borderColor: colors.border, maxWidth: 200,
        },
        suggestionText: { fontSize: 12, color: colors.textSecondary },
        currentLogoSection: { marginBottom: 20 },
        currentLogoCard: {
            backgroundColor: colors.card, borderRadius: 12,
            padding: 16, alignItems: 'center',
        },
        currentLogoImage: { width: 120, height: 120 },
        historySection: { marginBottom: 30 },
        logosList: { paddingRight: 16 },
        logoCard: {
            backgroundColor: colors.card, borderRadius: 12,
            padding: 12, marginRight: 12, width: 150,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
        },
        logoImage: { width: 126, height: 100, borderRadius: 8, backgroundColor: colors.border },
        logoPrompt: { fontSize: 11, color: colors.textSecondary, marginTop: 8, height: 28 },
        logoActions: { flexDirection: 'row', marginTop: 8, gap: 8 },
        actionBtn: {
            flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            paddingVertical: 6, borderRadius: 6, gap: 4,
        },
        selectBtn: { backgroundColor: colors.success || '#10b981' },
        deleteBtn: { backgroundColor: (colors.danger || '#ef4444') + '20', flex: 0.5 },
        actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
        emptyState: { alignItems: 'center', paddingVertical: 32 },
        emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
    };

    const usedPercent = status.limit > 0 ? ((status.limit - status.remaining) / status.limit) * 100 : 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Logo Generator</Text>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{status.remaining}/{status.limit}</Text>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Limit Info Card */}
                <View style={styles.limitCard}>
                    <View style={styles.limitRow}>
                        <View style={styles.limitLeft}>
                            <Text style={styles.limitLabel}>Remaining Today</Text>
                            <Text>
                                <Text style={styles.limitValue}>{status.remaining}</Text>
                                <Text style={styles.limitUnit}> / {status.limit}</Text>
                            </Text>
                        </View>
                        <View style={styles.limitDivider} />
                        <View style={styles.limitRight}>
                            <Text style={styles.resetLabel}>Resets In</Text>
                            <Text style={styles.resetCountdown}>{countdown || '...'}</Text>
                            <Text style={styles.resetTime}>
                                at {formatResetTime(status.resetTime)}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${usedPercent}%` }]} />
                    </View>
                    {/* Testing reset button */}
                    <TouchableOpacity
                        style={styles.resetBtn}
                        onPress={resetLimit}
                        disabled={resetting}
                    >
                        {resetting ? (
                            <ActivityIndicator size="small" color="#d97706" />
                        ) : (
                            <>
                                <Ionicons name="refresh" size={14} color="#d97706" />
                                <Text style={styles.resetBtnText}>Reset Limit (Testing)</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.inputSection}>
                    <Text style={styles.label}>Describe your logo</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., Minimalist coffee shop logo with brown colors..."
                        placeholderTextColor={colors.textSecondary}
                        value={prompt}
                        onChangeText={setPrompt}
                        multiline
                        numberOfLines={3}
                    />
                    <TouchableOpacity
                        style={[styles.generateBtn, (loading || isLimitReached) && styles.generateBtnDisabled]}
                        onPress={generateLogo}
                        disabled={loading || isLimitReached}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="sparkles" size={20} color="#fff" />
                                <Text style={styles.generateBtnText}>
                                    {isLimitReached ? 'Limit Reached' : 'Generate Logo'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.suggestionsSection}>
                    <Text style={styles.sectionTitle}>Quick Suggestions</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll}>
                        {LOGO_SUGGESTIONS.map((suggestion, index) => (
                            <TouchableOpacity
                                key={`suggestion-${index}`}
                                style={styles.suggestionChip}
                                onPress={() => setPrompt(suggestion)}
                            >
                                <Text style={styles.suggestionText} numberOfLines={2}>{suggestion}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {user?.businessLogo && (
                    <View style={styles.currentLogoSection}>
                        <Text style={styles.sectionTitle}>Current Business Logo</Text>
                        <View style={styles.currentLogoCard}>
                            <Image
                                source={{ uri: getImageUrl(user.businessLogo) }}
                                style={styles.currentLogoImage}
                                resizeMode="contain"
                            />
                        </View>
                    </View>
                )}

                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Generated Logos ({logos.length})</Text>
                    {logos.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.logosList}>
                            {logos.map((item) => renderLogoCard(item))}
                        </ScrollView>
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>No logos generated yet</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
