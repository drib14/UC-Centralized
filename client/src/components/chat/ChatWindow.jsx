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

const ChatWindow = ({ conversation, currentUser, socket, onBack, onMessageSent, onDeleteConversation, onUpdateConversation }) => {
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
    const [showDeleteConvModal, setShowDeleteConvModal] = useState(false);
    const [reactingMsgId, setReactingMsgId] = useState(null); // Which msg is having reactions toggled
    const [selectedFiles, setSelectedFiles] = useState([]); // Array of { file, preview, type, name }

    const { onlineUsers } = useSocket();
    const isMuted = conversation.mutedBy && conversation.mutedBy.includes(currentUser._id);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const audioRefs = useRef({}); // Map audio URLs to audio elements
    const timerRef = useRef(null); // For recording timer
    const [recordingStartTime, setRecordingStartTime] = useState(0); // To measure actual duration
    const [isInputFocused, setIsInputFocused] = useState(false); // Mobile focus state

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
        if (!newMessage.trim() && selectedFiles.length === 0) return;

        // Stop typing immediately
        if (typingTimeout) clearTimeout(typingTimeout);
        if (socket) socket.emit('stop_typing', { receiverId: otherUser._id, senderId: currentUser._id });

        // Handle File Uploads
        let attachments = [];
        if (selectedFiles.length > 0) {
            setUploading(true);
            try {
                // Upload sequentially to avoid overwhelming
                for (const fileObj of selectedFiles) {
                    const { url } = await API.uploadFile(fileObj.file);
                    let type = 'file';
                    if (fileObj.file.type.startsWith('image')) type = 'image';
                    else if (fileObj.file.type.startsWith('video')) type = 'video';
                    else if (fileObj.file.type.startsWith('audio')) type = 'audio';

                    attachments.push({
                        url,
                        type,
                        name: fileObj.file.name,
                        size: fileObj.file.size
                    });
                }
            } catch (err) {
                console.error("Upload failed", err);
                toast.error("Failed to upload files");
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        await sendMessage(newMessage, 'text', null, attachments);
        setNewMessage('');
        setSelectedFiles([]);
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

    const sendMessage = async (content, type, fileUrl = null, attachments = []) => {
        try {
            const sentMsg = await API.sendMessage(conversation._id, content, type, fileUrl, attachments);
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

    const handleUnmute = async () => {
        try {
            await API.muteConversation(conversation._id);
            toast.success("Conversation unmuted");

            if (onUpdateConversation) {
                const updatedConv = {
                    ...conversation,
                    mutedBy: conversation.mutedBy.filter(id => id !== currentUser._id)
                };
                onUpdateConversation(updatedConv);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteConversation = async () => {
        try {
            await API.deleteConversation(conversation._id);
            toast.success("Conversation deleted");
            if (onDeleteConversation) onDeleteConversation(conversation._id);
        } catch (err) {
            toast.error("Failed to delete conversation");
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
            const conv = await API.createConversation(targetUser._id);
            const sentMsg = await API.sendMessage(conv._id, forwardMsg.content, forwardMsg.type, forwardMsg.fileUrl);

            // Notify UI & Socket
            onMessageSent(sentMsg); // Update Sidebar logic (ChatLayout)
            if (socket) {
                socket.emit('send_message', {
                    ...sentMsg,
                    receiverId: targetUser._id
                });
            }

            toast.success("Forwarded successfully");
            setShowForwardModal(false);
            setForwardSearchTerm('');
            setForwardResults([]);
        } catch (err) {
            toast.error("Failed to forward");
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newFiles = files.map(file => {
            let preview = null;
            let type = 'file';
            if (file.type.startsWith('image')) {
                type = 'image';
                preview = URL.createObjectURL(file);
            } else if (file.type.startsWith('video')) {
                type = 'video';
                preview = URL.createObjectURL(file);
            } else if (file.type.startsWith('audio')) {
                type = 'audio';
            }
            return { file, preview, type, name: file.name };
        });

        setSelectedFiles(prev => [...prev, ...newFiles]);
        e.target.value = null; // Reset input
    };

    const removeSelectedFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
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
                const duration = Math.floor((Date.now() - recordingStartTime) / 1000);
                setRecordingTime(0);

                // Create Blob with specific type
                const blob = new Blob(chunks, { type: 'audio/webm' });
                // Explicitly name the file with extension
                const file = new File([blob], `voice_msg_${Date.now()}.webm`, { type: 'audio/webm' });

                setUploading(true);
                try {
                    const { url } = await API.uploadFile(file);
                    const attachment = {
                        url,
                        type: 'audio',
                        name: 'Voice Message',
                        size: file.size,
                        duration: duration
                    };
                    await sendMessage('', 'audio', url, [attachment]);
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
            setRecordingStartTime(Date.now());

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

    const renderMessageContent = (msg, isMe) => {
        if (msg.isDeletedForEveryone) {
            return (
                <div className={`p-3 rounded-4 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark'}`}>
                    <em className={`small d-block ${isMe ? 'text-white-50' : 'text-muted'}`}>Message unsent</em>
                </div>
            );
        }

        const renderSingleAttachment = (att, index, isLegacy=false) => {
             const url = att.url || att;
             const type = att.type || (url.match(/\.(jpeg|jpg|gif|png)$/i) ? 'image' : url.match(/\.(mp4|webm)$/i) ? 'video' : 'file');
             const name = att.name || url.split('/').pop() || 'File';
             const size = att.size;

             if (type === 'image') {
                 return (
                     <img
                         key={index}
                         src={url}
                         alt="sent"
                         className="img-fluid rounded shadow-sm"
                         style={{maxHeight: '200px', cursor: 'pointer', maxWidth: '100%'}}
                         onClick={() => setLightboxMedia({ url, type: 'image' })}
                     />
                 );
             } else if (type === 'video') {
                 return (
                    <div
                        key={index}
                        className="position-relative d-flex align-items-center justify-content-center rounded shadow-sm"
                        style={{width: '200px', height: '150px', cursor: 'pointer', backgroundColor: '#000'}}
                        onClick={() => setLightboxMedia({ url, type: 'video' })}
                    >
                        <FaPlay className="text-white fs-1 opacity-75 position-absolute" style={{zIndex: 2}} />
                        <video src={url} className="w-100 h-100 object-fit-cover rounded" style={{opacity: 0.8, pointerEvents: 'none'}} />
                    </div>
                 );
             } else if (type === 'audio') {
                 // Audio kept in bubble or custom styling? User said media bubble.
                 // We'll wrap audio in a small card to keep controls visible
                const isPlaying = playingAudio === url;
                const duration = att.duration || 0;
                return (
                    <div key={index} className="d-flex align-items-center gap-3 p-2 rounded-pill shadow-sm bg-white border" style={{minWidth: '240px'}}>
                        <button
                            className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                            style={{width: '35px', height: '35px', minWidth: '35px'}}
                            onClick={() => toggleAudio(url)}
                        >
                            {isPlaying ? <FaPause className="text-white" size={12} /> : <FaPlay className="text-white" size={12} />}
                        </button>

                        {/* Fake Waveform Visualizer */}
                        <div className="d-flex align-items-center gap-1" style={{height: '20px'}}>
                            {[...Array(15)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`rounded-pill ${isPlaying ? 'bg-primary animate-pulse' : 'bg-secondary'}`}
                                    style={{
                                        width: '3px',
                                        height: `${Math.random() * 15 + 5}px`,
                                        opacity: isPlaying ? 1 : 0.3,
                                        transition: 'all 0.2s'
                                    }}
                                ></div>
                            ))}
                        </div>

                        <div className="d-flex flex-column align-items-end ms-auto">
                            <span className="small text-muted fw-bold" style={{fontSize: '0.7rem'}}>
                                {duration ? formatDuration(duration) : (size ? (size >= 1048576 ? (size/1048576).toFixed(2)+' MB' : (size/1024).toFixed(0)+' KB') : 'Audio')}
                            </span>
                        </div>
                        <audio ref={el => audioRefs.current[url] = el} src={url} hidden />
                    </div>
                );
             } else {
                 return (
                     <a
                        key={index}
                        href={url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="text-decoration-none"
                     >
                        <div className="d-flex align-items-center gap-3 p-3 rounded shadow-sm" style={{minWidth: '220px', cursor: 'pointer', backgroundColor: '#333', color: '#fff'}}>
                             <div className="d-flex align-items-center justify-content-center rounded-circle" style={{width: '40px', height: '40px', backgroundColor: 'rgba(255,255,255,0.1)'}}>
                                 <FaFile size={20} className="text-white" />
                             </div>
                             <div className="d-flex flex-column flex-grow-1 overflow-hidden">
                                 <strong className="text-truncate d-block" style={{maxWidth: '180px', fontSize: '0.9rem'}} title={name}>{name}</strong>
                                 <small className="text-white-50" style={{fontSize: '0.75rem'}}>{size ? (size >= 1048576 ? (size/1048576).toFixed(2)+' MB' : (size/1024).toFixed(2)+' KB') : 'Download'}</small>
                             </div>
                        </div>
                     </a>
                 );
             }
        };

        const elements = [];

        // Handle Attachments
        if (msg.attachments && msg.attachments.length > 0) {
            msg.attachments.forEach((att, i) => {
                elements.push(renderSingleAttachment(att, i));
            });
        } else if (['image', 'video', 'file', 'audio'].includes(msg.type)) {
             elements.push(renderSingleAttachment({ url: msg.fileUrl, type: msg.type, name: 'Attachment' }, 0, true));
        }

        // Handle Text
        if (msg.content && msg.type !== 'image' && msg.type !== 'video' && msg.type !== 'file' && msg.type !== 'audio') {
             // If call/video_call system message
             if (msg.type === 'call' || msg.type === 'video_call') {
                const isVideo = msg.type === 'video_call';
                const isMissed = msg.content.toLowerCase().includes('missed');
                elements.push(
                    <div key="call" className="d-flex flex-column align-items-center justify-content-center gap-1 py-1" style={{width: '100%', minWidth: '200px'}}>
                        <div className="bg-light rounded-pill px-3 py-2 d-flex align-items-center gap-2 border shadow-sm">
                            {isVideo ? <FaVideo className={isMissed ? 'text-danger' : 'text-secondary'} /> : <FaPhone className={isMissed ? 'text-danger' : 'text-secondary'} />}
                            <span className={isMissed ? 'text-danger fw-bold' : 'text-dark'}>{msg.content}</span>
                        </div>
                    </div>
                );
             } else {
                 elements.push(
                    <div key="text" className={`p-3 rounded-4 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark'}`} style={{wordWrap: 'break-word'}}>
                        <div style={{whiteSpace: 'pre-wrap'}}>{msg.content} {msg.isEdited && <span className="small fst-italic ms-1" style={{opacity: 0.7}}>(edited)</span>}</div>
                    </div>
                 );
             }
        }

        return elements;
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
                        <h6 className="mb-0 fw-bold" style={{fontWeight: 700}}>{otherUser.firstName} {otherUser.lastName}</h6>
                        <div className="d-flex align-items-center gap-2">
                            {isOnline ? (
                                <small className="text-success d-flex align-items-center gap-1">
                                    <span className="bg-success rounded-circle" style={{width:8, height:8}}></span> Active Now
                                </small>
                            ) : (
                                <small className="text-muted">
                                    {otherUser.lastSeen
                                        ? `Active ${Math.floor((Date.now() - new Date(otherUser.lastSeen)) / 60000) < 60
                                            ? Math.max(1, Math.floor((Date.now() - new Date(otherUser.lastSeen)) / 60000)) + 'm'
                                            : Math.floor((Date.now() - new Date(otherUser.lastSeen)) / 3600000) + 'h'} ago`
                                        : 'Offline'}
                                </small>
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
                            <li><hr className="dropdown-divider"/></li>
                            <li><button className="dropdown-item text-danger" onClick={() => { setShowDeleteConvModal(true); setShowOptions(false); }}>
                                <FaTrash className="me-2" /> Delete Conversation
                            </button></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Delete Conversation Modal */}
            {showDeleteConvModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-sm">
                        <div className="modal-content">
                            <div className="modal-header border-0 pb-0">
                                <h5 className="modal-title">Delete Conversation?</h5>
                            </div>
                            <div className="modal-body text-muted small">
                                This will remove the conversation from your list. It will reappear if they message you again.
                            </div>
                            <div className="modal-footer border-0 pt-0">
                                <button className="btn btn-link text-secondary text-decoration-none" onClick={() => setShowDeleteConvModal(false)}>Cancel</button>
                                <button className="btn btn-danger" onClick={handleDeleteConversation}>Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

                                        <div className="position-relative d-flex align-items-center">
                                            {/* Actions Overlay - Absolute Position to prevent layout shift */}
                                            {(!msg.isDeletedForEveryone && hoveredMsgId === msg._id) && (
                                                <div
                                                    className="d-flex align-items-center gap-2 position-absolute"
                                                    style={{
                                                        [isMe ? 'right' : 'left']: '100%',
                                                        marginRight: isMe ? '10px' : 0,
                                                        marginLeft: !isMe ? '10px' : 0,
                                                        whiteSpace: 'nowrap',
                                                        zIndex: 5
                                                    }}
                                                >
                                                    {/* Reaction Trigger */}
                                                    <div className={`position-relative`}>
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
                                                <div className={`d-flex flex-column gap-1 ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                                                    {renderMessageContent(msg, isMe)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="d-flex align-items-center gap-1 mt-1">
                                            <small className="text-muted" style={{fontSize: '0.7rem'}}>
                                                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </small>
                                            {isMe && (
                                                <small className="text-muted ms-1" style={{fontSize: '0.7rem'}}>
                                                    {isSeen ? 'Seen' : (isOnline ? 'Delivered' : 'Sent')}
                                                </small>
                                            )}
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
                             <div className="d-flex align-items-center gap-2 mb-2">
                                {renderAvatar(otherUser, 35)}
                                <div className="bg-light p-3 rounded-4 shadow-sm">
                                    <div className="typing-dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                </div>
                             </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Mute Banner */}
            {isMuted && (
                <div className="bg-warning-subtle text-warning-emphasis px-3 py-2 d-flex align-items-center justify-content-between small">
                    <span><FaCircleInfo className="me-2"/> You have muted this conversation.</span>
                    <button className="btn btn-sm btn-outline-warning border-0 fw-bold" onClick={handleUnmute}>Unmute</button>
                </div>
            )}

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

                    {/* File Preview Bar */}
                    {selectedFiles.length > 0 && (
                        <div className="d-flex gap-2 p-2 overflow-auto bg-white border-bottom">
                            {selectedFiles.map((file, i) => (
                                <div key={i} className="position-relative flex-shrink-0" style={{width: '80px', height: '80px'}}>
                                    {file.type === 'image' ? (
                                        <img src={file.preview} alt="prev" className="w-100 h-100 rounded object-fit-cover border" />
                                    ) : file.type === 'video' ? (
                                        <video src={file.preview} className="w-100 h-100 rounded object-fit-cover border" />
                                    ) : (
                                        <div className="w-100 h-100 rounded bg-light border d-flex flex-column align-items-center justify-content-center text-center p-1">
                                            <FaFile className="text-muted mb-1" />
                                            <small className="d-block text-truncate w-100" style={{fontSize: '0.6rem'}}>{file.name}</small>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className="position-absolute top-0 end-0 btn btn-sm btn-danger rounded-circle p-0 d-flex align-items-center justify-content-center"
                                        style={{width: '20px', height: '20px', transform: 'translate(30%, -30%)'}}
                                        onClick={() => removeSelectedFile(i)}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
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

                        {/* Hide extra actions on mobile focus */}
                        {(!isInputFocused || window.innerWidth > 768) && (
                            <>
                                <input type="file" className="d-none" multiple ref={fileInputRef} onChange={handleFileSelect} />
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
                            </>
                        )}

                        <input
                            type="text"
                            className="form-control rounded-pill bg-light border-0"
                            placeholder={uploading ? "Uploading..." : "Aa"}
                            value={newMessage}
                            onChange={handleInputChange}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setTimeout(() => setIsInputFocused(false), 200)} // Delay to allow button clicks
                            disabled={uploading}
                        />

                        <button type="submit" className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center" style={{width:'40px', height:'40px'}} disabled={(!newMessage.trim() && selectedFiles.length === 0) || uploading}>
                            <FaPaperPlane />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
