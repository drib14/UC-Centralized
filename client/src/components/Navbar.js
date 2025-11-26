import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaBell } from 'react-icons/fa';
import API from '../utils/api';
import logo from '../assets/uc-central-logo.png';

const Navbar = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await API.getUserAnnouncements();
                setNotifications(data);
                // For now, we'll consider all fetched notifications as unread.
                // A more robust implementation would track read status.
                setUnreadCount(data.length);
            } catch (error) {
                console.error("Failed to load notifications", error);
            }
        };

        if (user) {
            fetchNotifications();
        }
    }, [user]);

    const getDisplayName = () => {
        if (!user) return 'User';
        if (user.firstName) return `Hi, ${user.firstName}`;
        if (user.name) return `Hi, ${user.name.split(' ')[0]}`;
        return 'Hi, Student';
    };

    return (
        <div className="topbar">
            {/* Empty div to push content to right if needed, but original code had it on left?
                Actually, standard dashboard usually has user on right.
                If 'justify-content: space-between', and I want it on right, I need a spacer or ms-auto on the item.
                But I will stick to exact HTML structure.
            */}
            <div className="d-flex align-items-center">
                <div className="position-relative me-3">
                    <FaBell className="text-primary" size={24} onClick={() => setShowDropdown(!showDropdown)} style={{ cursor: 'pointer' }} />
                    {unreadCount > 0 && (
                        <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                            {unreadCount}
                        </span>
                    )}
                    {showDropdown && (
                        <div className="dropdown-menu dropdown-menu-end show" style={{ position: 'absolute', right: 0, width: '300px' }}>
                            <h6 className="dropdown-header">Notifications</h6>
                            {notifications.length > 0 ? (
                                notifications.map(notif => (
                                    <div key={notif._id} className="dropdown-item">
                                        <strong>{notif.title}</strong>
                                        <p className="mb-0">{notif.message}</p>
                                        <small className="text-muted">{new Date(notif.createdAt).toLocaleString()}</small>
                                    </div>
                                ))
                            ) : (
                                <div className="dropdown-item text-muted">No new notifications</div>
                            )}
                        </div>
                    )}
                </div>
                <span className="me-2 fw-bold text-primary" id="nav-user-name">
                    {getDisplayName()}
                </span>
                <img src={logo} className="rounded-3 border border-2 border-primary" width="40" height="40" alt="User" />
            </div>
        </div>
    );
};

export default Navbar;
