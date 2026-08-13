import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSocket } from '../context/SocketContext';
import {
    FaTableColumns, FaCalendarDays, FaShirt, FaEnvelope,
    FaCartShopping, FaUser, FaCashRegister, FaClipboardList,
    FaUsers
} from 'react-icons/fa6';

const MobileNav = () => {
    const { user } = useAuth();
    const { getCount } = useCart();
    const { unreadMessageCount } = useSocket();
    const location = useLocation();

    if (!user) return null;

    const isAdmin = user.role === 'admin';
    const cartCount = getCount();

    return (
        <nav
            className="mobile-bottom-nav d-md-none position-fixed bottom-0 start-0 end-0 bg-white border-top shadow-lg"
            style={{
                zIndex: 1040,
                height: '62px',
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}
            aria-label="Mobile Navigation"
        >
            <div className="d-flex align-items-center justify-content-around h-100 px-1">
                {isAdmin ? (
                    <>
                        <NavLink
                            to="/admin/dashboard"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <FaTableColumns size={18} />
                            <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>Home</span>
                        </NavLink>

                        <NavLink
                            to="/admin/pos"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <FaCashRegister size={18} />
                            <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>POS</span>
                        </NavLink>

                        <NavLink
                            to="/admin/orders"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <FaClipboardList size={18} />
                            <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>Orders</span>
                        </NavLink>

                        <NavLink
                            to="/admin/messages"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 position-relative ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <div className="position-relative">
                                <FaEnvelope size={18} />
                                {unreadMessageCount > 0 && (
                                    <span
                                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                                        style={{ fontSize: '0.55rem', padding: '2px 4px' }}
                                    >
                                        {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>Chat</span>
                        </NavLink>

                        <NavLink
                            to="/admin/merch"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <FaShirt size={18} />
                            <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>Merch</span>
                        </NavLink>

                        <NavLink
                            to="/admin/users"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <FaUsers size={18} />
                            <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>Users</span>
                        </NavLink>
                    </>
                ) : (
                    <>
                        <NavLink
                            to="/student/dashboard"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <FaTableColumns size={18} />
                            <span style={{ fontSize: '0.68rem', marginTop: '2px' }}>Home</span>
                        </NavLink>

                        <NavLink
                            to="/student/events"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <FaCalendarDays size={18} />
                            <span style={{ fontSize: '0.68rem', marginTop: '2px' }}>Events</span>
                        </NavLink>

                        <NavLink
                            to="/student/merch"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <FaShirt size={18} />
                            <span style={{ fontSize: '0.68rem', marginTop: '2px' }}>Store</span>
                        </NavLink>

                        <NavLink
                            to="/student/messages"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 position-relative ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <div className="position-relative">
                                <FaEnvelope size={18} />
                                {unreadMessageCount > 0 && (
                                    <span
                                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                                        style={{ fontSize: '0.55rem', padding: '2px 4px' }}
                                    >
                                        {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '0.68rem', marginTop: '2px' }}>Chat</span>
                        </NavLink>

                        <NavLink
                            to="/student/cart"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 position-relative ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <div className="position-relative">
                                <FaCartShopping size={18} />
                                {cartCount > 0 && (
                                    <span
                                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                                        style={{ fontSize: '0.55rem', padding: '2px 4px' }}
                                    >
                                        {cartCount > 9 ? '9+' : cartCount}
                                    </span>
                                )}
                            </div>
                            <span style={{ fontSize: '0.68rem', marginTop: '2px' }}>Cart</span>
                        </NavLink>

                        <NavLink
                            to="/student/profile"
                            className={({ isActive }) => `mobile-nav-item d-flex flex-column align-items-center justify-content-center text-decoration-none py-1 flex-grow-1 ${isActive ? 'text-primary fw-bold active' : 'text-secondary'}`}
                        >
                            <FaUser size={18} />
                            <span style={{ fontSize: '0.68rem', marginTop: '2px' }}>Profile</span>
                        </NavLink>
                    </>
                )}
            </div>
        </nav>
    );
};

export default MobileNav;
