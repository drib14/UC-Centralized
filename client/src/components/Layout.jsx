import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
    const [collapsed, setCollapsed] = useState(false);

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
            <div id="page-content-wrapper" className={collapsed ? 'collapsed' : ''}>
                {/* Navbar removed as per request to fit content */}
                <div className="container-fluid">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default Layout;
