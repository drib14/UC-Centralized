import React, { useState } from 'react';
import { FaFile, FaFilePdf, FaFileWord, FaFileExcel, FaDownload, FaCheck, FaCheckDouble } from 'react-icons/fa';

const MessageBubble = ({ message, isOwn, sender, showAvatar, showHeader }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (user) => {
        if (!user) return 'U';
        const f = user.firstName ? user.firstName.charAt(0) : (user.name ? user.name.charAt(0) : '');
        const l = user.lastName ? user.lastName.charAt(0) : (user.name && user.name.includes(' ') ? user.name.split(' ').pop().charAt(0) : '');
        return (f + l).toUpperCase() || 'U';
    };

    const getFileIcon = (filename) => {
        if (!filename) return <FaFile />;
        const ext = filename.split('.').pop().toLowerCase();
        if (ext === 'pdf') return <FaFilePdf className="text-danger" />;
        if (['doc', 'docx'].includes(ext)) return <FaFileWord className="text-primary" />;
        if (['xls', 'xlsx'].includes(ext)) return <FaFileExcel className="text-success" />;
        return <FaFile className="text-secondary" />;
    };

    // Determine content based on type
    const renderContent = () => {
        switch (message.type) {
            case 'image':
                return (
                    <div className="message-image-container position-relative rounded overflow-hidden mb-1" style={{ maxWidth: '100%' }}>
                        {!imageLoaded && <div className="placeholder-glow" style={{ height: '150px', width: '200px' }}><div className="placeholder w-100 h-100"></div></div>}
                        <img
                            src={message.fileUrl}
                            alt="Shared image"
                            className={`img-fluid ${imageLoaded ? 'd-block' : 'd-none'}`}
                            onLoad={() => setImageLoaded(true)}
                            style={{ cursor: 'pointer', maxHeight: '300px' }}
                            onClick={() => window.open(message.fileUrl, '_blank')}
                        />
                    </div>
                );
            case 'video':
                return (
                    <div className="message-video-container rounded overflow-hidden mb-1" style={{ maxWidth: '100%' }}>
                         <video controls src={message.fileUrl} className="w-100" style={{ maxHeight: '300px' }} />
                    </div>
                );
            case 'audio':
                return (
                    <div className="message-audio-container mb-1" style={{ minWidth: '200px' }}>
                        <audio controls src={message.fileUrl} className="w-100" />
                    </div>
                );
            case 'file':
                // Attempt to get filename from URL
                const fileName = message.fileUrl.split('/').pop() || "Attachment";
                return (
                    <div className="d-flex align-items-center p-2 rounded bg-light border mb-1" style={{ maxWidth: '100%' }}>
                        <div className="me-2 fs-4">{getFileIcon(message.fileUrl)}</div>
                        <div className="flex-grow-1 text-truncate small" style={{ maxWidth: '150px' }}>{fileName}</div>
                        <a href={message.fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-light border-0 ms-2 text-primary">
                            <FaDownload />
                        </a>
                    </div>
                );
            default:
                return <div className="message-text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{message.content}</div>;
        }
    };

    // Read Status Logic
    const getReadStatus = () => {
        if (!isOwn) return null;
        // Logic: if readBy contains others besides sender
        const isRead = message.readBy && message.readBy.length > 1;
        return (
            <span className={`ms-1 small ${isRead ? 'text-info' : 'text-white-50'}`} title={isRead ? "Seen" : "Sent"}>
                {isRead ? <FaCheckDouble size={10} /> : <FaCheck size={10} />}
            </span>
        );
    };

    return (
        <div className={`d-flex mb-1 ${isOwn ? 'justify-content-end' : 'justify-content-start'}`}>
            {/* Avatar for other user */}
            {!isOwn && (
                <div className="me-2 d-flex align-items-end" style={{ width: '32px' }}>
                    {showAvatar ? (
                         sender?.profilePicture ? (
                            <img
                                src={sender.profilePicture}
                                alt={sender.firstName}
                                className="rounded-circle border"
                                width="32"
                                height="32"
                                title={`${sender?.firstName} ${sender?.lastName}`}
                                style={{ objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="rounded-circle border bg-white d-flex align-items-center justify-content-center text-primary fw-bold" style={{width: '32px', height: '32px', fontSize: '12px'}} title={`${sender?.firstName} ${sender?.lastName}`}>
                                {getInitials(sender)}
                            </div>
                        )
                    ) : (
                        <div style={{ width: '32px' }}></div>
                    )}
                </div>
            )}

            <div className={`d-flex flex-column ${isOwn ? 'align-items-end' : 'align-items-start'}`} style={{ maxWidth: '75%' }}>
                {/* Sender Name (Optional - mostly for group chats, but nice for context if first message) */}
                {!isOwn && showHeader && (
                    <small className="text-muted ms-1 mb-1" style={{ fontSize: '0.75rem' }}>{sender?.firstName}</small>
                )}

                {/* Bubble */}
                <div
                    className={`p-2 px-3 shadow-sm position-relative ${isOwn ? 'bg-primary text-white rounded-start-3 rounded-top-3' : 'bg-white text-dark border rounded-end-3 rounded-top-3'}`}
                    style={{
                        borderRadius: '18px',
                        borderBottomRightRadius: isOwn ? '4px' : '18px',
                        borderBottomLeftRadius: !isOwn ? '4px' : '18px',
                        width: 'fit-content', // Ensure it shrinks to text
                        minWidth: '60px' // Minimum width for timestamp
                    }}
                >
                    {renderContent()}

                    {/* Timestamp & Status inside bubble bottom right */}
                    <div className={`d-flex align-items-center justify-content-end mt-1 ${isOwn ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.65rem', lineHeight: 1 }}>
                        <span className="me-1">{formatTime(message.createdAt)}</span>
                        {getReadStatus()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
