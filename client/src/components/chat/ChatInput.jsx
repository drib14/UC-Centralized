import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'react-toastify';
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
    FaRegSmile,
    FaMicrophone,
    FaTrash,
    FaStop,
    FaPlay,
    FaPause
} from 'react-icons/fa';

const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const getFileIcon = (fileName = '') => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <span className="text-primary fs-5">🖼️</span>;
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return <span className="text-info fs-5">🎥</span>;
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return <span className="text-success fs-5">🎵</span>;
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

    // Voice Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
    const [previewDuration, setPreviewDuration] = useState(0);

    const fileInputRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const previewAudioRef = useRef(null);

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

    // Clean up media recorder and stream on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Preview audio event listeners
    useEffect(() => {
        const audio = previewAudioRef.current;
        if (!audio) return;

        const updateTime = () => setPreviewCurrentTime(audio.currentTime);
        const updateDur = () => {
            if (audio.duration && !isNaN(audio.duration)) setPreviewDuration(audio.duration);
        };
        const onEnded = () => {
            setIsPreviewPlaying(false);
            setPreviewCurrentTime(0);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDur);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDur);
            audio.removeEventListener('ended', onEnded);
        };
    }, [previewUrl]);

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

    // --- VOICE RECORDING LOGIC ---

    const getSupportedAudioMimeType = () => {
        if (typeof MediaRecorder === 'undefined') return '';
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
            'audio/aac'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
    };

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toast.error("Voice recording is not supported in this browser.");
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const mimeType = getSupportedAudioMimeType();
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            mediaRecorderRef.current = recorder;
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: mimeType || 'audio/webm'
                });
                setRecordedBlob(audioBlob);
                const url = URL.createObjectURL(audioBlob);
                setPreviewUrl(url);
            };

            recorder.start(100);
            setIsRecording(true);
            setRecordingTime(0);
            setRecordedBlob(null);
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
            }

            timerIntervalRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Microphone error:", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                toast.error("Microphone access was denied. Please allow microphone permissions in your browser.");
            } else {
                toast.error("Could not access microphone. Please check your audio settings.");
            }
        }
    };

    const stopRecordingForPreview = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setIsRecording(false);
        setRecordingTime(0);
        setRecordedBlob(null);
        setPreviewUrl(null);
        setIsPreviewPlaying(false);
    };

    const togglePreviewPlay = () => {
        if (!previewAudioRef.current) return;
        if (isPreviewPlaying) {
            previewAudioRef.current.pause();
            setIsPreviewPlaying(false);
        } else {
            previewAudioRef.current.play().then(() => setIsPreviewPlaying(true)).catch(console.error);
        }
    };

    const sendVoiceMessage = async (blobToSend = recordedBlob) => {
        if (!blobToSend) {
            if (mediaRecorderRef.current && isRecording) {
                // If currently recording and user clicked send directly
                mediaRecorderRef.current.onstop = () => {
                    const mimeType = getSupportedAudioMimeType() || 'audio/webm';
                    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                    const ext = mimeType.includes('ogg') ? 'ogg' : (mimeType.includes('mp4') ? 'mp4' : 'webm');
                    const voiceFile = new File([audioBlob], `voice-message-${Date.now()}.${ext}`, { type: mimeType });
                    onSendMessage('', 'audio', voiceFile);
                    cancelRecording();
                };
                mediaRecorderRef.current.stop();
                setIsRecording(false);
                if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                if (mediaStreamRef.current) {
                    mediaStreamRef.current.getTracks().forEach(track => track.stop());
                }
            }
            return;
        }

        const mimeType = blobToSend.type || getSupportedAudioMimeType() || 'audio/webm';
        const ext = mimeType.includes('ogg') ? 'ogg' : (mimeType.includes('mp4') ? 'mp4' : 'webm');
        const voiceFile = new File([blobToSend], `voice-message-${Date.now()}.${ext}`, { type: mimeType });
        onSendMessage('', 'audio', voiceFile);
        cancelRecording();
    };

    // --- STANDARD SUBMIT ---

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

    // Simulated waveform animation heights
    const waveformBars = [40, 70, 90, 45, 80, 100, 60, 85, 50, 95, 65, 40, 80, 55, 90, 75, 45, 85, 60, 40];

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
                        className="btn btn-sm btn-light rounded-circle text-danger p-1 d-flex align-items-center justify-content-center hover-scale"
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

            {/* LIVE VOICE RECORDING BAR */}
            {isRecording ? (
                <div className="d-flex align-items-center justify-content-between p-2 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded-4 animate-fade-in shadow-sm">
                    <div className="d-flex align-items-center gap-2 ps-2">
                        {/* Pulsing Red Dot */}
                        <div
                            className="rounded-circle bg-danger animate-pulse"
                            style={{ width: '12px', height: '12px', boxShadow: '0 0 10px rgba(220, 38, 38, 0.8)' }}
                        />
                        <span className="badge bg-danger text-white fw-bold px-2 py-1" style={{ fontSize: '0.75rem' }}>
                            REC
                        </span>
                        <span className="fw-bold text-danger font-monospace" style={{ fontSize: '0.95rem' }}>
                            {formatTime(recordingTime)}
                        </span>
                    </div>

                    {/* Animated Sound Wave Equalizer */}
                    <div className="d-flex align-items-center gap-1 mx-3 flex-grow-1 justify-content-center" style={{ height: '24px' }}>
                        {waveformBars.map((h, i) => (
                            <div
                                key={i}
                                className="bg-danger rounded-pill transition-all"
                                style={{
                                    width: '3px',
                                    height: `${Math.max(20, (h * Math.sin(recordingTime * 2 + i * 0.5) ** 2))}%`,
                                    opacity: 0.75,
                                    animation: `pulse 0.8s ease-in-out infinite alternate ${i * 0.05}s`
                                }}
                            />
                        ))}
                    </div>

                    {/* Action Controls */}
                    <div className="d-flex align-items-center gap-2 pe-1">
                        {/* Cancel / Trash */}
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center hover-scale shadow-sm"
                            style={{ width: '38px', height: '38px' }}
                            onClick={cancelRecording}
                            title="Discard recording"
                        >
                            <FaTrash size={14} />
                        </button>

                        {/* Stop & Review */}
                        <button
                            type="button"
                            className="btn btn-light btn-sm rounded-circle text-dark d-flex align-items-center justify-content-center hover-scale shadow-sm"
                            style={{ width: '38px', height: '38px' }}
                            onClick={stopRecordingForPreview}
                            title="Stop & review"
                        >
                            <FaStop size={14} className="text-secondary" />
                        </button>

                        {/* Send Immediately */}
                        <button
                            type="button"
                            className="btn btn-primary btn-sm rounded-circle d-flex align-items-center justify-content-center hover-scale shadow-sm"
                            style={{ width: '38px', height: '38px' }}
                            onClick={() => sendVoiceMessage(null)}
                            title="Send voice note"
                        >
                            <FaPaperPlane size={13} />
                        </button>
                    </div>
                </div>
            ) : previewUrl ? (
                /* VOICE NOTE PREVIEW BAR */
                <div className="d-flex align-items-center justify-content-between p-2 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-4 animate-fade-in shadow-sm">
                    <audio ref={previewAudioRef} src={previewUrl} preload="metadata" />

                    <div className="d-flex align-items-center gap-3 ps-2 flex-grow-1">
                        <button
                            type="button"
                            className="btn btn-primary btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm hover-scale"
                            style={{ width: '36px', height: '36px' }}
                            onClick={togglePreviewPlay}
                            title={isPreviewPlaying ? "Pause preview" : "Listen to preview"}
                        >
                            {isPreviewPlaying ? <FaPause size={12} /> : <FaPlay size={12} className="ms-1" />}
                        </button>

                        <div className="flex-grow-1 me-3">
                            <div className="d-flex justify-content-between small text-primary fw-medium mb-1" style={{ fontSize: '0.75rem' }}>
                                <span>Voice Message Preview</span>
                                <span>{formatTime(previewCurrentTime)} / {formatTime(previewDuration || recordingTime)}</span>
                            </div>
                            <div className="progress rounded-pill" style={{ height: '4px' }}>
                                <div
                                    className="progress-bar bg-primary rounded-pill"
                                    role="progressbar"
                                    style={{ width: `${previewDuration > 0 ? (previewCurrentTime / previewDuration) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 pe-1">
                        <button
                            type="button"
                            className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center hover-scale shadow-sm"
                            style={{ width: '38px', height: '38px' }}
                            onClick={cancelRecording}
                            title="Discard recording"
                        >
                            <FaTrash size={14} />
                        </button>

                        <button
                            type="button"
                            className="btn btn-primary btn-sm rounded-circle d-flex align-items-center justify-content-center hover-scale shadow-sm"
                            style={{ width: '38px', height: '38px' }}
                            onClick={() => sendVoiceMessage(recordedBlob)}
                            title="Send voice note"
                        >
                            <FaPaperPlane size={13} />
                        </button>
                    </div>
                </div>
            ) : (
                /* STANDARD TEXT & ATTACHMENT INPUT BAR */
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

                    {/* Microphone Voice Recording Button */}
                    {!message.trim() && !file ? (
                        <button
                            type="button"
                            className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center hover-lift flex-shrink-0"
                            style={{ width: '40px', height: '40px' }}
                            onClick={startRecording}
                            title="Record voice message"
                        >
                            <FaMicrophone size={16} />
                        </button>
                    ) : (
                        /* Send Button */
                        <button
                            type="submit"
                            className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center hover-lift flex-shrink-0"
                            style={{ width: '40px', height: '40px' }}
                            disabled={!message.trim() && !file}
                            title="Send"
                        >
                            <FaPaperPlane size={14} />
                        </button>
                    )}
                </form>
            )}
        </div>
    );
};

export default ChatInput;
