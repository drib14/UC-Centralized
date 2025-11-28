import React from 'react';
import './Skeleton.css';

const AdminMerchSkeleton = () => {
    return (
        <div className="container-fluid">
            <div className="skeleton skeleton-title"></div>
            <div className="row">
                {[...Array(4)].map((_, i) => (
                    <div className="col-md-3" key={i}>
                        <div className="skeleton skeleton-card" style={{ height: '250px' }}></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminMerchSkeleton;
