import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ShoppingBag, MessageCircle, Truck, CreditCard, Info, BellOff } from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import './NotificationBell.css';

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
            return { icon: <ShoppingBag size={16} />, className: 'order' };
        case 'new_message':
            return { icon: <MessageCircle size={16} />, className: 'message' };
        case 'payment_update':
            return { icon: <CreditCard size={16} />, className: 'payment' };
        case 'delivery_update':
            return { icon: <Truck size={16} />, className: 'delivery' };
        default:
            return { icon: <Info size={16} />, className: 'system' };
    }
}

function getNotifLink(notif) {
    const data = notif.data || {};
    if (data.orderId) return `/orders`;
    if (data.chatRoomId) return `/chat?room=${data.chatRoomId}`;
    return '/notifications';
}

function NotificationBell() {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllRead,
    } = useNotificationStore();

    useEffect(() => {
        if (open) {
            fetchNotifications();
        }
    }, [open, fetchNotifications]);

    const handleClickNotif = async (notif) => {
        if (!notif.isRead) {
            await markAsRead(notif._id);
        }
        setOpen(false);
        navigate(getNotifLink(notif));
    };

    const displayNotifs = notifications.slice(0, 10);

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
                className="notification-bell"
                onClick={() => setOpen(!open)}
                aria-label="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="notification-badge">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <>
                    <div className="notification-overlay" onClick={() => setOpen(false)} />
                    <div className="notification-dropdown">
                        <div className="notification-dropdown-header">
                            <h3>Notifications</h3>
                            {unreadCount > 0 && (
                                <button onClick={() => markAllRead()}>Mark all read</button>
                            )}
                        </div>

                        <div className="notification-dropdown-list">
                            {displayNotifs.length === 0 ? (
                                <div className="notification-empty">
                                    <BellOff size={32} />
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                displayNotifs.map((notif) => {
                                    const { icon, className } = getNotifIcon(notif.type);
                                    return (
                                        <div
                                            key={notif._id}
                                            className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                                            onClick={() => handleClickNotif(notif)}
                                        >
                                            <div className={`notification-icon ${className}`}>
                                                {icon}
                                            </div>
                                            <div className="notification-content">
                                                <p className="notification-title">{notif.title}</p>
                                                <p className="notification-message">{notif.message}</p>
                                                <span className="notification-time">
                                                    {formatTimeAgo(notif.createdAt)}
                                                </span>
                                            </div>
                                            {!notif.isRead && <div className="notification-unread-dot" />}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="notification-dropdown-footer">
                                <Link to="/notifications" onClick={() => setOpen(false)}>
                                    View all notifications
                                </Link>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default NotificationBell;
