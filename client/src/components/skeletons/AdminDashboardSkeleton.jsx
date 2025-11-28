import React from 'react';
import './Skeleton.css';

const AdminDashboardSkeleton = () => {
    return (
        <div className="container-fluid">
            <div className="skeleton-text skeleton-title"></div>

            <div className="row g-4 mb-4">
                {[...Array(4)].map((_, i) => (
                    <div className="col-md-3" key={i}>
                        <div className="skeleton skeleton-card"></div>
                    </div>
                ))}
            </div>

            <div className="row">
                <div className="col-lg-8">
                    <div className="skeleton skeleton-table"></div>
                </div>
                <div className="col-lg-4">
                    <div className="skeleton skeleton-card"></div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardSkeleton;
