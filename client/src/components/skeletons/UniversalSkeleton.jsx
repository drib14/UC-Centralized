import React from 'react';
import './Skeleton.css';

const UniversalSkeleton = () => {
    return (
        <div className="container-fluid mt-4">
            <div className="skeleton-wrapper">
                <div className="skeleton-header">
                    <div className="skeleton-title"></div>
                </div>
                <div className="skeleton-content" style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                    <div className="skeleton-card" style={{ height: '200px' }}></div>
                    <div className="skeleton-card" style={{ height: '300px' }}></div>
                </div>
            </div>
        </div>
    );
};

export default UniversalSkeleton;
