import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  Send,
  MessageCircle,
  Store,
  User,
  ShoppingBag,
  MoreVertical,
  Phone,
  Check,
  CheckCheck
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { getBackendUrl } from '../config';
import Layout from '@/components/layout/Layout';
import './Chat.css';

const SOCKET_URL = getBackendUrl();

function Chat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const [activeRoom, setActiveRoom] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [socketMessages, setSocketMessages] = useState([]);
  const [typingUser, setTypingUser] = useState(null);

  const roomId = searchParams.get('room');
  const sellerId = searchParams.get('seller');
  const orderId = searchParams.get('order');
  const fromPage = searchParams.get('from');
  const productId = searchParams.get('productId');

  // Store return URL when entering from a product page
  useEffect(() => {
    if (fromPage === 'product' && productId) {
      sessionStorage.setItem('chatReturnUrl', `/product/${productId}`);
    }
  }, [fromPage, productId]);

  // Get return URL for back button
  const getReturnUrl = () => {
    return sessionStorage.getItem('chatReturnUrl') || '/';
  };

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Create or get direct chat room
  const createDirectRoomMutation = useMutation({
    mutationFn: async (sellerId) => {
      const response = await api.post('/chat/rooms/direct', { sellerId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms', user?.id] });
      navigate(`/chat?room=${data._id}`);
    },
  });

  // Create or get order chat room
  const createOrderRoomMutation = useMutation({
    mutationFn: async (orderId) => {
      const response = await api.post('/chat/rooms', { orderId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms', user?.id] });
      navigate(`/chat?room=${data._id}`);
    },
  });

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to chat server');
      setConnectionStatus('connected');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setConnectionStatus('error');
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Disconnected from chat server:', reason);
      setConnectionStatus('disconnected');
    });

    socketRef.current.on('receive-message', (message) => {
      setSocketMessages(prev => [...prev, message]);
      setTimeout(scrollToBottom, 100);
    });

    socketRef.current.on('user-typing', (data) => {
      setTypingUser(data);
      setTimeout(() => setTypingUser(null), 3000);
    });

    socketRef.current.on('new-message-notification', () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms', user?.id] });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [queryClient, scrollToBottom]);

  // Join room when active room changes
  useEffect(() => {
    if (socketRef.current && activeRoom) {
      socketRef.current.emit('join-room', activeRoom._id);

      return () => {
        socketRef.current.emit('leave-room', activeRoom._id);
      };
    }
  }, [activeRoom]);

  // Fetch chat rooms
  const { data: chatRooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['chatRooms', user?.id],
    queryFn: async () => {
      const response = await api.get('/chat/rooms');
      return response.data;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Fetch messages for active room
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', activeRoom?._id],
    queryFn: async () => {
      if (!activeRoom) return [];
      const response = await api.get(`/chat/rooms/${activeRoom._id}/messages`);
      return response.data;
    },
    enabled: !!activeRoom,
    refetchInterval: 5000,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      const response = await api.post(`/chat/rooms/${activeRoom._id}/messages`, {
        content,
        messageType: 'text'
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (socketRef.current) {
        socketRef.current.emit('send-message', {
          roomId: activeRoom._id,
          message: data
        });
      }
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['messages', activeRoom._id] });
      queryClient.invalidateQueries({ queryKey: ['chatRooms', user?.id] });
    },
  });

  // Initialize room from URL params
  useEffect(() => {
    if (roomId && chatRooms) {
      const room = chatRooms.find(r => r._id === roomId);
      if (room) {
        setActiveRoom(room);
      }
    } else if (sellerId && user?.role === 'buyer') {
      createDirectRoomMutation.mutate(sellerId);
    } else if (orderId) {
      createOrderRoomMutation.mutate(orderId);
    }
  }, [roomId, sellerId, orderId, chatRooms, user?.role]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeRoom) return;

    sendMessageMutation.mutate(messageInput);
  };

  const handleTyping = () => {
    if (socketRef.current && activeRoom) {
      socketRef.current.emit('typing', { roomId: activeRoom._id });
    }
  };

  const getOtherParticipant = (room) => {
    if (!user || !room) return null;
    return user.role === 'buyer' ? room.seller : room.buyer;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const allMessages = [...(messages || []), ...socketMessages];
  const combinedMessages = allMessages.sort((a, b) =>
    new Date(a.createdAt) - new Date(b.createdAt)
  );

  // Group messages by date
  const groupedMessages = combinedMessages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (!user) {
    return (
      <Layout>
        <div className="chat-page container py-12 flex justify-center">
          <div className="chat-auth-required text-center p-8 border rounded-lg bg-card shadow-sm max-w-md w-full">
            <MessageCircle size={48} className="mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">Please Login</h2>
            <p className="text-muted-foreground mb-6">You need to be logged in to access chat</p>
            <button onClick={() => navigate('/login')} className="btn-primary w-full py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              Login
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="chat-page h-[calc(100vh-theme(spacing.16))] flex overflow-hidden">
        {/* Chat List Sidebar */}
        <div className={`chat-sidebar w-full md:w-80 lg:w-96 border-r flex flex-col bg-background ${activeRoom ? 'hidden md:flex' : 'flex'}`}>
          <div className="chat-sidebar-header p-4 border-b flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-2">
              <button className="back-button md:hidden p-2 hover:bg-muted rounded-full" onClick={() => {
                const returnUrl = getReturnUrl();
                sessionStorage.removeItem('chatReturnUrl');
                navigate(returnUrl);
              }}>
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-xl font-bold">Messages</h2>
            </div>
            <span className="chat-count bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">{chatRooms?.length || 0}</span>
          </div>

          <div className="chat-rooms-list flex-1 overflow-y-auto">
            {roomsLoading ? (
              <div className="chat-loading p-4 text-center text-muted-foreground">Loading chats...</div>
            ) : chatRooms?.length === 0 ? (
              <div className="chat-empty p-8 text-center flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle size={48} className="mb-4 opacity-20" />
                <p className="font-medium mb-1">No messages yet</p>
                <span className="text-sm">Start chatting with sellers!</span>
              </div>
            ) : (
              chatRooms?.map((room) => {
                const other = getOtherParticipant(room);
                const isActive = activeRoom?._id === room._id;

                return (
                  <div
                    key={room._id}
                    className={`chat-room-item p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors flex gap-3 items-start ${isActive ? 'bg-muted/30 border-l-4 border-l-primary' : ''} ${room.unreadCount > 0 ? 'bg-blue-50/50' : ''}`}
                    onClick={() => {
                      setActiveRoom(room);
                      setSocketMessages([]);
                      navigate(`/chat?room=${room._id}`, { replace: true });
                    }}
                  >
                    <div className="chat-room-avatar relative shrink-0">
                      {other?.profileImage ? (
                        <img src={other.profileImage} alt={other.businessName || other.name} className="w-12 h-12 rounded-full object-cover border" />
                      ) : (
                        <div className="avatar-placeholder w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground border">
                          {room.chatType === 'order' ? <ShoppingBag size={20} /> : <Store size={20} />}
                        </div>
                      )}
                      {room.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs flex items-center justify-center rounded-full ring-2 ring-background font-bold">{room.unreadCount}</span>
                      )}
                    </div>

                    <div className="chat-room-info flex-1 min-w-0">
                      <div className="chat-room-header flex justify-between items-baseline mb-1">
                        <h4 className="font-semibold truncate pr-2">{other?.businessName || other?.name}</h4>
                        <span className="chat-time text-xs text-muted-foreground shrink-0">
                          {room.lastMessage ? formatTime(room.lastMessage.createdAt) : ''}
                        </span>
                      </div>

                      <div className="chat-room-preview flex justify-between items-end">
                        <p className="text-sm text-muted-foreground truncate pr-2">{room.lastMessage?.content || 'Start a conversation'}</p>
                      </div>

                      {room.chatType === 'order' && room.order && (
                        <span className="chat-type-badge inline-flex items-center gap-1 text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded mt-1">
                          <ShoppingBag size={10} /> Order #{room.order._id?.slice(-6)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Chat Area */}
        <div className={`chat-main flex-1 flex flex-col bg-background ${!activeRoom ? 'hidden md:flex' : 'flex'}`}>
          {!activeRoom ? (
            <div className="chat-empty-state flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/10">
              <MessageCircle size={64} className="mb-4 opacity-20" />
              <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
              <p>Choose a chat from the sidebar to start messaging</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="chat-header p-3 border-b flex items-center justify-between bg-card z-10 shadow-sm">
                <div className="flex items-center gap-3">
                  <button
                    className="back-button-mobile md:hidden p-2 hover:bg-muted rounded-full"
                    onClick={() => {
                      setActiveRoom(null);
                      navigate('/chat', { replace: true });
                    }}
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div className="chat-header-info flex items-center gap-3">
                    <div className="chat-header-avatar">
                      {getOtherParticipant(activeRoom)?.profileImage ? (
                        <img
                          src={getOtherParticipant(activeRoom).profileImage}
                          alt={getOtherParticipant(activeRoom)?.businessName}
                          className="w-10 h-10 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border text-muted-foreground">
                          <Store size={20} />
                        </div>
                      )}
                    </div>

                    <div className="chat-header-details">
                      <h3 className="font-semibold leading-tight">{getOtherParticipant(activeRoom)?.businessName || getOtherParticipant(activeRoom)?.name}</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="chat-status flex items-center gap-1 text-muted-foreground">
                          {activeRoom.chatType === 'order' ? (
                            <><ShoppingBag size={12} /> Order Chat</>
                          ) : (
                            <><Store size={12} /> Store Chat</>
                          )}
                        </span>
                        {connectionStatus !== 'connected' && (
                          <span className={`connection-status ${connectionStatus} px-1.5 py-0.5 rounded text-[10px] ${connectionStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {connectionStatus === 'error' ? '⚠️ Connection error' : '📡 Connecting...'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="chat-header-actions flex gap-1">
                  <button className="btn-icon p-2 hover:bg-muted rounded-full text-muted-foreground">
                    <Phone size={20} />
                  </button>
                  <button className="btn-icon p-2 hover:bg-muted rounded-full text-muted-foreground">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="chat-messages flex-1 overflow-y-auto p-4 bg-muted/20 space-y-6">
                {messagesLoading ? (
                  <div className="chat-loading text-center text-muted-foreground py-8">Loading messages...</div>
                ) : (
                  Object.entries(groupedMessages).map(([date, dateMessages]) => (
                    <div key={date} className="message-group">
                      <div className="message-date-divider flex justify-center mb-4">
                        <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">{formatDate(date)}</span>
                      </div>

                      <div className="space-y-4">
                        {dateMessages.map((message, index) => {
                          const isMine = message.sender._id === user._id;
                          const showAvatar = index === 0 || dateMessages[index - 1].sender._id !== message.sender._id;

                          return (
                            <div
                              key={message._id || index}
                              className={`message flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                              {!isMine && (
                                <div className="message-avatar w-8 h-8 shrink-0 flex items-end">
                                  {showAvatar ? (
                                    message.sender.profileImage ? (
                                      <img src={message.sender.profileImage} alt={message.sender.name} className="w-8 h-8 rounded-full object-cover border" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border text-muted-foreground text-xs">
                                        <User size={14} />
                                      </div>
                                    )
                                  ) : <div className="w-8" />}
                                </div>
                              )}

                              <div className={`message-content max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${isMine ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card border rounded-bl-none'}`}>
                                <div className="message-bubble text-sm">
                                  <p>{message.content}</p>
                                </div>
                                <div className={`message-meta flex justify-end items-center gap-1 text-[10px] mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                  <span className="message-time">{formatTime(message.createdAt)}</span>
                                  {isMine && (
                                    <span className="message-status">
                                      {message.isRead ? (
                                        <CheckCheck size={12} className="opacity-100" />
                                      ) : (
                                        <Check size={12} className="opacity-70" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}

                {typingUser && (
                  <div className="typing-indicator flex items-center gap-2 text-xs text-muted-foreground ml-10">
                    <div className="typing-bubble flex gap-1 bg-muted px-2 py-1.5 rounded-full">
                      <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                    <span>{typingUser.userName} is typing...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form className="chat-input-area p-4 bg-background border-t" onSubmit={handleSendMessage}>
                <div className="chat-input-wrapper flex items-center gap-2 bg-muted p-2 rounded-full border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleTyping}
                    placeholder="Type a message..."
                    disabled={sendMessageMutation.isPending}
                    className="flex-1 bg-transparent border-none focus:outline-none px-4 text-sm"
                  />
                  <button
                    type="submit"
                    className="btn-send w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default Chat;
