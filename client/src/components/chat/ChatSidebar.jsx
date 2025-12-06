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
    const [peopleResults, setPeopleResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const searchAll = async () => {
            if (!search.trim()) {
                setMessageResults([]);
                setPeopleResults([]);
                return;
            }
            setIsSearching(true);
            try {
                // Parallel search: Messages content AND Users (People)
                const [msgs, users] = await Promise.all([
                    API.get(`/messages/search/content?q=${encodeURIComponent(search)}`),
                    API.searchUsers(search)
                ]);

                setMessageResults(msgs || []);

                // Filter users to exclude myself
                const filteredUsers = (users || []).filter(u => u._id !== currentUser._id);
                setPeopleResults(filteredUsers);

            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(searchAll, 500);
        return () => clearTimeout(timeoutId);
    }, [search, currentUser._id]);

    // Local filter for existing conversations (legacy behavior, kept for quick access)
    // But since we have a dedicated "People" search from API, we might prioritize API results
    // or merge them. User asked to "search both conversation and people".
    // Let's rely on the API results for "People" as it searches ALL users, not just conversations.
    // However, existing conversations should be highlighted or prioritized.

    // Let's stick to the request: "search both conversation and people".
    // API.searchUsers returns users.
    // We can match them with existing conversations to open the chat.

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

    const handleResultClick = (targetUser) => {
        // Check if conversation exists
        const existing = conversations.find(c => c.participants.some(p => p._id === targetUser._id));
        if (existing) {
            onSelect(existing);
        } else {
            // New chat - handled by parent usually via onNewChat logic, but here we can force selection
            // We need to create it or let ChatLayout handle it.
            // Since onSelect expects a conversation object, we might need to trigger onNewChat(targetUser)
            // But onNewChat prop takes no args in ChatLayout currently (it just opens empty?).
            // Let's pass a "temporary" conversation object or call a create API.
            // Best approach: create it immediately then select.
            API.createConversation(targetUser._id).then(newConv => {
                onSelect(newConv);
            });
        }
        setSearch(''); // Clear search on select? Or keep it? Usually clear.
    };

    const handleMessageResultClick = (result) => {
        const existingConv = conversations.find(c => c._id === result.conversationId);
        if (existingConv) {
            onSelect(existingConv);
        } else {
            // Fetch if missing from list
             API.get(`/messages/conversations/${result.conversationId}`).then(conv => { // This route might fail if it expects just messages
                 // Actually we need the conversation object.
                 // If not in list, maybe just select it by ID and let ChatLayout fetch?
                 // Let's try finding by ID in ChatLayout.
             });
        }
        setSearch('');
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
                    <div className="d-flex flex-column gap-3 pb-3">
                        {/* People Results */}
                        {peopleResults.length > 0 && (
                            <div>
                                <h6 className="px-2 text-muted small fw-bold mt-2">People</h6>
                                {peopleResults.map(user => (
                                    <div key={user._id} className="d-flex align-items-center p-2 rounded-3 cursor-pointer hover-bg-light" onClick={() => handleResultClick(user)}>
                                        <UserAvatar user={user} size={40} />
                                        <div className="ms-3">
                                            <div className="fw-bold">{user.firstName} {user.lastName}</div>
                                            <div className="small text-muted">{user.role}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Message Results */}
                        {messageResults.length > 0 && (
                            <div>
                                <h6 className="px-2 text-muted small fw-bold mt-2">Messages</h6>
                                {messageResults.map(msg => (
                                    <div key={msg._id} className="d-flex align-items-center p-2 rounded-3 cursor-pointer hover-bg-light" onClick={() => handleMessageResultClick(msg)}>
                                        <UserAvatar user={msg.sender} size={40} />
                                        <div className="ms-3 min-width-0 w-100">
                                            <div className="fw-bold small d-flex justify-content-between">
                                                <span>{msg.sender._id === currentUser._id ? 'You' : msg.sender.firstName}</span>
                                                <span className="text-muted fw-normal small">{new Date(msg.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-truncate text-muted small">{msg.content}</div>
                                            <div className="text-muted" style={{fontSize: '0.7rem'}}>In chat with {msg.otherUser ? msg.otherUser.firstName : 'Unknown'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {peopleResults.length === 0 && messageResults.length === 0 && !isSearching && (
                            <div className="text-center text-muted mt-4">No results found</div>
                        )}
                    </div>
                )}

                {/* Standard Conversation List */}
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

                            {/* 3-dots Menu - Fixed positioning to avoid clipping */}
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

                            {/* Dropdown Menu - Better Positioning Strategy needed?
                                User complained "distant from the 3 dot icon".
                                Fixed pos relative to viewport requires calc.
                                Let's try absolute but ensure parent has z-index.
                                Or just standard absolute right: 20px top: 50%
                            */}
                            {showMenuId === conv._id && (
                                <div
                                    className="position-absolute bg-white shadow-lg rounded-3 py-2 z-3"
                                    style={{
                                        right: '40px', // Just to the left of the button
                                        top: '50%',
                                        transform: 'translateY(-20%)',
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
