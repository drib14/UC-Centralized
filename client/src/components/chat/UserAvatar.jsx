import React from 'react';

const UserAvatar = ({ user, size = 40, className = '', showOnlineStatus = false, isOnline = false }) => {
    if (!user) return null;

    const initials = `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase();

    // Generate a consistent background color based on name
    const colors = ['#003399', '#FFCC00', '#dc3545', '#198754', '#0d6efd', '#6610f2', '#fd7e14', '#20c997'];
    const colorIndex = (user.firstName?.length + user.lastName?.length) % colors.length || 0;
    const bgColor = colors[colorIndex];
    const textColor = ['#FFCC00', '#ffffff'].includes(bgColor) ? '#000' : '#fff'; // Contrast adjustment (simplified)

    return (
        <div className={`position-relative d-inline-block ${className}`} style={{ width: size, height: size, minWidth: size }}>
            {user.profileImage ? (
                <img
                    src={user.profileImage}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="rounded-circle border"
                    width={size}
                    height={size}
                    style={{ objectFit: 'cover', width: size, height: size }}
                />
            ) : (
                <div
                    className="rounded-circle d-flex align-items-center justify-content-center border"
                    style={{
                        width: size,
                        height: size,
                        backgroundColor: bgColor,
                        color: '#fff',
                        fontSize: size * 0.4,
                        fontWeight: 'bold'
                    }}
                >
                    {initials || '?'}
                </div>
            )}

            {showOnlineStatus && isOnline && (
                <span
                    className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle"
                    style={{
                        width: Math.max(10, size * 0.25),
                        height: Math.max(10, size * 0.25),
                        borderWidth: '2px'
                    }}
                ></span>
            )}
        </div>
    );
};

export default UserAvatar;
