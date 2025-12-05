import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

const ChatSidebar = ({ conversations, selectedId, onSelect, onNewChat, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const { onlineUsers } = useSocket();

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchTerm(query);

        if (query.length > 2) {
            try {
                const results = await API.searchUsers(query);
                setSearchResults(results);
                setIsSearching(true);
            } catch (err) {
                console.error(err);
            }
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    };

    const getOtherParticipant = (conv) => {
        // If self-chat, find returns undefined, so fallback to first participant (me)
        return conv.participants.find(p => p._id !== currentUser._id) || conv.participants[0] || {};
    };

    const renderAvatar = (user) => {
        const isOnline = onlineUsers.has(user._id);

        return (
            <div className="position-relative">
                {user.profileImage ? (
                    <img src={user.profileImage} alt="avatar" className="rounded-circle" width="45" height="45" style={{objectFit:'cover'}} />
                ) : (
                    <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center" style={{width:'45px', height:'45px'}}>
                        {user.firstName ? user.firstName[0] : 'U'}
                    </div>
                )}
                {isOnline && (
                    <span className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle" style={{width: '12px', height: '12px'}}></span>
                )}
            </div>
        );
    };

    // Calculate unread count
    const getUnreadCount = (conv) => {
        if (!conv.lastMessage) return 0;
        const isRead = conv.lastMessage.readBy && conv.lastMessage.readBy.includes(currentUser._id);
        // Only count if NOT me and NOT read
        return (!isRead && conv.lastMessage.sender !== currentUser._id) ? 1 : 0;
    };

    const formatTime = (date) => {
        if (!date) return '';
        const now = new Date();
        const msgDate = new Date(date);
        const diff = now - msgDate;

        // If < 1 day, show time. Else show date.
        if (diff < 86400000 && now.getDate() === msgDate.getDate()) {
            return msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        return msgDate.toLocaleDateString();
    };

    return (
        <div className="d-flex flex-column h-100">
            {/* Mobile: Top Horizontal User List (Stories Style) */}
            <div className="d-md-none d-flex gap-3 p-3 overflow-auto border-bottom bg-white" style={{whiteSpace: 'nowrap'}}>
                {/* Current User */}
                <div className="text-center" style={{minWidth: '60px'}} onClick={() => onNewChat(currentUser)}>
                    {renderAvatar(currentUser)}
                    <small className="d-block text-truncate mt-1 text-muted" style={{maxWidth: '60px', fontSize: '0.7rem'}}>
                        You
                    </small>
                </div>

                {conversations.map(conv => {
                    const other = getOtherParticipant(conv);
                    // Skip if 'other' is me (avoid duplicate "You" entry)
                    if (other._id === currentUser._id) return null;

                    return (
                        <div key={conv._id} className="text-center" style={{minWidth: '60px'}} onClick={() => onSelect(conv)}>
                            {renderAvatar(other)}
                            <small className="d-block text-truncate mt-1" style={{maxWidth: '60px', fontSize: '0.7rem'}}>
                                {other.firstName}
                            </small>
                        </div>
                    );
                })}
            </div>

            <div className="p-3 border-bottom">
                <div className="input-group">
                    <span className="input-group-text bg-light border-end-0"><FaSearch className="text-muted" /></span>
                    <input
                        type="text"
                        className="form-control border-start-0 bg-light"
                        placeholder="Search people..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            <div className="flex-grow-1 overflow-auto">
                {isSearching ? (
                    <ul className="list-group list-group-flush">
                        {searchResults.length === 0 && <li className="list-group-item text-muted text-center p-3">No user found</li>}
                        {searchResults.map(user => (
                            <li
                                key={user._id}
                                className="list-group-item list-group-item-action cursor-pointer d-flex align-items-center gap-3 py-3"
                                onClick={() => {
                                    onNewChat(user);
                                    setSearchTerm('');
                                    setIsSearching(false);
                                }}
                                style={{cursor: 'pointer'}}
                            >
                                {renderAvatar(user)}
                                <div>
                                    <h6 className="mb-0">{user.firstName} {user.lastName}</h6>
                                    <small className="text-muted">{user.role} • {user.studentId}</small>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <ul className="list-group list-group-flush">
                        {conversations.length === 0 && <li className="list-group-item text-muted text-center p-5">No conversations yet</li>}
                        {conversations.map(conv => {
                            const other = getOtherParticipant(conv);
                            const isActive = selectedId === conv._id;
                            const unread = getUnreadCount(conv);
                            const contentPreview = conv.lastMessage?.type === 'image' ? '📷 sent a photo' : conv.lastMessage?.type === 'audio' ? '🎤 sent a voice message' : conv.lastMessage?.content;

                            return (
                                <li
                                    key={conv._id}
                                    className={`list-group-item list-group-item-action cursor-pointer d-flex align-items-center gap-3 py-3 ${isActive ? 'bg-light' : ''}`}
                                    onClick={() => onSelect(conv)}
                                    style={{cursor: 'pointer', borderLeft: isActive ? '4px solid #0d6efd' : '4px solid transparent'}}
                                >
                                    {renderAvatar(other)}
                                    <div className="flex-grow-1 overflow-hidden">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <h6 className={`mb-0 text-truncate ${unread ? 'fw-bold' : ''}`}>{other.firstName} {other.lastName}</h6>
                                            {conv.lastMessage && (
                                                <small className={`${unread ? 'text-primary fw-bold' : 'text-muted'}`} style={{fontSize: '0.75rem'}}>
                                                    {formatTime(conv.updatedAt)}
                                                </small>
                                            )}
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <small className={`text-truncate d-block ${unread ? 'fw-bold text-dark' : 'text-muted'}`}>
                                                {conv.lastMessage ? (
                                                    <span>{conv.lastMessage.sender === currentUser._id ? 'You: ' : ''}{contentPreview}</span>
                                                ) : (
                                                    <span className="fst-italic">Start chatting...</span>
                                                )}
                                            </small>
                                            {unread > 0 && (
                                                <span className="badge bg-danger rounded-pill ms-2">{unread}</span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;
