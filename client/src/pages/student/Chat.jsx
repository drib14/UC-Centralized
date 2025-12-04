import React, { useState, useEffect, useRef } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { FaPaperPlane, FaUserCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './Chat.css';

const Chat = () => {
    const { user } = useAuth();
    const socket = useSocket();
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchConversations();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchMessages(selectedUser._id);
            // Join chat room logic if needed, but we use user-id rooms in this simple setup
        }
    }, [selectedUser]);

    useEffect(() => {
        if (!socket) return;

        socket.on('receive_message', (message) => {
            // If the message is from the person we are currently chatting with
            if (selectedUser && message.sender === selectedUser._id) {
                setMessages(prev => [...prev, message]);
                scrollToBottom();
            } else {
                // Otherwise refresh conversations to show new badge/top position
                fetchConversations();
                toast.info(`New message from ${message.senderName || 'someone'}`);
            }
        });

        // Also listen for my own messages sent from other tabs?
        // Not implemented in backend yet, but good for future.

        return () => {
            socket.off('receive_message');
        };
    }, [socket, selectedUser]);

    const fetchConversations = async () => {
        try {
            const res = await API.get('/messages/conversations');
            setConversations(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMessages = async (userId) => {
        try {
            const res = await API.get(`/messages/conversation/${userId}`);
            setMessages(res.data);
            scrollToBottom();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        try {
            const res = await API.post('/messages', {
                recipientId: selectedUser._id,
                content: newMessage
            });

            // Add to local list immediately
            setMessages([...messages, res.data]);
            setNewMessage('');
            scrollToBottom();
            fetchConversations(); // Update list order
        } catch (err) {
            toast.error("Failed to send message");
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    // Format Date Logic
    const formatMessageTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;

        // If > 1 month (approx 30 days)
        if (diffInSeconds > 2592000) {
            return date.toLocaleDateString(); // Absolute date
        }

        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    };

    const getTooltipTime = (dateStr) => {
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="container-fluid chat-container" style={{ height: 'calc(100vh - 100px)' }}>
            <div className="row h-100 shadow-sm border rounded overflow-hidden">
                {/* Sidebar: Conversations */}
                <div className="col-md-4 col-lg-3 border-end p-0 bg-white d-flex flex-column">
                    <div className="p-3 border-bottom bg-light">
                        <h5 className="mb-0">Messages</h5>
                    </div>
                    <div className="flex-grow-1 overflow-auto">
                        {conversations.length === 0 ? (
                            <div className="p-3 text-center text-muted">No conversations yet</div>
                        ) : (
                            conversations.map(c => (
                                <div
                                    key={c.partner._id}
                                    className={`p-3 border-bottom cursor-pointer ${selectedUser?._id === c.partner._id ? 'bg-primary-light' : 'hover-bg-light'}`}
                                    onClick={() => setSelectedUser(c.partner)}
                                    style={{ cursor: 'pointer', backgroundColor: selectedUser?._id === c.partner._id ? '#e8f0fe' : 'transparent' }}
                                >
                                    <div className="d-flex align-items-center">
                                        <div className="me-3 position-relative">
                                            {c.partner.profileImage ? (
                                                <img src={c.partner.profileImage} alt="Profile" className="rounded-circle" width="40" height="40" style={{objectFit:'cover'}} />
                                            ) : (
                                                <FaUserCircle size={40} className="text-secondary" />
                                            )}
                                        </div>
                                        <div className="flex-grow-1 overflow-hidden">
                                            <div className="d-flex justify-content-between align-items-baseline">
                                                <strong className="text-truncate">{c.partner.firstName} {c.partner.lastName}</strong>
                                                <small className="text-muted" style={{fontSize: '0.75rem'}}>
                                                    {formatMessageTime(c.lastMessage.createdAt)}
                                                </small>
                                            </div>
                                            <div className="text-muted text-truncate small">
                                                {c.lastMessage.sender === user.id ? 'You: ' : ''}{c.lastMessage.content}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="col-md-8 col-lg-9 p-0 bg-white d-flex flex-column">
                    {selectedUser ? (
                        <>
                            {/* Header */}
                            <div className="p-3 border-bottom bg-light d-flex align-items-center">
                                <strong className="fs-5">{selectedUser.firstName} {selectedUser.lastName}</strong>
                                <span className="badge bg-secondary ms-2">{selectedUser.role}</span>
                            </div>

                            {/* Messages */}
                            <div className="flex-grow-1 p-3 overflow-auto" style={{ backgroundColor: '#f8f9fa' }}>
                                {messages.map((msg, index) => {
                                    const isMe = msg.sender === user.id || msg.sender._id === user.id;
                                    return (
                                        <div key={index} className={`d-flex mb-3 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                                            <div
                                                className={`p-3 rounded shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                                                style={{ maxWidth: '70%', position: 'relative' }}
                                                title={getTooltipTime(msg.createdAt)}
                                            >
                                                <div>{msg.content}</div>
                                                <div className={`text-end mt-1 ${isMe ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.7rem' }}>
                                                    {formatMessageTime(msg.createdAt)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 border-top bg-white">
                                <form onSubmit={handleSendMessage} className="d-flex gap-2">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
                                        <FaPaperPlane />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                            <FaUserCircle size={64} className="mb-3 opacity-50" />
                            <h4>Select a conversation to start chatting</h4>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chat;
