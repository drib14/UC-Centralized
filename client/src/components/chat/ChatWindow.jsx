import React, { useState, useEffect, useRef } from 'react';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useCall } from '../../context/CallContext';
import UserAvatar from './UserAvatar';
import { FaPhone, FaVideo, FaInfoCircle, FaPaperPlane, FaSmile, FaPaperclip, FaMicrophone, FaImage, FaStop, FaTrash } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'react-toastify';

const ChatWindow = () => {
    const { selectedConversation, toggleRightPanel } = useChat();
    const { user } = useAuth();
    const { socket } = useSocket();
    const { callUser } = useCall(); // Use call context

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);

    // Voice Recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (selectedConversation) {
            loadMessages();
        }
    }, [selectedConversation]);

    useEffect(() => {
        if (!socket) return;
        const handleMsg = (msg) => {
            if (msg.conversationId === selectedConversation?._id || msg.conversationId._id === selectedConversation?._id) {
                setMessages(prev => {
                    if (prev.some(m => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });
                scrollToBottom();
            }
        };
        socket.on('receive_message', handleMsg);
        return () => socket.off('receive_message', handleMsg);
    }, [socket, selectedConversation]);

    const loadMessages = async () => {
        try {
            const res = await API.get(`/messages/${selectedConversation._id}`);
            setMessages(res);
            scrollToBottom();
        } catch(e) { console.error(e); }
    };

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleSend = async (content = newMessage, type = 'text', attachments = []) => {
        if (!content.trim() && attachments.length === 0) return;
        try {
            await API.post('/messages', {
                conversationId: selectedConversation._id,
                content,
                type,
                attachments
            });
            setNewMessage('');
        } catch(e) { console.error(e); }
    };

    // Voice Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = e => audioChunksRef.current.push(e.data);
            mediaRecorderRef.current.start();

            setIsRecording(true);
            setRecordingDuration(0);
            recordingTimerRef.current = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
        } catch(e) {
            toast.error("Microphone access denied");
        }
    };

    const stopRecording = (shouldSend) => {
        if (!mediaRecorderRef.current) return;

        mediaRecorderRef.current.onstop = async () => {
            clearInterval(recordingTimerRef.current);
            setIsRecording(false);

            if (shouldSend) {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([blob], "voice_message.webm", { type: 'audio/webm' });
                try {
                    const { url } = await API.uploadFile(file);
                    handleSend('', 'audio', [{ url, type: 'audio', duration: recordingDuration }]);
                } catch(e) {
                    toast.error("Failed to upload audio");
                }
            }
        };

        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Simple sequential upload for MVP
        for (const file of files) {
            try {
                const { url } = await API.uploadFile(file);
                let type = 'file';
                if (file.type.startsWith('image')) type = 'image';
                else if (file.type.startsWith('video')) type = 'video';

                await handleSend('', type, [{ url, type, name: file.name }]);
            } catch(e) { toast.error("Upload failed"); }
        }
    };

    if (!selectedConversation) return null;

    // Display Logic
    let title = "Chat";
    let sub = "";
    let otherId = null;

    if (selectedConversation.type === 'group') {
        title = selectedConversation.name;
        sub = `${selectedConversation.participants.length} members`;
    } else {
        const other = selectedConversation.participants.find(p => p._id !== user._id) || selectedConversation.participants[0];
        title = `${other.firstName} ${other.lastName}`;
        sub = other.isOnline ? "Active now" : "Offline";
        otherId = other._id;
    }

    return (
        <div className="d-flex flex-column h-100 bg-white">
            {/* Header */}
            <div className="p-2 border-bottom d-flex align-items-center justify-content-between shadow-sm" style={{height: 60}}>
                <div className="d-flex align-items-center gap-2">
                    <div className="d-flex flex-column">
                        <span className="fw-bold">{title}</span>
                        <span className="text-muted small">{sub}</span>
                    </div>
                </div>
                <div className="d-flex gap-3 text-primary me-2">
                    <FaPhone className="cursor-pointer" onClick={() => otherId && callUser(otherId, false)} />
                    <FaVideo className="cursor-pointer" onClick={() => otherId && callUser(otherId, true)} />
                    <FaInfoCircle className="cursor-pointer" onClick={toggleRightPanel} />
                </div>
            </div>

            {/* Message List */}
            <div className="flex-grow-1 overflow-auto p-3 bg-light">
                {messages.map((msg, i) => {
                    const isMe = msg.sender._id === user._id;
                    return (
                        <div key={msg._id} className={`d-flex mb-2 ${isMe ? 'justify-content-end' : ''}`}>
                            {!isMe && <UserAvatar user={msg.sender} size={32} className="me-2 align-self-end" />}
                            <div
                                className={`p-2 rounded-3 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                                style={{ maxWidth: '70%' }}
                            >
                                {msg.attachments?.map((att, idx) => (
                                    <div key={idx}>
                                        {att.type === 'image' && <img src={att.url} className="img-fluid rounded mb-1" />}
                                        {att.type === 'audio' && <audio src={att.url} controls className="w-100" />}
                                        {att.type === 'video' && <video src={att.url} controls className="img-fluid rounded mb-1" />}
                                    </div>
                                ))}
                                <div>{msg.content}</div>
                                <div className={`small text-end ${isMe ? 'text-light' : 'text-muted'}`} style={{fontSize: '0.7em'}}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-2 border-top bg-white d-flex align-items-center gap-2">
                <input type="file" multiple ref={fileInputRef} className="d-none" onChange={handleFileUpload} />
                <FaPaperclip className="text-primary cursor-pointer fs-5" onClick={() => fileInputRef.current.click()} />

                <div className="flex-grow-1 position-relative d-flex align-items-center">
                    {isRecording ? (
                        <div className="flex-grow-1 d-flex align-items-center justify-content-between px-3 text-danger">
                            <span className="fw-bold animate-pulse">● {new Date(recordingDuration * 1000).toISOString().substr(14, 5)}</span>
                            <FaTrash className="cursor-pointer" onClick={() => stopRecording(false)} />
                        </div>
                    ) : (
                        <div className="position-relative w-100">
                            <input
                                className="form-control rounded-pill bg-light border-0 w-100"
                                placeholder="Aa"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                            />
                            <FaSmile
                                className="position-absolute end-0 top-50 translate-middle-y me-3 text-muted cursor-pointer"
                                onClick={() => setShowEmoji(!showEmoji)}
                            />
                        </div>
                    )}
                </div>

                {isRecording ? (
                    <FaStop className="text-danger cursor-pointer fs-4" onClick={() => stopRecording(true)} />
                ) : (
                    newMessage ? (
                        <FaPaperPlane className="text-primary cursor-pointer fs-4" onClick={() => handleSend()} />
                    ) : (
                        <FaMicrophone className="text-primary cursor-pointer fs-4" onClick={startRecording} />
                    )
                )}
            </div>

            {showEmoji && (
                <div className="position-absolute bottom-0 start-0 m-5 z-3">
                    <EmojiPicker onEmojiClick={(e) => setNewMessage(p => p + e.emoji)} />
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
