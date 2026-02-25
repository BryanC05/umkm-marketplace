import { create } from 'zustand';
import api from '../api/api';

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,

    fetchNotifications: async () => {
        try {
            const res = await api.get('/notifications');
            set({ notifications: res.data });
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    },

    fetchUnreadCount: async () => {
        try {
            const res = await api.get('/notifications/unread-count');
            set({ unreadCount: res.data.count });
        } catch (err) {
            console.error('Failed to fetch unread count:', err);
        }
    },

    markAsRead: async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            set((state) => ({
                notifications: state.notifications.map((n) =>
                    n._id === id ? { ...n, isRead: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    },

    markAllRead: async () => {
        try {
            await api.put('/notifications/read-all');
            set((state) => ({
                notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
                unreadCount: 0,
            }));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    },

    addNotification: (notification) => {
        set((state) => ({
            notifications: [notification, ...state.notifications].slice(0, 50),
            unreadCount: state.unreadCount + 1,
        }));
    },
}));
