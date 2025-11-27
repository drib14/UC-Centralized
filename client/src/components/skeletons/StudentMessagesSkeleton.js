import React from 'react';
import './Skeleton.css';

const StudentMessagesSkeleton = () => {
    return (
        <div className="skeleton-wrapper">
            <div className="skeleton-header">
                <div className="skeleton-title"></div>
            </div>
             <div className="skeleton-content" style={{ display: 'flex', gap: '20px' }}>
                <div style={{ width: '30%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} className="skeleton-card" style={{ height: '60px' }}></div>
                    ))}
                </div>
                <div style={{ width: '70%', height: '400px' }} className="skeleton-card"></div>
            </div>
        </div>
    );
};

export default StudentMessagesSkeleton;
