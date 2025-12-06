import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const ActiveUsersList = ({ currentUser }) => {
    const [users, setUsers] = useState([]);
    const { onlineUsers } = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                // Fetch top 50 recent users
                const data = await API.searchUsers('');
                // Filter out current user
                setUsers(data.filter(u => u._id !== currentUser._id));
            } catch (err) {
                console.error("Failed to fetch active users", err);
            }
        };
        fetchUsers();
    }, [currentUser]);

    const handleUserClick = async (user) => {
        try {
            const conv = await API.createConversation(user._id);
            navigate(currentUser.role === 'admin' ? '/admin/messages' : '/student/messages', {
                state: { selectedConversationId: conv._id }
            });
            // Force reload logic if needed, but context should handle it
            // Ideally dispatch an event or use context to set active conversation
            localStorage.setItem('selectedConversationId', conv._id);
            window.dispatchEvent(new Event('storage')); // Trigger update in other components if they listen
        } catch (err) {
            console.error("Failed to open conversation", err);
        }
    };

    const renderAvatar = (user) => {
        const isOnline = onlineUsers.has(user._id) || user.isOnline;
        return (
            <div className="position-relative d-inline-block">
                {user.profileImage ? (
                    <img
                        src={user.profileImage}
                        alt={user.firstName}
                        className="rounded-circle border"
                        width={50}
                        height={50}
                        style={{objectFit: 'cover'}}
                    />
                ) : (
                    <div
                        className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center border"
                        style={{width: 50, height: 50, fontSize: '1.2rem'}}
                    >
                        {user.firstName[0]}
                    </div>
                )}
                {isOnline && (
                    <span
                        className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle"
                        style={{width: 12, height: 12, transform: 'translate(-2px, -2px)'}}
                    ></span>
                )}
            </div>
        );
    };

    if (users.length === 0) return null;

    return (
        <div className="d-md-none bg-white border-bottom pt-3 pb-2 px-3 overflow-hidden">
            <h6 className="text-muted small fw-bold mb-2">Active People</h6>
            <div className="d-flex overflow-auto gap-3 pb-2 no-scrollbar" style={{scrollbarWidth: 'none'}}>
                {users.map(user => (
                    <div
                        key={user._id}
                        className="d-flex flex-column align-items-center flex-shrink-0"
                        style={{width: 60, cursor: 'pointer'}}
                        onClick={() => handleUserClick(user)}
                    >
                        {renderAvatar(user)}
                        <small className="text-truncate mt-1 text-center w-100" style={{fontSize: '0.7rem'}}>
                            {user.firstName}
                        </small>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActiveUsersList;
