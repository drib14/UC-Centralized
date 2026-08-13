import React, { useState } from 'react';
import { FaSearch, FaEdit, FaCircle } from 'react-icons/fa';

const ChatSidebar = ({
    conversations,
    selectedConversation,
    onSelectConversation,
    onNewChat,
    searchTerm,
    setSearchTerm,
    onSearchUser,
    searchResults,
    sidebarUserResults,
    showNewChatModal,
    setShowNewChatModal,
    newChatSearchTerm,
    setNewChatSearchTerm,
    currentUser
}) => {

    // Filter conversations locally for sidebar search
    const filteredConversations = conversations.filter(c => {
        const other = c.otherUser;
        const name = `${other?.firstName || ''} ${other?.lastName || ''} ${other?.name || ''}`.toLowerCase();
        return name.includes(searchTerm.toLowerCase());
    });

    // Filter API results (exclude existing conversations)
    const otherPeople = (sidebarUserResults || []).filter(u =>
        !conversations.some(c => c.otherUser?._id === u._id)
    );

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = diff / (1000 * 60 * 60 * 24);

        if (days < 1) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getInitials = (user) => {
        if (!user) return 'U';
        const f = user.firstName ? user.firstName.charAt(0) : (user.name ? user.name.charAt(0) : '');
        const l = user.lastName ? user.lastName.charAt(0) : (user.name && user.name.includes(' ') ? user.name.split(' ').pop().charAt(0) : '');
        return (f + l).toUpperCase() || 'U';
    };

    return (
        <div className="d-flex flex-column h-100 bg-white w-100" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div className="p-2.5 p-sm-3 border-bottom d-flex align-items-center justify-content-between flex-shrink-0">
                <h5 className="fw-bold mb-0">Messages</h5>
                <button
                    className="btn btn-light btn-sm rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                    style={{ width: '34px', height: '34px' }}
                    onClick={() => setShowNewChatModal(true)}
                    title="New Message"
                >
                    <FaEdit size={14} />
                </button>
            </div>

            {/* Search */}
            <div className="p-2.5 pb-2 p-sm-3 pb-sm-2 flex-shrink-0">
                <div className="input-group">
                    <span className="input-group-text bg-light border-0 py-1.5"><FaSearch className="text-muted" size={13} /></span>
                    <input
                        type="text"
                        className="form-control bg-light border-0 py-1.5"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ fontSize: '0.9rem' }}
                    />
                </div>
            </div>

            {/* Conversation List */}
            <div className="flex-grow-1 overflow-y-auto overflow-x-hidden custom-scrollbar" style={{ minHeight: 0 }}>

                {/* Existing Conversations */}
                {filteredConversations.length > 0 && (
                    <>
                        {searchTerm && <div className="px-3 py-1.5 text-muted small fw-bold bg-light" style={{ fontSize: '0.72rem' }}>CONVERSATIONS</div>}
                        {filteredConversations.map(conv => {
                            const other = conv.otherUser;
                            const isSelected = selectedConversation && selectedConversation._id === conv._id;
                            const isUnread = conv.unreadCount > 0;
                            const isOnline = other?.isOnline;

                            return (
                                <div
                                    key={conv._id}
                                    className={`d-flex align-items-center p-2.5 p-sm-3 cursor-pointer border-bottom-light ${isSelected ? 'bg-primary-subtle' : 'hover-bg-light'}`}
                                    onClick={() => onSelectConversation(conv)}
                                    style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                                >
                                    <div className="position-relative me-2.5 flex-shrink-0">
                                        {other?.profilePicture ? (
                                            <img
                                                src={other.profilePicture}
                                                alt={other.firstName}
                                                className="rounded-circle border"
                                                width="42"
                                                height="42"
                                                style={{ objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div className="rounded-circle border bg-light d-flex align-items-center justify-content-center text-primary fw-bold" style={{width: '42px', height: '42px', fontSize: '13px'}}>
                                                {getInitials(other)}
                                            </div>
                                        )}
                                        {isOnline && (
                                            <span
                                                className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle"
                                                style={{ width: '12px', height: '12px' }}
                                            ></span>
                                        )}
                                    </div>
                                    <div className="flex-grow-1 overflow-hidden">
                                        <div className="d-flex justify-content-between align-items-baseline mb-1">
                                            <h6 className={`mb-0 text-truncate ${isUnread ? 'fw-bold' : ''}`}>
                                                {other?.firstName} {other?.lastName || other?.name}
                                            </h6>
                                            <small className={`${isUnread ? 'text-primary fw-bold' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>
                                                {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ''}
                                            </small>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <p className={`mb-0 text-truncate small ${isUnread ? 'fw-bold text-dark' : 'text-muted'}`} style={{ maxWidth: '85%' }}>
                                                {conv.lastMessage ? (
                                                    <>
                                                        {conv.lastMessage.sender === currentUser._id && "You: "}
                                                        {conv.lastMessage.type === 'text' ? conv.lastMessage.content : `Sent a ${conv.lastMessage.type}`}
                                                    </>
                                                ) : (
                                                    <span className="text-secondary fst-italic">No messages yet</span>
                                                )}
                                            </p>
                                            {isUnread && (
                                                <span className="badge bg-primary rounded-pill">{conv.unreadCount}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}

                {/* Other People (API Results) */}
                {searchTerm && otherPeople.length > 0 && (
                    <>
                        <div className="px-3 py-2 text-muted small fw-bold bg-light">MORE PEOPLE</div>
                        {otherPeople.map(user => (
                            <div
                                key={user._id}
                                className="d-flex align-items-center p-3 cursor-pointer border-bottom-light hover-bg-light"
                                onClick={() => onNewChat(user)}
                                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                            >
                                <div className="position-relative me-3">
                                    {user.profilePicture ? (
                                        <img
                                            src={user.profilePicture}
                                            alt={user.firstName}
                                            className="rounded-circle border"
                                            width="48"
                                            height="48"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div className="rounded-circle border bg-light d-flex align-items-center justify-content-center text-primary fw-bold" style={{width: '48px', height: '48px'}}>
                                            {getInitials(user)}
                                        </div>
                                    )}
                                    {user.isOnline && (
                                        <span
                                            className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle"
                                            style={{ width: '12px', height: '12px' }}
                                        ></span>
                                    )}
                                </div>
                                <div>
                                    <h6 className="mb-0">{user.firstName} {user.lastName || user.name}</h6>
                                    <small className="text-muted text-capitalize">{user.role} • {user.department}</small>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* Empty State */}
                {filteredConversations.length === 0 && (!searchTerm || otherPeople.length === 0) && (
                    <div className="text-center p-4 text-muted">
                        <small>No conversations found</small>
                    </div>
                )}
            </div>

            {/* New Chat Modal (Custom minimal implementation) */}
            {showNewChatModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable mx-2 mx-sm-auto" style={{ maxWidth: '440px' }}>
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="modal-header border-bottom py-2.5 px-3">
                                <h6 className="modal-title fw-bold mb-0">New Message</h6>
                                <button type="button" className="btn-close" onClick={() => setShowNewChatModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Type name or email to search..."
                                        value={newChatSearchTerm}
                                        onChange={(e) => {
                                            setNewChatSearchTerm(e.target.value);
                                            onSearchUser(e.target.value);
                                        }}
                                        autoFocus
                                    />
                                </div>
                                <div className="list-group list-group-flush overflow-auto" style={{ maxHeight: '300px' }}>
                                    {searchResults.length > 0 ? (
                                        searchResults.map(user => (
                                            <button
                                                key={user._id}
                                                className="list-group-item list-group-item-action d-flex align-items-center"
                                                onClick={() => onNewChat(user)}
                                            >
                                                {user.profilePicture ? (
                                                    <img
                                                        src={user.profilePicture}
                                                        alt={user.firstName}
                                                        className="rounded-circle me-3"
                                                        width="32" height="32"
                                                        style={{objectFit: 'cover'}}
                                                    />
                                                ) : (
                                                    <div className="rounded-circle me-3 bg-light border d-flex align-items-center justify-content-center text-primary fw-bold" style={{width: '32px', height: '32px', minWidth: '32px'}}>
                                                        <small>{getInitials(user)}</small>
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="fw-bold">{user.firstName} {user.lastName || user.name}</div>
                                                    <small className="text-muted text-capitalize">{user.role} • {user.department}</small>
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        newChatSearchTerm && <div className="text-center p-3 text-muted">No users found</div>
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
