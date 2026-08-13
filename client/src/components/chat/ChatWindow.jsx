import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
    FaEllipsisV, FaArrowLeft, FaTrash, FaBellSlash, FaBell,
    FaChevronDown, FaCircle
} from 'react-icons/fa';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

const ChatWindow = ({
    conversation,
    messages = [],
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
    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const [showScrollBottom, setShowScrollBottom] = useState(false);

    const otherUser = conversation?.otherUser || conversation?.participants?.find(p => p._id !== currentUser?._id) || {};

    const scrollToBottom = useCallback((smooth = true) => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
        }
    }, []);

    useEffect(() => {
        scrollToBottom(false);
    }, [conversation?._id]);

    useEffect(() => {
        // Auto scroll on new message if close to bottom
        if (messagesContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 240;
            if (isNearBottom) {
                scrollToBottom(true);
            }
        }
    }, [messages, isTyping, scrollToBottom]);

    const handleScroll = () => {
        if (!messagesContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        setShowScrollBottom(distanceFromBottom > 220);
    };

    const getInitials = (user) => {
        if (!user) return 'U';
        const f = user.firstName ? user.firstName.charAt(0) : (user.name ? user.name.charAt(0) : '');
        const l = user.lastName ? user.lastName.charAt(0) : (user.name && user.name.includes(' ') ? user.name.split(' ').pop().charAt(0) : '');
        return (f + l).toUpperCase() || 'U';
    };

    const formatDateDivider = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) return 'Today';
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    // Grouping Messages by Sender and Date Breaks
    const messageGroupsWithDates = [];
    let lastDate = null;
    let currentGroup = null;

    messages.forEach((msg) => {
        const msgDateStr = msg.createdAt ? new Date(msg.createdAt).toDateString() : '';
        const isNewDate = msgDateStr && msgDateStr !== lastDate;

        if (isNewDate) {
            if (currentGroup) {
                messageGroupsWithDates.push(currentGroup);
                currentGroup = null;
            }
            messageGroupsWithDates.push({
                type: 'date-divider',
                dateStr: formatDateDivider(msg.createdAt),
                key: `divider_${msgDateStr}_${msg._id}`
            });
            lastDate = msgDateStr;
        }

        const isOwn = msg.sender?._id === currentUser?._id || msg.sender === currentUser?._id;

        if (currentGroup && currentGroup.senderId === (msg.sender?._id || msg.sender)) {
            currentGroup.messages.push(msg);
        } else {
            if (currentGroup) messageGroupsWithDates.push(currentGroup);
            currentGroup = {
                type: 'message-group',
                senderId: msg.sender?._id || msg.sender,
                isOwn: isOwn,
                sender: msg.sender,
                messages: [msg]
            };
        }
    });
    if (currentGroup) messageGroupsWithDates.push(currentGroup);

    return (
        <div className="d-flex flex-column h-100 bg-white w-100 position-relative" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
            {/* Topbar Header */}
            <div
                className="bg-white border-bottom px-2.5 px-sm-3 py-2 d-flex align-items-center justify-content-between shadow-sm flex-shrink-0"
                style={{ minHeight: '58px', maxHeight: '62px', zIndex: 10 }}
            >
                {/* Left: Back Button + User Identity */}
                <div className="d-flex align-items-center flex-grow-1 min-w-0 overflow-hidden me-2">
                    {/* Back button (Mobile only) */}
                    <button
                        type="button"
                        className="btn btn-light btn-sm rounded-circle p-1 me-2 d-md-none flex-shrink-0 d-flex align-items-center justify-content-center hover-scale"
                        style={{ width: '36px', height: '36px', minWidth: '36px' }}
                        onClick={onBack}
                        aria-label="Back to conversations"
                        title="Back to conversations"
                    >
                        <FaArrowLeft size={15} className="text-dark" />
                    </button>

                    {/* Contact Avatar with Online Dot */}
                    <div className="position-relative me-2.5 flex-shrink-0">
                        {otherUser.profilePicture ? (
                            <img
                                src={otherUser.profilePicture}
                                alt={otherUser.firstName || "User"}
                                className="rounded-circle border object-fit-cover shadow-sm"
                                style={{ width: '38px', height: '38px' }}
                            />
                        ) : (
                            <div
                                className="rounded-circle border bg-light d-flex align-items-center justify-content-center text-primary fw-bold shadow-sm"
                                style={{ width: '38px', height: '38px', fontSize: '13px' }}
                            >
                                {getInitials(otherUser)}
                            </div>
                        )}
                        {otherUser.isOnline && (
                            <span
                                className="position-absolute bottom-0 end-0 bg-success border border-2 border-white rounded-circle shadow-sm"
                                style={{ width: '11px', height: '11px' }}
                            />
                        )}
                    </div>

                    {/* Contact Name & Status */}
                    <div className="overflow-hidden min-w-0">
                        <h6 className="mb-0 fw-bold text-dark text-truncate font-outfit" style={{ fontSize: '0.9rem' }}>
                            {otherUser.firstName} {otherUser.lastName || otherUser.name}
                        </h6>
                        <small className="d-block text-truncate" style={{ fontSize: '0.72rem' }}>
                            {isTyping ? (
                                <span className="text-primary fw-bold animate-pulse">typing...</span>
                            ) : otherUser.isOnline ? (
                                <span className="text-success fw-semibold">Active now</span>
                            ) : otherUser.lastSeen ? (
                                <span className="text-muted">
                                    Last seen {new Date(otherUser.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            ) : (
                                <span className="text-muted">Offline</span>
                            )}
                        </small>
                    </div>
                </div>

                {/* Right: Dropdown Actions Menu */}
                <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                    <div className="dropdown">
                        <button
                            type="button"
                            className="btn btn-light btn-sm rounded-circle text-muted p-1 d-flex align-items-center justify-content-center hover-lift"
                            style={{ width: '34px', height: '34px' }}
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            title="Conversation options"
                        >
                            <FaEllipsisV size={13} />
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3" style={{ zIndex: 1050, minWidth: '170px' }}>
                            <li>
                                <button
                                    type="button"
                                    className="dropdown-item small py-2 d-flex align-items-center"
                                    onClick={() => onMuteConversation(conversation._id)}
                                >
                                    {isMuted ? (
                                        <><FaBell className="me-2 text-primary" size={13} /> Unmute Chat</>
                                    ) : (
                                        <><FaBellSlash className="me-2 text-secondary" size={13} /> Mute Notifications</>
                                    )}
                                </button>
                            </li>
                            <li><hr className="dropdown-divider my-1" /></li>
                            <li>
                                <button
                                    type="button"
                                    className="dropdown-item small py-2 text-danger d-flex align-items-center"
                                    onClick={() => {
                                        if (window.confirm("Are you sure you want to delete this conversation? This will permanently delete messages.")) {
                                            onDeleteConversation(conversation._id);
                                        }
                                    }}
                                >
                                    <FaTrash className="me-2" size={12} /> Delete Conversation
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Messages Scroll Area */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-grow-1 overflow-y-auto overflow-x-hidden p-2 p-sm-3 chat-messages-area position-relative"
                style={{
                    background: '#f8fafc',
                    minHeight: 0,
                    overscrollBehavior: 'contain',
                    WebkitOverflowScrolling: 'touch'
                }}
            >
                <div className="d-flex flex-column" style={{ minHeight: '100%' }}>
                    {/* mt-auto ensures short message histories align to bottom without breaking top scroll physics */}
                    <div className="mt-auto w-100">
                        {messages.length === 0 && (
                            <div className="text-center py-5 my-auto text-muted animate-fade-in">
                                {otherUser.profilePicture ? (
                                    <img
                                        src={otherUser.profilePicture}
                                        className="rounded-circle mb-3 border shadow-sm object-fit-cover"
                                        width="68"
                                        height="68"
                                        alt=""
                                    />
                                ) : (
                                    <div
                                        className="rounded-circle mb-3 border shadow-sm bg-white d-flex align-items-center justify-content-center text-primary fs-3 fw-bold mx-auto"
                                        style={{ width: '68px', height: '68px' }}
                                    >
                                        {getInitials(otherUser)}
                                    </div>
                                )}
                                <h5 className="fw-bold font-outfit text-dark mb-1">Say hello to {otherUser.firstName || 'User'}! 👋</h5>
                                <p className="small text-muted mb-0" style={{ maxWidth: '300px', margin: '0 auto' }}>
                                    This is the beginning of your direct conversation on UC-Central.
                                </p>
                            </div>
                        )}

                        {messageGroupsWithDates.map((item, idx) => {
                            if (item.type === 'date-divider') {
                                return (
                                    <div key={item.key || idx} className="text-center my-3">
                                        <span
                                            className="badge bg-white text-secondary border shadow-xs px-3 py-1 rounded-pill fw-medium"
                                            style={{ fontSize: '0.72rem', letterSpacing: '0.3px' }}
                                        >
                                            {item.dateStr}
                                        </span>
                                    </div>
                                );
                            }

                            const group = item;
                            return (
                                <div
                                    key={idx}
                                    className={`mb-2 ${group.isOwn ? 'align-self-end ms-auto' : 'align-self-start me-auto w-100'}`}
                                >
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
                            );
                        })}

                        {/* Live Typing Indicator */}
                        {isTyping && (
                            <div className="mb-2 align-self-start animate-fade-in">
                                <div className="d-flex align-items-center ms-1">
                                    {otherUser.profilePicture ? (
                                        <img
                                            src={otherUser.profilePicture}
                                            className="rounded-circle me-2 object-fit-cover shadow-xs"
                                            width="26"
                                            height="26"
                                            alt=""
                                        />
                                    ) : (
                                        <div
                                            className="rounded-circle me-2 bg-white border d-flex align-items-center justify-content-center text-primary fw-bold shadow-xs"
                                            style={{ width: '26px', height: '26px', fontSize: '10px' }}
                                        >
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

            {/* Scroll to Bottom Floating Action Pill */}
            {showScrollBottom && (
                <button
                    type="button"
                    className="position-absolute end-0 me-3 mb-2 btn btn-white border bg-white text-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center hover-lift animate-spring-pop"
                    style={{
                        bottom: '72px',
                        width: '38px',
                        height: '38px',
                        zIndex: 100
                    }}
                    onClick={() => scrollToBottom(true)}
                    title="Jump to latest message"
                >
                    <FaChevronDown size={14} />
                </button>
            )}

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

