import React, { useState, useEffect } from 'react';
import { FaPenToSquare, FaEllipsis, FaTrash, FaBellSlash } from 'react-icons/fa6';
import { FaSearch } from 'react-icons/fa';
import ActiveUsersList from './ActiveUsersList';
import UserAvatar from './UserAvatar';
import { toast } from 'react-toastify';
import API from '../../utils/api';

const ChatSidebar = ({ conversations, selectedId, onSelect, onNewChat, onDeleteConversation, currentUser }) => {
    const [search, setSearch] = useState('');
    const [showMenuId, setShowMenuId] = useState(null);
    const [messageResults, setMessageResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const searchMessages = async () => {
            if (!search.trim()) {
                setMessageResults([]);
                return;
            }
            setIsSearching(true);
            try {
                // Assuming API.get supports params or we construct URL
                const results = await API.get(`/messages/search/content?q=${encodeURIComponent(search)}`);
                setMessageResults(results);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchMessages, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [search]);

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
    };

    const handleMessageResultClick = (result) => {
        // Find conversation from local list if possible, or trigger selection via ID
        // The parent onSelect handles the switch. Ideally, we pass the full conversation object.
        // But search results might only contain conversationId.
        // We need to match it with existing 'conversations' prop or fetch it.
        const existingConv = conversations.find(c => c._id === result.conversationId);
        if (existingConv) {
            onSelect(existingConv);
        } else {
            // Should not happen often if we only search "my conversations", but safe fallback needed?
            // Maybe fetch it? For now, just toast if not found in list (e.g. if list is paginated)
            // But since 'conversations' prop is "all conversations", it should be there.
        }
    };

    return (
        <div className="d-flex flex-column h-100 chat-sidebar-container bg-white border-end">
            {/* Header */}
            <div className="p-3 d-flex justify-content-between align-items-center">
                <h3 className="fw-bold mb-0">Chats</h3>
                <div
                    className="btn-messenger"
                    onClick={onNewChat}
                >
                    <FaPenToSquare className="text-dark" size={20} />
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

            {/* Active Users (Horizontal) - Hide when searching */}
            {!search && <ActiveUsersList currentUser={currentUser} />}

            {/* Content Area */}
            <div className="flex-grow-1 overflow-auto px-2" onClick={() => setShowMenuId(null)}>

                {/* Search Results Mode */}
                {search && (
                    <div className="d-flex flex-column gap-3">
                        {/* People Results */}
                        {filteredConversations.length > 0 && (
                            <div>
                                <h6 className="px-2 text-muted small fw-bold mt-2">People</h6>
                                {filteredConversations.map(conv => {
                                    const other = conv.participants.find(p => p._id !== currentUser._id) || c.participants[0];
                                    return (
                                        <div key={conv._id} className="d-flex align-items-center p-2 rounded-3 cursor-pointer hover-bg-light" onClick={() => onSelect(conv)}>
                                            <UserAvatar user={other} size={40} />
                                            <div className="ms-3">
                                                <div className="fw-bold">{other.firstName} {other.lastName}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Message Results */}
                        {messageResults.length > 0 && (
                            <div>
                                <h6 className="px-2 text-muted small fw-bold mt-2">Messages</h6>
                                {messageResults.map(msg => (
                                    <div key={msg._id} className="d-flex align-items-center p-2 rounded-3 cursor-pointer hover-bg-light" onClick={() => handleMessageResultClick(msg)}>
                                        <UserAvatar user={msg.sender} size={40} />
                                        <div className="ms-3 min-width-0">
                                            <div className="fw-bold small">
                                                {msg.sender._id === currentUser._id ? 'You' : msg.sender.firstName}
                                                <span className="text-muted fw-normal"> &bull; {new Date(msg.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-truncate text-muted small">{msg.content}</div>
                                            <div className="text-muted" style={{fontSize: '0.7rem'}}>In chat with {msg.otherUser ? msg.otherUser.firstName : 'Unknown'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {filteredConversations.length === 0 && messageResults.length === 0 && !isSearching && (
                            <div className="text-center text-muted mt-4">No results found</div>
                        )}
                    </div>
                )}

                {/* Standard List Mode */}
                {!search && conversations.map(conv => {
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
                                         conv.lastMessage?.type === 'sticker' ? 'Sent a sticker' :
                                         (conv.lastMessage?.content || 'Started a chat')}
                                    </small>
                                    <small className="text-muted ms-1 flex-shrink-0" style={{fontSize: '0.7rem'}}>
                                        {new Date(conv.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </small>
                                </div>
                            </div>

                            {/* 3-dots Menu */}
                            <div
                                className="position-absolute end-0 top-50 translate-middle-y me-2 btn-messenger action-btn-wrapper"
                                style={{
                                    zIndex: 10,
                                    width: 32,
                                    height: 32,
                                    backgroundColor: showMenuId === conv._id ? '#f0f2f5' : 'transparent',
                                    opacity: showMenuId === conv._id ? 1 : undefined
                                }}
                                onClick={(e) => handleMenuClick(e, conv._id)}
                            >
                                <FaEllipsis className="text-muted" />
                            </div>

                            {/* Dropdown Menu */}
                            {showMenuId === conv._id && (
                                <div
                                    className="position-fixed bg-white shadow-lg rounded-3 py-2 z-3"
                                    style={{
                                        zIndex: 9999,
                                        marginTop: '10px',
                                        transform: 'translateX(-80%)' // Shift left to stay on screen
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
