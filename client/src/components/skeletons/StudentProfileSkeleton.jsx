import React from 'react';
import './Skeleton.css';

const StudentProfileSkeleton = () => {
    return (
        <div className="skeleton-wrapper">
            <div className="skeleton-header">
                <div className="skeleton-title"></div>
            </div>
            <div className="skeleton-content" style={{ display: 'flex', gap: '20px', flexDirection: 'column' }}>
                <div className="skeleton-card" style={{ height: '200px', display: 'flex', alignItems: 'center', padding: '20px' }}>
                    <div className="skeleton-circle" style={{ width: '100px', height: '100px', marginRight: '20px' }}></div>
                    <div style={{ flex: 1 }}>
                        <div className="skeleton-text" style={{ width: '50%', marginBottom: '10px' }}></div>
                        <div className="skeleton-text" style={{ width: '30%' }}></div>
                    </div>
                </div>
                <div className="skeleton-card" style={{ height: '300px' }}></div>
            </div>
        </div>
    );
};

export default StudentProfileSkeleton;
