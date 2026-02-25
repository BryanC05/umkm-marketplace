import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useLanguageStore } from '../../store/languageStore';
import { useThemeStore } from '../../store/themeStore';

export default function AdminMembershipScreen() {
    const { t } = useLanguageStore();
    const { colors } = useThemeStore();
    const [pendingMembers, setPendingMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchPending = async () => {
        try {
            const res = await api.get('/admin/membership/pending');
            setPendingMembers(res.data);
        } catch (error) {
            console.error('Failed to fetch pending:', error);
            Alert.alert('Error', 'Failed to load pending memberships');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchPending();
        setRefreshing(false);
    };

    const handleApprove = async (memberId) => {
        try {
            await api.post(`/admin/membership/approve/${memberId}`);
            Alert.alert('Success', 'Membership approved!');
            fetchPending();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to approve');
        }
    };

    const handleReject = async (memberId) => {
        Alert.alert(
            'Confirm Reject',
            'Are you sure you want to reject this membership?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post(`/admin/membership/reject/${memberId}`);
                            fetchPending();
                        } catch (error) {
                            Alert.alert('Error', error.response?.data?.error || 'Failed to reject');
                        }
                    },
                },
            ]
        );
    };

    if (loading) return <LoadingSpinner />;

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Ionicons name="person" size={24} color="#3b82f6" />
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                    {item.businessName && (
                        <Text style={styles.business}>{item.businessName}</Text>
                    )}
                    <Text style={styles.date}>
                        Submitted: {new Date(item.paymentSubmittedAt).toLocaleString('id-ID')}
                    </Text>
                </View>
            </View>

            <View style={styles.actions}>
                {item.paymentProof && (
                    <TouchableOpacity 
                        style={styles.viewProofBtn}
                        onPress={() => {
                            Alert.alert('Payment Proof', '', [
                                { text: 'OK' },
                            ]);
                        }}
                    >
                        <Ionicons name="image" size={16} color="#3b82f6" />
                        <Text style={styles.viewProofText}>View Proof</Text>
                    </TouchableOpacity>
                )}
                <View style={styles.actionBtns}>
                    <TouchableOpacity 
                        style={styles.rejectBtn}
                        onPress={() => handleReject(item._id)}
                    >
                        <Ionicons name="close" size={18} color="#ef4444" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.approveBtn}
                        onPress={() => handleApprove(item._id)}
                    >
                        <Ionicons name="checkmark" size={18} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Membership Approvals</Text>
                <Text style={styles.subtitle}>
                    {pendingMembers.length} pending request{pendingMembers.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {pendingMembers.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="checkmark-circle" size={64} color="#d1d5db" />
                    <Text style={styles.emptyText}>No pending approvals</Text>
                </View>
            ) : (
                <FlatList
                    data={pendingMembers}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 20, backgroundColor: colors.card },
    title: { fontSize: 24, fontWeight: '800', color: colors.text },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    list: { padding: 16 },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: colors.text },
    email: { fontSize: 14, color: colors.textSecondary },
    business: { fontSize: 14, color: colors.textSecondary, fontStyle: 'italic' },
    date: { fontSize: 12, color: colors.textTertiary, marginTop: 4 },
    actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    viewProofBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 8,
    },
    viewProofText: { color: '#3b82f6', fontSize: 14 },
    actionBtns: { flexDirection: 'row', gap: 8 },
    rejectBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#fee2e2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    approveBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#22c55e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 12 },
});
