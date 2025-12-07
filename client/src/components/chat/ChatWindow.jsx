import React, { useState, useRef, useEffect } from 'react';
import {
    FaArrowLeft, FaTrash, FaVolumeMute, FaVolumeUp,
    FaPaperPlane, FaPaperclip, FaMicrophone, FaStop, FaImage, FaFile
} from 'react-icons/fa';
import { FaUserCircle } from 'react-icons/fa';

const ChatWindow = ({
    conversation,
    messages,
    currentUser,
    onSendMessage,
    onDeleteConversation,
    onMuteConversation,
    onBack,
    isMuted
}) => {
    const [newMessage, setNewMessage] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioChunks, setAudioChunks] = useState([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const getOtherUser = () => {
        if (!conversation) return {};
        return conversation.participants.find(p => p._id !== currentUser._id) || {};
    };

    const otherUser = getOtherUser();
    const displayName = otherUser.firstName && otherUser.lastName
        ? `${otherUser.firstName} ${otherUser.lastName}`
        : (otherUser.name || "User");

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage(newMessage, 'text');
            setNewMessage("");
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            onSendMessage("", 'file', file); // Type determined by backend/utils usually, but we pass generic 'file' intent
        }
    };

    // Voice Recording Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            setMediaRecorder(recorder);

            const chunks = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/mp3' }); // or webm
                const file = new File([blob], "voice_message.mp3", { type: 'audio/mp3' });
                onSendMessage("", 'audio', file);
                setAudioChunks([]);
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setIsRecording(false);
            mediaRecorder.stream.getTracks().forEach(track => track.stop()); // Stop stream
        }
    };

    const renderMessageContent = (msg) => {
        switch (msg.type) {
            case 'image':
                return <img src={msg.fileUrl} alt="Shared" className="img-fluid rounded" style={{ maxWidth: '300px' }} />;
            case 'video':
                return <video src={msg.fileUrl} controls className="img-fluid rounded" style={{ maxWidth: '300px' }} />;
            case 'audio':
                return <audio src={msg.fileUrl} controls className="w-100" style={{ minWidth: '200px' }} />;
            case 'file':
                return (
                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="d-flex align-items-center text-decoration-none p-2 border rounded bg-light">
                        <FaFile className="me-2 text-primary" />
                        <span className="text-dark text-break">View File</span>
                    </a>
                );
            default:
                return <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>;
        }
    };

    return (
        <div className="d-flex flex-column h-100 bg-white">
            {/* Header */}
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light shadow-sm" style={{ zIndex: 10 }}>
                <div className="d-flex align-items-center">
                    <button className="btn btn-link text-dark p-0 me-3 d-md-none" onClick={onBack}>
                        <FaArrowLeft />
                    </button>
                    {otherUser.profilePicture ? (
                        <img
                            src={otherUser.profilePicture}
                            alt="Profile"
                            className="rounded-circle me-3"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                        />
                    ) : (
                        <FaUserCircle className="text-secondary me-3" style={{ width: '40px', height: '40px' }} />
                    )}
                    <div>
                        <h6 className="mb-0 fw-bold">{displayName}</h6>
                        <small className="text-muted">{otherUser.department}</small>
                    </div>
                </div>
                <div className="d-flex align-items-center">
                    <button
                        className="btn btn-link text-secondary me-3"
                        onClick={() => onMuteConversation(conversation._id)}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <FaVolumeMute className="fs-5 text-danger" /> : <FaVolumeUp className="fs-5" />}
                    </button>
                    <button
                        className="btn btn-link text-danger"
                        onClick={() => setShowDeleteModal(true)}
                        title="Delete Conversation"
                    >
                        <FaTrash className="fs-5" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow-1 p-3 overflow-auto" style={{ backgroundColor: '#f5f7fb' }}>
                {messages.length === 0 ? (
                    <div className="text-center text-muted mt-5">
                        <p>No messages yet. Say hello!</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMine = msg.sender._id === currentUser._id;
                        return (
                            <div key={msg._id || index} className={`d-flex mb-3 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                                {!isMine && (
                                    <div className="me-2 align-self-end">
                                        {msg.sender.profilePicture ? (
                                            <img
                                                src={msg.sender.profilePicture}
                                                className="rounded-circle"
                                                style={{ width: '30px', height: '30px' }}
                                                alt="S"
                                            />
                                        ) : (
                                            <FaUserCircle className="text-secondary" style={{ width: '30px', height: '30px' }} />
                                        )}
                                    </div>
                                )}
                                <div
                                    className={`p-3 rounded-3 shadow-sm ${isMine ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                                    style={{
                                        maxWidth: '75%',
                                        borderBottomRightRadius: isMine ? '0' : '1rem',
                                        borderBottomLeftRadius: !isMine ? '0' : '1rem'
                                    }}
                                >
                                    {renderMessageContent(msg)}
                                    <div className={`text-end small mt-1 ${isMine ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-top bg-light">
                <div className="d-flex align-items-center">
                    <button className="btn btn-light text-secondary me-2 rounded-circle" onClick={() => fileInputRef.current.click()}>
                        <FaPaperclip />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="d-none"
                        onChange={handleFileSelect}
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    />

                    <input
                        type="text"
                        className="form-control rounded-pill me-2 border-0 shadow-sm px-3"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                    />

                    {newMessage.trim() ? (
                         <button className="btn btn-primary rounded-circle p-2 shadow-sm" onClick={handleSend}>
                            <FaPaperPlane />
                        </button>
                    ) : (
                        <button
                            className={`btn rounded-circle p-2 shadow-sm ${isRecording ? 'btn-danger' : 'btn-light text-secondary'}`}
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            onTouchStart={startRecording}
                            onTouchEnd={stopRecording}
                            title="Hold to record"
                        >
                            {isRecording ? <FaStop /> : <FaMicrophone />}
                        </button>
                    )}
                </div>
                {isRecording && <small className="text-danger ms-5">Recording...</small>}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Delete Conversation</h5>
                                <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to permanently delete this conversation? This action cannot be undone for all participants.</p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => {
                                        onDeleteConversation(conversation._id);
                                        setShowDeleteModal(false);
                                    }}
                                >
                                    Delete Permanently
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
