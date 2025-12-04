import React from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import logo from '../assets/uc-central-logo.png';

const Navbar = () => {
    const { user } = useAuth();

    const getDisplayName = () => {
        if (!user) return 'User';
        if (user.firstName) return `Hi, ${user.firstName}`;
        if (user.name) return `Hi, ${user.name.split(' ')[0]}`;
        return 'Hi, Student';
    };

    return (
        <div className="topbar">
            <div className="d-flex align-items-center justify-content-end w-100">
                <div className="me-3">
                    <NotificationBell />
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
