import React, { useState, useEffect, useRef } from 'react';
import {
    FaArrowLeft, FaPaperPlane, FaImage, FaMicrophone, FaStop,
    FaPlay, FaPause, FaCheckDouble, FaVideo, FaPhone, FaEllipsisVertical,
    FaCircleInfo, FaBan, FaTrash, FaPen, FaShare, FaEllipsis, FaFaceSmile, FaFile, FaPlus
} from 'react-icons/fa6';
import EmojiPicker from 'emoji-picker-react';
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
    const [blocked, setBlocked] = useState(false); // I blocked them
    const [isBlocked, setIsBlocked] = useState(false); // They blocked me
    const [showProfile, setShowProfile] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Message Actions
    const [editingMsgId, setEditingMsgId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [hoveredMsgId, setHoveredMsgId] = useState(null);
    const [forwardMsg, setForwardMsg] = useState(null); // Message to forward
    const [showForwardModal, setShowForwardModal] = useState(false);
    const [forwardSearchTerm, setForwardSearchTerm] = useState('');
    const [forwardResults, setForwardResults] = useState([]);
    const [deleteCandidateMsg, setDeleteCandidateMsg] = useState(null); // Msg pending deletion
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState(null); // { url, type }
    const [reactingMsgId, setReactingMsgId] = useState(null); // Which msg is having reactions toggled

    const { onlineUsers } = useSocket();

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const audioRefs = useRef({}); // Map audio URLs to audio elements
    const timerRef = useRef(null); // For recording timer

    const otherUser = conversation.participants.find(p => p._id !== currentUser._id) || conversation.participants[0] || {};
    const isOnline = onlineUsers.has(otherUser._id);
    const totalSent = messages.filter(m => (m.sender._id === otherUser._id || m.sender === otherUser._id)).length;

    useEffect(() => {
        loadMessages();
        checkBlockStatus();
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

    const checkBlockStatus = async () => {
        try {
            const status = await API.getBlockStatus(otherUser._id);
            setBlocked(status.iBlockedThem);
            setIsBlocked(status.theyBlockedMe);
        } catch (err) { console.error(err); }
    };

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

        const handleMessageUpdate = (updatedMsg) => {
            setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
        };

        socket.on('receive_message', handleReceive);
        socket.on('messages_read_update', handleReadUpdate);
        socket.on('user_typing', handleTyping);
        socket.on('user_stop_typing', handleStopTyping);
        socket.on('message_updated', handleMessageUpdate);

        return () => {
            socket.off('receive_message', handleReceive);
            socket.off('messages_read_update', handleReadUpdate);
            socket.off('user_typing', handleTyping);
            socket.off('user_stop_typing', handleStopTyping);
            socket.off('message_updated', handleMessageUpdate);
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

    const handleEditSave = async (id) => {
        if (!editContent.trim()) return;
        try {
            const updated = await API.editMessage(id, editContent);
            setMessages(prev => prev.map(m => m._id === id ? updated : m));
            setEditingMsgId(null);
            toast.success("Message updated");
        } catch (err) {
            toast.error("Failed to edit message");
        }
    };

    const confirmDelete = async (mode) => {
        if (!deleteCandidateMsg) return;
        try {
            const id = deleteCandidateMsg._id;
            const updated = await API.deleteMessage(id, mode);

            if (mode === 'everyone') {
                setMessages(prev => prev.map(m => m._id === id ? updated : m));
            } else {
                setMessages(prev => prev.filter(m => m._id !== id));
            }
            toast.success(mode === 'everyone' ? "Unsent" : "Deleted for you");
        } catch (err) {
            toast.error("Failed to delete");
        } finally {
            setShowDeleteModal(false);
            setDeleteCandidateMsg(null);
        }
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
            toast.error(err.message || "Failed to send message");
        }
    };

    const handleBlock = async () => {
        try {
            if (blocked) {
                await API.unblockUser(otherUser._id);
                setBlocked(false);
                toast.success("User unblocked");
            } else {
                await API.blockUser(otherUser._id);
                setBlocked(true);
                toast.success("User blocked");
            }
            setShowOptions(false);
        } catch (err) {
            toast.error("Action failed");
        }
    };

    const handleForwardSearch = async (e) => {
        const query = e.target.value;
        setForwardSearchTerm(query);
        if (query.length > 1) {
            try {
                const res = await API.searchUsers(query);
                setForwardResults(res);
            } catch(e) { console.error(e); }
        } else {
            setForwardResults([]);
        }
    };

    const handleForwardSend = async (targetUser) => {
        try {
            // Get/Create conversation logic - similar to logCallMessage,
            // but we need the conversationId.
            // Ideally we assume conversation creation is idempotent.
            const conv = await API.createConversation(targetUser._id);
            await API.sendMessage(conv._id, forwardMsg.content, forwardMsg.type, forwardMsg.fileUrl);
            toast.success("Forwarded successfully");
            setShowForwardModal(false);
            setForwardSearchTerm('');
            setForwardResults([]);
        } catch (err) {
            toast.error("Failed to forward");
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const { url } = await API.uploadFile(file);
            let type = 'image';
            if (file.type.startsWith('audio')) type = 'audio';
            else if (file.type.startsWith('video')) type = 'video_call';

            if (file.type.startsWith('image')) {
                await sendMessage('', 'image', url);
            } else if (file.type.startsWith('audio')) {
                await sendMessage('', 'audio', url);
            } else {
                // Send as text link
                await sendMessage(url, 'text');
            }
        } catch (err) {
            console.error("Upload failed", err);
            toast.error("Failed to upload file.");
        } finally {
            setUploading(false);
        }
    };

    const onEmojiClick = (emojiObject) => {
        setNewMessage(prev => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    const handleReaction = async (msgId, emoji) => {
        try {
            const updated = await API.toggleReaction(msgId, emoji);
            setMessages(prev => prev.map(m => m._id === msgId ? updated : m));
            setReactingMsgId(null);
        } catch (err) {
            console.error(err);
        }
    };

    const onReactionEmojiClick = (emojiObject) => {
        if (reactingMsgId) {
            handleReaction(reactingMsgId, emojiObject.emoji);
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
        if (msg.isDeletedForEveryone) {
            return <em className="text-white-50 small border border-secondary p-2 rounded d-block" style={{borderColor: 'rgba(255,255,255,0.3) !important'}}>Message unsent</em>;
        }

        if (msg.type === 'image') {
            return (
                <img
                    src={msg.fileUrl}
                    alt="sent"
                    className="img-fluid rounded"
                    style={{maxHeight: '200px', cursor: 'pointer'}}
                    onClick={() => setLightboxMedia({ url: msg.fileUrl, type: 'image' })}
                />
            );
        } else if (msg.type === 'video_call' && !msg.content.includes('ended')) {
             return (
                <div
                    className="position-relative d-flex align-items-center justify-content-center bg-dark rounded"
                    style={{width: '200px', height: '150px', cursor: 'pointer'}}
                    onClick={() => setLightboxMedia({ url: msg.fileUrl, type: 'video' })}
                >
                    <FaPlay className="text-white fs-1 opacity-75" />
                    <video src={msg.fileUrl} className="w-100 h-100 object-fit-cover rounded opacity-50" />
                </div>
             );
        } else if (msg.type === 'audio') {
            const isPlaying = playingAudio === msg.fileUrl;
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
        } else if (msg.type === 'call' || msg.type === 'video_call') {
            const isVideo = msg.type === 'video_call';
            const isMissed = msg.content.toLowerCase().includes('missed');

            return (
                <div className="d-flex flex-column align-items-center justify-content-center gap-1 py-1" style={{width: '100%', minWidth: '200px'}}>
                    <div className="bg-light rounded-pill px-3 py-2 d-flex align-items-center gap-2 border shadow-sm">
                        {isVideo ? <FaVideo className={isMissed ? 'text-danger' : 'text-secondary'} /> : <FaPhone className={isMissed ? 'text-danger' : 'text-secondary'} />}
                        <span className={isMissed ? 'text-danger fw-bold' : 'text-dark'}>
                            {msg.content}
                        </span>
                    </div>
                </div>
            );
        }

        return <div style={{whiteSpace: 'pre-wrap'}}>{msg.content} {msg.isEdited && <span className="text-muted small fst-italic ms-1">(edited)</span>}</div>;
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
                    <div className="dropdown">
                        <button className="btn btn-light text-secondary rounded-circle" onClick={() => setShowOptions(!showOptions)} data-bs-toggle="dropdown">
                            <FaEllipsisVertical />
                        </button>
                        <ul className={`dropdown-menu dropdown-menu-end ${showOptions ? 'show' : ''}`}>
                            <li><button className="dropdown-item" onClick={() => { setShowProfile(true); setShowOptions(false); }}><FaCircleInfo className="me-2" /> View Profile</button></li>
                            <li><button className={`dropdown-item ${blocked ? 'text-success' : 'text-danger'}`} onClick={handleBlock}>
                                <FaBan className="me-2" /> {blocked ? "Unblock User" : "Block User"}
                            </button></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Profile Modal */}
            {showProfile && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header border-0 pb-0">
                                <button className="btn-close" onClick={() => setShowProfile(false)}></button>
                            </div>
                            <div className="modal-body text-center pb-4">
                                {renderAvatar(otherUser, 80)}
                                <h4 className="mt-3 mb-1">{otherUser.firstName} {otherUser.lastName}</h4>
                                <p className="text-muted mb-3">{otherUser.role} • {otherUser.studentId}</p>

                                <div className="d-flex justify-content-center gap-3 text-start d-inline-block">
                                    <div className="bg-light p-3 rounded text-center" style={{minWidth: '100px'}}>
                                        <small className="text-muted d-block">Department</small>
                                        <strong>{otherUser.department || 'N/A'}</strong>
                                    </div>
                                    <div className="bg-light p-3 rounded text-center" style={{minWidth: '100px'}}>
                                        <small className="text-muted d-block">Program</small>
                                        <strong>{otherUser.program || 'N/A'}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && deleteCandidateMsg && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title">Delete Message?</h5>
                            </div>
                            <div className="modal-body d-flex flex-column gap-2">
                                <p className="text-muted small mb-2">Who do you want to remove this message for?</p>

                                {(deleteCandidateMsg.sender._id === currentUser._id || deleteCandidateMsg.sender === currentUser._id) && (
                                    <button className="btn btn-outline-danger w-100 text-start" onClick={() => confirmDelete('everyone')}>
                                        <strong>Unsend for Everyone</strong>
                                        <div className="small text-muted" style={{fontSize: '0.75rem'}}>Remove for you and {otherUser.firstName}</div>
                                    </button>
                                )}

                                <button className="btn btn-outline-secondary w-100 text-start" onClick={() => confirmDelete('me')}>
                                    <strong>Remove for You</strong>
                                    <div className="small text-muted" style={{fontSize: '0.75rem'}}>Others will still see it</div>
                                </button>
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button className="btn btn-link text-secondary text-decoration-none" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox Modal */}
            {lightboxMedia && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 10500 }}>
                    <div className="position-absolute top-0 end-0 p-4">
                        <button className="btn btn-close btn-close-white" onClick={() => setLightboxMedia(null)}></button>
                    </div>
                    <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100">
                        {lightboxMedia.type === 'image' ? (
                            <img src={lightboxMedia.url} alt="Full view" style={{maxWidth: '90%', maxHeight: '80vh', objectFit: 'contain'}} />
                        ) : (
                            <video src={lightboxMedia.url} controls autoPlay style={{maxWidth: '90%', maxHeight: '80vh'}} />
                        )}
                        <a href={lightboxMedia.url} download target="_blank" rel="noreferrer" className="btn btn-light mt-3 rounded-pill px-4">
                            Download
                        </a>
                    </div>
                </div>
            )}

            {/* Forward Modal */}
            {showForwardModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title">Forward to...</h5>
                                <button className="btn-close" onClick={() => setShowForwardModal(false)}></button>
                            </div>
                            <div className="modal-body pt-2">
                                <p className="mb-3 p-2 bg-light rounded border small text-truncate">
                                    {forwardMsg?.content || 'Media attachment'}
                                </p>
                                <div className="input-group mb-3">
                                    <span className="input-group-text bg-light border-end-0"><FaPlus /></span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0 bg-light"
                                        placeholder="Search people..."
                                        value={forwardSearchTerm}
                                        onChange={handleForwardSearch}
                                        autoFocus
                                    />
                                </div>

                                <div className="list-group list-group-flush" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                    {forwardResults.length === 0 && forwardSearchTerm && (
                                        <div className="text-center text-muted p-3">No users found</div>
                                    )}

                                    {/* Default "Forward to Self" option if search empty or matches */}
                                    {(!forwardSearchTerm || "you".includes(forwardSearchTerm.toLowerCase())) && (
                                        <button className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-2" onClick={() => handleForwardSend(currentUser)}>
                                            {renderAvatar(currentUser, 40)}
                                            <div>
                                                <h6 className="mb-0">You</h6>
                                                <small className="text-muted">Message yourself</small>
                                            </div>
                                        </button>
                                    )}

                                    {forwardResults.filter(u => u._id !== currentUser._id).map(user => (
                                        <button key={user._id} className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-2" onClick={() => handleForwardSend(user)}>
                                            {renderAvatar(user, 40)}
                                            <div>
                                                <h6 className="mb-0">{user.firstName} {user.lastName}</h6>
                                                <small className="text-muted">{user.role}</small>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Reaction Picker Modal (If needed, or popover) */}
            {reactingMsgId && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 10600, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setReactingMsgId(null)}>
                    <div className="bg-white rounded p-3 shadow-lg" onClick={e => e.stopPropagation()}>
                        <h6 className="mb-3">Choose Reaction</h6>
                        <EmojiPicker onEmojiClick={onReactionEmojiClick} />
                    </div>
                </div>
            )}

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
                            const isSeen = msg.readBy.length > 1;

                            return (
                                <div
                                    key={idx}
                                    className={`d-flex gap-2 message-container ${isMe ? 'flex-row-reverse' : ''}`}
                                    onMouseEnter={() => setHoveredMsgId(msg._id)}
                                    onMouseLeave={() => setHoveredMsgId(null)}
                                    onClick={() => {
                                        if (window.innerWidth < 768) {
                                            setHoveredMsgId(prev => prev === msg._id ? null : msg._id);
                                        }
                                    }}
                                >
                                    {renderAvatar(isMe ? currentUser : otherUser, 35)}

                                    <div className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`} style={{maxWidth: '70%', position: 'relative'}}>
                                        <small className="text-muted mb-1" style={{fontSize: '0.75rem'}}>
                                            {isMe ? 'You' : msg.sender.firstName}
                                        </small>

                                        <div className="d-flex align-items-center">
                                            {(!msg.isDeletedForEveryone && hoveredMsgId === msg._id) && (
                                                <div className="d-flex align-items-center gap-2">
                                                    {/* Reaction Trigger */}
                                                    <div className={`position-relative ${isMe ? 'me-1' : 'ms-1'}`}>
                                                        <button
                                                            className="btn btn-sm btn-light rounded-circle shadow-sm text-warning"
                                                            data-bs-toggle="dropdown"
                                                            aria-expanded="false"
                                                        >
                                                            <FaFaceSmile />
                                                        </button>
                                                        <ul className="dropdown-menu p-2 shadow-lg" style={{minWidth: '280px'}}>
                                                            <div className="d-flex gap-2 align-items-center justify-content-between">
                                                                {['👍', '❤️', '😂', '😮', '😢', '😠'].map(emoji => (
                                                                    <span key={emoji} className="fs-4 cursor-pointer hover-scale" onClick={() => handleReaction(msg._id, emoji)} role="button">{emoji}</span>
                                                                ))}
                                                                <button className="btn btn-sm btn-light rounded-circle" onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setReactingMsgId(msg._id);
                                                                }}><FaPlus /></button>
                                                            </div>
                                                        </ul>
                                                    </div>

                                                    {/* Options Menu */}
                                                    <div className="dropdown">
                                                        <button className="btn btn-sm btn-light rounded-circle shadow-sm" data-bs-toggle="dropdown">
                                                            <FaEllipsis />
                                                        </button>
                                                        <ul className="dropdown-menu shadow-sm">
                                                            {msg.type === 'text' && (
                                                                <li><button className="dropdown-item" onClick={() => {
                                                                    navigator.clipboard.writeText(msg.content);
                                                                    toast.success("Copied to clipboard");
                                                                }}>
                                                                    <FaPen className="me-2 text-secondary" /> Copy
                                                                </button></li>
                                                            )}
                                                            <li><button className="dropdown-item" onClick={() => { setForwardMsg(msg); setShowForwardModal(true); }}>
                                                                <FaShare className="me-2 text-primary" /> Forward
                                                            </button></li>
                                                            {isMe && msg.type === 'text' && (
                                                                <li><button className="dropdown-item" onClick={() => { setEditingMsgId(msg._id); setEditContent(msg.content); }}>
                                                                    <FaPen className="me-2 text-warning" /> Edit
                                                                </button></li>
                                                            )}
                                                            <li><button className="dropdown-item text-danger" onClick={() => { setDeleteCandidateMsg(msg); setShowDeleteModal(true); }}>
                                                                <FaTrash className="me-2" /> Delete
                                                            </button></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Message Bubble or Edit Input */}
                                            {editingMsgId === msg._id ? (
                                                <div className="input-group">
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={editContent}
                                                        onChange={e => setEditContent(e.target.value)}
                                                        autoFocus
                                                    />
                                                    <button className="btn btn-success" onClick={() => handleEditSave(msg._id)}>Save</button>
                                                    <button className="btn btn-secondary" onClick={() => setEditingMsgId(null)}>Cancel</button>
                                                </div>
                                            ) : (
                                                <div
                                                    className={`p-3 rounded-4 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                                                    style={{wordWrap: 'break-word'}}
                                                >
                                                    {renderMessageContent(msg)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="d-flex align-items-center gap-1 mt-1">
                                            <small className="text-muted" style={{fontSize: '0.7rem'}}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </small>
                                            {isMe && isSeen && <FaCheckDouble className="text-primary" size={12} title="Seen" />}
                                        </div>

                                        {/* Reactions Display */}
                                        {msg.reactions && msg.reactions.length > 0 && (
                                            <div className="d-flex gap-1 mt-1 position-absolute" style={{bottom: '-10px', [isMe ? 'left' : 'right']: '0'}}>
                                                {Object.entries(msg.reactions.reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {})).map(([emoji, count]) => (
                                                    <span key={emoji} className="badge bg-light text-dark border shadow-sm rounded-pill" style={{fontSize: '0.7rem'}}>
                                                        {emoji} {count}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
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

            {/* Input Area */}
            {blocked ? (
                <div className="p-4 bg-light border-top text-center text-muted">
                    <p>You have blocked this user.</p>
                    <button className="btn btn-outline-danger btn-sm" onClick={handleBlock}>Unblock</button>
                </div>
            ) : isBlocked ? (
                <div className="p-4 bg-light border-top text-center text-muted">
                    <p>You cannot reply to this conversation.</p>
                </div>
            ) : (
                <div className="p-3 bg-white border-top position-relative">
                    {/* Emoji Picker Popover */}
                    {showEmojiPicker && (
                        <div className="position-absolute bottom-100 start-0 mb-2 ms-3 shadow-lg">
                            <EmojiPicker onEmojiClick={onEmojiClick} />
                        </div>
                    )}

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
                        <button type="button" className="btn btn-light text-secondary rounded-circle" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                            <FaFaceSmile size={20} className="text-warning" />
                        </button>

                        <input type="file" className="d-none" ref={fileInputRef} onChange={handleFileSelect} />
                        <button type="button" className="btn btn-light text-secondary rounded-circle" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                            <FaPlus size={20} />
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
            )}
        </div>
    );
};

export default ChatWindow;
