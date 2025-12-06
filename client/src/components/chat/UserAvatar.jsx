import React from 'react';

const UserAvatar = ({ user, size = 40, className = "", showOnlineStatus = false, isOnline = false }) => {
    if (!user) return <div style={{width: size, height: size}} className={`bg-secondary rounded-circle ${className}`}></div>;

    const initials = user.firstName ? user.firstName.charAt(0).toUpperCase() : '?';

    return (
        <div className={`position-relative d-inline-block ${className}`} style={{ width: size, height: size }}>
            {user.profileImage ? (
                <img
                    src={user.profileImage}
                    alt={user.firstName}
                    className="rounded-circle object-fit-cover w-100 h-100 border"
                />
            ) : (
                <div
                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold w-100 h-100 border"
                    style={{ fontSize: size * 0.4 }}
                >
                    {initials}
                </div>
            )}
            {showOnlineStatus && isOnline && (
                <span
                    className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle"
                    style={{ width: size * 0.25, height: size * 0.25 }}
                ></span>
            )}
        </div>
    );
};

export default UserAvatar;
