import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import UserAvatar from './UserAvatar';

const ActiveUsersList = ({ currentUser }) => {
    const [users, setUsers] = useState([]);
    const { onlineUsers } = useSocket();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
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
            localStorage.setItem('selectedConversationId', conv._id);
            navigate(currentUser.role === 'admin' ? '/admin/messages' : '/student/messages', {
                state: { selectedConversationId: conv._id }
            });
            window.dispatchEvent(new Event('chat_selection_change'));
        } catch (err) {
            console.error("Failed to open conversation", err);
        }
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
                        <UserAvatar
                            user={user}
                            size={50}
                            showOnlineStatus={true}
                            isOnline={onlineUsers.has(user._id) || user.isOnline}
                        />
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
