import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import { formatRelativeTime } from '../../utils/helpers';
import { useThemeStore } from '../../store/themeStore';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ThreadDetailScreen({ route }) {
    const { threadId } = route.params;
    const { colors } = useThemeStore();
    const [thread, setThread] = useState(null);
    const [replies, setReplies] = useState([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const user = useAuthStore((s) => s.user);

    const fetchThread = useCallback(async () => {
        try {
            const response = await api.get(`/forum/${threadId}`);
            setThread(response.data);
            setReplies(response.data.replies || []);
        } catch (error) {
            console.error('Failed to fetch thread:', error);
        } finally {
            setLoading(false);
        }
    }, [threadId]);

    useEffect(() => { fetchThread(); }, [fetchThread]);

    const sendReply = async () => {
        if (!reply.trim()) return;
        setSending(true);
        try {
            await api.post(`/forum/${threadId}/reply`, { content: reply.trim() });
            setReply('');
            fetchThread();
        } catch (error) {
            Alert.alert('Error', 'Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    const handleLike = async () => {
        try {
            const response = await api.post(`/forum/${threadId}/like`);
            setThread((prev) => ({ ...prev, likes: response.data.likes }));
        } catch (error) {
            console.error('Failed to like:', error);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!thread) return null;

    const isLiked = thread.likes?.includes(user?.id);

    const renderHeader = () => (
        <View style={styles.threadContent}>
            <View style={styles.authorRow}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(thread.author?.name || 'U').charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                    <Text style={styles.authorName}>{thread.author?.name || 'Anonymous'}</Text>
                    <Text style={styles.date}>{formatRelativeTime(thread.createdAt)}</Text>
                </View>
            </View>
            <Text style={styles.title}>{thread.title}</Text>
            <Text style={styles.body}>{thread.content}</Text>
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                    <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? '#ef4444' : '#9ca3af'} />
                    <Text style={[styles.actionText, isLiked && { color: '#ef4444' }]}>
                        {thread.likes?.length || 0}
                    </Text>
                </TouchableOpacity>
                <View style={styles.actionBtn}>
                    <Ionicons name="chatbubble-outline" size={16} color="#9ca3af" />
                    <Text style={styles.actionText}>{replies.length} replies</Text>
                </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.repliesTitle}>Replies</Text>
        </View>
    );

    const renderReply = ({ item }) => (
        <View style={styles.replyCard}>
            <View style={styles.replyAvatar}>
                <Text style={styles.replyAvatarText}>{(item.author?.name || 'U').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.replyContent}>
                <View style={styles.replyHeader}>
                    <Text style={styles.replyAuthor}>{item.author?.name || 'Anonymous'}</Text>
                    <Text style={styles.replyDate}>{formatRelativeTime(item.createdAt)}</Text>
                </View>
                <Text style={styles.replyText}>{item.content}</Text>
            </View>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            <FlatList
                data={replies}
                keyExtractor={(item) => item._id}
                renderItem={renderReply}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <Text style={styles.noReplies}>No replies yet. Be the first!</Text>
                }
            />
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.textInput}
                    value={reply}
                    onChangeText={setReply}
                    placeholder="Write a reply..."
                    placeholderTextColor="#9ca3af"
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!reply.trim() || sending) && styles.sendBtnDisabled]}
                    onPress={sendReply}
                    disabled={!reply.trim() || sending}
                >
                    <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    list: { paddingBottom: 8 },
    threadContent: { padding: 20 },
    authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
    avatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    authorName: { fontSize: 14, fontWeight: '700', color: colors.text },
    date: { fontSize: 12, color: colors.textTertiary, marginTop: 1 },
    title: { fontSize: 20, fontWeight: '800', color: colors.text, lineHeight: 26, marginBottom: 10 },
    body: { fontSize: 15, color: colors.textSecondary, lineHeight: 24, marginBottom: 16 },
    actions: { flexDirection: 'row', gap: 20, marginBottom: 16 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionText: { fontSize: 13, color: colors.textTertiary, fontWeight: '500' },
    divider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
    repliesTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    replyCard: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12 },
    replyAvatar: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: colors.input,
        justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2,
    },
    replyAvatarText: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
    replyContent: { flex: 1 },
    replyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    replyAuthor: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    replyDate: { fontSize: 11, color: colors.textTertiary },
    replyText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    noReplies: { textAlign: 'center', color: colors.textTertiary, fontSize: 14, padding: 20 },
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 28,
        backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border, gap: 10,
    },
    textInput: {
        flex: 1, backgroundColor: colors.input, borderRadius: 20, paddingHorizontal: 16,
        paddingVertical: 10, fontSize: 14, color: colors.text, maxHeight: 80,
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: colors.textTertiary },
});
