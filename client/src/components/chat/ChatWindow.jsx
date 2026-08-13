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
    onDeleteMessage,
    onRequestForward,
    onToggleReaction
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

    messages.forEach((msg) => {
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
        <div className="d-flex flex-column h-100 bg-white w-100" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div className="bg-white border-bottom px-2 px-sm-3 py-2 d-flex align-items-center justify-content-between shadow-sm flex-shrink-0" style={{ minHeight: '56px', maxHeight: '60px', zIndex: 10 }}>
                <div className="d-flex align-items-center flex-grow-1 overflow-hidden me-2">
                    <button className="btn btn-light btn-sm rounded-circle p-1 me-2 d-md-none flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} onClick={onBack} aria-label="Back to conversations">
                        <FaArrowLeft size={14} />
                    </button>

                    <div className="position-relative me-2 flex-shrink-0">
                        {otherUser.profilePicture ? (
                            <img
                                src={otherUser.profilePicture}
                                alt={otherUser.firstName}
                                className="rounded-circle border"
                                width="36" height="36"
                                style={{ objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="rounded-circle border bg-light d-flex align-items-center justify-content-center text-primary fw-bold" style={{ width: '36px', height: '36px', fontSize: '13px' }}>
                                {getInitials(otherUser)}
                            </div>
                        )}
                        {otherUser.isOnline && (
                            <span className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle" style={{ width: '9px', height: '9px' }}></span>
                        )}
                    </div>
                    <div className="overflow-hidden">
                        <h6 className="mb-0 fw-bold text-truncate font-outfit" style={{ fontSize: '0.925rem' }}>{otherUser.firstName} {otherUser.lastName || otherUser.name}</h6>
                        <small className="text-muted d-block text-truncate" style={{ fontSize: '0.72rem' }}>
                            {otherUser.isOnline ? 'Active now' : (otherUser.lastSeen ? `Last seen ${new Date(otherUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline')}
                        </small>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                    <div className="dropdown">
                        <button className="btn btn-light btn-sm rounded-circle text-muted p-1 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} data-bs-toggle="dropdown">
                            <FaEllipsisV size={13} />
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
                                    if (window.confirm("Are you sure you want to delete this conversation? This cannot be undone.")) {
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

            {/* Messages Scroll Area */}
            <div
                className="flex-grow-1 overflow-y-auto overflow-x-hidden p-2 p-sm-3 chat-messages-area"
                style={{
                    background: '#f8fafc',
                    minHeight: 0,
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                <div className="d-flex flex-column" style={{ minHeight: '100%' }}>
                    {/* mt-auto pushes short message list to bottom cleanly without creating bottom whitespace on scroll */}
                    <div className="mt-auto w-100">
                        {messages.length === 0 && (
                            <div className="text-center py-4 my-auto text-muted">
                                {otherUser.profilePicture ? (
                                    <img src={otherUser.profilePicture} className="rounded-circle mb-3 border shadow-sm" width="64" height="64" alt="" style={{ objectFit: 'cover' }} />
                                ) : (
                                    <div className="rounded-circle mb-3 border shadow-sm bg-white d-flex align-items-center justify-content-center text-primary fs-3 fw-bold mx-auto" style={{ width: '64px', height: '64px' }}>
                                        {getInitials(otherUser)}
                                    </div>
                                )}
                                <h5 className="fw-bold font-outfit text-dark">Say hello to {otherUser.firstName || 'User'}! 👋</h5>
                                <p className="small text-muted mb-0">This is the beginning of your direct conversation.</p>
                            </div>
                        )}

                        {groupedMessages.map((group, gIndex) => (
                            <div key={gIndex} className={`mb-2 ${group.isOwn ? 'align-self-end ms-auto' : 'align-self-start me-auto w-100'}`}>
                                {group.messages.map((msg, mIndex) => (
                                    <MessageBubble
                                        key={msg._id || mIndex}
                                        message={msg}
                                        isOwn={group.isOwn}
                                        sender={group.sender}
                                        currentUser={currentUser}
                                        showAvatar={!group.isOwn && mIndex === group.messages.length - 1}
                                        showHeader={!group.isOwn && mIndex === 0}
                                        onViewImage={onViewImage}
                                        onViewVideo={onViewVideo}
                                        onEditMessage={onEditMessage}
                                        onDeleteMessage={onDeleteMessage}
                                        onRequestForward={onRequestForward}
                                        onToggleReaction={onToggleReaction}
                                    />
                                ))}
                            </div>
                        ))}

                        {isTyping && (
                            <div className="mb-2 align-self-start">
                                <div className="d-flex align-items-center ms-1">
                                    {otherUser.profilePicture ? (
                                        <img
                                            src={otherUser.profilePicture}
                                            className="rounded-circle me-2"
                                            width="24" height="24"
                                            alt=""
                                        />
                                    ) : (
                                        <div className="rounded-circle me-2 bg-white border d-flex align-items-center justify-content-center text-primary fw-bold" style={{ width: '24px', height: '24px', fontSize: '10px' }}>
                                            {getInitials(otherUser)}
                                        </div>
                                    )}
                                    <TypingIndicator />
                                </div>
                            </div>
                        )}
                    </div>
                    <div ref={messagesEndRef} style={{ height: '1px', width: '100%' }} />
                </div>
            </div>

            {/* Input Area */}
            <div className="flex-shrink-0 bg-white border-top">
                <ChatInput
                    onSendMessage={onSendMessage}
                    onTyping={onTyping}
                    onStopTyping={onStopTyping}
                />
            </div>
        </div>
    );
};

export default ChatWindow;

