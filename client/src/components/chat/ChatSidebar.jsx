import React, { useState } from 'react';
import { FaSearch, FaPenToSquare } from 'react-icons/fa6';
import ActiveUsersList from './ActiveUsersList';

const ChatSidebar = ({ conversations, selectedId, onSelect, onNewChat, currentUser }) => {
    const [search, setSearch] = useState('');

    return (
        <div className="d-flex flex-column h-100">
            {/* Header */}
            <div className="p-3 d-flex justify-content-between align-items-center">
                <h3 className="fw-bold mb-0">Chats</h3>
                <div className="bg-light rounded-circle p-2 cursor-pointer hover-scale">
                    <FaPenToSquare size={20} />
                </div>
            </div>

            {/* Search */}
            <div className="px-3 mb-3">
                <div className="bg-light rounded-pill px-3 py-2 d-flex align-items-center">
                    <FaSearch className="text-muted me-2" />
                    <input
                        type="text"
                        placeholder="Search Messenger"
                        className="bg-transparent border-0 w-100 no-focus-outline"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Active Users (Horizontal) */}
            <ActiveUsersList currentUser={currentUser} />

            {/* Conversation List */}
            <div className="flex-grow-1 overflow-auto px-2">
                {conversations.map(conv => {
                    const other = conv.participants.find(p => p._id !== currentUser._id) || conv.participants[0];
                    const isActive = selectedId === conv._id;

                    return (
                        <div
                            key={conv._id}
                            className={`d-flex align-items-center p-2 rounded-3 cursor-pointer ${isActive ? 'bg-primary-subtle' : 'hover-bg-light'}`}
                            onClick={() => onSelect(conv)}
                        >
                            <div className="position-relative me-3">
                                <img
                                    src={other.profileImage || 'https://via.placeholder.com/50'}
                                    alt="avatar"
                                    className="rounded-circle"
                                    width={50}
                                    height={50}
                                    style={{objectFit:'cover'}}
                                />
                                {other.isOnline && <span className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle" style={{width: 14, height: 14}}></span>}
                            </div>
                            <div className="flex-grow-1 min-width-0">
                                <h6 className={`mb-0 text-truncate ${conv.unread ? 'fw-bold' : ''}`}>{other.firstName} {other.lastName}</h6>
                                <div className="d-flex justify-content-between">
                                    <small className={`text-truncate ${conv.unread ? 'fw-bold text-dark' : 'text-muted'}`}>
                                        {conv.lastMessage?.content || 'Sent a message'}
                                    </small>
                                    <small className="text-muted ms-2 flex-shrink-0">10:00 AM</small>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ChatSidebar;
