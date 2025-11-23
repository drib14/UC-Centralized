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

    const handleMobileClick = () => {
        if (isMobile) setMobileActive(false);
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
                        <NavLink to="/admin/dashboard" className="nav-link" onClick={handleMobileClick}><FaTableColumns className="me-2" /> <span>Dashboard</span></NavLink>
                        <NavLink to="/admin/users" className="nav-link" onClick={handleMobileClick}><FaUsers className="me-2" /> <span>Users</span></NavLink>
                        <NavLink to="/admin/events" className="nav-link" onClick={handleMobileClick}><FaCalendarDays className="me-2" /> <span>Events</span></NavLink>
                        <NavLink to="/admin/merch" className="nav-link" onClick={handleMobileClick}><FaShirt className="me-2" /> <span>Merch</span></NavLink>
                        <NavLink to="/admin/announcements" className="nav-link" onClick={handleMobileClick}><FaBullhorn className="me-2" /> <span>Announcements</span></NavLink>
                        <NavLink to="/admin/orders" className="nav-link" onClick={handleMobileClick}><FaClipboardList className="me-2" /> <span>Orders</span></NavLink>
                        <NavLink to="/admin/pos" className="nav-link" onClick={handleMobileClick}><FaCashRegister className="me-2" /> <span>POS</span></NavLink>
                        <NavLink to="/admin/messages" className="nav-link" onClick={handleMobileClick}><FaEnvelope className="me-2" /> <span>Messages</span></NavLink>
                    </>
                ) : (
                    <>
                        <NavLink to="/student/dashboard" className="nav-link" onClick={handleMobileClick}><FaTableColumns className="me-2" /> <span>Dashboard</span></NavLink>
                        <NavLink to="/student/events" className="nav-link" onClick={handleMobileClick}><FaCalendarDays className="me-2" /> <span>Events</span></NavLink>
                        <NavLink to="/student/merch" className="nav-link" onClick={handleMobileClick}><FaShirt className="me-2" /> <span>Merch Store</span></NavLink>
                        <NavLink to="/student/messages" className="nav-link" onClick={handleMobileClick}><FaEnvelope className="me-2" /> <span>Messages</span></NavLink>
                        <NavLink to="/student/cart" className="nav-link" onClick={handleMobileClick}>
                            <FaCartShopping className="me-2" /> <span>Cart</span>
                            {!collapsed && <span className={`badge bg-danger ms-auto ${getCount() === 0 ? 'd-none' : ''}`}>{getCount()}</span>}
                        </NavLink>
                        <NavLink to="/student/profile" className="nav-link" onClick={handleMobileClick}><FaUser className="me-2" /> <span>Profile</span></NavLink>
                    </>
                )}
            </nav>

            <div className="sidebar-footer">
                <button className="nav-link text-danger btn btn-link text-start w-100 border-0 bg-transparent" onClick={() => { handleMobileClick(); logout(); }}>
                    <FaRightFromBracket className="me-2" /> <span>Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
