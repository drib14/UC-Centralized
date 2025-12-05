import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { FaBell, FaCheck, FaBullhorn, FaCalendarDays, FaEnvelope } from 'react-icons/fa6';

const Notifications = () => {
    const [notifications, setLocalNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const { setUnreadCount } = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const { notifications: data, unreadCount } = await API.getNotifications();
            setLocalNotifications(data);
            setUnreadCount(unreadCount);
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
        } catch (err) {
            console.error(err);
        }
    };

    const handleClick = async (notification) => {
        if (!notification.read) {
            await handleMarkAsRead(notification._id);
        }

        // Redirect logic
        if (notification.type === 'announcement') navigate('/student/dashboard'); // Or specific announcement page if exists
        if (notification.type === 'event') navigate('/student/events');
        if (notification.type === 'message') navigate('/student/messages');
    };

    const getIcon = (type) => {
        switch(type) {
            case 'announcement': return <FaBullhorn className="text-warning" />;
            case 'event': return <FaCalendarDays className="text-primary" />;
            case 'message': return <FaEnvelope className="text-success" />;
            default: return <FaBell className="text-secondary" />;
        }
    };

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4 pt-3">
                <h2 className="text-primary"><FaBell className="me-2" />Notifications</h2>
                <button className="btn btn-outline-primary btn-sm" onClick={handleMarkAllRead}>
                    <FaCheck className="me-1" /> Mark All Read
                </button>
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
                                className={`list-group-item list-group-item-action p-3 d-flex gap-3 align-items-start ${!notification.read ? 'bg-light border-start border-primary border-4' : ''}`}
                                style={{cursor: 'pointer'}}
                                onClick={() => handleClick(notification)}
                            >
                                <div className="fs-4 mt-1">
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-grow-1">
                                    <div className="d-flex justify-content-between">
                                        <h6 className={`mb-1 ${!notification.read ? 'fw-bold' : ''}`}>
                                            {notification.content}
                                        </h6>
                                        <small className="text-muted text-nowrap ms-2">
                                            {new Date(notification.createdAt).toLocaleDateString()}
                                        </small>
                                    </div>
                                    <p className="mb-0 text-muted small">Click to view details</p>
                                </div>
                                {!notification.read && <span className="badge bg-primary rounded-circle p-1" style={{width:10, height:10}}> </span>}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notifications;
