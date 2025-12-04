import React, { useState, useEffect, useRef } from 'react';
import { FaArrowLeft, FaPaperPlane, FaImage, FaMicrophone, FaStop, FaPlay, FaPause, FaCheckDouble } from 'react-icons/fa';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

const ChatWindow = ({ conversation, currentUser, socket, onBack, onMessageSent }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [playingAudio, setPlayingAudio] = useState(null); // URL of currently playing audio
    const { onlineUsers } = useSocket();

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const audioRefs = useRef({}); // Map audio URLs to audio elements

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

        socket.on('receive_message', handleReceive);
        socket.on('messages_read_update', handleReadUpdate);

        return () => {
            socket.off('receive_message', handleReceive);
            socket.off('messages_read_update', handleReadUpdate);
        };
    }, [socket, conversation._id]);

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

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
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
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const file = new File([blob], "voice_msg.webm", { type: 'audio/webm' });

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
        }
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
            return (
                <div className="d-flex align-items-center gap-2" style={{minWidth: '150px'}}>
                    <button className="btn btn-sm btn-light rounded-circle" onClick={() => toggleAudio(msg.fileUrl)}>
                        {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                    <div className="flex-grow-1 bg-secondary rounded" style={{height: '4px'}}>
                        <div className={`bg-white rounded ${isPlaying ? 'progress-bar-animated progress-bar-striped' : ''}`} style={{height: '100%', width: isPlaying ? '100%' : '0%'}}></div>
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
            <div className="p-3 border-bottom bg-white d-flex align-items-center shadow-sm" style={{height: '70px'}}>
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
                        <small className="text-muted border-start ps-2">{totalSent} messages sent</small>
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
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-top">
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
                        onChange={(e) => setNewMessage(e.target.value)}
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
