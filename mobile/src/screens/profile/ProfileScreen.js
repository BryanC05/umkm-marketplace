import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
    TextInput, ActivityIndicator, Switch, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useTranslation } from '../../hooks/useTranslation';
import { useDriverStore } from '../../store/driverStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useTheme } from '../../theme/ThemeContext';
import { getImageUrl } from '../../utils/helpers';
import BusinessSection from '../../components/business/BusinessSection';
import api from '../../api/api';

const SOCIAL_PLATFORMS = {
    instagram: { id: 'instagram', name: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
    tiktok: { id: 'tiktok', name: 'TikTok', icon: 'logo-tiktok', color: '#000000' },
    facebook: { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
    twitter: { id: 'twitter', name: 'Twitter/X', icon: 'logo-twitter', color: '#1DA1F2' },
    youtube: { id: 'youtube', name: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
    whatsapp: { id: 'whatsapp', name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
    website: { id: 'website', name: 'Website', icon: 'globe-outline', color: '#666666' },
};

const getPlatformInfo = (platformId) => SOCIAL_PLATFORMS[platformId] || { id: platformId, name: platformId, icon: 'globe-outline', color: '#666666' };

const handleOpenLink = async (url) => {
    try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert('Error', 'Cannot open this link');
        }
    } catch (error) {
        Alert.alert('Error', 'Failed to open link');
    }
};

export default function ProfileScreen({ navigation, route }) {
    const { userId: viewingUserId } = route?.params || {};
    const { user, logout, setUser } = useAuthStore();
    const { isDarkMode, toggleTheme, initTheme } = useThemeStore();
    const { language, toggleLanguage, initLanguage } = useLanguageStore();
    const { t } = useTranslation();
    const { isDriverMode, stats, initDriverMode, toggleDriverMode } = useDriverStore();
    const unreadNotifCount = useNotificationStore((s) => s.unreadCount);
    const { colors } = useTheme();
    
    // Determine if viewing own profile or another user's profile
    const isOwnProfile = !viewingUserId || viewingUserId === user?._id;
    const [viewedUser, setViewedUser] = useState(null);

    useEffect(() => {
        initTheme();
        initLanguage();
        initDriverMode();
    }, []);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [togglingDriver, setTogglingDriver] = useState(false);
    const [socialLinks, setSocialLinks] = useState([]);
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

    // Fetch social links
    useEffect(() => {
        const fetchSocialLinks = async () => {
            if (isOwnProfile) {
                try {
                    const response = await api.get('/users/social-links');
                    setSocialLinks(response.data.profileLinks || []);
                } catch (error) {
                    console.error('Failed to fetch social links:', error);
                }
            }
        };
        fetchSocialLinks();
    }, [isOwnProfile]);

    // Fetch viewed user's profile when viewing someone else's profile
    useEffect(() => {
        if (viewingUserId && !isOwnProfile) {
            const fetchViewedUser = async () => {
                try {
                    const response = await api.get(`/users/seller/${viewingUserId}`);
                    const userData = response.data;
                    // Transform the response to match User model structure
                    setViewedUser({
                        _id: userData._id,
                        name: userData.name,
                        email: userData.email,
                        phone: userData.phone,
                        businessName: userData.businessName,
                        businessType: userData.businessType,
                        profileImage: userData.profileImage,
                        isVerified: userData.isVerified,
                        isSeller: userData.isSeller,
                        rating: userData.rating,
                        location: userData.location,
                    });
                } catch (error) {
                    console.log('Failed to fetch user:', error);
                }
            };
            fetchViewedUser();
        }
    }, [viewingUserId, isOwnProfile]);

    // Determine which user data to display
    const displayUser = isOwnProfile ? user : viewedUser;

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
        avatarLargeText: { color: colors.white, fontWeight: '800', fontSize: 34 },
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
        // sellerBadge styles removed - account status badges no longer shown
        businessName: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
        socialIconsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
        socialIconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
        addSocialLinksBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.primaryLight + '20', borderRadius: 16 },
        addSocialLinksText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
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
        saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
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
        logoutText: { fontSize: 15, fontWeight: '600', color: colors.danger },
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

    const menuItems = useMemo(() => [
        { icon: 'chatbubbles-outline', label: t.messages || 'Messages', onPress: () => navigation.navigate('Messages'), color: '#0ea5e9' },
        { icon: 'notifications-outline', label: t.notifications || 'Notifications', onPress: () => navigation.navigate('Notifications'), color: '#f43f5e', badge: unreadNotifCount > 0 ? (unreadNotifCount > 9 ? '9+' : String(unreadNotifCount)) : null },
        { icon: 'heart-outline', label: t.savedProducts || 'Saved Products', onPress: () => navigation.navigate('Wishlist'), color: '#ef4444' },
        { icon: 'receipt-outline', label: t.orderHistory || 'Order History', onPress: () => navigation.navigate('Orders'), color: '#14b8a6' },
        { icon: 'location-outline', label: t.nearbySellers || 'Nearby Sellers', onPress: () => navigation.navigate('NearbySellers'), color: '#ef4444' },
        { icon: 'color-palette-outline', label: t.logoGenerator || 'Logo Generator', onPress: () => navigation.navigate('LogoGenerator'), color: '#8b5cf6' },
        { icon: 'storefront-outline', label: t.sellerDashboard || 'Seller Dashboard', onPress: () => navigation.navigate('SellerDashboard'), color: '#16a34a' },
        { icon: 'chatbubbles-outline', label: t.forum || 'Forum', onPress: () => navigation.navigate('Forum'), color: '#8b5cf6' },
        { icon: 'shield-checkmark-outline', label: t.membershipApprovals || 'Membership Approvals', onPress: () => navigation.navigate('AdminMembership'), color: '#f59e0b' },
        {
            icon: isDarkMode ? 'moon' : 'moon-outline', label: t.darkMode || 'Dark Mode',
            onPress: toggleTheme, color: '#6366f1', isToggle: true, toggleValue: isDarkMode,
        },
        {
            icon: 'language-outline', label: t.language || 'Language',
            onPress: toggleLanguage, color: '#10b981', isToggle: true, toggleValue: language === 'id',
            showValue: language === 'id' ? 'ID' : 'EN',
        },
    ], [t, navigation, unreadNotifCount, isDarkMode, language]);

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
                                {(displayUser?.name || 'U').charAt(0).toUpperCase()}
                            </Text>
                        )}
                        {uploadingImage && (
                            <View style={[StyleSheet.absoluteFill, {
                                backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderRadius: 45,
                            }]}>
                                <ActivityIndicator color={colors.white} size="small" />
                            </View>
                        )}
                    </View>
                    {isOwnProfile && (
                        <TouchableOpacity style={styles.cameraBtn} onPress={pickProfileImage} disabled={uploadingImage}>
                            <Ionicons name="camera" size={16} color={colors.white} />
                        </TouchableOpacity>
                    )}
                </View>

                {!editing ? (
                    <>
                        <Text style={styles.profileName}>{displayUser?.name || 'User'}</Text>
                        <Text style={styles.profileEmail}>{displayUser?.email}</Text>
                        {displayUser?.phone ? (
                            <Text style={styles.profilePhone}>{displayUser.phone}</Text>
                        ) : null}
                        {/* Account status badges removed - all users are equal */}
                        {displayUser?.businessName && (
                            <Text style={styles.businessName}>{displayUser.businessName}</Text>
                        )}
                        
                        {/* Social Links */}
                        {socialLinks.length > 0 && (
                            <View style={styles.socialIconsRow}>
                                {socialLinks.slice(0, 5).map((link) => {
                                    const platform = getPlatformInfo(link.platform);
                                    return (
                                        <TouchableOpacity
                                            key={link.platform}
                                            style={[styles.socialIconBtn, { backgroundColor: platform.color + '20' }]}
                                            onPress={() => handleOpenLink(link.url)}
                                        >
                                            <Ionicons name={platform.icon} size={18} color={platform.color} />
                                        </TouchableOpacity>
                                    );
                                })}
                                {isOwnProfile && (
                                    <TouchableOpacity 
                                        style={[styles.socialIconBtn, { backgroundColor: colors.input }]}
                                        onPress={() => navigation.navigate('SocialLinks')}
                                    >
                                        <Ionicons name="add" size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        
                        {isOwnProfile && socialLinks.length === 0 && (
                            <TouchableOpacity 
                                style={styles.addSocialLinksBtn}
                                onPress={() => navigation.navigate('SocialLinks')}
                            >
                                <Ionicons name="link-outline" size={16} color={colors.primary} />
                                <Text style={styles.addSocialLinksText}>{t.addSocialLink || 'Add Social Links'}</Text>
                            </TouchableOpacity>
                        )}

                        {isOwnProfile && (
                            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                                <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                                <Text style={styles.editBtnText}>{t.editProfile || 'Edit Profile'}</Text>
                            </TouchableOpacity>
                        )}
                    </>
                ) : (
                    <View style={styles.editForm}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t.fullName || 'Full Name'}</Text>
                            <TextInput
                                style={styles.input}
                                value={form.name}
                                onChangeText={(v) => setForm({ ...form, name: v })}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t.phone || 'Phone'}</Text>
                            <TextInput
                                style={styles.input}
                                value={form.phone}
                                onChangeText={(v) => setForm({ ...form, phone: v })}
                                keyboardType="phone-pad"
                                placeholder={t.phonePlaceholder || 'Enter phone number'}
                                placeholderTextColor={colors.textSecondary}
                            />
                        </View>
                        {/* Business info is now optional for all users */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>{t.businessName || 'Business Name'}</Text>
                            <TextInput
                                style={styles.input}
                                value={form.businessName}
                                onChangeText={(v) => setForm({ ...form, businessName: v })}
                            />
                        </View>
                        <View style={styles.editActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                                <Text style={styles.cancelBtnText}>{t.cancel || 'Cancel'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.saveBtnText}>{t.save || 'Save'}</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Business Section - Manage business registration and logo */}
            <BusinessSection navigation={navigation} />

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
                    item.isToggle ? (
                        <TouchableOpacity
                            key={idx}
                            style={styles.menuItem}
                            onPress={() => item.onPress && item.onPress()}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                                <Ionicons name={item.icon} size={20} color={item.color} />
                            </View>
                            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                            {item.showValue ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 14 }}>
                                        {item.showValue}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                                </View>
                            ) : (
                                <Switch
                                    value={item.toggleValue}
                                    onValueChange={() => item.onPress()}
                                    trackColor={{ true: item.color, false: colors.border }}
                                    thumbColor={colors.white}
                                />
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            key={idx}
                            style={styles.menuItem}
                            onPress={() => item.onPress && item.onPress()}
                            disabled={item.isLoading}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                                <Ionicons name={item.icon} size={20} color={item.color} />
                            </View>
                            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                            {item.isLoading ? (
                                <ActivityIndicator size="small" color={item.color} />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    {item.badge && (
                                        <View style={{ backgroundColor: item.color, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginRight: 8 }}>
                                            <Text style={{ color: colors.white, fontSize: 11, fontWeight: '700' }}>{item.badge}</Text>
                                        </View>
                                    )}
                                    <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                                </View>
                            )}
                        </TouchableOpacity>
                    )
                ))}
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>{t.logout || 'Logout'}</Text>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            </TouchableOpacity>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

