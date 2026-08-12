import React from 'react';
import './Skeleton.css';

const AdminDepartmentsSkeleton = () => {
    return (
        <div className="container-fluid">
            <div className="skeleton skeleton-title mb-4"></div>
            <div className="row g-3 mb-4">
                <div className="col-md-4"><div className="skeleton" style={{ height: '90px', borderRadius: '12px' }}></div></div>
                <div className="col-md-4"><div className="skeleton" style={{ height: '90px', borderRadius: '12px' }}></div></div>
                <div className="col-md-4"><div className="skeleton" style={{ height: '90px', borderRadius: '12px' }}></div></div>
            </div>
            <div className="skeleton skeleton-table" style={{ height: '350px', borderRadius: '12px' }}></div>
        </div>
    );
};

export default AdminDepartmentsSkeleton;
