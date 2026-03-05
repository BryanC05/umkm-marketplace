import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Modal, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { formatPrice } from '../../utils/helpers';
import { useTranslation } from '../../hooks/useTranslation';
import { useThemeStore } from '../../store/themeStore';

export default function SellerDashboardScreen({ navigation }) {
    const { user } = useAuthStore();
    const { t, language } = useTranslation();
    const { colors, isDarkMode } = useThemeStore();
    const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Membership state
    const [membership, setMembership] = useState(null);
    const [membershipLoading, setMembershipLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentImage, setPaymentImage] = useState(null);
    const [uploading, setUploading] = useState(false);

    const fetchMembership = useCallback(async () => {
        try {
            const res = await api.get('/users/membership/status');
            setMembership(res.data);
        } catch (error) {
            console.error('Failed to fetch membership:', error);
        } finally {
            setMembershipLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMembership();
    }, [fetchMembership]);

    const fetchStats = useCallback(async () => {
        if (!user?._id) {
            setLoading(false);
            return;
        }
        
        try {
            // Fetch products count
            const productsRes = await api.get(`/products/seller/${user._id}`);
            const productsCount = productsRes.data?.length || 0;

            // Fetch orders for revenue calculation
            const ordersRes = await api.get('/orders/my-orders');
            const myOrders = ordersRes.data || [];

            // Filter orders where user is seller
            const sellerOrders = myOrders.filter(o => o.seller?._id === user._id || o.seller === user._id);

            const revenue = sellerOrders
                .filter(o => o.status === 'delivered')
                .reduce((sum, o) => sum + o.totalAmount, 0);

            const pending = sellerOrders
                .filter(o => ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status))
                .length;

            setStats({
                products: productsCount,
                orders: sellerOrders.length,
                revenue,
                pending
            });
        } catch (error) {
            console.error('Failed to fetch seller stats:', error);
            // Reset stats on error so UI shows 0
            setStats({ products: 0, orders: 0, revenue: 0, pending: 0 });
        } finally {
            setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchStats(), fetchMembership()]);
        setRefreshing(false);
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setPaymentImage(result.assets[0]);
        }
    };

    const submitPayment = async () => {
        if (!paymentImage) {
            Alert.alert('Error', 'Please select a payment proof image');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('paymentProof', {
                uri: paymentImage.uri,
                name: 'payment.jpg',
                type: 'image/jpeg',
            });

            await api.post('/users/membership/payment', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            Alert.alert('Success', 'Payment submitted! Please wait for admin approval.');
            setShowPaymentModal(false);
            setPaymentImage(null);
            fetchMembership();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to submit payment');
        } finally {
            setUploading(false);
        }
    };

    const styles = useMemo(() => StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: { padding: 20, backgroundColor: colors.card, paddingBottom: 20 },
        title: { fontSize: 24, fontWeight: '800', color: colors.text },
        subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 4 },
        statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
        statCard: {
            width: '48%', backgroundColor: colors.card, borderRadius: 16, padding: 16,
            shadowColor: isDarkMode ? '#000' : '#e2e8f0', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDarkMode ? 0.3 : 0.8, shadowRadius: 4, elevation: 2,
        },
        iconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
        statValue: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 2 },
        statLabel: { fontSize: 12, color: colors.textSecondary },
        actions: { padding: 16 },
        sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 12 },
        actionBtn: {
            flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
            padding: 16, borderRadius: 16, marginBottom: 12, gap: 14,
            shadowColor: isDarkMode ? '#000' : '#e2e8f0', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDarkMode ? 0.3 : 0.8, shadowRadius: 4, elevation: 2,
        },
        actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
        actionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
        actionDesc: { fontSize: 13, color: colors.textSecondary },
        membershipCard: {
            margin: 16, marginTop: 0, backgroundColor: colors.card,
            borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border,
        },
        membershipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
        membershipTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        membershipTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
        activeBadge: { backgroundColor: colors.successLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
        activeBadgeText: { color: colors.success, fontSize: 12, fontWeight: '600' },
        pendingBadge: { backgroundColor: colors.warningLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
        pendingBadgeText: { color: colors.warning, fontSize: 12, fontWeight: '600' },
        membershipInfo: {},
        membershipText: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
        membershipSubtext: { fontSize: 13, color: colors.success, marginTop: 4 },
        membershipBenefits: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: 8 },
        upgradeBtn: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
        upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
        modalContent: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
        modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
        modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
        paymentInfo: { backgroundColor: colors.warningLight, padding: 16, borderRadius: 12, marginBottom: 16 },
        paymentLabel: { fontSize: 12, color: colors.warning },
        paymentValue: { fontSize: 18, fontWeight: '700', color: colors.text, marginVertical: 4 },
        paymentAmount: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8 },
        imagePickerBtn: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
        imagePickerPlaceholder: { padding: 40, alignItems: 'center' },
        imagePickerText: { marginTop: 8, color: colors.textSecondary, fontSize: 14 },
        previewImage: { width: '100%', height: 200, resizeMode: 'cover' },
        submitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
        submitBtnDisabled: { backgroundColor: colors.textTertiary },
        submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    }), [colors, isDarkMode]);

    if (loading) return <LoadingSpinner />;

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>{t.sellerDashboard}</Text>
                <Text style={styles.subtitle}>{user.businessName || user.name}</Text>
            </View>

            {/* Membership Card */}
            <View style={styles.membershipCard}>
                <View style={styles.membershipHeader}>
                    <View style={styles.membershipTitleRow}>
                        <Ionicons
                            name={membership?.isMember ? "star" : "star-outline"}
                            size={24}
                            color={membership?.isMember ? colors.warning : colors.textTertiary}
                        />
                        <Text style={styles.membershipTitle}>
                            {membership?.isMember ? 'Premium Member' : 'Upgrade to Premium'}
                        </Text>
                    </View>
                    {membership?.isMember ? (
                        <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                    ) : membership?.membershipStatus === 'pending' ? (
                        <View style={styles.pendingBadge}>
                            <Text style={styles.pendingBadgeText}>Pending</Text>
                        </View>
                    ) : null}
                </View>

                {membership?.isMember ? (
                    <View style={styles.membershipInfo}>
                        <Text style={styles.membershipText}>
                            Active until {new Date(membership.memberExpiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                        <Text style={styles.membershipSubtext}>
                            ✓ Unlimited product listings
                        </Text>
                    </View>
                ) : (
                    <View style={styles.membershipInfo}>
                        <Text style={styles.membershipText}>
                            Rp 10.000/month
                        </Text>
                        <Text style={styles.membershipBenefits}>
                            ✓ Unlimited listings{'\n'}
                            ✓ Priority search results{'\n'}
                            ✓ Verified badge
                        </Text>
                        <TouchableOpacity
                            style={styles.upgradeBtn}
                            onPress={() => setShowPaymentModal(true)}
                        >
                            <Text style={styles.upgradeBtnText}>Pay Now</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Payment Modal */}
            <Modal visible={showPaymentModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Submit Payment</Text>
                            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.paymentInfo}>
                            <Text style={styles.paymentLabel}>Transfer to:</Text>
                            <Text style={styles.paymentValue}>Bank BCA 1234567890</Text>
                            <Text style={styles.paymentLabel}>a/n MSME Marketplace</Text>
                            <Text style={styles.paymentAmount}>Amount: Rp 10.000</Text>
                        </View>

                        <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                            {paymentImage ? (
                                <Image source={{ uri: paymentImage.uri }} style={styles.previewImage} />
                            ) : (
                                <View style={styles.imagePickerPlaceholder}>
                                    <Ionicons name="camera" size={32} color={colors.textTertiary} />
                                    <Text style={styles.imagePickerText}>Select Payment Proof</Text>
                                </View>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.submitBtn, uploading && styles.submitBtnDisabled]}
                            onPress={submitPayment}
                            disabled={uploading}
                        >
                            <Text style={styles.submitBtnText}>
                                {uploading ? 'Submitting...' : 'Submit Payment'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <View style={[styles.iconBg, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="cube" size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.statValue}>{stats.products}</Text>
                    <Text style={styles.statLabel}>{t.tabProducts}</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.iconBg, { backgroundColor: colors.successLight }]}>
                        <Ionicons name="cash" size={24} color={colors.success} />
                    </View>
                    <Text style={styles.statValue}>{formatPrice(stats.revenue)}</Text>
                    <Text style={styles.statLabel}>Revenue</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.iconBg, { backgroundColor: colors.warningLight }]}>
                        <Ionicons name="receipt" size={24} color={colors.warning} />
                    </View>
                    <Text style={styles.statValue}>{stats.orders}</Text>
                    <Text style={styles.statLabel}>Total Orders</Text>
                </View>
                <View style={styles.statCard}>
                    <View style={[styles.iconBg, { backgroundColor: colors.dangerLight }]}>
                        <Ionicons name="time" size={24} color={colors.danger} />
                    </View>
                    <Text style={styles.statValue}>{stats.pending}</Text>
                    <Text style={styles.statLabel}>{t.pending}</Text>
                </View>
            </View>

            <View style={styles.actions}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('AddProduct')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: colors.primary }]}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.actionTitle}>{t.addNewProduct}</Text>
                        <Text style={styles.actionDesc}>List a new item for sale</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('MyProducts')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: isDarkMode ? '#4f46e5' : '#4338ca' }]}>
                        <Ionicons name="list" size={24} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.actionTitle}>{t.manageProducts}</Text>
                        <Text style={styles.actionDesc}>Edit stock and prices</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('LogoGenerator')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#f59e0b' }]}>
                        <Ionicons name="color-palette" size={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.actionTitle}>{t.logoGenerator || 'Logo Generator'}</Text>
                            {!membership?.isMember && (
                                <Ionicons name="star" size={14} color="#f59e0b" />
                            )}
                        </View>
                        <Text style={styles.actionDesc}>Create AI-generated logos for your store</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('Automation')}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
                        <Ionicons name="flash" size={24} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.actionTitle}>{t.automation || 'Automations'}</Text>
                            {!membership?.isMember && (
                                <Ionicons name="star" size={14} color="#f59e0b" />
                            )}
                        </View>
                        <Text style={styles.actionDesc}>Connect n8n workflows for emails & alerts</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
