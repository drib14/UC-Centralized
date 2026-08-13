import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
    FaFile,
    FaFilePdf,
    FaFileWord,
    FaFileExcel,
    FaFilePowerpoint,
    FaFileArchive,
    FaFileCode,
    FaFileAlt,
    FaDownload,
    FaCheck,
    FaCheckDouble,
    FaPlay,
    FaPause,
    FaEllipsisV,
    FaEdit,
    FaTrash,
    FaTimes,
    FaSave,
    FaShare,
    FaRegSmile,
    FaPlus
} from 'react-icons/fa';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

// Helper to format file sizes cleanly
const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Helper for audio duration formatting
const formatAudioTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// --- AUDIO PLAYER COMPONENT (Messenger Style) ---
const MessengerAudioPlayer = ({ src, isOwn }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => {
            if (audio.duration && !isNaN(audio.duration)) {
                setDuration(audio.duration);
            }
        };
        const onEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('durationchange', updateDuration);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('durationchange', updateDuration);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error(e));
        }
    };

    const handleSeek = (e) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const seekTime = (clickX / width) * duration;
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    // Simulated waveform bars heights
    const waveformHeights = [35, 60, 40, 85, 55, 95, 70, 45, 80, 60, 90, 50, 75, 40, 65, 85, 50, 70, 40, 60];

    return (
        <div className={`messenger-audio-player d-flex align-items-center p-2 rounded-4 ${isOwn ? 'text-white' : 'text-dark'}`} style={{ minWidth: '220px', maxWidth: '300px' }}>
            <audio ref={audioRef} src={src} preload="metadata" />
            
            <button
                type="button"
                className={`btn rounded-circle d-flex align-items-center justify-content-center me-2 shadow-sm ${isOwn ? 'btn-light text-primary' : 'btn-primary text-white'}`}
                style={{ width: '36px', height: '36px', flexShrink: 0 }}
                onClick={togglePlay}
            >
                {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} className="ms-1" />}
            </button>

            <div className="flex-grow-1 d-flex flex-column justify-content-center cursor-pointer" onClick={handleSeek}>
                {/* Waveform Visualization */}
                <div className="d-flex align-items-center gap-1 mb-1" style={{ height: '24px' }}>
                    {waveformHeights.map((h, i) => {
                        const barProgress = (i / waveformHeights.length) * 100;
                        const isFilled = barProgress <= progress;
                        return (
                            <div
                                key={i}
                                className="rounded-pill transition-all"
                                style={{
                                    width: '3px',
                                    height: `${h}%`,
                                    backgroundColor: isFilled
                                        ? (isOwn ? '#ffffff' : 'var(--uc-navy-primary, #002b7f)')
                                        : (isOwn ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 43, 127, 0.2)'),
                                    transform: isPlaying && isFilled ? 'scaleY(1.1)' : 'scaleY(1)',
                                    transition: 'all 0.15s ease'
                                }}
                            />
                        );
                    })}
                </div>

                {/* Duration & Timestamp */}
                <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                    <span>{formatAudioTime(currentTime)}</span>
                    <span>{formatAudioTime(duration || 0)}</span>
                </div>
            </div>
        </div>
    );
};

