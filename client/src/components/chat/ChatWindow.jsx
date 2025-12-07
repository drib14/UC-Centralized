import React, { useRef, useEffect } from 'react';
import { FaEllipsisV, FaArrowLeft, FaTrash, FaBellSlash, FaBell } from 'react-icons/fa';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

const ChatWindow = ({
    conversation,
    messages,
    currentUser,
    onSendMessage,
    onDeleteConversation,
    onMuteConversation,
    onBack,
    isMuted,
    isTyping,
    onTyping,
    onStopTyping,
    onViewImage,
    onViewVideo,
    onEditMessage,
    onDeleteMessage
}) => {
    const messagesEndRef = useRef(null);
    const otherUser = conversation.otherUser || conversation.participants.find(p => p._id !== currentUser._id) || {};

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const getInitials = (user) => {
        if (!user) return 'U';
        const f = user.firstName ? user.firstName.charAt(0) : (user.name ? user.name.charAt(0) : '');
        const l = user.lastName ? user.lastName.charAt(0) : (user.name && user.name.includes(' ') ? user.name.split(' ').pop().charAt(0) : '');
        return (f + l).toUpperCase() || 'U';
    };

    // Grouping Logic
    const groupedMessages = [];
    let currentGroup = null;

    messages.forEach((msg, index) => {
        const isOwn = msg.sender._id === currentUser._id;

        if (currentGroup && currentGroup.senderId === msg.sender._id) {
            currentGroup.messages.push(msg);
        } else {
            if (currentGroup) groupedMessages.push(currentGroup);
            currentGroup = {
                senderId: msg.sender._id,
                isOwn: isOwn,
                sender: msg.sender,
                messages: [msg]
            };
        }
    });
    if (currentGroup) groupedMessages.push(currentGroup);

    return (
        <div className="d-flex flex-column h-100 bg-light">
            {/* Header */}
            <div className="bg-white border-bottom p-3 d-flex align-items-center shadow-sm" style={{ height: '70px', zIndex: 10 }}>
                <button className="btn btn-link text-dark me-2 d-md-none" onClick={onBack}>
                    <FaArrowLeft />
                </button>

                <div className="d-flex align-items-center flex-grow-1">
                    <div className="position-relative me-3">
                        {otherUser.profilePicture ? (
                            <img
                                src={otherUser.profilePicture}
                                alt={otherUser.firstName}
                                className="rounded-circle border"
                                width="40" height="40"
                                style={{ objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="rounded-circle border bg-light d-flex align-items-center justify-content-center text-primary fw-bold" style={{width: '40px', height: '40px'}}>
                                {getInitials(otherUser)}
                            </div>
                        )}
                        {otherUser.isOnline && (
                            <span className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle" style={{ width: '10px', height: '10px' }}></span>
                        )}
                    </div>
                    <div>
                        <h6 className="mb-0 fw-bold">{otherUser.firstName} {otherUser.lastName || otherUser.name}</h6>
                        <small className="text-muted">
                            {otherUser.isOnline ? 'Active now' : (otherUser.lastSeen ? `Last seen ${new Date(otherUser.lastSeen).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Offline')}
                        </small>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <div className="dropdown">
                        <button className="btn btn-light rounded-circle text-muted" data-bs-toggle="dropdown">
                            <FaEllipsisV />
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow border-0">
                            <li>
                                <button className="dropdown-item" onClick={() => onMuteConversation(conversation._id)}>
                                    {isMuted ? <><FaBell className="me-2 text-primary" /> Unmute</> : <><FaBellSlash className="me-2" /> Mute Notifications</>}
                                </button>
                            </li>
                            <li><hr className="dropdown-divider" /></li>
                            <li>
                                <button className="dropdown-item text-danger" onClick={() => {
                                    if(window.confirm("Are you sure you want to delete this conversation? This cannot be undone.")) {
                                        onDeleteConversation(conversation._id);
                                    }
                                }}>
                                    <FaTrash className="me-2" /> Delete Conversation
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow-1 overflow-auto p-3" style={{ background: '#f0f2f5' }}>
                <div className="d-flex flex-column justify-content-end min-h-100">
                    {/* Welcome / Info if empty */}
                    {messages.length === 0 && (
                        <div className="text-center my-5 text-muted">
                            {otherUser.profilePicture ? (
                                <img src={otherUser.profilePicture} className="rounded-circle mb-3 border shadow-sm" width="80" height="80" alt="" style={{ objectFit: 'cover' }} />
                            ) : (
                                <div className="rounded-circle mb-3 border shadow-sm bg-white d-flex align-items-center justify-content-center text-primary display-4 fw-bold mx-auto" style={{width: '80px', height: '80px'}}>
                                    {getInitials(otherUser)}
                                </div>
                            )}
                            <h5>Say hello to {otherUser.firstName}! 👋</h5>
                            <p>This is the beginning of your conversation.</p>
                        </div>
                    )}

                    {groupedMessages.map((group, gIndex) => (
                        <div key={gIndex} className={`mb-3 ${group.isOwn ? 'align-self-end' : 'align-self-start w-100'}`}>
                            {group.messages.map((msg, mIndex) => (
                                <MessageBubble
                                    key={msg._id || mIndex}
                                    message={msg}
                                    isOwn={group.isOwn}
                                    sender={group.sender}
                                    showAvatar={!group.isOwn && mIndex === group.messages.length - 1}
                                    showHeader={!group.isOwn && mIndex === 0}
                                    onViewImage={onViewImage}
                                    onViewVideo={onViewVideo}
                                    onEditMessage={onEditMessage}
                                    onDeleteMessage={onDeleteMessage}
                                />
                            ))}
                        </div>
                    ))}

                    {isTyping && (
                         <div className="mb-3 align-self-start">
                             <div className="d-flex align-items-center ms-2">
                                {otherUser.profilePicture ? (
                                    <img
                                        src={otherUser.profilePicture}
                                        className="rounded-circle me-2"
                                        width="24" height="24"
                                        alt=""
                                    />
                                ) : (
                                    <div className="rounded-circle me-2 bg-white border d-flex align-items-center justify-content-center text-primary fw-bold" style={{width: '24px', height: '24px', fontSize: '10px'}}>
                                        {getInitials(otherUser)}
                                    </div>
                                )}
                                <TypingIndicator />
                             </div>
                         </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <ChatInput
                onSendMessage={onSendMessage}
                onTyping={onTyping}
                onStopTyping={onStopTyping}
            />
        </div>
    );
};

export default ChatWindow;
