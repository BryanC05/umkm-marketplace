import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, ShoppingBag, MessageCircle, Truck, CreditCard, Info } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useNotificationStore } from '../store/notificationStore';
import './Notifications.css';

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'orders', label: 'Orders', types: ['new_order', 'order_status'] },
    { key: 'messages', label: 'Messages', types: ['new_message'] },
    { key: 'payments', label: 'Payments', types: ['payment_update'] },
    { key: 'delivery', label: 'Delivery', types: ['delivery_update'] },
    { key: 'system', label: 'System', types: ['system'] },
];

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

function getNotifIcon(type) {
    switch (type) {
        case 'new_order':
        case 'order_status':
            return { icon: <ShoppingBag size={18} />, className: 'order' };
        case 'new_message':
            return { icon: <MessageCircle size={18} />, className: 'message' };
        case 'payment_update':
            return { icon: <CreditCard size={18} />, className: 'payment' };
        case 'delivery_update':
            return { icon: <Truck size={18} />, className: 'delivery' };
        default:
            return { icon: <Info size={18} />, className: 'system' };
    }
}

function getNotifLink(notif) {
    const data = notif.data || {};
    if (data.orderId) return `/orders`;
    if (data.chatRoomId) return `/chat?room=${data.chatRoomId}`;
    return null;
}

function Notifications() {
    const [activeFilter, setActiveFilter] = useState('all');
    const navigate = useNavigate();
    const { notifications, unreadCount, fetchNotifications, markAsRead, markAllRead } =
        useNotificationStore();

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const filtered = activeFilter === 'all'
        ? notifications
        : notifications.filter((n) => {
            const filterDef = FILTERS.find((f) => f.key === activeFilter);
            return filterDef?.types?.includes(n.type);
        });

    const handleClick = async (notif) => {
        if (!notif.isRead) {
            await markAsRead(notif._id);
        }
        const link = getNotifLink(notif);
        if (link) navigate(link);
    };

    return (
        <>
            <Navbar />
            <div className="notifications-page">
                <div className="notifications-header">
                    <h1>
                        <Bell size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                        Notifications
                    </h1>
                    {unreadCount > 0 && (
                        <button className="mark-all-btn" onClick={markAllRead}>
                            Mark all as read
                        </button>
                    )}
                </div>

                <div className="notification-filters">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            className={`notification-filter-tab ${activeFilter === f.key ? 'active' : ''}`}
                            onClick={() => setActiveFilter(f.key)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="notifications-empty">
                        <BellOff size={48} />
                        <p>No notifications</p>
                    </div>
                ) : (
                    <div className="notifications-list">
                        {filtered.map((notif) => {
                            const { icon, className } = getNotifIcon(notif.type);
                            return (
                                <div
                                    key={notif._id}
                                    className={`notification-card ${!notif.isRead ? 'unread' : ''}`}
                                    onClick={() => handleClick(notif)}
                                >
                                    <div className={`notification-icon ${className}`}>{icon}</div>
                                    <div className="notification-content">
                                        <p className="notification-title">{notif.title}</p>
                                        <p className="notification-message">{notif.message}</p>
                                        <span className="notification-time">{formatTimeAgo(notif.createdAt)}</span>
                                    </div>
                                    {!notif.isRead && <div className="notification-unread-dot" />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}

export default Notifications;
