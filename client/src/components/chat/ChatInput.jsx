import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
    FaPaperPlane,
    FaPaperclip,
    FaTimes,
    FaFile,
    FaFilePdf,
    FaFileWord,
    FaFileExcel,
    FaFilePowerpoint,
    FaFileArchive,
    FaFileCode,
    FaRegSmile
} from 'react-icons/fa';

const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileName = '') => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <span className="text-primary fs-5">🖼️</span>;
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return <span className="text-info fs-5">🎥</span>;
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return <span className="text-success fs-5">🎵</span>;
    if (ext === 'pdf') return <FaFilePdf className="text-danger fs-5" />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord className="text-primary fs-5" />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FaFileExcel className="text-success fs-5" />;
    if (['ppt', 'pptx'].includes(ext)) return <FaFilePowerpoint className="text-warning fs-5" />;
    if (['zip', 'rar', '7z', 'tar'].includes(ext)) return <FaFileArchive className="text-purple fs-5" style={{ color: '#7c3aed' }} />;
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp', 'sql', 'txt', 'md'].includes(ext)) {
        return <FaFileCode className="text-cyan fs-5" style={{ color: '#0891b2' }} />;
    }
    return <FaFile className="text-secondary fs-5" />;
};

const ChatInput = ({ onSendMessage, onTyping, onStopTyping }) => {
    const [message, setMessage] = useState('');
    const [file, setFile] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const emojiPickerRef = useRef(null);

    // Close input emoji picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowInputEmojiPicker(false);
            }
        };

        if (showInputEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showInputEmojiPicker]);

    const handleTextChange = (e) => {
        setMessage(e.target.value);

        if (!isTyping) {
            setIsTyping(true);
            onTyping();
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            onStopTyping();
        }, 2000);
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleEmojiClick = (emojiData) => {
        setMessage(prev => prev + emojiData.emoji);
        setShowInputEmojiPicker(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!message.trim() && !file) return;

        let type = 'text';
        if (file) {
            const ext = (file.name.split('.').pop() || '').toLowerCase();
            const mime = (file.type || '').toLowerCase();

            if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
                type = 'image';
            } else if (mime.startsWith('video/') || ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv'].includes(ext)) {
                type = 'video';
            } else if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) {
                type = 'audio';
            } else if (mime === 'application/pdf' || ext === 'pdf') {
                type = 'pdf';
            } else if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) {
                type = 'document';
            } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
                type = 'spreadsheet';
            } else if (['ppt', 'pptx'].includes(ext)) {
                type = 'presentation';
            } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
                type = 'archive';
            } else if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp', 'sql', 'txt', 'md'].includes(ext)) {
                type = 'code';
            } else {
                type = 'file';
            }
        }

        onSendMessage(message, type, file);

        // Reset
        setMessage('');
        setFile(null);
        setShowInputEmojiPicker(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onStopTyping();
        setIsTyping(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="bg-white p-3 border-top position-relative">
            {/* File Preview Bar */}
            {file && (
                <div className="mb-2 p-2 bg-light border rounded-3 d-flex align-items-center justify-content-between animate-fade-in shadow-sm">
                    <div className="d-flex align-items-center overflow-hidden me-2">
                        <div className="me-2">{getFileIcon(file.name)}</div>
                        <div className="text-truncate">
                            <span className="small fw-bold text-dark d-block text-truncate" style={{ maxWidth: '240px' }}>
                                {file.name}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                {formatFileSize(file.size)}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="btn btn-sm btn-light rounded-circle text-danger p-1 d-flex align-items-center justify-content-center"
                        style={{ width: '26px', height: '26px' }}
                        onClick={() => {
                            setFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                    >
                        <FaTimes size={12} />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="d-flex align-items-end gap-2 position-relative">
                {/* File Attachment Button */}
                <div className="position-relative">
                    <button
                        type="button"
                        className="btn btn-light rounded-circle text-muted d-flex align-items-center justify-content-center shadow-sm hover-lift"
                        style={{ width: '40px', height: '40px' }}
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach Any File"
                    >
                        <FaPaperclip size={16} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="d-none"
                        onChange={handleFileSelect}
                    />
                </div>

                {/* Textarea + Emoji Button */}
                <div className="flex-grow-1 position-relative d-flex align-items-center">
                    <textarea
                        className="form-control border-0 bg-light rounded-4 px-3 py-2 pe-5"
                        rows="1"
                        placeholder="Type a message..."
                        style={{ resize: 'none', minHeight: '40px', maxHeight: '120px' }}
                        value={message}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                    />

                    {/* Emoji Picker Button inside input */}
                    <button
                        type="button"
                        className="btn btn-link text-muted position-absolute end-0 me-2 p-1 d-flex align-items-center justify-content-center hover-scale"
                        style={{ width: '28px', height: '28px' }}
                        onClick={() => setShowInputEmojiPicker(prev => !prev)}
                        title="Insert emoji"
                    >
                        <FaRegSmile size={18} className="text-secondary" />
                    </button>

                    {/* Emoji Picker Popup */}
                    {showInputEmojiPicker && (
                        <div
                            ref={emojiPickerRef}
                            className="position-absolute shadow-lg border rounded-4 overflow-hidden"
                            style={{
                                bottom: '100%',
                                right: '0',
                                marginBottom: '10px',
                                zIndex: 1080
                            }}
                        >
                            <EmojiPicker
                                onEmojiClick={handleEmojiClick}
                                autoFocusSearch={false}
                                searchPlaceholder="Search emoji..."
                                previewConfig={{ showPreview: false }}
                                width={320}
                                height={380}
                            />
                        </div>
                    )}
                </div>

                {/* Send Button */}
                <button
                    type="submit"
                    className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center hover-lift flex-shrink-0"
                    style={{ width: '40px', height: '40px' }}
                    disabled={!message.trim() && !file}
                    title="Send"
                >
                    <FaPaperPlane size={14} />
                </button>
            </form>
        </div>
    );
};

export default ChatInput;
