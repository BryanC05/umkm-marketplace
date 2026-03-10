import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import api from '../../api/api';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { SOCKET_URL } from '../../config';
import { formatTime } from '../../utils/helpers';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ChatScreen({ route, navigation }) {
    const { roomId: initialRoomId, sellerId, otherUser, productName, productId } = route.params || {};
    const { colors } = useThemeStore();
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [roomId, setRoomId] = useState(initialRoomId);
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const socketRef = useRef(null);
    const flatListRef = useRef(null);
    const user = useAuthStore((s) => s.user);
    const isMountedRef = useRef(true);

    // Track mounted state
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Set title with subtitle
    useEffect(() => {
        navigation.setOptions({
            title: otherUser?.name || 'Chat',
            headerTitle: () => (
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>
                        {otherUser?.name || 'Chat'}
                    </Text>
                    {productName && (
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                            {productName}
                        </Text>
                    )}
                </View>
            ),
        });
    }, [otherUser, productName, navigation, colors]);

    // Create room or fetch messages when roomId changes
    useEffect(() => {
        const initChat = async () => {
            console.log('[ChatScreen] initChat - roomId:', roomId, 'sellerId:', sellerId);
            
            let currentRoomId = roomId;

            // If no roomId but we have sellerId, create a room
            if (!currentRoomId && sellerId) {
                try {
                    console.log('[ChatScreen] Creating room with sellerId:', sellerId);
                    const roomRes = await api.post('/chat/rooms/direct', { sellerId });
                    console.log('[ChatScreen] Room created:', roomRes.data);
                    
                    if (roomRes.data?._id && isMountedRef.current) {
                        currentRoomId = roomRes.data._id;
                        setRoomId(currentRoomId);
                    }
                } catch (error) {
                    console.error('[ChatScreen] Failed to create chat room:', error.response || error);
                    if (isMountedRef.current) setLoading(false);
                    return;
                }
            }

            // If we have a roomId now, fetch messages
            if (currentRoomId) {
                try {
                    console.log('[ChatScreen] Fetching messages for room:', currentRoomId);
                    const msgResponse = await api.get(`/chat/rooms/${currentRoomId}/messages`);
                    console.log('[ChatScreen] Messages received:', msgResponse.data?.length || 0);
                    if (isMountedRef.current) {
                        setMessages((msgResponse.data || []).reverse());
                    }
                } catch (error) {
                    console.error('[ChatScreen] Failed to init chat:', error.response || error);
                }
            } else {
                console.log('[ChatScreen] No roomId available, skipping message fetch');
            }

            if (isMountedRef.current) {
                setLoading(false);
            }
        };
        initChat();
    }, [sellerId]); // Only run when sellerId changes, not roomId

    // Socket.io connection
    useEffect(() => {
        if (!roomId) return;

        const connectSocket = async () => {
            const token = await SecureStore.getItemAsync('token');
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
        if (!message.trim() || isSending) return;

        console.log('[ChatScreen] sendMessage - roomId:', roomId, 'sellerId:', sellerId);
        
        setIsSending(true);
        
        try {
            let currentRoomId = roomId;

            // If we don't have a room yet, create one now with the seller
            if (!currentRoomId && sellerId) {
                console.log('[ChatScreen] Creating room before send with sellerId:', sellerId);
                const roomRes = await api.post('/chat/rooms/direct', { sellerId });
                console.log('[ChatScreen] Room for send:', roomRes.data);
                currentRoomId = roomRes.data._id;
                if (isMountedRef.current) {
                    setRoomId(currentRoomId);
                }
            }

            if (!currentRoomId) {
                console.error('[ChatScreen] No roomId available for sending');
                setIsSending(false);
                return;
            }

            console.log('[ChatScreen] Sending message to room:', currentRoomId);
            const response = await api.post(`/chat/rooms/${currentRoomId}/messages`, {
                content: message.trim(),
            });

            console.log('[ChatScreen] Message sent:', response.data);
            const newMsg = response.data;
            
            if (isMountedRef.current) {
                setMessages((prev) => [newMsg, ...prev]);
            }

            // Emit via socket for real-time delivery
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit('send-message', {
                    roomId: currentRoomId,
                    message: newMsg,
                });
            }

            if (isMountedRef.current) {
                setMessage('');
            }
        } catch (error) {
            console.error('[ChatScreen] Failed to send message:', error.response || error);
        } finally {
            if (isMountedRef.current) {
                setIsSending(false);
            }
        }
    };

    const getSenderId = (msg) => {
        if (!msg.sender) return null;
        if (typeof msg.sender === 'object' && msg.sender._id) {
            return msg.sender._id;
        }
        if (typeof msg.sender === 'string') {
            return msg.sender;
        }
        return null;
    };

    const renderMessage = ({ item: msg }) => {
        const senderId = getSenderId(msg);
        const userId = user?.id;
        const isMe = senderId === userId || senderId === String(userId);
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

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        messageList: { padding: 16, paddingBottom: 8 },
        msgRow: { marginBottom: 8, alignItems: 'flex-start' },
        msgRowMe: { alignItems: 'flex-end' },
        bubble: { maxWidth: '78%', padding: 12, borderRadius: 16 },
        bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
        bubbleOther: {
            backgroundColor: colors.card, borderBottomLeftRadius: 4,
            shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
        },
        msgText: { fontSize: 14, color: colors.text, lineHeight: 20 },
        msgTextMe: { color: colors.white },
        msgTime: { fontSize: 10, color: colors.textTertiary, marginTop: 4, alignSelf: 'flex-end' },
        msgTimeMe: { color: 'rgba(255,255,255,0.7)' },
        empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 40, transform: [{ scaleY: -1 }] },
        emptyText: { fontSize: 14, color: colors.textTertiary },
        inputBar: {
            flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 90,
            backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.border, gap: 10,
        },
        textInput: {
            flex: 1, backgroundColor: colors.input, borderRadius: 20, paddingHorizontal: 16,
            paddingVertical: 10, fontSize: 14, color: colors.text, maxHeight: 100,
        },
        sendBtn: {
            width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary,
            justifyContent: 'center', alignItems: 'center',
        },
        sendBtnDisabled: { backgroundColor: colors.textTertiary },
    });

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
                    style={[styles.sendBtn, (!message.trim() || isSending) && styles.sendBtnDisabled]}
                    onPress={sendMessage}
                    disabled={!message.trim() || isSending}
                >
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}
