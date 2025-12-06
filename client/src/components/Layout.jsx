import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const isChatPage = location.pathname.includes('/messages');

    useEffect(() => {
        const checkState = () => {
             const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
             // Only apply collapsed class on desktop
             if (window.innerWidth > 768) {
                setCollapsed(isCollapsed);
             } else {
                 setCollapsed(false);
             }
        };

        checkState();

        const handleToggle = () => {
             checkState();
        };

        window.addEventListener('sidebarToggle', handleToggle);
        window.addEventListener('resize', checkState);

        return () => {
            window.removeEventListener('sidebarToggle', handleToggle);
            window.removeEventListener('resize', checkState);
        };
    }, []);

    return (
        <div id="wrapper">
            <Sidebar />
            <div id="page-content-wrapper" className={`${collapsed ? 'collapsed' : ''} ${isChatPage ? 'chat-page-wrapper' : ''}`} style={isChatPage ? { height: '100dvh', overflow: 'hidden' } : {}}>
                {/* Navbar removed as per request to fit content */}
                <div className={isChatPage ? 'h-100 p-0' : 'container-fluid'}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Layout;
