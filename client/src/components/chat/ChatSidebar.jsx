import React, { useState } from 'react';
import { FaPenToSquare, FaEllipsis, FaTrash, FaBellSlash } from 'react-icons/fa6';
import { FaSearch } from 'react-icons/fa';
import ActiveUsersList from './ActiveUsersList';
import UserAvatar from './UserAvatar';
import { toast } from 'react-toastify';

const ChatSidebar = ({ conversations, selectedId, onSelect, onNewChat, onDeleteConversation, currentUser }) => {
    const [search, setSearch] = useState('');
    const [showMenuId, setShowMenuId] = useState(null);

    const filteredConversations = conversations.filter(c => {
        const other = c.participants.find(p => p._id !== currentUser._id) || c.participants[0];
        const name = `${other.firstName} ${other.lastName}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const handleMenuClick = (e, convId) => {
        e.stopPropagation();
        setShowMenuId(showMenuId === convId ? null : convId);
    };

    const handleDelete = (e, convId) => {
        e.stopPropagation();
        if (!window.confirm("Delete this conversation? It will be hidden until a new message is sent.")) return;
        onDeleteConversation(convId);
        toast.success("Conversation deleted");
        setShowMenuId(null);
    };

    const handleMute = (e, convId) => {
        e.stopPropagation();
        toast.info("Notifications muted for this conversation");
        setShowMenuId(null);
        // Call API here if backend supports per-conversation mute
    };

    return (
        <div className="d-flex flex-column h-100 chat-sidebar-container bg-white border-end">
            {/* Header */}
            <div className="p-3 d-flex justify-content-between align-items-center">
                <h3 className="fw-bold mb-0">Chats</h3>
                <div
                    className="bg-light rounded-circle p-2 cursor-pointer hover-scale"
                    onClick={onNewChat}
                >
                    <FaPenToSquare size={20} />
                </div>
            </div>

            {/* Search */}
            <div className="px-3 mb-3">
                <div className="bg-light rounded-pill px-3 py-2 d-flex align-items-center">
                    <FaSearch className="text-muted me-2" />
                    <input
                        type="text"
                        placeholder="Search Message"
                        className="bg-transparent border-0 w-100 no-focus-outline"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Active Users (Horizontal) */}
            <ActiveUsersList currentUser={currentUser} />

            {/* Conversation List */}
            <div className="flex-grow-1 overflow-auto px-2" onClick={() => setShowMenuId(null)}>
                {filteredConversations.length === 0 && (
                    <div className="text-center text-muted mt-5">No conversations found</div>
                )}
                {filteredConversations.map(conv => {
                    const other = conv.participants.find(p => p._id !== currentUser._id) || conv.participants[0];
                    const isActive = selectedId === conv._id;
                    const isUnread = conv.unread;

                    return (
                        <div
                            key={conv._id}
                            className={`d-flex align-items-center p-2 rounded-3 cursor-pointer position-relative group-hover-trigger ${isActive ? 'bg-primary-subtle' : 'hover-bg-light'}`}
                            onClick={() => onSelect(conv)}
                            style={{ transition: 'background-color 0.2s' }}
                        >
                            <div className="me-3">
                                <UserAvatar
                                    user={other}
                                    size={56}
                                    showOnlineStatus={true}
                                    isOnline={other.isOnline}
                                />
                            </div>

                            <div className="flex-grow-1 min-width-0 pe-4">
                                <h6 className={`mb-0 text-truncate ${isUnread ? 'fw-bold' : ''}`}>
                                    {other.firstName} {other.lastName}
                                </h6>
                                <div className="d-flex justify-content-between align-items-center">
                                    <small className={`text-truncate ${isUnread ? 'fw-bold text-dark' : 'text-muted'}`} style={{maxWidth: '80%'}}>
                                        {conv.lastMessage?.type === 'image' ? 'Sent a photo' :
                                         conv.lastMessage?.type === 'video' ? 'Sent a video' :
                                         conv.lastMessage?.type === 'file' ? 'Sent a file' :
                                         conv.lastMessage?.type === 'audio' ? 'Sent a voice message' :
                                         (conv.lastMessage?.content || 'Started a chat')}
                                    </small>
                                    <small className="text-muted ms-1 flex-shrink-0" style={{fontSize: '0.7rem'}}>
                                        {new Date(conv.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </small>
                                </div>
                            </div>

                            {/* 3-dots Menu */}
                            <div
                                className="position-absolute end-0 top-50 translate-middle-y me-2 p-2 rounded-circle hover-bg-gray d-flex align-items-center justify-content-center"
                                style={{
                                    opacity: showMenuId === conv._id ? 1 : 0,
                                    zIndex: 10,
                                    width: 32,
                                    height: 32
                                }}
                                onClick={(e) => handleMenuClick(e, conv._id)}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                            >
                                <FaEllipsis className="text-muted" />
                            </div>

                            {/* Dropdown Menu */}
                            {showMenuId === conv._id && (
                                <div
                                    className="position-absolute bg-white shadow-lg rounded-3 py-2 z-3"
                                    style={{
                                        top: '60%',
                                        right: '20px',
                                        minWidth: '180px',
                                        border: '1px solid #eee'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="px-3 py-2 hover-bg-light cursor-pointer d-flex align-items-center gap-2" onClick={(e) => handleDelete(e, conv._id)}>
                                        <FaTrash className="text-danger" size={14} />
                                        <span className="text-danger small fw-bold">Delete Chat</span>
                                    </div>
                                    <div className="px-3 py-2 hover-bg-light cursor-pointer d-flex align-items-center gap-2" onClick={(e) => handleMute(e, conv._id)}>
                                        <FaBellSlash className="text-muted" size={14} />
                                        <span className="text-dark small">Mute Notifications</span>
                                    </div>
                                </div>
                            )}

                            {isUnread && (
                                <div className="position-absolute top-50 end-0 translate-middle-y me-3 bg-primary rounded-circle" style={{width: 12, height: 12}}></div>
                            )}
                        </div>
                    );
                })}
            </div>

            <style>{`
                .group-hover-trigger:hover .position-absolute {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    );
};

export default ChatSidebar;
