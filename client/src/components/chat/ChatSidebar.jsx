import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { FaEllipsisVertical, FaTrash, FaCheck, FaVolumeXmark, FaVolumeHigh } from 'react-icons/fa6';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';
import ActiveUsersList from './ActiveUsersList';

const ChatSidebar = ({ conversations, selectedId, onSelect, onNewChat, currentUser, onDeleteConversation, onUpdateConversation }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [deleteConvId, setDeleteConvId] = useState(null); // ID for delete modal
    const [activeMenuId, setActiveMenuId] = useState(null); // Which 3-dot menu is open
    const { onlineUsers, setUnreadMessageCount } = useSocket();

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
        return (!isRead && conv.lastMessage.sender !== currentUser._id) ? 1 : 0;
    };

    const handleAction = async (e, action, conv) => {
        e.stopPropagation();
        try {
            if (action === 'delete') {
                setDeleteConvId(conv._id);
                setActiveMenuId(null);
            } else if (action === 'mute') {
                await API.muteConversation(conv._id);
                toast.success("Conversation mute toggled");

                if (onUpdateConversation) {
                    const isMuted = conv.mutedBy.includes(currentUser._id);
                    const updatedConv = {
                        ...conv,
                        mutedBy: isMuted
                            ? conv.mutedBy.filter(id => id !== currentUser._id)
                            : [...conv.mutedBy, currentUser._id]
                    };
                    onUpdateConversation(updatedConv);
                }
                setActiveMenuId(null);
            } else if (action === 'read') {
                await API.markMessagesRead(conv._id);
                toast.success("Marked as read");

                if (onUpdateConversation) {
                    const updatedConv = {
                        ...conv,
                        lastMessage: {
                            ...conv.lastMessage,
                            readBy: [...(conv.lastMessage.readBy || []), currentUser._id]
                        }
                    };
                    onUpdateConversation(updatedConv);
                }
                setUnreadMessageCount(prev => Math.max(0, prev - 1));
                setActiveMenuId(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const confirmDelete = async () => {
        if (!deleteConvId) return;
        try {
            await API.deleteConversation(deleteConvId);
            toast.success("Conversation deleted");
            if (onDeleteConversation) onDeleteConversation(deleteConvId);
        } catch (err) {
            toast.error("Failed to delete");
        } finally {
            setDeleteConvId(null);
        }
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
            {/* Mobile: Top Horizontal Active User List */}
            <ActiveUsersList currentUser={currentUser} />

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
                            const isMuted = conv.mutedBy && conv.mutedBy.includes(currentUser._id);
                            let contentPreview = conv.lastMessage?.content || 'Sent a message';
                            const msg = conv.lastMessage;
                            if (msg) {
                                if (msg.attachments && msg.attachments.length > 0) {
                                    const type = msg.attachments[0].type;
                                    if (type === 'image') contentPreview = '📷 Sent a photo';
                                    else if (type === 'video') contentPreview = '🎥 Sent a video';
                                    else if (type === 'audio') contentPreview = '🎤 Sent a voice message';
                                    else contentPreview = '📎 Sent a file';
                                } else if (msg.type === 'image') contentPreview = '📷 Sent a photo';
                                else if (msg.type === 'audio') contentPreview = '🎤 Sent a voice message';
                                else if (msg.type === 'video') contentPreview = '🎥 Sent a video';
                                else if (msg.type === 'file') contentPreview = '📎 Sent a file';
                                else contentPreview = msg.content;
                            } else {
                                contentPreview = <span className="fst-italic">Start chatting...</span>;
                            }

                            return (
                                <li
                                    key={conv._id}
                                    className={`list-group-item list-group-item-action cursor-pointer d-flex align-items-center gap-3 py-3 position-relative group-hover-trigger ${isActive ? 'bg-light' : ''}`}
                                    onClick={() => {
                                        onSelect(conv);
                                        setActiveMenuId(null);
                                        if (unread > 0) setUnreadMessageCount(prev => Math.max(0, prev - 1));
                                    }}
                                    style={{cursor: 'pointer', borderLeft: isActive ? '4px solid #0d6efd' : '4px solid transparent'}}
                                >
                                    {renderAvatar(other)}
                                    <div className="flex-grow-1 position-relative" style={{minWidth: 0}}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="d-flex align-items-center gap-1">
                                                <h6 className={`mb-0 text-truncate fw-bold ${unread ? 'text-dark' : 'text-secondary'}`} style={{fontWeight: 700}}>{other.firstName} {other.lastName}</h6>
                                                {isMuted && <FaVolumeXmark className="text-secondary" size={12} />}
                                            </div>
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
                                            <div className="d-flex align-items-center">
                                                {unread > 0 && <span className="badge bg-danger rounded-pill ms-2">{unread}</span>}

                                                {/* 3-Dot Menu Trigger */}
                                                {/* Increased margin-left (ms-3) for distance */}
                                                <div className="action-btn-wrapper ms-3 position-relative">
                                                    <button
                                                        className="btn btn-sm btn-link text-secondary p-2 rounded-circle" // Increased padding for easier click
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenuId(activeMenuId === conv._id ? null : conv._id);
                                                        }}
                                                        style={{zIndex: 10}} // Ensure it's above other elements
                                                    >
                                                        <FaEllipsisVertical size={16} />
                                                    </button>

                                                     {/* Custom Dropdown Menu */}
                                                    {activeMenuId === conv._id && (
                                                        <>
                                                            <div
                                                                className="position-fixed top-0 start-0 w-100 h-100"
                                                                style={{ zIndex: 1040, cursor: 'default' }}
                                                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                                                            ></div>
                                                            <div className="position-absolute bg-white shadow rounded-3 border py-2" style={{ right: 0, top: '120%', zIndex: 1050, minWidth: '180px' }}>
                                                                <button className="dropdown-item btn btn-sm text-start px-3 py-2 d-flex align-items-center" onClick={(e) => handleAction(e, 'read', conv)}>
                                                                    <FaCheck className="me-2 text-primary" size={14} /> <span>Mark as read</span>
                                                                </button>
                                                                <button className="dropdown-item btn btn-sm text-start px-3 py-2 d-flex align-items-center" onClick={(e) => handleAction(e, 'mute', conv)}>
                                                                    {isMuted ? <><FaVolumeHigh className="me-2" size={14}/> <span>Unmute</span></> : <><FaVolumeXmark className="me-2" size={14}/> <span>Mute</span></>}
                                                                </button>
                                                                <div className="dropdown-divider my-1 mx-2"></div>
                                                                <button className="dropdown-item btn btn-sm text-start text-danger px-3 py-2 d-flex align-items-center" onClick={(e) => handleAction(e, 'delete', conv)}>
                                                                    <FaTrash className="me-2" size={14} /> <span>Delete</span>
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConvId && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title">Delete Conversation?</h5>
                            </div>
                            <div className="modal-body text-muted small">
                                This will remove the conversation from your list. It will reappear if they message you again.
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button className="btn btn-link text-secondary text-decoration-none" onClick={() => setDeleteConvId(null)}>Cancel</button>
                                <button className="btn btn-danger" onClick={confirmDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatSidebar;
