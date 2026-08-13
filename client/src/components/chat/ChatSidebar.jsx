import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    FaSearch, FaEdit, FaTimes, FaCircle, FaPlus,
    FaVolumeMute, FaImage, FaVideo, FaMicrophone, FaFile, FaCheck, FaCheckDouble,
    FaArrowLeft
} from 'react-icons/fa';

const ChatSidebar = ({
    conversations = [],
    selectedConversation,
    onSelectConversation,
    onNewChat,
    searchTerm,
    setSearchTerm,
    onSearchUser,
    searchResults = [],
    sidebarUserResults = [],
    showNewChatModal,
    setShowNewChatModal,
    newChatSearchTerm,
    setNewChatSearchTerm,
    currentUser
}) => {
    const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread' | 'online'

    // Compute online and unread counts
    const unreadCountTotal = useMemo(() => {
        return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    }, [conversations]);

    const onlineConversations = useMemo(() => {
        return conversations.filter(c => c.otherUser?.isOnline);
    }, [conversations]);

    // Filter conversations locally for sidebar search and active tab
    const filteredConversations = useMemo(() => {
        return conversations.filter(c => {
            const other = c.otherUser;
            const name = `${other?.firstName || ''} ${other?.lastName || ''} ${other?.name || ''}`.toLowerCase();
            const matchesSearch = !searchTerm.trim() || name.includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (filterTab === 'unread') {
                return (c.unreadCount || 0) > 0;
            }
            if (filterTab === 'online') {
                return !!other?.isOnline;
            }
            return true;
        });
    }, [conversations, searchTerm, filterTab]);

    // Filter API results (exclude existing conversations)
    const otherPeople = useMemo(() => {
        return (sidebarUserResults || []).filter(u =>
            !conversations.some(c => c.otherUser?._id === u._id) && u._id !== currentUser?._id
        );
    }, [sidebarUserResults, conversations, currentUser]);

    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getInitials = (user) => {
        if (!user) return 'U';
        const f = user.firstName ? user.firstName.charAt(0) : (user.name ? user.name.charAt(0) : '');
        const l = user.lastName ? user.lastName.charAt(0) : (user.name && user.name.includes(' ') ? user.name.split(' ').pop().charAt(0) : '');
        return (f + l).toUpperCase() || 'U';
    };

    const renderLastMessagePreview = (conv) => {
        const lastMsg = conv.lastMessage;
        if (!lastMsg) return <span className="text-secondary fst-italic">No messages yet</span>;

        const isOwn = lastMsg.sender === currentUser?._id;
        const prefix = isOwn ? 'You: ' : '';

        if (lastMsg.type === 'image') {
            return <span>{prefix}<FaImage className="me-1 text-primary" size={11} /> Photo</span>;
        }
        if (lastMsg.type === 'video') {
            return <span>{prefix}<FaVideo className="me-1 text-danger" size={11} /> Video</span>;
        }
        if (lastMsg.type === 'audio' || lastMsg.type === 'voice') {
            return <span>{prefix}<FaMicrophone className="me-1 text-info" size={11} /> Voice note</span>;
        }
        if (lastMsg.type === 'document' || lastMsg.type === 'file') {
            return <span>{prefix}<FaFile className="me-1 text-secondary" size={11} /> Attachment</span>;
        }
        return <span>{prefix}{lastMsg.content || 'Message'}</span>;
    };

    const homeRoute = currentUser?.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';

    return (
        <div className="d-flex flex-column h-100 bg-white w-100 position-relative" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
            {/* Topbar Header */}
            <div className="p-3 border-bottom d-flex align-items-center justify-content-between flex-shrink-0 bg-white">
                <div className="d-flex align-items-center gap-2">
                    <Link
                        to={homeRoute}
                        className="btn btn-sm btn-light border rounded-circle shadow-xs d-flex align-items-center justify-content-center d-md-none me-1 hover-lift"
                        style={{ width: '36px', height: '36px' }}
                        title="Back to Home Dashboard"
                    >
                        <FaArrowLeft size={14} className="text-secondary" />
                    </Link>
                    <h5 className="fw-bold font-outfit text-dark mb-0">Messages</h5>
                    {unreadCountTotal > 0 && (
                        <span className="badge rounded-pill bg-primary px-2 py-0.5 text-white fw-bold" style={{ fontSize: '0.72rem' }}>
                            {unreadCountTotal} new
                        </span>
                    )}
                </div>
                <button
                    className="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center hover-lift"
                    style={{ width: '36px', height: '36px' }}
                    onClick={() => setShowNewChatModal(true)}
                    title="Start New Chat"
                >
                    <FaEdit size={15} className="text-primary" />
                </button>
            </div>

            {/* Search Input with Clear Button */}
            <div className="px-3 pt-2.5 pb-2 flex-shrink-0 bg-white">
                <div className="position-relative d-flex align-items-center">
                    <span className="position-absolute start-0 ms-3 text-muted" style={{ pointerEvents: 'none' }}>
                        <FaSearch size={13} />
                    </span>
                    <input
                        type="text"
                        className="form-control border-0 bg-light rounded-pill ps-5 pe-5 py-2"
                        placeholder="Search chats or people..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ fontSize: '0.875rem' }}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            className="btn btn-link text-muted position-absolute end-0 me-2 p-1 d-flex align-items-center justify-content-center"
                            onClick={() => setSearchTerm('')}
                            title="Clear search"
                        >
                            <FaTimes size={13} />
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Tabs (All / Unread / Online) */}
            {!searchTerm && (
                <div className="px-3 py-1.5 d-flex gap-1.5 flex-shrink-0 overflow-x-auto no-scrollbar border-bottom bg-white">
                    <button
                        type="button"
                        className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold text-nowrap transition-all ${filterTab === 'all' ? 'btn-primary shadow-sm' : 'btn-light text-secondary'}`}
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setFilterTab('all')}
                    >
                        All ({conversations.length})
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold text-nowrap transition-all ${filterTab === 'unread' ? 'btn-primary shadow-sm' : 'btn-light text-secondary'}`}
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setFilterTab('unread')}
                    >
                        Unread {unreadCountTotal > 0 && `(${unreadCountTotal})`}
                    </button>
                    <button
                        type="button"
                        className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold text-nowrap transition-all ${filterTab === 'online' ? 'btn-primary shadow-sm' : 'btn-light text-secondary'}`}
                        style={{ fontSize: '0.75rem' }}
                        onClick={() => setFilterTab('online')}
                    >
                        Online {onlineConversations.length > 0 && `(${onlineConversations.length})`}
                    </button>
                </div>
            )}

            {/* Online Quick Carousel (Only when not actively searching) */}
            {!searchTerm && filterTab === 'all' && onlineConversations.length > 0 && (
                <div className="py-2.5 px-3 border-bottom bg-light bg-opacity-50 flex-shrink-0">
                    <div className="d-flex align-items-center gap-3 overflow-x-auto no-scrollbar py-1">
                        {/* New Chat Bubble */}
                        <div
                            className="d-flex flex-column align-items-center cursor-pointer flex-shrink-0"
                            onClick={() => setShowNewChatModal(true)}
                            style={{ width: '56px', cursor: 'pointer' }}
                        >
                            <div
                                className="rounded-circle border border-2 border-primary border-dashed d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary shadow-sm"
                                style={{ width: '44px', height: '44px' }}
                            >
                                <FaPlus size={14} />
                            </div>
                            <span className="small text-muted mt-1 text-truncate text-center w-100" style={{ fontSize: '0.68rem' }}>
                                New
                            </span>
                        </div>

                        {/* Online Users List */}
                        {onlineConversations.map(conv => {
                            const other = conv.otherUser;
                            return (
                                <div
                                    key={conv._id}
                                    className="d-flex flex-column align-items-center cursor-pointer flex-shrink-0"
                                    onClick={() => onSelectConversation(conv)}
                                    style={{ width: '56px', cursor: 'pointer' }}
                                    title={`${other?.firstName} is active now`}
                                >
                                    <div className="position-relative">
                                        {other?.profilePicture ? (
                                            <img
                                                src={other.profilePicture}
                                                alt={other.firstName}
                                                className="rounded-circle border border-2 border-success object-fit-cover shadow-sm"
                                                style={{ width: '44px', height: '44px' }}
                                            />
                                        ) : (
                                            <div
                                                className="rounded-circle border border-2 border-success bg-white d-flex align-items-center justify-content-center text-primary fw-bold shadow-sm"
                                                style={{ width: '44px', height: '44px', fontSize: '13px' }}
                                            >
                                                {getInitials(other)}
                                            </div>
                                        )}
                                        <span
                                            className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle animate-pulse"
                                            style={{ width: '12px', height: '12px' }}
                                        />
                                    </div>
                                    <span className="small text-dark fw-medium mt-1 text-truncate text-center w-100" style={{ fontSize: '0.68rem' }}>
                                        {other?.firstName || 'User'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Conversation Tiles List */}
            <div className="flex-grow-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white chat-sidebar-scroll" style={{ minHeight: 0, paddingBottom: '80px' }}>
                {filteredConversations.length > 0 ? (
                    <>
                        {searchTerm && (
                            <div className="px-3 py-2 text-muted small fw-bold bg-light" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                                CONVERSATIONS ({filteredConversations.length})
                            </div>
                        )}
                        {filteredConversations.map(conv => {
                            const other = conv.otherUser;
                            const isSelected = selectedConversation && selectedConversation._id === conv._id;
                            const isUnread = (conv.unreadCount || 0) > 0;
                            const isOnline = other?.isOnline;
                            const isMuted = conv.mutedBy?.includes(currentUser?._id);

                            return (
                                <div
                                    key={conv._id}
                                    className={`d-flex align-items-center p-3 cursor-pointer border-bottom-light transition-all ${isSelected ? 'bg-primary-subtle border-start border-3 border-primary' : 'hover-bg-light'}`}
                                    onClick={() => onSelectConversation(conv)}
                                    style={{ cursor: 'pointer', minHeight: '68px' }}
                                >
                                    {/* User Avatar with Online Badge */}
                                    <div className="position-relative me-3 flex-shrink-0">
                                        {other?.profilePicture ? (
                                            <img
                                                src={other.profilePicture}
                                                alt={other.firstName || "User"}
                                                className="rounded-circle border object-fit-cover shadow-sm"
                                                style={{ width: '46px', height: '46px' }}
                                            />
                                        ) : (
                                            <div
                                                className="rounded-circle border bg-light d-flex align-items-center justify-content-center text-primary fw-bold shadow-sm"
                                                style={{ width: '46px', height: '46px', fontSize: '14px' }}
                                            >
                                                {getInitials(other)}
                                            </div>
                                        )}
                                        {isOnline && (
                                            <span
                                                className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle shadow-sm"
                                                style={{ width: '13px', height: '13px' }}
                                            />
                                        )}
                                    </div>

                                    {/* Conversation Content Details */}
                                    <div className="flex-grow-1 min-w-0 overflow-hidden">
                                        <div className="d-flex justify-content-between align-items-baseline mb-1">
                                            <h6 className={`mb-0 text-truncate ${isUnread ? 'fw-bold text-dark' : 'fw-semibold text-dark'}`} style={{ fontSize: '0.9rem', maxWidth: '70%' }}>
                                                {other?.firstName} {other?.lastName || other?.name}
                                            </h6>
                                            <span className={`small text-nowrap ${isUnread ? 'text-primary fw-bold' : 'text-muted'}`} style={{ fontSize: '0.72rem' }}>
                                                {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ''}
                                            </span>
                                        </div>

                                        <div className="d-flex justify-content-between align-items-center gap-2">
                                            <p className={`mb-0 text-truncate small ${isUnread ? 'fw-bold text-dark' : 'text-muted'}`} style={{ fontSize: '0.8rem', maxWidth: '85%' }}>
                                                {renderLastMessagePreview(conv)}
                                            </p>
                                            <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                                {isMuted && <FaVolumeMute size={11} className="text-muted" title="Muted" />}
                                                {isUnread && (
                                                    <span className="badge bg-primary rounded-pill px-2 py-0.5 text-white fw-bold shadow-sm" style={{ fontSize: '0.7rem' }}>
                                                        {conv.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                ) : (
                    !searchTerm && (
                        <div className="d-flex flex-column align-items-center justify-content-center p-5 text-center text-muted">
                            <div className="display-4 mb-2 opacity-50">💬</div>
                            <h6 className="fw-bold text-dark mb-1">No conversations yet</h6>
                            <p className="small text-muted mb-3" style={{ maxWidth: '240px' }}>
                                Tap below to start chatting with students and staff.
                            </p>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm rounded-pill px-3 py-1.5 fw-semibold shadow-sm"
                                onClick={() => setShowNewChatModal(true)}
                            >
                                Start a Conversation
                            </button>
                        </div>
                    )
                )}

                {/* More People (Live Directory Search Results) */}
                {searchTerm && otherPeople.length > 0 && (
                    <>
                        <div className="px-3 py-2 text-muted small fw-bold bg-light" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                            DIRECTORY USERS ({otherPeople.length})
                        </div>
                        {otherPeople.map(user => (
                            <div
                                key={user._id}
                                className="d-flex align-items-center p-3 cursor-pointer border-bottom-light hover-bg-light transition-all"
                                onClick={() => onNewChat(user)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="position-relative me-3 flex-shrink-0">
                                    {user.profilePicture ? (
                                        <img
                                            src={user.profilePicture}
                                            alt={user.firstName}
                                            className="rounded-circle border object-fit-cover shadow-sm"
                                            style={{ width: '44px', height: '44px' }}
                                        />
                                    ) : (
                                        <div
                                            className="rounded-circle border bg-light d-flex align-items-center justify-content-center text-primary fw-bold shadow-sm"
                                            style={{ width: '44px', height: '44px', fontSize: '13px' }}
                                        >
                                            {getInitials(user)}
                                        </div>
                                    )}
                                    {user.isOnline && (
                                        <span
                                            className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
                                            style={{ width: '12px', height: '12px' }}
                                        />
                                    )}
                                </div>
                                <div className="flex-grow-1 min-w-0 overflow-hidden">
                                    <h6 className="mb-0 text-dark fw-bold text-truncate" style={{ fontSize: '0.875rem' }}>
                                        {user.firstName} {user.lastName || user.name}
                                    </h6>
                                    <small className="text-muted text-capitalize d-block text-truncate" style={{ fontSize: '0.75rem' }}>
                                        {user.role || 'Student'} {user.department ? `• ${user.department}` : ''}
                                    </small>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-outline-primary btn-sm rounded-pill px-2.5 py-1 text-nowrap flex-shrink-0"
                                    style={{ fontSize: '0.75rem' }}
                                >
                                    Message
                                </button>
                            </div>
                        ))}
                    </>
                )}

                {/* Empty Search State */}
                {searchTerm && filteredConversations.length === 0 && otherPeople.length === 0 && (
                    <div className="text-center p-4 text-muted">
                        <div className="display-6 mb-2 opacity-50">🔍</div>
                        <h6 className="fw-semibold mb-1">No results found</h6>
                        <small className="text-muted">No users or messages match "{searchTerm}"</small>
                    </div>
                )}
            </div>

            {/* Mobile Floating Action Button (FAB) */}
            <button
                type="button"
                className="d-md-none position-absolute end-0 me-3 btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center hover-lift"
                style={{ width: '52px', height: '52px', bottom: '76px', zIndex: 1020 }}
                onClick={() => setShowNewChatModal(true)}
                title="New Message"
            >
                <FaPlus size={18} />
            </button>

            {/* New Chat Modal / Mobile Bottom Drawer */}
            {showNewChatModal && (
                <div
                    className="modal show d-block animate-fade-in"
                    tabIndex="-1"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(4px)', zIndex: 1080 }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable mx-2 mx-sm-auto" style={{ maxWidth: '440px' }}>
                        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                            {/* Modal Header */}
                            <div className="modal-header border-bottom py-3 px-3.5 bg-white d-flex align-items-center justify-content-between">
                                <h6 className="modal-title fw-bold text-dark mb-0 font-outfit">New Conversation</h6>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => {
                                        setShowNewChatModal(false);
                                        setNewChatSearchTerm('');
                                    }}
                                />
                            </div>

                            {/* Modal Body & Search Input */}
                            <div className="modal-body p-3 bg-white">
                                <div className="position-relative mb-3">
                                    <span className="position-absolute start-0 ms-3 top-50 translate-middle-y text-muted" style={{ pointerEvents: 'none' }}>
                                        <FaSearch size={13} />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control border bg-light rounded-pill ps-5 pe-4 py-2"
                                        placeholder="Search by name, student ID, or email..."
                                        value={newChatSearchTerm}
                                        onChange={(e) => {
                                            setNewChatSearchTerm(e.target.value);
                                            onSearchUser(e.target.value);
                                        }}
                                        autoFocus
                                        style={{ fontSize: '0.875rem' }}
                                    />
                                    {newChatSearchTerm && (
                                        <button
                                            type="button"
                                            className="btn btn-link text-muted position-absolute end-0 top-50 translate-middle-y me-2 p-1"
                                            onClick={() => {
                                                setNewChatSearchTerm('');
                                                onSearchUser('');
                                            }}
                                        >
                                            <FaTimes size={13} />
                                        </button>
                                    )}
                                </div>

                                {/* User Search Results List */}
                                <div className="list-group list-group-flush overflow-auto custom-scrollbar" style={{ maxHeight: '340px' }}>
                                    {searchResults.length > 0 ? (
                                        searchResults.map(user => (
                                            <button
                                                key={user._id}
                                                type="button"
                                                className="list-group-item list-group-item-action d-flex align-items-center p-2.5 rounded-3 border-0 mb-1 hover-bg-light transition-all"
                                                onClick={() => onNewChat(user)}
                                            >
                                                <div className="position-relative me-3 flex-shrink-0">
                                                    {user.profilePicture ? (
                                                        <img
                                                            src={user.profilePicture}
                                                            alt={user.firstName}
                                                            className="rounded-circle border object-fit-cover shadow-sm"
                                                            style={{ width: '40px', height: '40px' }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="rounded-circle border bg-light d-flex align-items-center justify-content-center text-primary fw-bold shadow-sm"
                                                            style={{ width: '40px', height: '40px', fontSize: '13px' }}
                                                        >
                                                            {getInitials(user)}
                                                        </div>
                                                    )}
                                                    {user.isOnline && (
                                                        <span
                                                            className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle"
                                                            style={{ width: '11px', height: '11px' }}
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex-grow-1 min-w-0 text-start">
                                                    <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.875rem' }}>
                                                        {user.firstName} {user.lastName || user.name}
                                                    </div>
                                                    <small className="text-muted text-capitalize d-block text-truncate" style={{ fontSize: '0.75rem' }}>
                                                        {user.role || 'Student'} {user.department ? `• ${user.department}` : ''}
                                                    </small>
                                                </div>
                                            </button>
                                        ))
                                    ) : newChatSearchTerm ? (
                                        <div className="text-center py-4 text-muted">
                                            <div className="small mb-1">No users found matching "{newChatSearchTerm}"</div>
                                            <small className="opacity-75">Check spelling or search by student ID</small>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 text-muted">
                                            <div className="small mb-1">Type to search for classmates, faculty, or staff</div>
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
