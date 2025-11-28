import React from 'react';
import './Skeleton.css';

const AdminPOSSkeleton = () => {
    return (
        <div className="skeleton-wrapper">
            <div className="skeleton-header">
                <div className="skeleton-title"></div>
                <div className="skeleton-button"></div>
            </div>
            <div className="skeleton-content" style={{ display: 'flex', gap: '20px' }}>
                 <div style={{ width: '65%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                        <div key={n} className="skeleton-card" style={{ height: '200px' }}></div>
                    ))}
                 </div>
                 <div style={{ width: '35%', height: '500px' }} className="skeleton-card"></div>
            </div>
        </div>
    );
};

export default AdminPOSSkeleton;
