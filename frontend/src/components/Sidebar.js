import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import logo from '../assets/uc-central-logo.png';
import {
    FaTableColumns, FaCalendarDays, FaShirt, FaEnvelope, FaCartShopping, FaUser, FaRightFromBracket,
    FaUsers, FaBullhorn, FaClipboardList, FaCashRegister, FaChevronLeft, FaChevronRight
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

    const isAdmin = user?.role === 'admin';

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
                        <NavLink to="/admin/dashboard" className="nav-link"><FaTableColumns /> <span>Dashboard</span></NavLink>
                        <NavLink to="/admin/users" className="nav-link"><FaUsers /> <span>Users</span></NavLink>
                        <NavLink to="/admin/events" className="nav-link"><FaCalendarDays /> <span>Events</span></NavLink>
                        <NavLink to="/admin/merch" className="nav-link"><FaShirt /> <span>Merch</span></NavLink>
                        <NavLink to="/admin/announcements" className="nav-link"><FaBullhorn /> <span>Announcements</span></NavLink>
                        <NavLink to="/admin/orders" className="nav-link"><FaClipboardList /> <span>Orders</span></NavLink>
                        <NavLink to="/admin/pos" className="nav-link"><FaCashRegister /> <span>POS</span></NavLink>
                        <NavLink to="/admin/messages" className="nav-link"><FaEnvelope /> <span>Messages</span></NavLink>
                    </>
                ) : (
                    <>
                        <NavLink to="/student/dashboard" className="nav-link"><FaTableColumns /> <span>Dashboard</span></NavLink>
                        <NavLink to="/student/events" className="nav-link"><FaCalendarDays /> <span>Events</span></NavLink>
                        <NavLink to="/student/merch" className="nav-link"><FaShirt /> <span>Merch Store</span></NavLink>
                        <NavLink to="/student/messages" className="nav-link"><FaEnvelope /> <span>Messages</span></NavLink>
                        <NavLink to="/student/cart" className="nav-link">
                            <FaCartShopping /> <span>Cart</span>
                            {!collapsed && <span className={`badge bg-danger ms-auto ${getCount() === 0 ? 'd-none' : ''}`}>{getCount()}</span>}
                        </NavLink>
                        <NavLink to="/student/profile" className="nav-link"><FaUser /> <span>Profile</span></NavLink>
                    </>
                )}
            </nav>

            <div className="sidebar-footer">
                <a href="#" className="nav-link text-danger" onClick={(e) => { e.preventDefault(); logout(); }}>
                    <FaRightFromBracket /> <span>Logout</span>
                </a>
            </div>
        </div>
    );
};

export default Sidebar;
