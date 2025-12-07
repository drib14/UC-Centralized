import React, { useState, useEffect } from 'react';
import { FaMagnifyingGlass, FaPlus, FaUser, FaBoxArchive } from 'react-icons/fa6';
import api from '../../utils/api';
import { Modal, Button } from 'react-bootstrap';

const ChatSidebar = ({ conversations, selectedConversation, onSelectConversation, onNewChat, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [showNewChat, setShowNewChat] = useState(false);
    const [userResults, setUserResults] = useState([]);
    const [showArchived, setShowArchived] = useState(false);

    // Filter conversations
    const filteredConversations = conversations.filter(c => {
        const isArchived = c.archivedBy?.includes(currentUser._id);
        if (showArchived && !isArchived) return false;
        if (!showArchived && isArchived) return false;

        const otherUser = c.otherUser || c.participants.find(p => p._id !== currentUser._id);
        const name = otherUser ? (otherUser.firstName + ' ' + otherUser.lastName) : 'Unknown';
        return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleSearchUsers = async (q) => {
        if (!q) { setUserResults([]); return; }
        try {
            const res = await api.get(`/messages/search/users?q=${q}`);
            setUserResults(res.data);
        } catch (err) { console.error(err); }
    };

    const getDisplayName = (conv) => {
        const other = conv.otherUser || conv.participants.find(p => p._id !== currentUser._id);
        if (!other) return "Unknown User";
        // Check for nickname
        if (conv.nicknames && conv.nicknames[other._id]) return conv.nicknames[other._id];
        return `${other.firstName} ${other.lastName}`;
    };

    return (
        <div className="d-flex flex-column h-100">
            {/* Header */}
            <div className="p-3 border-bottom bg-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold text-primary">Messages</h5>
                <div className="d-flex gap-2">
                    <button className={`btn btn-sm ${showArchived ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setShowArchived(!showArchived)} title="Archived">
                        <FaBoxArchive />
                    </button>
                    <button className="btn btn-sm btn-primary rounded-circle" onClick={() => setShowNewChat(true)}>
                        <FaPlus />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="p-3 bg-white">
                <div className="input-group bg-light rounded-pill px-3 py-2 border">
                    <span className="input-group-text bg-transparent border-0 text-muted"><FaMagnifyingGlass /></span>
                    <input
                        type="text"
                        className="form-control bg-transparent border-0 shadow-none"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-grow-1 overflow-auto custom-scrollbar">
                {filteredConversations.length === 0 ? (
                    <div className="text-center text-muted mt-5">
                        <small>{showArchived ? "No archived chats" : "No conversations found"}</small>
                    </div>
                ) : (
                    <div className="list-group list-group-flush">
                        {filteredConversations.map(conv => {
                            const other = conv.otherUser || conv.participants.find(p => p._id !== currentUser._id);
                            const isActive = selectedConversation?._id === conv._id;
                            const isUnread = conv.unreadCount > 0;

                            return (
                                <div
                                    key={conv._id}
                                    className={`list-group-item list-group-item-action p-3 border-0 d-flex align-items-center gap-3 cursor-pointer transition-all ${isActive ? 'bg-primary-subtle border-start border-4 border-primary' : ''}`}
                                    onClick={() => onSelectConversation(conv)}
                                    style={{ transition: 'background-color 0.2s' }}
                                >
                                    <div className="position-relative">
                                        <img
                                            src={other?.profilePicture || "https://via.placeholder.com/40"}
                                            alt="Avatar"
                                            className="rounded-circle object-fit-cover shadow-sm"
                                            width="50" height="50"
                                        />
                                        {other?.isOnline && (
                                            <span className="position-absolute bottom-0 end-0 p-1 bg-success border border-white rounded-circle"></span>
                                        )}
                                    </div>
                                    <div className="flex-grow-1 min-w-0">
                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                            <h6 className={`mb-0 text-truncate ${isUnread ? 'fw-bold text-dark' : 'text-secondary'}`}>
                                                {getDisplayName(conv)}
                                            </h6>
                                            {conv.lastMessage && (
                                                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                    {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                                                </small>
                                            )}
                                        </div>
                                        <p className={`mb-0 text-truncate small ${isUnread ? 'fw-semibold text-dark' : 'text-muted'}`}>
                                            {conv.lastMessage?.type === 'image' && '📷 Image'}
                                            {conv.lastMessage?.type === 'video' && '🎥 Video'}
                                            {conv.lastMessage?.type === 'audio' && '🎤 Audio'}
                                            {conv.lastMessage?.type === 'file' && '📎 File'}
                                            {conv.lastMessage?.type === 'system' && 'System Message'}
                                            {conv.lastMessage?.type === 'text' && conv.lastMessage.content}
                                        </p>
                                    </div>
                                    {isUnread && (
                                        <div className="badge bg-danger rounded-pill">{conv.unreadCount}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* New Chat Modal */}
            <Modal show={showNewChat} onHide={() => setShowNewChat(false)} centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">New Message</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="input-group mb-3">
                        <span className="input-group-text bg-white"><FaMagnifyingGlass /></span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search for students..."
                            onChange={(e) => handleSearchUsers(e.target.value)}
                        />
                    </div>
                    <div className="list-group overflow-auto" style={{ maxHeight: '300px' }}>
                        {userResults.map(u => (
                            <button
                                key={u._id}
                                className="list-group-item list-group-item-action d-flex align-items-center gap-2"
                                onClick={() => { onNewChat(u); setShowNewChat(false); }}
                            >
                                <img src={u.profilePicture || "https://via.placeholder.com/30"} className="rounded-circle" width="30" height="30" alt=""/>
                                <div>
                                    <div className="fw-bold">{u.firstName} {u.lastName}</div>
                                    <small className="text-muted">{u.role}</small>
                                </div>
                            </button>
                        ))}
                    </div>
                </Modal.Body>
            </Modal>
        </div>
    );
};

export default ChatSidebar;
