import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import logo from '../assets/uc-central-logo.svg';
import {
    FaTableColumns, FaCalendarDays, FaShirt, FaEnvelope, FaCartShopping, FaUser, FaRightFromBracket,
    FaUsers, FaBullhorn, FaClipboardList, FaCashRegister, FaChevronLeft, FaChevronRight, FaBook, FaBell,
    FaBuildingColumns
} from 'react-icons/fa6';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { getCount } = useCart();
    const { unreadCount, unreadMessageCount } = useSocket();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileActive, setMobileActive] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        if (window.innerWidth > 768) {
            setCollapsed(isCollapsed);
        }

        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
            if (window.innerWidth <= 768) {
                setCollapsed(false);
            } else {
                setMobileActive(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        if (isMobile) {
            setMobileActive(!mobileActive);
        } else {
            const newState = !collapsed;
            setCollapsed(newState);
            localStorage.setItem('sidebar_collapsed', newState);
            window.dispatchEvent(new Event('sidebarToggle'));
        }
    };

    const handleMobileClick = () => {
        if (isMobile) setMobileActive(false);
    };

    const isAdmin = user?.role === 'admin';
    const navLinkClass = collapsed ? 'nav-link justify-content-center' : 'nav-link';
    const iconClass = collapsed ? '' : 'me-3';

    // Close mobile drawer on escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && mobileActive) {
                setMobileActive(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mobileActive]);

    return (
        <>
            {/* Mobile Floating Toggle Button (visible when mobile drawer is closed) */}
            {isMobile && !mobileActive && (
                <button
                    type="button"
                    className="btn btn-warning shadow d-md-none position-fixed rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                        top: '12px',
                        left: '12px',
                        width: '42px',
                        height: '42px',
                        zIndex: 990,
                        border: '2px solid #ffffff'
                    }}
                    onClick={() => setMobileActive(true)}
                    aria-label="Open Navigation Menu"
                    title="Menu"
                >
                    <FaChevronRight size={16} className="text-dark" />
                </button>
            )}

            {/* Mobile Overlay */}
            {isMobile && mobileActive && (
                <div
                    className="position-fixed top-0 start-0 w-100 h-100 bg-dark opacity-50"
                    style={{ zIndex: 999 }}
                    onClick={handleMobileClick}
                ></div>
            )}

            <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileActive ? 'active' : ''}`} id="sidebar">
                <div className="sidebar-toggle-btn" onClick={toggleSidebar} id="sidebar-toggle">
                    {isMobile
                        ? (mobileActive ? <FaChevronLeft /> : <FaChevronRight />)
                        : (collapsed ? <FaChevronRight /> : <FaChevronLeft />)
                    }
                </div>

                <div className="sidebar-header">
                    <img src={logo} className="logo-img" alt="Logo" />
                    <span className="sidebar-brand-text">UC-Central</span>
                </div>

                <nav className="nav flex-column mt-3 sidebar-nav">
                    {isAdmin ? (
                        <>
                            <NavLink to="/admin/dashboard" className={navLinkClass} onClick={handleMobileClick}><FaTableColumns className={iconClass} /> <span>Dashboard</span></NavLink>
                            <NavLink to="/admin/departments" className={navLinkClass} onClick={handleMobileClick}><FaBuildingColumns className={iconClass} /> <span>Departments</span></NavLink>
                            <NavLink to="/admin/users" className={navLinkClass} onClick={handleMobileClick}><FaUsers className={iconClass} /> <span>Users</span></NavLink>
                            <NavLink to="/admin/events" className={navLinkClass} onClick={handleMobileClick}><FaCalendarDays className={iconClass} /> <span>Events</span></NavLink>
                            <NavLink to="/admin/merch" className={navLinkClass} onClick={handleMobileClick}><FaShirt className={iconClass} /> <span>Merch</span></NavLink>
                            <NavLink to="/admin/announcements" className={navLinkClass} onClick={handleMobileClick}><FaBullhorn className={iconClass} /> <span>Announcements</span></NavLink>
                            <NavLink to="/admin/orders" className={navLinkClass} onClick={handleMobileClick}><FaClipboardList className={iconClass} /> <span>Orders</span></NavLink>
                            <NavLink to="/admin/pos" className={navLinkClass} onClick={handleMobileClick}><FaCashRegister className={iconClass} /> <span>POS</span></NavLink>
                        </>
                    ) : (
                        <>
                            <NavLink to="/student/dashboard" className={navLinkClass} onClick={handleMobileClick}><FaTableColumns className={iconClass} /> <span>Dashboard</span></NavLink>
                            <NavLink to="/student/events" className={navLinkClass} onClick={handleMobileClick}><FaCalendarDays className={iconClass} /> <span>Events</span></NavLink>
                            <NavLink to="/student/merch" className={navLinkClass} onClick={handleMobileClick}><FaShirt className={iconClass} /> <span>Merch Store</span></NavLink>
                            <NavLink to="/student/messages" className={navLinkClass} onClick={handleMobileClick}>
                                <FaEnvelope className={iconClass} /> <span>Messages</span>
                                {!collapsed && unreadMessageCount > 0 && <span className="badge bg-danger ms-auto">{unreadMessageCount}</span>}
                            </NavLink>
                            <NavLink to="/student/notifications" className={navLinkClass} onClick={handleMobileClick}>
                                <FaBell className={iconClass} /> <span>Notifications</span>
                                {!collapsed && unreadCount > 0 && <span className="badge bg-danger ms-auto">{unreadCount}</span>}
                            </NavLink>
                            <NavLink to="/student/cart" className={navLinkClass} onClick={handleMobileClick}>
                                <FaCartShopping className={iconClass} /> <span>Cart</span>
                                {!collapsed && <span className={`badge bg-danger ms-auto ${getCount() === 0 ? 'd-none' : ''}`}>{getCount()}</span>}
                            </NavLink>
                            <NavLink to="/student/profile" className={navLinkClass} onClick={handleMobileClick}><FaUser className={iconClass} /> <span>Profile</span></NavLink>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <button className={`btn w-100 border-0 bg-transparent text-danger d-flex align-items-center ${collapsed ? 'justify-content-center' : 'px-3'}`} onClick={() => { handleMobileClick(); logout(); }} style={{ height: '50px' }}>
                        <FaRightFromBracket className={collapsed ? 'fs-5' : 'me-2 fs-5'} />
                        {!collapsed && <span>Logout</span>}
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
