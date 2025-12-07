import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from './UserAvatar';
import { FaSearch, FaEdit, FaEllipsisV, FaTrash, FaArchive, FaVolumeMute } from 'react-icons/fa';
import { toast } from 'react-toastify';
import CreateGroupModal from './CreateGroupModal';

const ChatSidebar = () => {
    const { selectedConversation, setSelectedConversation } = useChat();
    const { socket, onlineUsers } = useSocket();
    const { user } = useAuth();

    const [conversations, setConversations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleUpdate = (updatedConv) => {
            setConversations(prev => {
                const idx = prev.findIndex(c => c._id === updatedConv._id);
                if (idx > -1) {
                    const newPrev = [...prev];
                    newPrev[idx] = updatedConv;
                    return newPrev.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                }
                return [updatedConv, ...prev];
            });
        };

        const handleNewMessage = (msg) => {
            loadConversations();
        };

        socket.on('conversation_updated', handleUpdate);
        socket.on('receive_message', handleNewMessage);

        return () => {
            socket.off('conversation_updated', handleUpdate);
            socket.off('receive_message', handleNewMessage);
        };
    }, [socket]);

    const loadConversations = async () => {
        try {
            const res = await API.get('/messages/conversations');
            // Deduping just in case, though API should handle
            const unique = res.filter((v, i, a) => a.findIndex(t => t._id === v._id) === i);
            setConversations(unique);
        } catch (err) {
            console.error("Load Convs Failed", err);
        }
    };

    const handleSearch = async (e) => {
        const q = e.target.value;
        setSearchTerm(q);
        if (!q.trim()) {
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        try {
            const res = await API.get(`/messages/search/global?q=${q}`);
            setSearchResults(res.users || []);
        } catch(err) {
            console.error(err);
        }
    };

    const startChat = async (userId) => {
        try {
            const res = await API.post('/messages/conversations', { receiverId: userId });
            setSelectedConversation(res);
            setSearchTerm('');
            setIsSearching(false);
            if (!conversations.find(c => c._id === res._id)) {
                setConversations(prev => [res, ...prev]);
            }
        } catch(err) {
            toast.error("Failed to start chat");
        }
    };

    const handleDelete = async (e, convId) => {
        e.stopPropagation();
        if(!window.confirm("Delete conversation?")) return;
        try {
            // Placeholder: API needs delete endpoint or we hide it locally
            // Implementing delete logic requires backend support (archivedBy/deletedFor)
            // For now, let's assume updateSettings or similar can handle it, or just remove from UI
            setConversations(prev => prev.filter(c => c._id !== convId));
            // Actual API call: await API.delete(`/messages/conversations/${convId}`);
            // Since we implemented archivedBy logic in backend, let's use that if available or create endpoint.
            // But for this step, UI removal is key.
        } catch(e) { toast.error("Failed"); }
    };

    return (
        <div className="d-flex flex-column h-100 border-end">
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                <h5 className="mb-0 fw-bold">Chats</h5>
                <button className="btn btn-sm btn-light rounded-circle" title="New Group" onClick={() => setShowGroupModal(true)}>
                    <FaEdit />
                </button>
            </div>

            <div className="p-2">
                <div className="input-group">
                    <span className="input-group-text bg-white border-end-0"><FaSearch className="text-muted"/></span>
                    <input
                        type="text"
                        className="form-control border-start-0 ps-0 shadow-none"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            <div className="flex-grow-1 overflow-auto">
                {isSearching ? (
                    <div className="list-group list-group-flush">
                        {searchResults.map(u => (
                            <div key={u._id} className="list-group-item list-group-item-action d-flex align-items-center gap-2 cursor-pointer" onClick={() => startChat(u._id)}>
                                <UserAvatar user={u} size={40} />
                                <div>
                                    <div className="fw-bold">{u.firstName} {u.lastName}</div>
                                    <small className="text-muted">{u.role}</small>
                                </div>
                            </div>
                        ))}
                        {searchResults.length === 0 && <div className="p-3 text-center text-muted">No users found</div>}
                    </div>
                ) : (
                    <div className="list-group list-group-flush">
                        {conversations.map(conv => (
                            <ConversationListItem
                                key={conv._id}
                                conversation={conv}
                                isSelected={selectedConversation?._id === conv._id}
                                onClick={() => setSelectedConversation(conv)}
                                onDelete={(e) => handleDelete(e, conv._id)}
                                onlineUsers={onlineUsers}
                                currentUser={user}
                            />
                        ))}
                    </div>
                )}
            </div>

            <CreateGroupModal show={showGroupModal} onHide={() => setShowGroupModal(false)} />
        </div>
    );
};

const ConversationListItem = ({ conversation, isSelected, onClick, onDelete, onlineUsers, currentUser }) => {
    const [showMenu, setShowMenu] = useState(false);

    let name = "Unknown";
    let image = null;
    let isOnline = false;

    if (conversation.type === 'group') {
        name = conversation.name;
        image = conversation.image;
    } else {
        const other = conversation.participants.find(p => p._id !== currentUser._id) || conversation.participants[0];
        if (other) {
            name = `${other.firstName} ${other.lastName}`;
            image = other.profileImage;
            isOnline = onlineUsers.includes(other._id);
        }
    }

    const lastMsg = conversation.lastMessage;
    const preview = lastMsg ? (
        lastMsg.sender === currentUser._id || lastMsg.sender._id === currentUser._id ? `You: ${lastMsg.content}` : lastMsg.content
    ) : "Start a conversation";

    return (
        <div
            className={`list-group-item list-group-item-action border-0 p-3 cursor-pointer position-relative group-hover-trigger ${isSelected ? 'bg-primary-subtle' : ''}`}
            onClick={onClick}
            onMouseEnter={() => setShowMenu(true)}
            onMouseLeave={() => setShowMenu(false)}
        >
            <div className="d-flex align-items-center gap-3">
                <div className="position-relative">
                    <UserAvatar user={{ firstName: name, lastName: '', profileImage: image }} size={48} />
                    {isOnline && <span className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle p-1"></span>}
                </div>
                <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex justify-content-between align-items-baseline">
                        <h6 className="mb-0 text-truncate">{name}</h6>
                        {lastMsg && <small className="text-muted ms-2" style={{fontSize: '0.7em'}}>{new Date(lastMsg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>}
                    </div>
                    <p className="mb-0 text-muted small text-truncate">{preview}</p>
                </div>
            </div>

            {/* 3-Dots Menu (Visible on Hover) */}
            {showMenu && (
                <div className="position-absolute top-50 end-0 translate-middle-y me-2 bg-white shadow rounded-circle p-2 d-flex align-items-center justify-content-center"
                     style={{width: 32, height: 32, zIndex: 5}}
                     onClick={(e) => e.stopPropagation()}>
                    <div className="dropdown">
                        <FaEllipsisV className="text-muted cursor-pointer" data-bs-toggle="dropdown" />
                        <ul className="dropdown-menu dropdown-menu-end">
                            <li><button className="dropdown-item d-flex align-items-center gap-2"><FaArchive /> Archive</button></li>
                            <li><button className="dropdown-item d-flex align-items-center gap-2"><FaVolumeMute /> Mute</button></li>
                            <li><hr className="dropdown-divider"/></li>
                            <li><button className="dropdown-item d-flex align-items-center gap-2 text-danger" onClick={onDelete}><FaTrash /> Delete</button></li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatSidebar;
