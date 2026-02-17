import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    RefreshControl, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useLanguageStore } from '../../store/languageStore';
import api from '../../api/api';
import ForumPostCard from '../../components/ForumPostCard';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ForumScreen({ navigation }) {
    const { colors } = useThemeStore();
    const { t } = useLanguageStore();
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchThreads = useCallback(async () => {
        try {
            const params = search ? `?search=${search}` : '';
            const response = await api.get(`/forum${params}`);
            setThreads(response.data.threads || []);
        } catch (error) {
            console.error('Failed to fetch threads:', error);
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchThreads(); }, [fetchThreads]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchThreads();
        setRefreshing(false);
    };

    const createThread = async () => {
        if (!newTitle.trim() || !newContent.trim()) {
            Alert.alert(t.error, t.fillAllFields);
            return;
        }
        setCreating(true);
        try {
            await api.post('/forum', { title: newTitle.trim(), content: newContent.trim() });
            setShowCreate(false);
            setNewTitle('');
            setNewContent('');
            fetchThreads();
        } catch (error) {
            Alert.alert(t.error, error.response?.data?.message || 'Failed to create thread');
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    const styles = {
        container: { flex: 1, backgroundColor: colors.background },
        searchRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },
        searchWrap: {
            flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
            backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, height: 42,
            borderWidth: 1, borderColor: colors.border,
        },
        searchInput: { flex: 1, fontSize: 14, color: colors.text },
        createBtn: {
            width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary,
            justifyContent: 'center', alignItems: 'center',
        },
        list: { padding: 16, paddingTop: 4 },
        empty: { alignItems: 'center', paddingTop: 60 },
        emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 12 },
        emptyText: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
        modalOverlay: {
            flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
        },
        modalContent: {
            backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: 20, paddingBottom: 40,
        },
        modalHeader: {
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
        },
        modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
        modalInput: {
            backgroundColor: colors.input, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.text, marginBottom: 12,
        },
        modalTextarea: { height: 120 },
        modalBtn: {
            backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14,
            alignItems: 'center', marginTop: 4,
        },
        modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    };

    return (
        <View style={styles.container}>
            {/* Search */}
            <View style={styles.searchRow}>
                <View style={styles.searchWrap}>
                    <Ionicons name="search" size={16} color={colors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t.search + '...'}
                        placeholderTextColor={colors.textSecondary}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
                    <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={threads}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <ForumPostCard
                        post={item}
                        onPress={() => navigation.navigate('ThreadDetail', { threadId: item._id })}
                    />
                )}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
                        <Text style={styles.emptyTitle}>{t.noThreads}</Text>
                        <Text style={styles.emptyText}>{t.startDiscussion}</Text>
                    </View>
                }
            />

            {/* Create Thread Modal */}
            <Modal visible={showCreate} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t.newThread}</Text>
                            <TouchableOpacity onPress={() => setShowCreate(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.modalInput}
                            placeholder={t.threadTitlePlaceholder}
                            placeholderTextColor={colors.textSecondary}
                            value={newTitle}
                            onChangeText={setNewTitle}
                        />
                        <TextInput
                            style={[styles.modalInput, styles.modalTextarea]}
                            placeholder={t.threadContentPlaceholder}
                            placeholderTextColor={colors.textSecondary}
                            value={newContent}
                            onChangeText={setNewContent}
                            multiline
                            textAlignVertical="top"
                        />
                        <TouchableOpacity
                            style={[styles.modalBtn, creating && { opacity: 0.7 }]}
                            onPress={createThread}
                            disabled={creating}
                        >
                            <Text style={styles.modalBtnText}>{creating ? t.loading : t.postThread}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
