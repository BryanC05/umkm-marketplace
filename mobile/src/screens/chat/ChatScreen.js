import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import { SOCKET_URL } from '../../config';
import { formatTime } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ChatScreen({ route, navigation }) {
    const { roomId: initialRoomId, sellerId, otherUser } = route.params || {};
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [roomId, setRoomId] = useState(initialRoomId);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef(null);
    const flatListRef = useRef(null);
    const user = useAuthStore((s) => s.user);

    // Set title
    useEffect(() => {
        navigation.setOptions({
            title: otherUser?.name || 'Chat',
        });
    }, [otherUser, navigation]);

    // Create or join room
    useEffect(() => {
        const initChat = async () => {
            try {
                let rid = roomId;
                if (!rid && sellerId) {
                    const response = await api.post('/chat/rooms/direct', { sellerId });
                    rid = response.data._id;
                    setRoomId(rid);
                }
                if (rid) {
                    const msgResponse = await api.get(`/chat/rooms/${rid}/messages`);
                    setMessages((msgResponse.data || []).reverse());
                }
            } catch (error) {
                console.error('Failed to init chat:', error);
            } finally {
                setLoading(false);
            }
        };
        initChat();
    }, [roomId, sellerId]);

    // Socket.io connection
    useEffect(() => {
        if (!roomId) return;

        const connectSocket = async () => {
            const token = await AsyncStorage.getItem('token');
            const socket = io(SOCKET_URL, {
                auth: { token },
                transports: ['websocket', 'polling'],
            });

            socket.on('connect', () => {
                socket.emit('join-room', roomId);
            });

            socket.on('receive-message', (newMessage) => {
                setMessages((prev) => [newMessage, ...prev]);
            });

            socketRef.current = socket;
        };

        connectSocket();

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leave-room', roomId);
                socketRef.current.disconnect();
            }
        };
    }, [roomId]);

    const sendMessage = async () => {
        if (!message.trim() || !roomId) return;

        try {
            const response = await api.post(`/chat/room/${roomId}/message`, {
                content: message.trim(),
            });

            const newMsg = response.data;
            setMessages((prev) => [newMsg, ...prev]);

            // Emit via socket for real-time delivery
            if (socketRef.current) {
                socketRef.current.emit('send-message', {
                    roomId,
                    message: newMsg,
                });
            }

            setMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const renderMessage = ({ item: msg }) => {
        const isMe = msg.sender?._id === user?.id || msg.sender === user?.id;
        return (
            <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{msg.content}</Text>
                    <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                        {formatTime(msg.createdAt)}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) return <LoadingSpinner />;

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item._id || String(Math.random())}
                renderItem={renderMessage}
                inverted
                contentContainerStyle={styles.messageList}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>Start the conversation!</Text>
                    </View>
                }
            />

            <View style={styles.inputBar}>
                <TextInput
                    style={styles.textInput}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Type a message..."
                    placeholderTextColor="#9ca3af"
                    multiline
                    maxLength={1000}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
                    onPress={sendMessage}
                    disabled={!message.trim()}
                >
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    messageList: { padding: 16, paddingBottom: 8 },
    msgRow: { marginBottom: 8, alignItems: 'flex-start' },
    msgRowMe: { alignItems: 'flex-end' },
    bubble: { maxWidth: '78%', padding: 12, borderRadius: 16 },
    bubbleMe: {
        backgroundColor: '#3b82f6', borderBottomRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: '#fff', borderBottomLeftRadius: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    },
    msgText: { fontSize: 14, color: '#111827', lineHeight: 20 },
    msgTextMe: { color: '#fff' },
    msgTime: { fontSize: 10, color: '#9ca3af', marginTop: 4, alignSelf: 'flex-end' },
    msgTimeMe: { color: 'rgba(255,255,255,0.7)' },
    empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 40, transform: [{ scaleY: -1 }] },
    emptyText: { fontSize: 14, color: '#9ca3af' },
    inputBar: {
        flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 28,
        backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#f3f4f6', gap: 10,
    },
    textInput: {
        flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 16,
        paddingVertical: 10, fontSize: 14, color: '#111827', maxHeight: 100,
    },
    sendBtn: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: '#3b82f6',
        justifyContent: 'center', alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: '#d1d5db' },
});
