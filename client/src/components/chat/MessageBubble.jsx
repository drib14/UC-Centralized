import React, { useState } from 'react';
import { FaFile, FaFilePdf, FaFileWord, FaFileExcel, FaDownload, FaCheck, FaCheckDouble, FaPlay } from 'react-icons/fa';

const MessageBubble = ({ message, isOwn, sender, showAvatar, showHeader, onViewImage, onViewVideo }) => {
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

    const isMedia = message.type === 'image' || message.type === 'video';

    // Determine content based on type
    const renderContent = () => {
        switch (message.type) {
            case 'image':
                return (
                    <div
                        className="message-image-container position-relative rounded overflow-hidden"
                        style={{ maxWidth: '100%', cursor: 'pointer' }}
                        onClick={() => onViewImage && onViewImage(message.fileUrl)}
                    >
                        {!imageLoaded && <div className="placeholder-glow" style={{ height: '150px', width: '200px' }}><div className="placeholder w-100 h-100"></div></div>}
                        <img
                            src={message.fileUrl}
                            alt="Shared image"
                            className={`img-fluid ${imageLoaded ? 'd-block' : 'd-none'}`}
                            onLoad={() => setImageLoaded(true)}
                            style={{ maxHeight: '300px' }}
                        />
                    </div>
                );
            case 'video':
                return (
                    <div
                        className="message-video-container position-relative rounded overflow-hidden bg-black d-flex align-items-center justify-content-center"
                        style={{ width: '250px', height: '150px', cursor: 'pointer' }}
                        onClick={() => onViewVideo && onViewVideo(message.fileUrl)}
                    >
                         <video
                            src={message.fileUrl}
                            className="w-100 h-100"
                            style={{ objectFit: 'cover' }}
                            muted // Mute thumbnail
                         />
                         <div className="position-absolute top-50 start-50 translate-middle bg-dark bg-opacity-50 rounded-circle d-flex align-items-center justify-content-center backdrop-blur" style={{ width: '50px', height: '50px' }}>
                             <FaPlay className="text-white ps-1" size={20} />
                         </div>
                    </div>
                );
            case 'audio':
                return (
                    <div className="message-audio-container mb-1" style={{ minWidth: '200px' }}>
                        <audio controls src={message.fileUrl} className="w-100" />
                    </div>
                );
            case 'file':
                // Use stored fileName if available
                const fileName = message.fileName || message.fileUrl.split('/').pop() || "Attachment";
                return (
                    <div className="d-flex align-items-center p-2 rounded bg-light border mb-1" style={{ maxWidth: '100%' }}>
                        <div className="me-2 fs-4">{getFileIcon(fileName)}</div>
                        <div className="flex-grow-1 text-truncate small fw-bold text-dark" style={{ maxWidth: '150px' }}>{fileName}</div>
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
        // Text color depends on background (white if media or own bubble, muted if other)
        // Actually for media, we are outside a bubble, so text should be muted/dark?
        // But for 'isOwn', we usually want it inside?
        // Wait, if isMedia is true, we removed the bubble container.
        // So the status is floating below or beside?
        // The container logic below handles this.

        return (
            <span className={`ms-1 small ${isRead ? 'text-primary' : 'text-muted'}`} title={isRead ? "Seen" : "Sent"}>
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
                {/* Sender Name */}
                {!isOwn && showHeader && (
                    <small className="text-muted ms-1 mb-1" style={{ fontSize: '0.75rem' }}>{sender?.firstName}</small>
                )}

                {/* Content Container */}
                {/* If media, no bubble styling. If text/file, bubble styling. */}
                <div
                    className={`
                        ${!isMedia ? (isOwn ? 'p-2 px-3 bg-primary text-white shadow-sm' : 'p-2 px-3 bg-white text-dark border shadow-sm') : 'mb-1 shadow-sm'}
                        position-relative
                    `}
                    style={{
                        borderRadius: isMedia ? '12px' : '18px',
                        borderBottomRightRadius: isOwn ? '4px' : (isMedia ? '12px' : '18px'),
                        borderBottomLeftRadius: !isOwn ? '4px' : (isMedia ? '12px' : '18px'),
                        width: 'fit-content',
                        minWidth: isMedia ? 'auto' : '60px'
                    }}
                >
                    {renderContent()}

                    {/* Timestamp & Status */}
                    {/* For text, inside bubble. For media, maybe overlay or below? */}
                    {/* User said "dont put it on bubble". So for media, it's just the image. */}
                    {/* Where does timestamp go? Usually overlay or below. */}
                    {/* I'll put it below for media to be clean, or overlay if it fits. */}
                    {/* Let's keep it consistent: always inside the container div.
                        If media container has no bg, it might be hard to read.
                        I'll stick to putting it at the bottom of the content container for now.
                        For media, I'll add a subtle gradient or background for the timestamp if needed,
                        OR just put it in the corner of the image container.
                    */}
                    {!isMedia && (
                        <div className={`d-flex align-items-center justify-content-end mt-1 ${isOwn ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.65rem', lineHeight: 1 }}>
                            <span className="me-1">{formatTime(message.createdAt)}</span>
                            {/* Override status color for own bubble */}
                            <span className={`${isOwn ? 'text-white-50' : ''}`}>
                                {getReadStatus()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Timestamp for Media (Outside/Below) */}
                {isMedia && (
                    <div className="d-flex align-items-center justify-content-end mt-1 pe-1" style={{ fontSize: '0.65rem', lineHeight: 1 }}>
                        <span className="text-muted me-1">{formatTime(message.createdAt)}</span>
                        {getReadStatus()}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;
