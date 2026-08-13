import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import logo from '../assets/uc-central-logo.svg';
import {
    FaBars, FaUser, FaRightFromBracket, FaBell
} from 'react-icons/fa6';

const MobileHeader = () => {
    const { user, logout } = useAuth();
    const { unreadCount } = useSocket();
    const location = useLocation();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Do not show on chat page as ChatWindow has its own dedicated back topbar
    if (location.pathname.includes('/messages')) {
        return null;
    }

    if (!user) return null;

    const isAdmin = user.role === 'admin';

    const openSidebar = () => {
        window.dispatchEvent(new Event('openMobileSidebar'));
    };

    const getInitials = () => {
        if (!user) return 'U';
        const f = user.firstName ? user.firstName.charAt(0) : (user.name ? user.name.charAt(0) : '');
        const l = user.lastName ? user.lastName.charAt(0) : (user.name && user.name.includes(' ') ? user.name.split(' ').pop().charAt(0) : '');
        return (f + l).toUpperCase() || 'U';
    };

    const studentName = (user.firstName && user.lastName) ? `${user.firstName} ${user.lastName}` : (user.name || 'User');

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header
            className="mobile-top-header d-md-none sticky-top bg-white border-bottom shadow-xs px-3 py-2"
            style={{
                zIndex: 1035,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                backgroundColor: 'rgba(255, 255, 255, 0.95)'
            }}
        >
            <div className="d-flex align-items-center justify-content-between">
                {/* Left: Menu Hamburger Trigger & Logo */}
                <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-light rounded-circle shadow-xs d-flex align-items-center justify-content-center p-0"
                        style={{ width: '38px', height: '38px' }}
                        onClick={openSidebar}
                        title="Open Menu"
                        aria-label="Open Navigation Menu"
                    >
                        <FaBars size={16} className="text-dark" />
                    </button>

                    <Link to={isAdmin ? "/admin/dashboard" : "/student/dashboard"} className="d-flex align-items-center gap-2 text-decoration-none">
                        <img src={logo} alt="Logo" width="28" height="28" className="rounded-2" />
                        <span className="fw-bold font-outfit text-primary" style={{ fontSize: '1.05rem', letterSpacing: '-0.3px' }}>
                            UC-Central
                        </span>
                    </Link>
                </div>

                {/* Right: Quick Notifications & User Account Dropdown */}
                <div className="d-flex align-items-center gap-2" ref={dropdownRef}>
                    {/* Student Notifications Bell */}
                    {!isAdmin && (
                        <Link
                            to="/student/notifications"
                            className="btn btn-light rounded-circle shadow-xs position-relative d-flex align-items-center justify-content-center p-0 me-1"
                            style={{ width: '36px', height: '36px' }}
                            title="Notifications"
                        >
                            <FaBell size={15} className="text-secondary" />
                            {unreadCount > 0 && (
                                <span
                                    className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white"
                                    style={{ fontSize: '0.55rem', padding: '2px 4px' }}
                                >
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>
                    )}

                    {/* User Profile & Logout Dropdown */}
                    <div className="position-relative">
                        <button
                            type="button"
                            className="btn p-0 rounded-circle border border-2 border-primary border-opacity-25 shadow-xs d-flex align-items-center justify-content-center"
                            style={{ width: '36px', height: '36px', overflow: 'hidden' }}
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            aria-expanded={dropdownOpen}
                            title="Account Settings"
                        >
                            {user.profileImage ? (
                                <img src={user.profileImage} alt={studentName} className="w-100 h-100 object-fit-cover" />
                            ) : (
                                <div className="w-100 h-100 bg-primary text-white fw-bold d-flex align-items-center justify-content-center small" style={{ fontSize: '0.8rem' }}>
                                    {getInitials()}
                                </div>
                            )}
                        </button>

                        {dropdownOpen && (
                            <div
                                className="position-absolute end-0 shadow-lg border bg-white rounded-4 mt-2 p-2 animate-fade-in"
                                style={{ zIndex: 1060, minWidth: '230px', top: '100%' }}
                            >
                                <div className="px-3 py-2 border-bottom">
                                    <div className="fw-bold text-dark text-truncate small">{studentName}</div>
                                    <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                                        {isAdmin ? 'Campus Administrator' : `${user.studentId ? `ID: ${user.studentId}` : (user.department || 'Student')}`}
                                    </div>
                                </div>

                                {!isAdmin && (
                                    <Link
                                        className="dropdown-item small py-2 px-3 d-flex align-items-center rounded-3 mt-1 text-dark"
                                        to="/student/profile"
                                        onClick={() => setDropdownOpen(false)}
                                    >
                                        <FaUser className="me-2 text-primary" size={13} /> My Profile & Records
                                    </Link>
                                )}

                                <hr className="dropdown-divider my-1" />

                                <button
                                    type="button"
                                    className="dropdown-item small py-2 px-3 d-flex align-items-center text-danger rounded-3 fw-semibold w-100 border-0 bg-transparent"
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        logout();
                                    }}
                                >
                                    <FaRightFromBracket className="me-2" size={13} /> Log Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default MobileHeader;
