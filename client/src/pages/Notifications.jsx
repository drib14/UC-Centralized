import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { FaBell, FaCheck, FaBullhorn, FaCalendarDays, FaEnvelope, FaTrash } from 'react-icons/fa6';
import { toast } from 'react-toastify';

const Notifications = () => {
    const [notifications, setLocalNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setUnreadCount, socket } = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        loadNotifications();
    }, []);

    // Listen for new notifications while on this page
    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (newNotif) => {
            setLocalNotifications(prev => [newNotif, ...prev]);
            // Count handles itself via context usually, but if we are viewing the list,
            // should it auto-mark read? No, user must click.
        };

        socket.on('new_notification', handleNewNotification);
        socket.on('broadcast_notification', handleNewNotification);

        return () => {
            socket.off('new_notification', handleNewNotification);
            socket.off('broadcast_notification', handleNewNotification);
        };
    }, [socket]);

    const loadNotifications = async () => {
        try {
            const { notifications: data, unreadCount } = await API.getNotifications();
            setLocalNotifications(data);
            setUnreadCount(unreadCount); // Sync global badge
            setLoading(false);
        } catch (err) {
            console.error("Failed to load notifications", err);
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await API.markNotificationRead(id);
            setLocalNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await API.markAllNotificationsRead();
            setLocalNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
            toast.success("All marked as read");
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation(); // Prevent navigation
        try {
            await API.deleteNotification(id);
            const notif = notifications.find(n => n._id === id);
            setLocalNotifications(prev => prev.filter(n => n._id !== id));
            if (notif && !notif.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            toast.success("Notification deleted");
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm("Are you sure you want to delete all notifications?")) return;
        try {
            await API.deleteAllNotifications();
            setLocalNotifications([]);
            setUnreadCount(0);
            toast.success("All notifications deleted");
        } catch (err) {
            console.error(err);
        }
    };

    const handleClick = async (notification) => {
        if (!notification.read) {
            await handleMarkAsRead(notification._id);
        }

        // Redirect logic
        if (notification.type === 'announcement') navigate('/student/dashboard');
        if (notification.type === 'event') navigate('/student/events');
        if (notification.type === 'message') navigate('/student/messages');
        if (notification.type === 'alert' && notification.content.includes('Order')) navigate('/student/cart');
        if (notification.type === 'alert' && notification.content.includes('Low Stock')) navigate('/admin/merch');
    };

    const getIcon = (type) => {
        switch(type) {
            case 'announcement': return <FaBullhorn className="text-warning" />;
            case 'event': return <FaCalendarDays className="text-primary" />;
            case 'message': return <FaEnvelope className="text-success" />;
            default: return <FaBell className="text-secondary" />;
        }
    };

    const getHeader = (type) => {
        switch(type) {
            case 'announcement': return "New Announcement";
            case 'event': return "New Event";
            case 'message': return "New Message";
            case 'alert': return "System Alert";
            default: return "Notification";
        }
    };

    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    };

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4 pt-3">
                <h2 className="text-primary"><FaBell className="me-2" />Notifications</h2>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-primary btn-sm" onClick={handleMarkAllRead}>
                        <FaCheck className="me-1" /> Mark All Read
                    </button>
                    <button className="btn btn-outline-danger btn-sm" onClick={handleDeleteAll}>
                        <FaTrash className="me-1" /> Delete All
                    </button>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="list-group list-group-flush">
                    {loading ? (
                        <div className="text-center p-5">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center p-5 text-muted">No notifications yet.</div>
                    ) : (
                        notifications.map(notification => (
                            <div
                                key={notification._id}
                                className={`list-group-item list-group-item-action p-3 d-flex gap-3 align-items-center ${!notification.read ? 'bg-light border-start border-primary border-4' : ''}`}
                                style={{cursor: 'pointer'}}
                                onClick={() => handleClick(notification)}
                            >
                                {/* Icon */}
                                <div className="fs-3 mt-1 text-secondary p-2 bg-white rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                                    {getIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-grow-1">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <h6 className={`mb-0 ${!notification.read ? 'fw-bold text-dark' : 'text-secondary'}`}>
                                            {getHeader(notification.type)}
                                        </h6>
                                        <small className="text-muted text-nowrap ms-2" style={{fontSize: '0.8rem'}}>
                                            {timeAgo(notification.createdAt)}
                                        </small>
                                    </div>
                                    <p className="mb-0 text-muted small" style={{lineHeight: '1.4'}}>
                                        {notification.content}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="d-flex align-items-center gap-3">
                                    {!notification.read && (
                                        <span className="badge bg-primary rounded-pill" style={{fontSize: '0.7rem'}}>New</span>
                                    )}
                                    <button
                                        className="btn btn-sm btn-outline-danger border-0 rounded-circle p-2 d-flex align-items-center justify-content-center hover-scale"
                                        title="Delete"
                                        onClick={(e) => handleDelete(e, notification._id)}
                                        style={{width: 32, height: 32}}
                                    >
                                        <FaTrash size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notifications;
