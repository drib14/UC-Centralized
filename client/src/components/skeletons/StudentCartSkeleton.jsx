import React from 'react';
import './Skeleton.css';

const StudentCartSkeleton = () => {
    return (
        <div className="skeleton-wrapper">
            <div className="skeleton-header">
                <div className="skeleton-title"></div>
            </div>
            <div className="skeleton-content">
                <div className="skeleton-card" style={{ height: '300px', marginBottom: '20px' }}></div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <div className="skeleton-button"></div>
                    <div className="skeleton-button"></div>
                </div>
            </div>
        </div>
    );
};

export default StudentCartSkeleton;
