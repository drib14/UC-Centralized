import React, { useState, useEffect, useRef } from 'react';
import { FaArrowLeft, FaPaperPlane } from 'react-icons/fa';
import API from '../../utils/api';

const ChatWindow = ({ conversation, currentUser, socket, onBack, onMessageSent }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const otherUser = conversation.participants.find(p => p._id !== currentUser._id) || {};

    useEffect(() => {
        loadMessages();
    }, [conversation._id]);

    useEffect(() => {
        if (!socket) return;

        const handleReceive = (data) => {
            if (data.conversationId === conversation._id) {
                setMessages(prev => [...prev, data]);
                scrollToBottom();
            }
        };

        socket.on('receive_message', handleReceive);

        return () => {
            socket.off('receive_message', handleReceive);
        };
    }, [socket, conversation._id]);

    const loadMessages = async () => {
        setLoading(true);
        try {
            const data = await API.getMessages(conversation._id);
            setMessages(data);
            scrollToBottom();
        } catch (err) {
            console.error("Failed to load messages", err);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const content = newMessage;
        setNewMessage(''); // Optimistic clear

        try {
            // Send via API (persistence)
            const sentMsg = await API.sendMessage(conversation._id, content);
            setMessages(prev => [...prev, sentMsg]);
            onMessageSent(sentMsg);

            // Send via Socket (real-time)
            socket.emit('send_message', {
                ...sentMsg,
                receiverId: otherUser._id
            });

            scrollToBottom();
        } catch (err) {
            console.error("Failed to send", err);
        }
    };

    const renderAvatar = (user) => {
        if (user.profileImage) {
            return <img src={user.profileImage} alt="avatar" className="rounded-circle" width="32" height="32" style={{objectFit:'cover'}} />;
        }
        return (
            <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center" style={{width:'32px', height:'32px', fontSize:'0.8rem'}}>
                {user.firstName ? user.firstName[0] : 'U'}
            </div>
        );
    };

    return (
        <div className="d-flex flex-column h-100">
            {/* Header */}
            <div className="p-3 border-bottom bg-white d-flex align-items-center shadow-sm" style={{height: '60px'}}>
                <button className="btn btn-link text-dark d-md-none me-2" onClick={onBack}>
                    <FaArrowLeft />
                </button>
                {renderAvatar(otherUser)}
                <div className="ms-2">
                    <h6 className="mb-0">{otherUser.firstName} {otherUser.lastName}</h6>
                    {/* <small className="text-success">Active Now</small> */}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-grow-1 p-3 overflow-auto" style={{backgroundColor: '#f8f9fa'}}>
                {loading ? (
                    <div className="d-flex justify-content-center pt-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-2">
                        {messages.map((msg, idx) => {
                            const isMe = msg.sender._id === currentUser._id || msg.sender === currentUser._id;
                            return (
                                <div key={idx} className={`d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                                    <div
                                        className={`p-2 px-3 rounded-3 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                                        style={{maxWidth: '75%', wordWrap: 'break-word'}}
                                    >
                                        <div style={{whiteSpace: 'pre-wrap'}}>{msg.content}</div>
                                        <div className={`text-end mt-1 ${isMe ? 'text-white-50' : 'text-muted'}`} style={{fontSize: '0.7rem'}}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-top">
                <form onSubmit={handleSend} className="d-flex gap-2">
                    <input
                        type="text"
                        className="form-control rounded-pill"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center" style={{width:'40px', height:'40px'}} disabled={!newMessage.trim()}>
                        <FaPaperPlane />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
