import React, { useState, useEffect, useRef } from 'react';
import {
    FaArrowLeft, FaPaperPlane, FaImage, FaMicrophone, FaStop,
    FaPlay, FaPause, FaCheckDouble, FaVideo, FaPhone, FaEllipsisVertical,
    FaCircleInfo, FaBan
} from 'react-icons/fa6';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';

const ChatWindow = ({ conversation, currentUser, socket, onBack, onMessageSent }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0); // Timer for recording
    const [uploading, setUploading] = useState(false);
    const [playingAudio, setPlayingAudio] = useState(null); // URL of currently playing audio
    const [isTyping, setIsTyping] = useState(false); // If other user is typing
    const [typingTimeout, setTypingTimeout] = useState(null); // For local debouncing
    const [showOptions, setShowOptions] = useState(false); // Dropdown state

    const { onlineUsers } = useSocket();

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const audioRefs = useRef({}); // Map audio URLs to audio elements
    const timerRef = useRef(null); // For recording timer

    const otherUser = conversation.participants.find(p => p._id !== currentUser._id) || {};
    const isOnline = onlineUsers.has(otherUser._id);
    const totalSent = messages.filter(m => (m.sender._id === otherUser._id || m.sender === otherUser._id)).length;

    useEffect(() => {
        loadMessages();
        // Mark as read immediately on load
        API.markMessagesRead(conversation._id).catch(console.error);
        if (socket) {
            socket.emit('mark_messages_read', {
                conversationId: conversation._id,
                readerId: currentUser._id,
                senderId: otherUser._id
            });
        }
    }, [conversation._id]);

    useEffect(() => {
        if (!socket) return;

        const handleReceive = (data) => {
            if (data.conversationId === conversation._id) {
                setMessages(prev => [...prev, data]);
                scrollToBottom();

                // Mark as read real-time
                API.markMessagesRead(conversation._id).catch(console.error);
                socket.emit('mark_messages_read', {
                    conversationId: conversation._id,
                    readerId: currentUser._id,
                    senderId: otherUser._id
                });
            }
        };

        const handleReadUpdate = (data) => {
            if (data.conversationId === conversation._id) {
                setMessages(prev => prev.map(msg => {
                    if (msg.sender._id === currentUser._id || msg.sender === currentUser._id) {
                        if (!msg.readBy.includes(data.readBy)) {
                            return { ...msg, readBy: [...msg.readBy, data.readBy] };
                        }
                    }
                    return msg;
                }));
            }
        };

        const handleTyping = (data) => {
            if (data.senderId === otherUser._id) {
                setIsTyping(true);
            }
        };

        const handleStopTyping = (data) => {
            if (data.senderId === otherUser._id) {
                setIsTyping(false);
            }
        };

        socket.on('receive_message', handleReceive);
        socket.on('messages_read_update', handleReadUpdate);
        socket.on('user_typing', handleTyping);
        socket.on('user_stop_typing', handleStopTyping);

        return () => {
            socket.off('receive_message', handleReceive);
            socket.off('messages_read_update', handleReadUpdate);
            socket.off('user_typing', handleTyping);
            socket.off('user_stop_typing', handleStopTyping);
        };
    }, [socket, conversation._id, otherUser._id]);

    const loadMessages = async () => {
        setLoading(true);
        try {
            const data = await API.getMessages(conversation._id);
            setMessages(data);
            scrollToBottom();
        } catch (err) {
            console.error("Failed to load messages", err);
        } finally {
            setLoading(false);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);

        if (socket) {
            socket.emit('typing', { receiverId: otherUser._id, senderId: currentUser._id });

            if (typingTimeout) clearTimeout(typingTimeout);

            const timeout = setTimeout(() => {
                socket.emit('stop_typing', { receiverId: otherUser._id, senderId: currentUser._id });
            }, 2000);

            setTypingTimeout(timeout);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // Stop typing immediately
        if (typingTimeout) clearTimeout(typingTimeout);
        if (socket) socket.emit('stop_typing', { receiverId: otherUser._id, senderId: currentUser._id });

        await sendMessage(newMessage, 'text');
        setNewMessage('');
    };

    const sendMessage = async (content, type, fileUrl = null) => {
        try {
            const sentMsg = await API.sendMessage(conversation._id, content, type, fileUrl);
            setMessages(prev => [...prev, sentMsg]);
            onMessageSent(sentMsg);

            socket.emit('send_message', {
                ...sentMsg,
                receiverId: otherUser._id
            });

            scrollToBottom();
        } catch (err) {
            console.error("Failed to send", err);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const { url } = await API.uploadFile(file);
            await sendMessage('', 'image', url);
        } catch (err) {
            console.error("Upload failed", err);
            alert("Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    // Voice Recorder Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = async () => {
                clearInterval(timerRef.current);
                setRecordingTime(0);

                // Create Blob with specific type
                const blob = new Blob(chunks, { type: 'audio/webm' });
                // Explicitly name the file with extension
                const file = new File([blob], `voice_msg_${Date.now()}.webm`, { type: 'audio/webm' });

                setUploading(true);
                try {
                    const { url } = await API.uploadFile(file);
                    await sendMessage('', 'audio', url);
                } catch (err) {
                    console.error("Audio upload failed", err);
                } finally {
                    setUploading(false);
                }
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Mic access denied", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            setMediaRecorder(null);
            clearInterval(timerRef.current);
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const toggleAudio = (url) => {
        const audio = audioRefs.current[url];
        if (!audio) return;

        if (playingAudio === url) {
            audio.pause();
            setPlayingAudio(null);
        } else {
            if (playingAudio && audioRefs.current[playingAudio]) {
                audioRefs.current[playingAudio].pause();
                audioRefs.current[playingAudio].currentTime = 0;
            }
            audio.play();
            setPlayingAudio(url);
            audio.onended = () => setPlayingAudio(null);
        }
    };

    const renderAvatar = (user, size=32) => {
        if (user.profileImage) {
            return <img src={user.profileImage} alt="avatar" className="rounded-circle" width={size} height={size} style={{objectFit:'cover'}} />;
        }
        return (
            <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center" style={{width:size, height:size, fontSize: size*0.4}}>
                {user.firstName ? user.firstName[0] : 'U'}
            </div>
        );
    };

    const renderMessageContent = (msg) => {
        if (msg.type === 'image') {
            return <img src={msg.fileUrl} alt="sent" className="img-fluid rounded" style={{maxHeight: '200px'}} />;
        } else if (msg.type === 'audio') {
            const isPlaying = playingAudio === msg.fileUrl;
            // Facebook-like audio player
            return (
                <div className="d-flex align-items-center gap-3 p-1" style={{minWidth: '200px'}}>
                    <button
                        className="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                        style={{width: '40px', height: '40px', color: '#0084ff'}}
                        onClick={() => toggleAudio(msg.fileUrl)}
                    >
                        {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <div className="d-flex flex-column flex-grow-1">
                        {/* Fake Waveform Visual */}
                        <div className="d-flex align-items-center gap-1" style={{height: '20px'}}>
                             {[...Array(20)].map((_, i) => (
                                 <div
                                    key={i}
                                    className="rounded-pill"
                                    style={{
                                        width: '3px',
                                        height: `${Math.random() * 15 + 5}px`,
                                        backgroundColor: isPlaying ? '#0084ff' : '#ccc',
                                        opacity: isPlaying ? (i % 2 === 0 ? 1 : 0.6) : 0.5
                                    }}
                                 />
                             ))}
                        </div>
                    </div>
                    <audio ref={el => audioRefs.current[msg.fileUrl] = el} src={msg.fileUrl} hidden />
                </div>
            );
        }
        return <div style={{whiteSpace: 'pre-wrap'}}>{msg.content}</div>;
    };

    return (
        <div className="d-flex flex-column h-100">
            {/* Header */}
            <div className="p-3 border-bottom bg-white d-flex align-items-center justify-content-between shadow-sm" style={{height: '70px'}}>
                <div className="d-flex align-items-center">
                    <button className="btn btn-link text-dark d-md-none me-2" onClick={onBack}>
                        <FaArrowLeft />
                    </button>
                    {renderAvatar(otherUser, 40)}
                    <div className="ms-3">
                        <h6 className="mb-0">{otherUser.firstName} {otherUser.lastName}</h6>
                        <div className="d-flex align-items-center gap-2">
                            {isOnline ? (
                                <small className="text-success d-flex align-items-center gap-1">
                                    <span className="bg-success rounded-circle" style={{width:8, height:8}}></span> Active Now
                                </small>
                            ) : (
                                <small className="text-muted">Last active {otherUser.lastSeen ? new Date(otherUser.lastSeen).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'recently'}</small>
                            )}
                            {/* <small className="text-muted border-start ps-2">{totalSent} messages sent</small> */}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="d-flex align-items-center gap-3">
                    <button className="btn btn-light text-primary rounded-circle" title="Voice Call" onClick={() => toast.info("Voice Call feature coming soon!")}>
                        <FaPhone />
                    </button>
                    <button className="btn btn-light text-primary rounded-circle" title="Video Call" onClick={() => toast.info("Video Call feature coming soon!")}>
                        <FaVideo />
                    </button>
                    <div className="dropdown">
                        <button className="btn btn-light text-secondary rounded-circle" onClick={() => setShowOptions(!showOptions)} data-bs-toggle="dropdown">
                            <FaEllipsisVertical />
                        </button>
                        <ul className={`dropdown-menu dropdown-menu-end ${showOptions ? 'show' : ''}`}>
                            <li><button className="dropdown-item" onClick={() => toast.info("Profile view coming soon")}><FaCircleInfo className="me-2" /> View Profile</button></li>
                            <li><button className="dropdown-item text-danger" onClick={() => toast.error("Block feature coming soon")}><FaBan className="me-2" /> Block User</button></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-grow-1 p-3 overflow-auto" style={{backgroundColor: '#f8f9fa'}}>
                {loading ? (
                    <div className="d-flex justify-content-center pt-5">
                        <div className="spinner-border text-primary" role="status"></div>
                    </div>
                ) : (
                    <div className="d-flex flex-column gap-3">
                        {messages.map((msg, idx) => {
                            const isMe = msg.sender._id === currentUser._id || msg.sender === currentUser._id;
                            const isSeen = msg.readBy.length > 1; // >1 because sender reads it

                            return (
                                <div key={idx} className={`d-flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                    {renderAvatar(isMe ? currentUser : otherUser, 35)}
                                    <div className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`} style={{maxWidth: '70%'}}>
                                        {/* Name on top of bubble */}
                                        <small className="text-muted mb-1" style={{fontSize: '0.75rem'}}>
                                            {isMe ? 'You' : msg.sender.firstName}
                                        </small>

                                        <div
                                            className={`p-3 rounded-4 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                                            style={{wordWrap: 'break-word'}}
                                        >
                                            {renderMessageContent(msg)}
                                        </div>

                                        <div className="d-flex align-items-center gap-1 mt-1">
                                            <small className="text-muted" style={{fontSize: '0.7rem'}}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </small>
                                            {isMe && isSeen && <FaCheckDouble className="text-primary" size={12} title="Seen" />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {isTyping && (
                             <div className="d-flex align-items-center gap-2 ms-5 mb-2">
                                <div className="bg-light p-2 rounded-4 shadow-sm">
                                    <div className="typing-dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                                <small className="text-muted" style={{fontSize: '0.7rem'}}>typing...</small>
                             </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-top position-relative">
                {isRecording && (
                     <div className="position-absolute start-0 end-0 bottom-0 bg-white d-flex align-items-center justify-content-center border-top shadow-sm" style={{height: '100%', zIndex: 10}}>
                         <div className="text-danger fw-bold animate-pulse d-flex align-items-center gap-2">
                             <div className="rounded-circle bg-danger" style={{width:10, height:10}}></div>
                             Recording... {formatDuration(recordingTime)}
                         </div>
                         <button className="btn btn-sm btn-secondary ms-4 rounded-pill" onClick={stopRecording}>Stop & Send</button>
                     </div>
                )}

                <form onSubmit={handleSend} className="d-flex gap-2 align-items-center">
                    <input type="file" accept="image/*" className="d-none" ref={fileInputRef} onChange={handleFileSelect} />
                    <button type="button" className="btn btn-light text-secondary rounded-circle" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                        <FaImage size={20} />
                    </button>

                    <button
                        type="button"
                        className={`btn rounded-circle ${isRecording ? 'btn-danger' : 'btn-light text-secondary'}`}
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={uploading}
                    >
                        {isRecording ? <FaStop size={16} /> : <FaMicrophone size={20} />}
                    </button>

                    <input
                        type="text"
                        className="form-control rounded-pill bg-light border-0"
                        placeholder={uploading ? "Uploading..." : "Aa"}
                        value={newMessage}
                        onChange={handleInputChange}
                        disabled={uploading}
                    />

                    <button type="submit" className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center" style={{width:'40px', height:'40px'}} disabled={!newMessage.trim() && !uploading}>
                        <FaPaperPlane />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
