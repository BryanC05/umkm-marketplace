import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
    TextInput, ActivityIndicator, Switch, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useDriverStore } from '../../store/driverStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useTheme } from '../../theme/ThemeContext';
import { getImageUrl } from '../../utils/helpers';
import api from '../../api/api';

export default function ProfileScreen({ navigation }) {
    const { user, logout, setUser } = useAuthStore();
    const { isDarkMode, toggleTheme, initTheme } = useThemeStore();
    const { t, language, toggleLanguage, initLanguage } = useLanguageStore();
    const { isDriverMode, stats, initDriverMode, toggleDriverMode } = useDriverStore();
    const unreadNotifCount = useNotificationStore((s) => s.unreadCount);
    const { colors } = useTheme();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [togglingDriver, setTogglingDriver] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        businessName: user?.businessName || '',
    });

    useEffect(() => {
        initTheme();
        initLanguage();
        initDriverMode();
    }, []);

    useEffect(() => {
        setForm({
            name: user?.name || '',
            phone: user?.phone || '',
            businessName: user?.businessName || '',
        });
    }, [user]);

    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        profileCard: {
            backgroundColor: colors.card, margin: 16, borderRadius: 20, padding: 24,
            alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
        },
        avatarContainer: { position: 'relative', marginBottom: 16 },
        avatarLarge: {
            width: 90, height: 90, borderRadius: 45, backgroundColor: colors.primary,
            justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
        },
        avatarImage: { width: 90, height: 90, borderRadius: 45 },
        avatarLargeText: { color: '#fff', fontWeight: '800', fontSize: 34 },
        cameraBtn: {
            position: 'absolute', bottom: 0, right: -4,
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
            borderWidth: 3, borderColor: colors.card,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15, shadowRadius: 2, elevation: 3,
        },
        profileName: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
        profileEmail: { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
        profilePhone: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
        sellerBadge: {
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: isDarkMode ? '#064e3b' : '#d1fae5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 4,
        },
        sellerBadgeText: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
        businessName: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
        editBtn: {
            flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14,
            paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
            backgroundColor: isDarkMode ? '#1e3a5f' : '#eff6ff',
        },
        editBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
        editForm: { width: '100%', marginTop: 12, gap: 12 },
        inputGroup: { gap: 4 },
        inputLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
        input: {
            backgroundColor: isDarkMode ? '#374151' : '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text,
        },
        editActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
        cancelBtn: {
            flex: 1, paddingVertical: 11, borderRadius: 10,
            backgroundColor: isDarkMode ? '#374151' : '#f3f4f6', alignItems: 'center',
        },
        cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
        saveBtn: {
            flex: 1, paddingVertical: 11, borderRadius: 10,
            backgroundColor: colors.primary, alignItems: 'center',
        },
        saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
        menuSection: {
            marginHorizontal: 16, backgroundColor: colors.card, borderRadius: 16,
            overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
        },
        menuItem: {
            flexDirection: 'row', alignItems: 'center', padding: 16,
            borderBottomWidth: 1, borderColor: colors.border,
        },
        menuIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
        menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
        logoutBtn: {
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginHorizontal: 16, marginTop: 20, paddingVertical: 14,
            borderRadius: 14, borderWidth: 1.5, borderColor: isDarkMode ? '#7f1d1d' : '#fecaca',
            backgroundColor: colors.card,
        },
        logoutText: { fontSize: 15, fontWeight: '600', color: '#ef4444' },
        langValue: { fontSize: 13, color: colors.textSecondary, marginRight: 4 },
    }), [colors, isDarkMode]);

    const pickProfileImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t.error, t.cameraRollPermissionNeeded || 'Camera roll access is needed to change your profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
        });

        if (!result.canceled && result.assets?.[0]) {
            uploadProfileImage(result.assets[0]);
        }
    };

    const uploadProfileImage = async (asset) => {
        setUploadingImage(true);
        try {
            const base64 = asset.base64;
            const ext = (asset.uri || '').split('.').pop()?.toLowerCase() || 'jpeg';
            const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${base64}`;

            const response = await api.put('/auth/profile', { profileImage: dataUrl });
            setUser(response.data.user);
        } catch (error) {
            Alert.alert(t.error, t.failedUploadProfilePicture || 'Failed to upload profile picture');
            console.error(error);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await api.put('/auth/profile', form);
            setUser(response.data.user);
            setEditing(false);
            Alert.alert(t.success, t.profileUpdated);
        } catch (error) {
            Alert.alert(t.error, error.response?.data?.message || t.failedUpdateProfile || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(t.logout, t.logoutConfirm, [
            { text: t.cancel },
            { text: t.logout, style: 'destructive', onPress: logout },
        ]);
    };

    const handleToggleDriverMode = async () => {
        setTogglingDriver(true);
        const result = await toggleDriverMode(!isDriverMode);
        setTogglingDriver(false);
        if (!result.success) {
            Alert.alert(t.error, result.error);
        }
    };

    const profileImageUri = user?.profileImage
        ? (user.profileImage.startsWith('data:') ? user.profileImage : getImageUrl(user.profileImage))
        : null;

    const menuItems = [
        { icon: 'chatbubbles-outline', label: t.messages, onPress: () => navigation.navigate('Messages'), color: '#0ea5e9' },
        { icon: 'notifications-outline', label: 'Notifications', onPress: () => navigation.navigate('Notifications'), color: '#f43f5e', badge: unreadNotifCount > 0 ? (unreadNotifCount > 9 ? '9+' : String(unreadNotifCount)) : null },
        { icon: 'heart-outline', label: 'Saved Products', onPress: () => navigation.navigate('Wishlist'), color: '#ef4444' },
        { icon: 'receipt-outline', label: t.orderHistory, onPress: () => navigation.navigate('Orders'), color: '#3b82f6' },
        // Delivery disabled: { icon: 'bicycle-outline', label: t.driverMode || 'Driver Mode', onPress: handleToggleDriverMode, color: '#10b981', isToggle: true, toggleValue: isDriverMode, isLoading: togglingDriver },
        { icon: 'location-outline', label: t.nearbySellers, onPress: () => navigation.navigate('NearbySellers'), color: '#ef4444' },
        { icon: 'color-palette-outline', label: t.logoGenerator, onPress: () => navigation.navigate('LogoGenerator'), color: '#8b5cf6' },
        ...(user?.isSeller ? [{
            icon: 'storefront-outline', label: t.sellerDashboard,
            onPress: () => navigation.navigate('SellerDashboard'), color: '#16a34a'
        }] : []),
        { icon: 'chatbubbles-outline', label: t.forum, onPress: () => navigation.navigate('Forum'), color: '#8b5cf6' },
        // Admin option (manual access for now)
        { icon: 'shield-checkmark-outline', label: t.membershipApprovals || 'Membership Approvals', onPress: () => navigation.navigate('AdminMembership'), color: '#f59e0b' },
        {
            icon: 'globe-outline', label: t.language,
            onPress: toggleLanguage, color: '#f59e0b', isToggle: true, toggleValue: language === 'id',
        },
        {
            icon: isDarkMode ? 'moon' : 'moon-outline', label: t.darkMode,
            onPress: toggleTheme, color: '#6366f1', isToggle: true, toggleValue: isDarkMode,
        },
    ];

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.profileCard}>
                {/* Avatar with camera button */}
                <View style={styles.avatarContainer}>
                    <View style={styles.avatarLarge}>
                        {profileImageUri ? (
                            <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
                        ) : (
                            <Text style={styles.avatarLargeText}>
                                {(user?.name || 'U').charAt(0).toUpperCase()}
                            </Text>
                        )}
                        {uploadingImage && (
                            <View style={[StyleSheet.absoluteFill, {
                                backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderRadius: 45,
                            }]}>
                                <ActivityIndicator color="#fff" size="small" />
                            </View>
                        )}
                    </View>
                    <TouchableOpacity style={styles.cameraBtn} onPress={pickProfileImage} disabled={uploadingImage}>
                        <Ionicons name="camera" size={16} color="#fff" />
                    </TouchableOpacity>
                </View>

                {!editing ? (
                    <>
                        <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                        <Text style={styles.profileEmail}>{user?.email}</Text>
                        {user?.phone ? (
                            <Text style={styles.profilePhone}>{user.phone}</Text>
                        ) : null}
                        {user?.isSeller && (
                            <View style={styles.sellerBadge}>
                                <Ionicons name="storefront" size={12} color="#16a34a" />
                                <Text style={styles.sellerBadgeText}>{t.seller}</Text>
                            </View>
                        )}
                        {user?.businessName && (
                            <Text style={styles.businessName}>{user.businessName}</Text>
                        )}
                        <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                            <Text style={styles.editBtnText}>{t.editProfile}</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.editForm}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t.fullName}</Text>
                            <TextInput
                                style={styles.input}
                                value={form.name}
                                onChangeText={(v) => setForm({ ...form, name: v })}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t.phone}</Text>
                            <TextInput
                                style={styles.input}
                                value={form.phone}
                                onChangeText={(v) => setForm({ ...form, phone: v })}
                                keyboardType="phone-pad"
                                placeholder={t.phonePlaceholder}
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                        {user?.isSeller && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t.businessName}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={form.businessName}
                                    onChangeText={(v) => setForm({ ...form, businessName: v })}
                                />
                            </View>
                        )}
                        <View style={styles.editActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                                <Text style={styles.cancelBtnText}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{t.save}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {isDriverMode && (
                <TouchableOpacity
                    style={[styles.menuSection, { marginTop: 16 }]}
                    onPress={() => navigation.getParent()?.navigate('DeliveryTab')}
                    activeOpacity={0.7}
                >
                    <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                        <View style={[styles.menuIcon, { backgroundColor: `${colors.success}15` }]}>
                            <Ionicons name="bicycle" size={20} color={colors.success} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.menuLabel}>{t.driverStats || 'Driver Stats'}</Text>
                            <View style={{ flexDirection: 'row', marginTop: 6, gap: 16 }}>
                                <View>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{stats.totalDeliveries}</Text>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{t.deliveries || 'Deliveries'}</Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.success }}>Rp {(stats.totalEarnings || 0).toLocaleString('id-ID')}</Text>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{t.earned || 'Earned'}</Text>
                                </View>
                                <View>
                                    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{stats.rating?.toFixed(1) || '5.0'}</Text>
                                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{t.rating || 'Rating'}</Text>
                                </View>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>
            )}

            <View style={styles.menuSection}>
                {menuItems.map((item, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={styles.menuItem}
                        onPress={item.isToggle ? item.onPress : () => item.onPress && item.onPress()}
                        disabled={item.isToggle && item.isLoading}
                    >
                        <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                            <Ionicons name={item.icon} size={20} color={item.color} />
                        </View>
                        <Text style={styles.menuLabel}>{item.label}</Text>
                        {item.isLoading ? (
                            <ActivityIndicator size="small" color={item.color} />
                        ) : item.isToggle ? (
                            <Switch
                                value={item.toggleValue}
                                onValueChange={item.onPress}
                                trackColor={{ true: item.color, false: '#e5e7eb' }}
                                thumbColor="#fff"
                            />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {item.badge && (
                                    <View style={{ backgroundColor: item.color, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginRight: 8 }}>
                                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{item.badge}</Text>
                                    </View>
                                )}
                                <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.logoutText}>{t.logout}</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}
