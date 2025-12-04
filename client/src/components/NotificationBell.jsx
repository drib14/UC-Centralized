import React, { useState, useEffect } from 'react';
import { FaBell } from 'react-icons/fa';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import API from '../utils/api';
import './NotificationBell.css';

const NotificationBell = () => {
    const { user } = useAuth();
    const socket = useSocket();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (user) {
            // Initial Fetch (You might need to create an API endpoint for this if you want persistence)
            // For now, let's assume we start empty or implementing an API get endpoint
             fetchNotifications();
        }
    }, [user]);

    useEffect(() => {
        if (!socket) return;

        socket.on('receive_notification', (data) => {
            // Add new notification to top
            const newNotif = {
                _id: Date.now(), // Temp ID until refresh
                title: data.title,
                message: data.message,
                isRead: false,
                createdAt: new Date().toISOString()
            };
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
        });

        return () => {
            socket.off('receive_notification');
        };
    }, [socket]);

    const fetchNotifications = async () => {
        try {
            const res = await API.get('/users/notifications');
            setNotifications(res.data);
            const unread = res.data.filter(n => !n.isRead).length;
            setUnreadCount(unread);
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen && unreadCount > 0) {
            // Mark all as read logic here
             setUnreadCount(0);
        }
    };

    return (
        <div className="notification-bell-container position-relative">
            <div className="cursor-pointer text-white position-relative" onClick={handleToggle}>
                <FaBell size={20} />
                {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{fontSize: '0.6rem'}}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </div>

            {isOpen && (
                <div className="notification-dropdown shadow bg-white rounded">
                    <div className="p-2 border-bottom fw-bold text-dark d-flex justify-content-between">
                        <span>Notifications</span>
                        <small className="text-primary cursor-pointer" onClick={() => setNotifications([])}>Clear</small>
                    </div>
                    <div className="notification-list" style={{ maxHeight: '300px', overflowY: 'auto', width: '300px' }}>
                        {notifications.length === 0 ? (
                            <div className="p-3 text-center text-muted small">No new notifications</div>
                        ) : (
                            notifications.map((n, i) => (
                                <div key={i} className="p-2 border-bottom hover-bg-light text-dark">
                                    <div className="fw-bold small">{n.title}</div>
                                    <div className="small text-muted text-truncate">{n.message}</div>
                                    <div className="x-small text-muted text-end" style={{fontSize: '0.65rem'}}>
                                        {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-2 text-center bg-light border-top">
                        <Link to="/student/notifications" className="small text-decoration-none" onClick={() => setIsOpen(false)}>View All</Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