const MessageBubble = ({
    message,
    isOwn,
    sender,
    currentUser,
    showAvatar,
    showHeader,
    onViewImage,
    onViewVideo,
    onEditMessage,
    onDeleteMessage,
    onRequestForward,
    onToggleReaction
}) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content || "");
    const [showReactionBar, setShowReactionBar] = useState(false);
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    const reactionBarRef = useRef(null);

    // Close reactions bar when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (reactionBarRef.current && !reactionBarRef.current.contains(e.target)) {
                setShowReactionBar(false);
                setShowCustomPicker(false);
            }
        };

        if (showReactionBar || showCustomPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showReactionBar, showCustomPicker]);

    const handleSaveEdit = () => {
        if (editContent.trim() !== message.content) {
            onEditMessage(message._id, editContent);
        }
        setIsEditing(false);
    };

    const handleDelete = () => {
        onDeleteMessage(message._id, isOwn);
    };

    const handleForward = () => {
        onRequestForward(message);
    };

    const handleReact = (emoji) => {
        if (onToggleReaction) {
            onToggleReaction(message._id, emoji);
        }
        setShowReactionBar(false);
        setShowCustomPicker(false);
    };

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

    // Determine specific file category and configuration
    const getFileCategory = (msg) => {
        const fileName = msg.fileName || (msg.fileUrl ? msg.fileUrl.split('/').pop().split('?')[0] : 'Attachment');
        const ext = fileName.split('.').pop().toLowerCase();
        const type = msg.type || '';

        if (type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic'].includes(ext)) {
            return { category: 'image', fileName, ext };
        }
        if (type === 'video' || ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', '3gp'].includes(ext)) {
            return { category: 'video', fileName, ext };
        }
        if (type === 'audio' || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'].includes(ext)) {
            return { category: 'audio', fileName, ext };
        }
        if (type === 'pdf' || ext === 'pdf') {
            return { category: 'pdf', fileName, ext, label: 'PDF Document', color: '#dc2626', bg: '#fef2f2', icon: <FaFilePdf /> };
        }
        if (type === 'document' || ['doc', 'docx', 'rtf', 'odt', 'pages'].includes(ext)) {
            return { category: 'document', fileName, ext, label: 'Word Document', color: '#2563eb', bg: '#eff6ff', icon: <FaFileWord /> };
        }
        if (type === 'spreadsheet' || ['xls', 'xlsx', 'csv', 'tsv', 'ods', 'numbers'].includes(ext)) {
            return { category: 'spreadsheet', fileName, ext, label: 'Spreadsheet', color: '#16a34a', bg: '#f0fdf4', icon: <FaFileExcel /> };
        }
        if (type === 'presentation' || ['ppt', 'pptx', 'odp', 'key'].includes(ext)) {
            return { category: 'presentation', fileName, ext, label: 'Presentation', color: '#ea580c', bg: '#fff7ed', icon: <FaFilePowerpoint /> };
        }
        if (type === 'archive' || ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(ext)) {
            return { category: 'archive', fileName, ext, label: 'Compressed Archive', color: '#7c3aed', bg: '#f5f3ff', icon: <FaFileArchive /> };
        }
        if (type === 'code' || ['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs', 'sql', 'sh', 'xml', 'yaml', 'yml', 'md', 'txt'].includes(ext)) {
            return { category: 'code', fileName, ext, label: ext === 'txt' || ext === 'md' ? 'Text Document' : 'Source Code', color: '#0891b2', bg: '#ecfeff', icon: <FaFileCode /> };
        }
        return { category: 'file', fileName, ext, label: `${ext.toUpperCase() || 'FILE'} File`, color: '#475569', bg: '#f1f5f9', icon: <FaFile /> };
    };

    const fileInfo = message.fileUrl ? getFileCategory(message) : null;
    const isMedia = fileInfo && (fileInfo.category === 'image' || fileInfo.category === 'video');

    // Grouping Reactions for badges
    const groupedReactions = (message.reactions || []).reduce((acc, r) => {
        if (!r || !r.emoji) return acc;
        if (!acc[r.emoji]) {
            acc[r.emoji] = {
                emoji: r.emoji,
                count: 0,
                users: [],
                hasReacted: false
            };
        }
        acc[r.emoji].count += 1;
        const reactionUserId = r.user?._id || r.user;
        const currentUserId = currentUser?._id;
        const isMe = reactionUserId && currentUserId && (reactionUserId.toString() === currentUserId.toString());
        const userName = isMe ? 'You' : (r.user?.firstName ? `${r.user.firstName} ${r.user.lastName || ''}`.trim() : (r.user?.name || 'User'));
        acc[r.emoji].users.push(userName);
        if (isMe) {
            acc[r.emoji].hasReacted = true;
        }
        return acc;
    }, {});

    // Render customized bubble content
    const renderContent = () => {
        if (isEditing) {
            return (
                <div className="d-flex flex-column" style={{ minWidth: '220px' }}>
                    <textarea
                        className="form-control form-control-sm mb-2"
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        rows={2}
                        autoFocus
                    />
                    <div className="btn-group btn-group-sm align-self-end">
                        <button className="btn btn-outline-secondary" onClick={() => { setIsEditing(false); setEditContent(message.content || ""); }}>
                            <FaTimes />
                        </button>
                        <button className="btn btn-primary" onClick={handleSaveEdit}>
                            <FaSave />
                        </button>
                    </div>
                </div>
            );
        }

        if (fileInfo) {
            switch (fileInfo.category) {
                case 'image':
                    return (
                        <div className="d-flex flex-column">
                            <div
                                className="position-relative rounded-4 overflow-hidden shadow-sm hover-lift"
                                style={{ maxWidth: '100%', cursor: 'pointer', backgroundColor: '#0000000a' }}
                                onClick={() => onViewImage && onViewImage(message.fileUrl)}
                            >
                                {!imageLoaded && (
                                    <div className="placeholder-glow d-flex align-items-center justify-content-center bg-light" style={{ height: '200px', width: '280px' }}>
                                        <div className="spinner-border spinner-border-sm text-primary"></div>
                                    </div>
                                )}
                                <img
                                    src={message.fileUrl}
                                    alt={fileInfo.fileName || "Image"}
                                    className={`img-fluid ${imageLoaded ? 'd-block' : 'd-none'}`}
                                    onLoad={() => setImageLoaded(true)}
                                    style={{ maxHeight: '360px', width: '100%', objectFit: 'cover' }}
                                />
                            </div>
                            {message.content && (
                                <div className={`mt-2 px-1 message-text fw-medium ${isOwn ? 'text-white' : 'text-dark'}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.925rem' }}>
                                    {message.content}
                                </div>
                            )}
                        </div>
                    );

                case 'video':
                    return (
                        <div className="d-flex flex-column">
                            <div
                                className="position-relative rounded-4 overflow-hidden bg-black d-flex align-items-center justify-content-center shadow-sm hover-lift"
                                style={{ width: '280px', height: '170px', cursor: 'pointer' }}
                                onClick={() => onViewVideo && onViewVideo(message.fileUrl)}
                            >
                                <video
                                    src={message.fileUrl}
                                    className="w-100 h-100"
                                    style={{ objectFit: 'cover', opacity: 0.85 }}
                                    muted
                                />
                                <div className="position-absolute top-50 start-50 translate-middle bg-dark bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '52px', height: '52px', backdropFilter: 'blur(4px)' }}>
                                    <FaPlay className="text-white ps-1" size={20} />
                                </div>
                            </div>
                            {message.content && (
                                <div className={`mt-2 px-1 message-text fw-medium ${isOwn ? 'text-white' : 'text-dark'}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.925rem' }}>
                                    {message.content}
                                </div>
                            )}
                        </div>
                    );

                case 'audio':
                    return (
                        <div className="d-flex flex-column">
                            <MessengerAudioPlayer src={message.fileUrl} isOwn={isOwn} />
                            {message.content && (
                                <div className={`mt-1 px-1 message-text fw-medium ${isOwn ? 'text-white' : 'text-dark'}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.925rem' }}>
                                    {message.content}
                                </div>
                            )}
                        </div>
                    );

                default:
                    // Documents, Spreadsheets, Presentations, PDFs, Archives, Code, General Files
                    return (
                        <div className="d-flex flex-column" style={{ minWidth: '240px', maxWidth: '320px' }}>
                            <div className="d-flex align-items-center p-2 rounded-3 bg-white border shadow-sm text-dark">
                                {/* Customized File Icon Tile */}
                                <div
                                    className="rounded-3 d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                                    style={{
                                        width: '44px',
                                        height: '44px',
                                        backgroundColor: fileInfo.bg || '#f1f5f9',
                                        color: fileInfo.color || '#475569',
                                        fontSize: '1.4rem'
                                    }}
                                >
                                    {fileInfo.icon}
                                </div>

                                {/* File Details */}
                                <div className="flex-grow-1 overflow-hidden me-2">
                                    <div className="fw-bold text-truncate" style={{ fontSize: '0.875rem' }} title={fileInfo.fileName}>
                                        {fileInfo.fileName}
                                    </div>
                                    <div className="d-flex align-items-center text-muted" style={{ fontSize: '0.72rem' }}>
                                        <span className="badge px-1 py-0 me-1 text-uppercase" style={{ backgroundColor: fileInfo.bg || '#f1f5f9', color: fileInfo.color || '#475569', fontSize: '0.65rem' }}>
                                            {fileInfo.ext}
                                        </span>
                                        {message.fileSize > 0 && <span>{formatFileSize(message.fileSize)}</span>}
                                    </div>
                                </div>

                                {/* Actions (Download) */}
                                <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                    <a
                                        href={message.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={fileInfo.fileName}
                                        className="btn btn-sm btn-light rounded-circle text-primary p-2 d-flex align-items-center justify-content-center hover-lift"
                                        title="Download File"
                                        style={{ width: '32px', height: '32px' }}
                                    >
                                        <FaDownload size={13} />
                                    </a>
                                </div>
                            </div>

                            {message.content && (
                                <div className={`mt-2 px-1 message-text fw-medium ${isOwn ? 'text-white' : 'text-dark'}`} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.925rem' }}>
                                    {message.content}
                                </div>
                            )}
                        </div>
                    );
            }
        }

        // Standard Text Message
        return (
            <div className="message-text" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.94rem', lineHeight: '1.45' }}>
                {message.content}
            </div>
        );
    };

    const getReadStatus = () => {
        if (!isOwn) return null;
        const isRead = message.readBy && message.readBy.length > 1;
        return (
            <span className={`ms-1 small ${isRead ? 'text-primary' : 'text-muted'}`} title={isRead ? "Seen" : "Sent"}>
                {isRead ? <FaCheckDouble size={11} /> : <FaCheck size={11} />}
            </span>
        );
    };

    return (
        <div className={`d-flex mb-2 ${isOwn ? 'justify-content-end' : 'justify-content-start'} position-relative`}>
            {/* Avatar for other user */}
            {!isOwn && (
                <div className="me-2 d-flex align-items-end flex-shrink-0" style={{ width: '32px' }}>
                    {showAvatar ? (
                        sender?.profilePicture ? (
                            <img
                                src={sender.profilePicture}
                                alt={sender.firstName || "User"}
                                className="rounded-circle border"
                                width="32"
                                height="32"
                                title={`${sender?.firstName || ''} ${sender?.lastName || ''}`}
                                style={{ objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="rounded-circle border bg-white d-flex align-items-center justify-content-center text-primary fw-bold" style={{ width: '32px', height: '32px', fontSize: '12px' }} title={`${sender?.firstName || ''} ${sender?.lastName || ''}`}>
                                {getInitials(sender)}
                            </div>
                        )
                    ) : (
                        <div style={{ width: '32px' }}></div>
                    )}
                </div>
            )}

            <div className={`d-flex flex-column ${isOwn ? 'align-items-end' : 'align-items-start'} chat-bubble-group`} style={{ maxWidth: '80%' }}>
                {/* Sender Name for group / received messages */}
                {!isOwn && showHeader && (
                    <small className="text-muted ms-1 mb-1 fw-semibold" style={{ fontSize: '0.75rem' }}>{sender?.firstName}</small>
                )}

                {/* Message Bubble + Action Buttons Row */}
                <div className={`d-flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} align-items-center position-relative group`}>

                    {/* Chat Bubble Surface */}
                    <div
                        className={`
                            ${!isMedia ? (isOwn ? 'p-2 px-3 bg-primary text-white shadow-sm' : 'p-2 px-3 bg-white text-dark border shadow-sm') : ''}
                            position-relative transition-all
                        `}
                        style={{
                            borderRadius: isMedia ? '16px' : '18px',
                            borderBottomRightRadius: isOwn ? '4px' : (isMedia ? '16px' : '18px'),
                            borderBottomLeftRadius: !isOwn ? '4px' : (isMedia ? '16px' : '18px'),
                            width: 'fit-content',
                            minWidth: isMedia ? 'auto' : '50px',
                            maxWidth: '100%'
                        }}
                    >
                        {renderContent()}
                    </div>

                    {/* Hover Controls: Quick Reaction Trigger + More Options Dropdown */}
                    {!isEditing && (
                        <div className="bubble-actions d-flex align-items-center gap-1 mx-2 opacity-0 group-hover-visible transition-opacity">
                            {/* Emoji Reaction Trigger Button */}
                            <button
                                type="button"
                                className="btn btn-sm btn-light rounded-circle shadow-sm text-muted d-flex align-items-center justify-content-center hover-lift p-0"
                                style={{ width: '28px', height: '28px' }}
                                title="React"
                                onClick={() => {
                                    setShowReactionBar(prev => !prev);
                                    setShowCustomPicker(false);
                                }}
                            >
                                <FaRegSmile size={14} className="text-secondary" />
                            </button>

                            {/* Dropdown Menu (Edit / Forward / Delete) */}
                            <div className="dropdown">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-light rounded-circle shadow-sm text-muted d-flex align-items-center justify-content-center hover-lift p-0"
                                    style={{ width: '28px', height: '28px' }}
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                    title="More"
                                >
                                    <FaEllipsisV size={11} />
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3" style={{ zIndex: 1050, minWidth: '130px' }}>
                                    {isOwn && (
                                        <li>
                                            <button className="dropdown-item small d-flex align-items-center py-2" onClick={() => setIsEditing(true)}>
                                                <FaEdit className="me-2 text-primary" size={13} /> Edit
                                            </button>
                                        </li>
                                    )}
                                    <li>
                                        <button className="dropdown-item small d-flex align-items-center py-2" onClick={handleForward}>
                                            <FaShare className="me-2 text-info" size={13} /> Forward
                                        </button>
                                    </li>
                                    <li>
                                        <button className="dropdown-item small d-flex align-items-center py-2 text-danger" onClick={handleDelete}>
                                            <FaTrash className="me-2" size={13} /> Delete
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Messenger Floating Reactions Bar */}
                    {showReactionBar && (
                        <div
                            ref={reactionBarRef}
                            className={`position-absolute floating-reaction-bar bg-white rounded-pill shadow-lg border p-1 d-flex align-items-center gap-1 animate-spring-pop`}
                            style={{
                                bottom: '100%',
                                [isOwn ? 'right' : 'left']: '0',
                                marginBottom: '8px',
                                zIndex: 1060
                            }}
                        >
                            {QUICK_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    className="btn btn-link p-1 text-decoration-none reaction-emoji-btn hover-scale"
                                    onClick={() => handleReact(emoji)}
                                >
                                    <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{emoji}</span>
                                </button>
                            ))}

                            {/* Plus button to trigger custom emoji picker */}
                            <button
                                type="button"
                                className="btn btn-light rounded-circle d-flex align-items-center justify-content-center p-1 hover-lift"
                                style={{ width: '28px', height: '28px', backgroundColor: '#f1f5f9' }}
                                title="Custom Emoji"
                                onClick={() => setShowCustomPicker(prev => !prev)}
                            >
                                <FaPlus size={11} className="text-secondary" />
                            </button>

                            {/* Custom Emoji Picker Popover */}
                            {showCustomPicker && (
                                <div
                                    className="position-absolute shadow-lg border rounded-4 overflow-hidden animate-fade-in"
                                    style={{
                                        top: '100%',
                                        [isOwn ? 'right' : 'left']: '0',
                                        marginTop: '10px',
                                        zIndex: 1070
                                    }}
                                >
                                    <EmojiPicker
                                        onEmojiClick={(emojiData) => handleReact(emojiData.emoji)}
                                        autoFocusSearch={false}
                                        searchPlaceholder="Search emojis..."
                                        previewConfig={{ showPreview: false }}
                                        width={300}
                                        height={360}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Reaction Badges Pill (Messenger Style) */}
                {Object.keys(groupedReactions).length > 0 && (
                    <div
                        className={`d-flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-content-end' : 'justify-content-start'}`}
                        style={{ marginTop: '-4px', zIndex: 5 }}
                    >
                        {Object.values(groupedReactions).map(grp => (
                            <button
                                key={grp.emoji}
                                type="button"
                                className={`btn btn-sm reaction-badge-pill d-flex align-items-center shadow-sm px-2 py-0 rounded-pill border ${grp.hasReacted ? 'bg-primary-subtle border-primary text-primary fw-bold' : 'bg-white text-dark'}`}
                                style={{ fontSize: '0.75rem', height: '22px', transition: 'all 0.15s ease' }}
                                title={grp.users.join(', ')}
                                onClick={() => onToggleReaction && onToggleReaction(message._id, grp.emoji)}
                            >
                                <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{grp.emoji}</span>
                                {grp.count > 1 && <span className="ms-1 fw-bold" style={{ fontSize: '0.7rem' }}>{grp.count}</span>}
                            </button>
                        ))}
                    </div>
                )}

                {/* Timestamp & Read Status */}
                <div className="d-flex align-items-center justify-content-end mt-1 pe-1" style={{ fontSize: '0.68rem', lineHeight: 1 }}>
                    <span className="text-muted me-1 opacity-75">{formatTime(message.createdAt)}</span>
                    {getReadStatus()}
                </div>
            </div>

            <style>{`
                .chat-bubble-group:hover .group-hover-visible,
                .group:hover .group-hover-visible {
                    opacity: 1 !important;
                }
                .transition-opacity {
                    transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .reaction-emoji-btn {
                    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .reaction-emoji-btn:hover {
                    transform: scale(1.35) translateY(-3px);
                }
                .reaction-badge-pill:hover {
                    transform: scale(1.08);
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
                }
                @keyframes springPop {
                    0% { transform: scale(0.6); opacity: 0; }
                    80% { transform: scale(1.06); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-spring-pop {
                    animation: springPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default MessageBubble;
