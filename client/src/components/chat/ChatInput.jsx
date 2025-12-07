import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaPaperclip, FaTimes } from 'react-icons/fa';

const ChatInput = ({ onSendMessage, onTyping, onStopTyping }) => {
    const [message, setMessage] = useState('');
    const [file, setFile] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);

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

    const handleSubmit = (e) => {
        e.preventDefault();
        if ((!message.trim() && !file)) return;

        let type = 'text';
        if (file) {
            // Basic inference, backend handles it better
            if (file.type.startsWith('image/')) type = 'image';
            else if (file.type.startsWith('video/')) type = 'video';
            else if (file.type.startsWith('audio/')) type = 'audio';
            else type = 'file';
        }

        onSendMessage(message, type, file);

        // Reset
        setMessage('');
        setFile(null);
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
        <div className="bg-white p-3 border-top">
            {/* File Preview */}
            {file && (
                <div className="mb-2 p-2 bg-light border rounded d-flex align-items-center justify-content-between">
                    <span className="text-truncate small me-2">{file.name}</span>
                    <button className="btn btn-sm btn-link text-danger p-0" onClick={() => { setFile(null); fileInputRef.current.value = ''; }}>
                        <FaTimes />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="d-flex align-items-end gap-2">
                <div className="position-relative">
                    <button
                        type="button"
                        className="btn btn-light rounded-circle text-muted"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach file"
                    >
                        <FaPaperclip />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="d-none"
                        onChange={handleFileSelect}
                    />
                </div>

                <div className="flex-grow-1 position-relative">
                    <textarea
                        className="form-control border-0 bg-light rounded-4 px-3 py-2"
                        rows="1"
                        placeholder="Type a message..."
                        style={{ resize: 'none', minHeight: '40px', maxHeight: '120px' }}
                        value={message}
                        onChange={handleTextChange}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                    style={{ width: '40px', height: '40px' }}
                    disabled={!message.trim() && !file}
                >
                    <FaPaperPlane size={14} />
                </button>
            </form>
        </div>
    );
};

export default ChatInput;
