import React, { useRef, useEffect, useState } from 'react';
import { FaPhone, FaVideo, FaEllipsisVertical, FaCircleInfo, FaArrowLeft } from 'react-icons/fa6';
import MessageInput from './MessageInput';
import AudioMessage from './AudioMessage';
import ChatSettingsModal from './ChatSettingsModal';

const ChatWindow = ({ conversation, messages, currentUser, onSendMessage, onBack, onSettingsChange }) => {
    const bottomRef = useRef(null);
    const [showSettings, setShowSettings] = useState(false);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const otherUser = conversation.otherUser || conversation.participants.find(p => p._id !== currentUser._id);
    const themeClass = `chat-theme-${conversation.theme || 'default'}`;

    // Helper to get display name (nickname support)
    const getDisplayName = (user) => {
        if (conversation.nicknames && conversation.nicknames[user._id]) return conversation.nicknames[user._id];
        return user.firstName; // First name only in bubbles usually
    };

    const getHeaderName = () => {
         if (conversation.nicknames && otherUser && conversation.nicknames[otherUser._id]) return conversation.nicknames[otherUser._id];
         return otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : "Unknown";
    };

    return (
        <div className={`d-flex flex-column h-100 ${themeClass}`} style={{ backgroundColor: 'var(--chat-bg)', transition: 'background-color 0.3s' }}>
            {/* Header */}
            <div className="p-3 border-bottom bg-white shadow-sm d-flex justify-content-between align-items-center z-1">
                <div className="d-flex align-items-center gap-3">
                    <button className="btn btn-light rounded-circle d-md-none" onClick={onBack}>
                        <FaArrowLeft />
                    </button>
                    <div className="position-relative">
                        <img
                            src={otherUser?.profilePicture || "https://via.placeholder.com/40"}
                            alt="Avatar"
                            className="rounded-circle object-fit-cover border"
                            width="45" height="45"
                        />
                        {otherUser?.isOnline && (
                             <span className="position-absolute bottom-0 end-0 p-1 bg-success border border-white rounded-circle"></span>
                        )}
                    </div>
                    <div>
                        <h6 className="mb-0 fw-bold">{getHeaderName()}</h6>
                        <small className="text-muted">
                            {otherUser?.isOnline ? "Active now" : (otherUser?.lastSeen ? `Last seen ${new Date(otherUser.lastSeen).toLocaleTimeString()}` : "Offline")}
                        </small>
                    </div>
                </div>
                <div className="d-flex gap-2">
                    {/* Placeholder for Calls - "Visual Only" as per thought process, but user asked for "Voice Record" not calls specifically. Keeping it simple. */}
                    {/* <button className="btn btn-light rounded-circle text-primary"><FaPhone /></button> */}
                    {/* <button className="btn btn-light rounded-circle text-primary"><FaVideo /></button> */}
                    <button className="btn btn-light rounded-circle" onClick={() => setShowSettings(true)}>
                        <FaCircleInfo className="text-secondary"/>
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow-1 overflow-auto p-4 custom-scrollbar d-flex flex-column gap-3">
                {messages.map((msg, idx) => {
                    const isMe = msg.sender._id === currentUser._id;
                    const isSystem = msg.type === 'system';

                    if (isSystem) {
                        return (
                            <div key={idx} className="text-center my-2">
                                <small className="text-muted bg-light px-3 py-1 rounded-pill border">{msg.content}</small>
                            </div>
                        );
                    }

                    return (
                        <div key={idx} className={`d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'} animate-slide-up`}>
                            {!isMe && (
                                <img
                                    src={msg.sender.profilePicture || "https://via.placeholder.com/30"}
                                    className="rounded-circle me-2 align-self-end mb-1"
                                    width="30" height="30" alt=""
                                />
                            )}
                            <div style={{ maxWidth: '70%' }}>
                                {!isMe && <small className="text-muted ms-1" style={{fontSize: '0.75rem'}}>{getDisplayName(msg.sender)}</small>}
                                <div
                                    className={`p-3 shadow-sm position-relative ${isMe ? 'rounded-top-left-3 rounded-bottom-3' : 'rounded-top-right-3 rounded-bottom-3'}`}
                                    style={{
                                        backgroundColor: isMe ? 'var(--chat-bubble-me)' : 'var(--chat-bubble-them)',
                                        color: isMe ? 'var(--chat-text-me)' : 'var(--chat-text-them)',
                                        borderRadius: '18px',
                                        borderBottomRightRadius: isMe ? '4px' : '18px',
                                        borderBottomLeftRadius: !isMe ? '4px' : '18px'
                                    }}
                                >
                                    {/* Content based on type */}
                                    {msg.type === 'text' && <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>}

                                    {msg.type === 'image' && (
                                        <img src={msg.fileUrl} alt="Sent image" className="img-fluid rounded" style={{ maxHeight: '300px' }}
                                             onClick={() => window.open(msg.fileUrl, '_blank')}
                                        />
                                    )}

                                    {msg.type === 'video' && (
                                        <video src={msg.fileUrl} controls className="img-fluid rounded" style={{ maxHeight: '300px' }} />
                                    )}

                                    {msg.type === 'audio' && <AudioMessage src={msg.fileUrl} />}

                                    {msg.type === 'file' && (
                                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-decoration-none d-flex align-items-center gap-2 text-reset bg-white bg-opacity-25 p-2 rounded">
                                            <FaCircleInfo /> <span>Download File</span>
                                        </a>
                                    )}
                                </div>
                                <div className={`text-end mt-1 ${isMe ? 'me-1' : 'ms-1'}`}>
                                    <small className="text-muted" style={{ fontSize: '0.65rem' }}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </small>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            {conversation.mutedBy?.includes(currentUser._id) && (
                <div className="bg-warning-subtle text-warning-emphasis text-center py-1 small">
                    You have muted notifications for this conversation.
                </div>
            )}
            <MessageInput onSendMessage={onSendMessage} />

            {/* Settings Modal */}
            <ChatSettingsModal
                show={showSettings}
                onHide={() => setShowSettings(false)}
                conversation={conversation}
                currentUser={currentUser}
                onChange={() => {
                    onSettingsChange();
                    // maybe close modal if deleted?
                }}
            />
        </div>
    );
};

export default ChatWindow;
