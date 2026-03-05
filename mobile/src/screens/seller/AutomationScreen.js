import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useTranslation } from '../../hooks/useTranslation';

const WORKFLOW_TYPES = [
    {
        value: 'order_confirmation',
        label: 'Order Confirmation',
        description: 'Send confirmation emails when new orders are placed',
        icon: 'mail-outline',
        color: '#3b82f6',
    },
    {
        value: 'inventory_alert',
        label: 'Inventory Alert',
        description: 'Get notified when product stock runs low',
        icon: 'alert-circle-outline',
        color: '#f97316',
    },
    {
        value: 'welcome_series',
        label: 'Welcome Series',
        description: 'Send welcome emails to new customers',
        icon: 'person-add-outline',
        color: '#22c55e',
    },
];

export default function AutomationScreen({ navigation }) {
    const { user } = useAuthStore();
    const { colors } = useThemeStore();
    const { t } = useTranslation();
    
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [membership, setMembership] = useState(null);
    const [membershipLoading, setMembershipLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selectedType, setSelectedType] = useState(null);
    const [workflowName, setWorkflowName] = useState('');

    useEffect(() => {
        const fetchMembership = async () => {
            if (user?.isSeller) {
                try {
                    const response = await api.get('/users/membership/status');
                    setMembership(response.data);
                } catch (err) {
                    console.error('Failed to fetch membership:', err);
                }
            }
            setMembershipLoading(false);
        };
        fetchMembership();
    }, [user?.isSeller]);

    useEffect(() => {
        if (user?.isSeller && membership?.isMember) {
            fetchWorkflows();
        }
    }, [user?.isSeller, membership?.isMember]);

    const fetchWorkflows = async () => {
        try {
            setLoading(true);
            const response = await api.get('/workflows');
            setWorkflows(response.data.workflows || []);
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleWorkflow = async (workflowId, currentStatus) => {
        try {
            await api.put(`/workflows/${workflowId}/toggle`, { isActive: !currentStatus });
            setWorkflows(prev => prev.map(w => 
                w._id === workflowId ? { ...w, isActive: !currentStatus } : w
            ));
            Alert.alert(t.success, currentStatus ? t.workflowPaused : t.workflowActivated);
        } catch (error) {
            Alert.alert(t.error, t.toggleFailed);
        }
    };

    const deleteWorkflow = async (workflowId) => {
        Alert.alert(
            t.deleteWorkflow,
            t.confirmDeleteWorkflow,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.delete,
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/workflows/${workflowId}`);
                            setWorkflows(prev => prev.filter(w => w._id !== workflowId));
                        } catch (error) {
                            Alert.alert(t.error, 'Failed to delete workflow');
                        }
                    }
                }
            ]
        );
    };

    const createWorkflow = async () => {
        if (!selectedType) {
            Alert.alert(t.error, 'Please select a workflow type');
            return;
        }
        
        setCreating(true);
        try {
            const response = await api.post('/workflows', {
                type: selectedType,
                name: workflowName || undefined,
            });
            setWorkflows(prev => [response.data.workflow, ...prev]);
            setShowCreateModal(false);
            setSelectedType(null);
            setWorkflowName('');
            Alert.alert(t.success, t.workflowCreated);
        } catch (error) {
            Alert.alert(t.error, error.response?.data?.error || 'Failed to create workflow');
        } finally {
            setCreating(false);
        }
    };

    const getWorkflowMeta = (type) => {
        return WORKFLOW_TYPES.find(w => w.value === type) || WORKFLOW_TYPES[0];
    };

    const styles = useMemo(() => StyleSheet.create({
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
        headerAction: {
            paddingHorizontal: 12, paddingVertical: 8, 
            backgroundColor: colors.primary, borderRadius: 8,
        },
        headerActionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
        
        content: { flex: 1, padding: 16 },
        
        howItWorksCard: {
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
        },
        howItWorksTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
        stepItem: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: 12,
        },
        stepNumber: {
            width: 28, height: 28,
            borderRadius: 14,
            backgroundColor: colors.primary,
            justifyContent: 'center', alignItems: 'center',
            marginRight: 12,
        },
        stepNumberText: { color: '#fff', fontSize: 14, fontWeight: '700' },
        stepContent: { flex: 1 },
        stepTitle: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
        stepDesc: { fontSize: 12, color: colors.textSecondary },
        
        workflowCard: {
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.border,
        },
        workflowHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 8,
        },
        workflowInfo: { flex: 1 },
        workflowName: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
        workflowType: { fontSize: 13, color: colors.textSecondary },
        workflowBadge: {
            paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
            backgroundColor: colors.successLight,
        },
        workflowBadgeText: { fontSize: 12, fontWeight: '600', color: colors.success },
        workflowBadgePaused: {
            backgroundColor: colors.textTertiary + '30',
        },
        workflowBadgePausedText: { color: colors.textSecondary },
        
        workflowActions: {
            flexDirection: 'row',
            marginTop: 12,
            gap: 8,
        },
        actionBtn: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 10,
            borderRadius: 8,
            gap: 6,
        },
        toggleBtn: { backgroundColor: colors.primary },
        toggleBtnPaused: { backgroundColor: colors.success },
        deleteBtn: { backgroundColor: colors.danger + '20', flex: 0.4 },
        actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
        
        emptyState: {
            alignItems: 'center',
            paddingVertical: 40,
        },
        emptyIcon: { marginBottom: 12, color: colors.textSecondary },
        emptyText: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
        
        createBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            paddingVertical: 14,
            borderRadius: 12,
            gap: 8,
        },
        createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
        
        // Modal styles
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
        modalContent: {
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            maxHeight: '80%',
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
        },
        modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
        modalClose: { padding: 4 },
        
        typeOption: {
            flexDirection: 'row',
            alignItems: 'center',
            padding: 14,
            borderRadius: 12,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
        },
        typeOptionSelected: {
            borderColor: colors.primary,
            backgroundColor: colors.primaryLight + '20',
        },
        typeIcon: {
            width: 44, height: 44,
            borderRadius: 12,
            justifyContent: 'center', alignItems: 'center',
            marginRight: 12,
        },
        typeInfo: { flex: 1 },
        typeLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
        typeDesc: { fontSize: 12, color: colors.textSecondary },
        
        nameInput: {
            backgroundColor: colors.input,
            borderRadius: 12,
            padding: 14,
            fontSize: 14,
            color: colors.text,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
        },
        
        modalActions: {
            flexDirection: 'row',
            gap: 12,
        },
        cancelBtn: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: colors.input,
            borderWidth: 1,
            borderColor: colors.border,
        },
        cancelBtnText: { fontSize: 16, fontWeight: '600', color: colors.text },
        submitBtn: {
            flex: 1,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            backgroundColor: colors.primary,
        },
        submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
        
        // Gate screens
        gateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
        gateIcon: { marginBottom: 16 },
        gateTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 12 },
        gateDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
        gateBtn: {
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: colors.primary,
            paddingVertical: 14, paddingHorizontal: 32,
            borderRadius: 12, gap: 8,
        },
        gateBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    }), [colors]);

    // Gate: Must be a seller
    if (!membershipLoading && !user?.isSeller) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t.automation || 'Automation'}</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.gateContainer}>
                    <Ionicons name="storefront-outline" size={64} color={colors.primary} style={styles.gateIcon} />
                    <Text style={styles.gateTitle}>{t.sellerAccessRequired || 'Seller Access Required'}</Text>
                    <Text style={styles.gateDesc}>
                        {t.sellerAccessDesc || 'Automation features are available for sellers only. Register your business to get started.'}
                    </Text>
                    <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.navigate('Profile')}>
                        <Ionicons name="storefront" size={20} color="#fff" />
                        <Text style={styles.gateBtnText}>{t.registerAsSeller || 'Register as Seller'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Gate: Must have premium membership
    if (!membershipLoading && membership && !membership.isMember) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t.automation || 'Automation'}</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.gateContainer}>
                    <Ionicons name="star-outline" size={64} color="#f59e0b" style={styles.gateIcon} />
                    <Text style={styles.gateTitle}>{t.premiumFeature || 'Premium Feature'}</Text>
                    <Text style={styles.gateDesc}>
                        {t.premiumDesc || 'Workflow automation is available exclusively for Premium Members.'}
                    </Text>
                    <Text style={[styles.gateDesc, { marginBottom: 24 }]}>
                        {t.upgradeDesc || 'Upgrade to Premium for Rp 10.000/month to unlock automated emails, inventory alerts, and more.'}
                    </Text>
                    <TouchableOpacity style={styles.gateBtn} onPress={() => navigation.navigate('SellerDashboard')}>
                        <Ionicons name="star" size={20} color="#fff" />
                        <Text style={styles.gateBtnText}>{t.upgradeOnDashboard || 'Upgrade on Dashboard'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (membershipLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t.automation || 'Automation'}</Text>
                <TouchableOpacity 
                    style={styles.headerAction} 
                    onPress={() => setShowCreateModal(true)}
                >
                    <Text style={styles.headerActionText}>+ {t.create || 'Create'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* How It Works */}
                <View style={styles.howItWorksCard}>
                    <Text style={styles.howItWorksTitle}>How It Works</Text>
                    <View style={styles.stepItem}>
                        <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>{t.chooseWorkflow || 'Choose a Workflow'}</Text>
                            <Text style={styles.stepDesc}>{t.chooseWorkflowDesc || 'Pick automation type — orders, inventory, or welcome emails.'}</Text>
                        </View>
                    </View>
                    <View style={styles.stepItem}>
                        <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>{t.activateIt || 'Activate It'}</Text>
                            <Text style={styles.stepDesc}>{t.activateItDesc || 'Click Create and we handle the automation setup.'}</Text>
                        </View>
                    </View>
                    <View style={styles.stepItem}>
                        <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                        <View style={styles.stepContent}>
                            <Text style={styles.stepTitle}>{t.sitBack || 'Sit Back & Relax'}</Text>
                            <Text style={styles.stepDesc}>{t.sitBackDesc || 'Your automations run automatically when events occur.'}</Text>
                        </View>
                    </View>
                </View>

                {loading ? (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : workflows.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="git-branch-outline" size={48} color={colors.textSecondary} style={styles.emptyIcon} />
                        <Text style={styles.emptyText}>{t.noWorkflows || 'No workflows configured yet'}</Text>
                        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.createBtnText}>{t.createFirstWorkflow || 'Create Your First Workflow'}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    workflows.map(workflow => {
                        const meta = getWorkflowMeta(workflow.type);
                        return (
                            <View key={workflow._id} style={styles.workflowCard}>
                                <View style={styles.workflowHeader}>
                                    <View style={styles.workflowInfo}>
                                        <Text style={styles.workflowName}>
                                            {workflow.name || meta.label}
                                        </Text>
                                        <Text style={styles.workflowType}>{meta.label}</Text>
                                    </View>
                                    <View style={[
                                        styles.workflowBadge,
                                        !workflow.isActive && styles.workflowBadgePaused
                                    ]}>
                                        <Text style={[
                                            styles.workflowBadgeText,
                                            !workflow.isActive && styles.workflowBadgePausedText
                                        ]}>
                                            {workflow.isActive ? (t.active || 'Active') : (t.paused || 'Paused')}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 12 }}>
                                    {meta.description}
                                </Text>
                                <View style={styles.workflowActions}>
                                    <TouchableOpacity 
                                        style={[
                                            styles.actionBtn, 
                                            styles.toggleBtn,
                                            !workflow.isActive && styles.toggleBtnPaused
                                        ]}
                                        onPress={() => toggleWorkflow(workflow._id, workflow.isActive)}
                                    >
                                        <Ionicons 
                                            name={workflow.isActive ? 'pause' : 'play'} 
                                            size={16} 
                                            color="#fff" 
                                        />
                                        <Text style={styles.actionBtnText}>
                                            {workflow.isActive ? (t.pause || 'Pause') : (t.activate || 'Activate')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, styles.deleteBtn]}
                                        onPress={() => deleteWorkflow(workflow._id)}
                                    >
                                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Create Modal */}
            <Modal visible={showCreateModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t.createWorkflow || 'Create Workflow'}</Text>
                            <TouchableOpacity style={styles.modalClose} onPress={() => setShowCreateModal(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
                            {t.selectType || 'Select Workflow Type'}
                        </Text>

                        {WORKFLOW_TYPES.map(type => (
                            <TouchableOpacity
                                key={type.value}
                                style={[
                                    styles.typeOption,
                                    selectedType === type.value && styles.typeOptionSelected
                                ]}
                                onPress={() => setSelectedType(type.value)}
                            >
                                <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                                    <Ionicons name={type.icon} size={24} color={type.color} />
                                </View>
                                <View style={styles.typeInfo}>
                                    <Text style={styles.typeLabel}>{type.label}</Text>
                                    <Text style={styles.typeDesc}>{type.description}</Text>
                                </View>
                                {selectedType === type.value && (
                                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}

                        <TextInput
                            style={styles.nameInput}
                            placeholder={t.workflowNamePlaceholder || 'Workflow name (optional)'}
                            placeholderTextColor={colors.textSecondary}
                            value={workflowName}
                            onChangeText={setWorkflowName}
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity 
                                style={styles.cancelBtn} 
                                onPress={() => setShowCreateModal(false)}
                            >
                                <Text style={styles.cancelBtnText}>{t.cancel}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.submitBtn} 
                                onPress={createWorkflow}
                                disabled={creating || !selectedType}
                            >
                                {creating ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>{t.create || 'Create'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
