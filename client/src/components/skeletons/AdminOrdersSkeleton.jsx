import React from 'react';
import './Skeleton.css';

const AdminOrdersSkeleton = () => {
    return (
        <div className="container-fluid">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-table"></div>
        </div>
    );
};

export default AdminOrdersSkeleton;
