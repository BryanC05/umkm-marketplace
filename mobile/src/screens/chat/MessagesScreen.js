import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import { formatRelativeTime } from '../../utils/helpers';
import { useLanguageStore } from '../../store/languageStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ChatSkeleton } from '../../components/LoadingSkeleton';

export default function MessagesScreen({ navigation }) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const user = useAuthStore((s) => s.user);
    const { t } = useLanguageStore();

    const fetchRooms = useCallback(async () => {
        try {
            const response = await api.get('/chat/rooms');
            setRooms(response.data || []);
        } catch (error) {
            console.error('Failed to fetch chat rooms:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRooms(); }, [fetchRooms]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchRooms();
        setRefreshing(false);
    };

    const getOtherParticipant = (room) => {
        if (!user) return {};
        return user.id === room.buyer?._id ? room.seller : room.buyer;
    };

    if (loading) return (
        <View style={{ flex: 1, backgroundColor: '#f8fafc', paddingTop: 50 }}>
            <ChatSkeleton />
            <ChatSkeleton />
            <ChatSkeleton />
        </View>
    );

    const renderRoom = ({ item: room }) => {
        const other = getOtherParticipant(room);
        const lastMessage = room.lastMessage;
        return (
            <TouchableOpacity
                style={styles.roomCard}
                onPress={() => navigation.navigate('Chat', { roomId: room._id, otherUser: other })}
                activeOpacity={0.7}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {(other?.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.roomInfo}>
                    <View style={styles.roomHeader}>
                        <Text style={styles.roomName} numberOfLines={1}>{other?.name || 'User'}</Text>
                        {lastMessage && (
                            <Text style={styles.roomTime}>{formatRelativeTime(lastMessage.createdAt)}</Text>
                        )}
                    </View>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {lastMessage?.content || t.noMessages}
                    </Text>
                    {room.product && (
                        <View style={styles.productTag}>
                            <Ionicons name="cube-outline" size={10} color="#6b7280" />
                            <Text style={styles.productTagText} numberOfLines={1}>{room.product.name}</Text>
                        </View>
                    )}
                </View>
                {room.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{room.unreadCount}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={rooms}
                keyExtractor={(item) => item._id}
                renderItem={renderRoom}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                        <Text style={styles.emptyTitle}>{t.noMessages}</Text>
                        <Text style={styles.emptyText}>{t.noMessagesDesc}</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    list: { paddingBottom: 20 },
    roomCard: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f3f4f6',
    },
    avatar: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#3b82f6',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
    roomInfo: { flex: 1 },
    roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    roomName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
    roomTime: { fontSize: 11, color: '#9ca3af' },
    lastMessage: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
    productTag: {
        flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
        backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8, alignSelf: 'flex-start',
    },
    productTagText: { fontSize: 10, color: '#6b7280' },
    unreadBadge: {
        width: 22, height: 22, borderRadius: 11, backgroundColor: '#3b82f6',
        justifyContent: 'center', alignItems: 'center', marginLeft: 8,
    },
    unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    empty: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginTop: 12 },
    emptyText: { fontSize: 13, color: '#9ca3af', marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
});
