import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import logo from '../assets/uc-central-logo.png';
import {
    FaTableColumns, FaCalendarDays, FaShirt, FaEnvelope, FaCartShopping, FaUser, FaRightFromBracket,
    FaUsers, FaBullhorn, FaClipboardList, FaCashRegister, FaChevronLeft, FaChevronRight, FaBook
} from 'react-icons/fa6';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { getCount } = useCart();
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
    const iconClass = collapsed ? '' : 'me-2';

    return (
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

            <nav className="nav flex-column mt-3">
                {isAdmin ? (
                    <>
                        <NavLink to="/admin/dashboard" className={navLinkClass} onClick={handleMobileClick}><FaTableColumns className={iconClass} /> <span>Dashboard</span></NavLink>
                        <NavLink to="/admin/users" className={navLinkClass} onClick={handleMobileClick}><FaUsers className={iconClass} /> <span>Users</span></NavLink>
                        <NavLink to="/admin/events" className={navLinkClass} onClick={handleMobileClick}><FaCalendarDays className={iconClass} /> <span>Events</span></NavLink>
                        <NavLink to="/admin/merch" className={navLinkClass} onClick={handleMobileClick}><FaShirt className={iconClass} /> <span>Merch</span></NavLink>
                        <NavLink to="/admin/announcements" className={navLinkClass} onClick={handleMobileClick}><FaBullhorn className={iconClass} /> <span>Announcements</span></NavLink>
                        <NavLink to="/admin/orders" className={navLinkClass} onClick={handleMobileClick}><FaClipboardList className={iconClass} /> <span>Orders</span></NavLink>
                        <NavLink to="/admin/pos" className={navLinkClass} onClick={handleMobileClick}><FaCashRegister className={iconClass} /> <span>POS</span></NavLink>
                        <NavLink to="/admin/messages" className={navLinkClass} onClick={handleMobileClick}><FaEnvelope className={iconClass} /> <span>Messages</span></NavLink>
                    </>
                ) : (
                    <>
                        <NavLink to="/student/dashboard" className={navLinkClass} onClick={handleMobileClick}><FaTableColumns className={iconClass} /> <span>Dashboard</span></NavLink>
                        <NavLink to="/student/events" className={navLinkClass} onClick={handleMobileClick}><FaCalendarDays className={iconClass} /> <span>Events</span></NavLink>
                        <NavLink to="/student/merch" className={navLinkClass} onClick={handleMobileClick}><FaShirt className={iconClass} /> <span>Merch Store</span></NavLink>
                        <NavLink to="/student/messages" className={navLinkClass} onClick={handleMobileClick}><FaEnvelope className={iconClass} /> <span>Messages</span></NavLink>
                        <NavLink to="/student/cart" className={navLinkClass} onClick={handleMobileClick}>
                            <FaCartShopping className={iconClass} /> <span>Cart</span>
                            {!collapsed && <span className={`badge bg-danger ms-auto ${getCount() === 0 ? 'd-none' : ''}`}>{getCount()}</span>}
                        </NavLink>
                        <NavLink to="/student/profile" className={navLinkClass} onClick={handleMobileClick}><FaUser className={iconClass} /> <span>Profile</span></NavLink>
                    </>
                )}
            </nav>

            <div className="sidebar-footer">
                <button className={`nav-link text-danger btn btn-link w-100 border-0 bg-transparent ${collapsed ? 'justify-content-center' : 'text-start'}`} onClick={() => { handleMobileClick(); logout(); }}>
                    <FaRightFromBracket className={iconClass} /> <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
