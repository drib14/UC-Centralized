import React from 'react';
import './Skeleton.css';

const AdminEventsSkeleton = () => {
    return (
        <div className="container-fluid">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-card" style={{ height: '100px' }}></div>
            <div className="skeleton skeleton-table" style={{ height: '300px' }}></div>
        </div>
    );
};

export default AdminEventsSkeleton;
