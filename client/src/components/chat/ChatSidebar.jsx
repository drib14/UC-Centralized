import React, { useState, useEffect } from 'react';
import { FaSearch, FaPlus, FaVolumeMute, FaSpinner } from 'react-icons/fa';
import { FaUserCircle } from 'react-icons/fa';

const ChatSidebar = ({
    conversations,
    selectedConversation,
    onSelectConversation,
    onNewChat,
    searchTerm,
    setSearchTerm,
    onSearchUser,
    searchResults,
    showNewChatModal,
    setShowNewChatModal,
    newChatSearchTerm,
    setNewChatSearchTerm,
    currentUser
}) => {
    const [isSearching, setIsSearching] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (newChatSearchTerm.trim()) {
                setIsSearching(true);
                onSearchUser(newChatSearchTerm).finally(() => setIsSearching(false));
            } else {
                 onSearchUser(""); // Clear results
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [newChatSearchTerm]); // removed onSearchUser dependency to avoid loop if parent function not memoized

    const getOtherUser = (conversation) => {
        return conversation.participants.find(p => p._id !== currentUser._id) || {};
    };

    const getDisplayName = (user) => {
        if (!user) return "Unknown User";
        return user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : (user.name || "User");
    };

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const safeConversations = Array.isArray(conversations) ? conversations : [];

    const filteredConversations = safeConversations.filter(conv => {
        const other = getOtherUser(conv);
        const name = getDisplayName(other).toLowerCase();
        return name.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="d-flex flex-column h-100 bg-white border-end">
            {/* Header */}
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                <h5 className="mb-0 fw-bold text-primary">Messages</h5>
                <button
                    className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center p-0"
                    style={{ width: '40px', height: '40px' }}
                    onClick={() => setShowNewChatModal(true)}
                    title="New Message"
                >
                    <FaPlus />
                </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 bg-light">
                <div className="input-group">
                    <span className="input-group-text bg-white border-end-0"><FaSearch className="text-muted"/></span>
                    <input
                        type="text"
                        className="form-control border-start-0"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Conversation List */}
            <div className="flex-grow-1 overflow-auto">
                {filteredConversations.length === 0 ? (
                    <div className="text-center text-muted mt-5">
                        <p>No conversations found.</p>
                    </div>
                ) : (
                    <div className="list-group list-group-flush">
                        {filteredConversations.map(conv => {
                            const otherUser = getOtherUser(conv);
                            const isSelected = selectedConversation && selectedConversation._id === conv._id;
                            const isMuted = conv.mutedBy && conv.mutedBy.includes(currentUser._id);

                            return (
                                <div
                                    key={conv._id}
                                    className={`list-group-item list-group-item-action p-3 border-bottom ${isSelected ? 'bg-light border-start border-primary border-4' : ''}`}
                                    onClick={() => onSelectConversation(conv)}
                                    style={{ cursor: 'pointer', borderLeft: isSelected ? '4px solid #0d6efd' : 'none' }}
                                >
                                    <div className="d-flex align-items-center">
                                        <div className="position-relative">
                                            {otherUser.profilePicture ? (
                                                <img
                                                    src={otherUser.profilePicture}
                                                    alt="Profile"
                                                    className="rounded-circle"
                                                    style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <FaUserCircle className="text-secondary" style={{ width: '50px', height: '50px' }} />
                                            )}
                                            {/* Online status indicator could go here */}
                                        </div>
                                        <div className="ms-3 flex-grow-1 overflow-hidden">
                                            <div className="d-flex justify-content-between align-items-baseline">
                                                <h6 className="mb-0 text-truncate fw-bold">{getDisplayName(otherUser)}</h6>
                                                <small className="text-muted ms-2">{formatTime(conv.lastMessage?.createdAt || conv.createdAt)}</small>
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center mt-1">
                                                <p className="mb-0 text-muted text-truncate small" style={{ maxWidth: '85%' }}>
                                                    {conv.lastMessage
                                                        ? (conv.lastMessage.sender === currentUser._id ? 'You: ' : '') +
                                                          (conv.lastMessage.type === 'text' ? conv.lastMessage.content : `Sent a ${conv.lastMessage.type}`)
                                                        : 'Start chatting!'}
                                                </p>
                                                <div className="d-flex align-items-center">
                                                    {isMuted && <FaVolumeMute className="text-muted me-1 small" />}
                                                    {conv.unreadCount > 0 && (
                                                        <span className="badge rounded-pill bg-danger">
                                                            {conv.unreadCount}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* New Chat Modal (Simple Custom Modal) */}
            {showNewChatModal && (
                <div className="modal show d-block modal-animate" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered modal-animate-content">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">New Message</h5>
                                <button type="button" className="btn-close" onClick={() => setShowNewChatModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="input-group mb-3">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search for a student (Name)..."
                                        value={newChatSearchTerm}
                                        onChange={(e) => setNewChatSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                    <span className="input-group-text">
                                        {isSearching ? <FaSpinner className="spinner-border spinner-border-sm" /> : <FaSearch />}
                                    </span>
                                </div>
                                <div className="list-group overflow-auto" style={{ maxHeight: '300px' }}>
                                    {(Array.isArray(searchResults) ? searchResults : []).map(user => (
                                        <button
                                            key={user._id}
                                            className="list-group-item list-group-item-action d-flex align-items-center"
                                            onClick={() => onNewChat(user)}
                                        >
                                            {user.profilePicture ? (
                                                <img
                                                    src={user.profilePicture}
                                                    alt="Profile"
                                                    className="rounded-circle me-3"
                                                    style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <FaUserCircle className="text-secondary me-3" style={{ width: '40px', height: '40px' }} />
                                            )}
                                            <div>
                                                <div className="fw-bold">{getDisplayName(user)}</div>
                                                <div className="small text-muted">{user.department || 'Student'}</div>
                                            </div>
                                        </button>
                                    ))}

                                    {!isSearching && newChatSearchTerm && searchResults && searchResults.length === 0 && (
                                        <div className="text-center text-muted p-3">
                                            No students found matching "{newChatSearchTerm}"
                                        </div>
                                    )}

                                    {!newChatSearchTerm && (
                                        <div className="text-center text-muted p-3">
                                            <p className="small mb-0">Type a name to search for other students to message.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatSidebar;
