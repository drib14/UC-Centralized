import React, { useState, useEffect, useRef } from 'react';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from './UserAvatar';
import { FaEdit, FaSearch } from 'react-icons/fa';

const ChatSidebar = ({ onSelectConversation, selectedId, initialChatTarget }) => {
    const { user } = useAuth();
    const { socket, onlineUsers, unreadMessageCount } = useSocket();
    const [conversations, setConversations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ users: [], messages: [] });
    const [isSearching, setIsSearching] = useState(false);

    // Initial Load
    useEffect(() => {
        loadConversations();
    }, [unreadMessageCount]); // Reload if unread count changes (simplified sync)

    // Handle "Start Chat With" intent from other pages
    useEffect(() => {
        if (initialChatTarget) {
            handleCreateConversation(initialChatTarget);
        }
    }, [initialChatTarget]);

    // Socket Listeners for Real-time List Updates
    useEffect(() => {
        if (!socket) return;

        const handleReceive = (msg) => {
            // Move conversation to top
            setConversations(prev => {
                const idx = prev.findIndex(c => c._id === msg.conversationId || c._id === msg.conversationId._id);
                if (idx > -1) {
                    const updated = { ...prev[idx], lastMessage: msg, updatedAt: new Date().toISOString() };
                    const others = prev.filter((_, i) => i !== idx);
                    return [updated, ...others];
                }
                // New conversation? Reload list
                loadConversations();
                return prev;
            });
        };

        socket.on('receive_message', handleReceive);
        return () => socket.off('receive_message', handleReceive);
    }, [socket]);

    const loadConversations = async () => {
        try {
            const data = await API.get('/messages/conversations');
            setConversations(data);
        } catch (err) {
            console.error("Failed to load conversations", err);
        }
    };

    const handleSearch = async (e) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (!q.trim()) {
            setIsSearching(false);
            setSearchResults({ users: [], messages: [] });
            return;
        }

        setIsSearching(true);
        try {
            // Debounce could be added here, but for now direct call
            const res = await API.get(`/messages/search/global?q=${q}`);
            setSearchResults(res);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateConversation = async (receiverId) => {
        try {
            const conv = await API.post('/messages/conversations', { receiverId });
            // Add to list if not present
            if (!conversations.find(c => c._id === conv._id)) {
                setConversations(prev => [conv, ...prev]);
            }
            onSelectConversation(conv._id);
            // Clear search
            setSearchQuery('');
            setIsSearching(false);
        } catch (err) {
            console.error("Create Chat Error", err);
        }
    };

    const getOtherUser = (conv) => {
        return conv.participants.find(p => p._id !== user._id) || conv.participants[0];
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString();
    };

    return (
        <div className="d-flex flex-column h-100 bg-white">
            {/* Header */}
            <div className="p-3 d-flex justify-content-between align-items-center">
                <h4 className="fw-bold m-0">Chats</h4>
                <div className="bg-light rounded-circle p-2 cursor-pointer" onClick={() => {/* Maybe New Chat Modal */}}>
                    <FaEdit size={20} className="text-primary" />
                </div>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
                <div className="input-group bg-light rounded-pill px-3 py-1">
                    <span className="input-group-text bg-transparent border-0 text-muted"><FaSearch /></span>
                    <input
                        type="text"
                        className="form-control bg-transparent border-0 shadow-none"
                        placeholder="Search Messenger"
                        value={searchQuery}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-grow-1 overflow-auto chat-scroll">
                {isSearching ? (
                    <div className="p-2">
                        {searchResults.users.length > 0 && (
                            <div className="mb-3">
                                <small className="text-muted fw-bold px-2">People</small>
                                {searchResults.users.map(u => (
                                    <div key={u._id} className="d-flex align-items-center gap-3 p-2 rounded hover-bg-light cursor-pointer" onClick={() => handleCreateConversation(u._id)}>
                                        <UserAvatar user={u} size={40} showOnlineStatus={true} isOnline={u.isOnline} />
                                        <div>
                                            <div className="fw-bold text-dark">{u.firstName} {u.lastName}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchResults.messages.length > 0 && (
                            <div>
                                <small className="text-muted fw-bold px-2">Messages</small>
                                {searchResults.messages.map(m => (
                                    <div key={m._id} className="d-flex align-items-center gap-3 p-2 rounded hover-bg-light cursor-pointer" onClick={() => onSelectConversation(m.conversationId)}>
                                        <UserAvatar user={m.sender} size={40} />
                                        <div className="overflow-hidden w-100">
                                            <div className="fw-bold text-dark">{m.sender.firstName} {m.sender.lastName}</div>
                                            <div className="small text-muted text-truncate">{m.content}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {searchResults.users.length === 0 && searchResults.messages.length === 0 && (
                            <div className="text-center text-muted mt-4">No results found</div>
                        )}
                    </div>
                ) : (
                    <div className="p-2">
                        {conversations.map(conv => {
                            const other = getOtherUser(conv);
                            const isSelected = conv._id === selectedId;
                            const isUnread = conv.lastMessage &&
                                           conv.lastMessage.sender !== user._id &&
                                           !conv.lastMessage.readBy.includes(user._id);

                            // Last Message Preview
                            let preview = 'No messages yet';
                            if (conv.lastMessage) {
                                if (conv.lastMessage.isDeletedForEveryone) preview = 'Message unsent';
                                else if (conv.lastMessage.type === 'image') preview = 'Sent a photo';
                                else if (conv.lastMessage.type === 'audio') preview = 'Sent a voice message';
                                else if (conv.lastMessage.type === 'video') preview = 'Sent a video';
                                else if (conv.lastMessage.type === 'file') preview = 'Sent a file';
                                else preview = conv.lastMessage.content;

                                if (conv.lastMessage.sender === user._id) preview = `You: ${preview}`;
                            }

                            return (
                                <div
                                    key={conv._id}
                                    className={`d-flex align-items-center gap-3 p-2 rounded mb-1 cursor-pointer ${isSelected ? 'bg-primary-subtle' : 'hover-bg-light'}`}
                                    onClick={() => onSelectConversation(conv._id)}
                                >
                                    <UserAvatar user={other} size={48} showOnlineStatus={true} isOnline={other.isOnline || onlineUsers.includes(other._id)} />
                                    <div className="flex-grow-1 overflow-hidden" style={{ minWidth: 0 }}>
                                        <div className="d-flex justify-content-between align-items-baseline">
                                            <div className={`text-truncate ${isUnread ? 'fw-bold text-dark' : 'text-dark'}`} style={{ fontSize: '0.95rem' }}>
                                                {conv.nicknames?.[other._id] || other.firstName + ' ' + other.lastName}
                                            </div>
                                            {conv.lastMessage && <small className={`ms-2 ${isUnread ? 'text-primary fw-bold' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>{formatTime(conv.updatedAt)}</small>}
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className={`text-truncate ${isUnread ? 'fw-bold text-dark' : 'text-muted'}`} style={{ fontSize: '0.85rem' }}>
                                                {preview}
                                            </div>
                                            {isUnread && <div className="bg-primary rounded-circle" style={{ width: 10, height: 10 }}></div>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;
