import React from 'react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/uc-central-logo.svg';

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
            {/* Empty div to push content to right if needed, but original code had it on left?
                Actually, standard dashboard usually has user on right.
                If 'justify-content: space-between', and I want it on right, I need a spacer or ms-auto on the item.
                But I will stick to exact HTML structure.
            */}
            <div className="d-flex align-items-center">
                <span className="me-2 fw-bold text-primary" id="nav-user-name">
                    {getDisplayName()}
                </span>
                <img src={logo} className="rounded-3 border border-2 border-primary" width="40" height="40" alt="User" />
            </div>
        </div>
    );
};

export default Navbar;
