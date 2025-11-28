import React from 'react';
import './Skeleton.css';

const AdminUsersSkeleton = () => {
    return (
        <div className="container-fluid">
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-table"></div>
        </div>
    );
};

export default AdminUsersSkeleton;
