import React, { useState, useEffect, useRef } from 'react';
import {
    FaPhone, FaVideo, FaCircleInfo, FaImages, FaFaceSmile, FaPlus, FaThumbsUp, FaPaperPlane, FaArrowLeft,
    FaPlay, FaPause, FaFile, FaReply, FaTrash, FaLocationDot, FaSquarePollVertical, FaMicrophone, FaEllipsisVertical, FaStop, FaXmark
} from 'react-icons/fa6';
import { FaStickyNote } from 'react-icons/fa'; // Sticker Icon
import EmojiPicker from 'emoji-picker-react';
import { useSwipeable } from 'react-swipeable';
import { useCall } from '../../context/CallContext';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import UserAvatar from './UserAvatar';
import PollModal from './PollModal';
import MediaPreview from './MediaPreview';
import ChatInfoModal from './ChatInfoModal';
import StickerPicker from './StickerPicker';

const ChatWindow = ({ conversation, currentUser, socket, onBack, onMessageSent, onDeleteConversation }) => {
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [showPollModal, setShowPollModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [conversationSettings, setConversationSettings] = useState({
        theme: conversation.theme || '#003399',
        quickReaction: conversation.quickReaction || '👍',
        nicknames: conversation.nicknames || {}
    });
    const [isMuted, setIsMuted] = useState(conversation.mutedBy?.includes(currentUser._id));

    // Voice Recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);

    const { callUser } = useCall();
    const otherUser = conversation.participants.find(p => p._id !== currentUser._id) || conversation.participants[0];
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const audioRefs = useRef({});
    const [playingAudio, setPlayingAudio] = useState(null);

    // Swipe Handlers
    const touchStartRef = useRef(null);
    const touchEndRef = useRef(null);

    const onTouchStart = (e) => {
        touchEndRef.current = null;
        touchStartRef.current = e.targetTouches[0].clientX;
    }

    const onTouchMove = (e) => {
        touchEndRef.current = e.targetTouches[0].clientX;
    }

    const onTouchEnd = (msg) => {
        if (!touchStartRef.current || !touchEndRef.current) return;
        const distance = touchStartRef.current - touchEndRef.current;
        const isSwipeRight = distance < -50;

        if (isSwipeRight) {
            setReplyTo(msg);
        }
    }

    useEffect(() => {
        loadMessages();
        API.markMessagesRead(conversation._id).catch(console.error);
        setIsMuted(conversation.mutedBy?.includes(currentUser._id));
        setConversationSettings({
            theme: conversation.theme || '#003399',
            quickReaction: conversation.quickReaction || '👍',
            nicknames: conversation.nicknames || {}
        });

        if (socket) {
            socket.emit('mark_messages_read', {
                conversationId: conversation._id,
                readerId: currentUser._id,
                senderId: otherUser._id
            });
            socket.on('conversation_settings_updated', (data) => {
                if (data.conversationId === conversation._id) {
                    setConversationSettings({
                        theme: data.theme,
                        quickReaction: data.quickReaction,
                        nicknames: data.nicknames || {}
                    });
                }
            });
        }
        return () => {
            if(socket) socket.off('conversation_settings_updated');
        }
    }, [conversation._id]);

    useEffect(() => {
        if (!socket) return;
        const handleReceive = (data) => {
            if (data.conversationId === conversation._id) {
                if (data.isEdited || data.type === 'poll' || data.isDeletedForEveryone) {
                    setMessages(prev => prev.map(m => m._id === data._id ? data : m));
                } else {
                     setMessages(prev => [...prev, data]);
                     scrollToBottom();
                }
                if (onMessageSent) onMessageSent(data);
            }
        };
        const handleUpdate = (data) => {
             if (data.conversationId === conversation._id) {
                 setMessages(prev => prev.map(m => m._id === data._id ? data : m));
             }
        };

        socket.on('receive_message', handleReceive);
        socket.on('message_updated', handleUpdate);
        return () => {
            socket.off('receive_message', handleReceive);
            socket.off('message_updated', handleUpdate);
        }
    }, [socket, conversation._id]);

    const loadMessages = async () => {
        try {
            const data = await API.getMessages(conversation._id);
            setMessages(data);
            scrollToBottom();
        } catch (err) {
            console.error(err);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // --- Voice Recording Logic ---
    const startRecording = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                audioChunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };

                mediaRecorderRef.current.onstop = () => {
                   // Logic handled in stop/send
                };

                mediaRecorderRef.current.start();
                setIsRecording(true);
                setRecordingDuration(0);
                recordingTimerRef.current = setInterval(() => {
                    setRecordingDuration(prev => prev + 1);
                }, 1000);
            } catch (err) {
                console.error("Mic Error:", err);
                toast.error("Microphone access denied");
            }
        } else {
            toast.error("Audio recording not supported");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            clearInterval(recordingTimerRef.current);
            setIsRecording(false);
        }
    };

    const cancelRecording = () => {
        stopRecording();
        audioChunksRef.current = [];
    };

    const sendRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.onstop = async () => {
                 const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                 const file = new File([audioBlob], "voice_message.webm", { type: 'audio/webm' });

                 setIsSending(true);
                 try {
                     const { url } = await API.uploadFile(file);
                     await handleSend('', 'audio', null, [{ url, type: 'audio', duration: recordingDuration }]);
                 } catch (err) {
                     toast.error("Failed to send audio");
                 } finally {
                     setIsSending(false);
                 }
                 clearInterval(recordingTimerRef.current);
                 setIsRecording(false);
            };
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };


    const handleSend = async (overrideContent = null, overrideType = 'text', fileUrl = null, attachments = [], pollData = null, locationData = null) => {
        const content = overrideContent !== null ? overrideContent : newMessage;
        if (!content.trim() && attachments.length === 0 && !fileUrl && !pollData && !locationData && overrideType === 'text') return;

        setIsSending(true);
        try {
            // Using API.post as fixed in api.js
            const sentMsg = await API.post('/messages', {
                conversationId: conversation._id,
                content,
                type: overrideType,
                fileUrl,
                attachments,
                pollData,
                locationData
            });

            setMessages(prev => [...prev, sentMsg]);
            setNewMessage('');
            setReplyTo(null);
            setSelectedFiles([]);
            if (onMessageSent) onMessageSent(sentMsg);

            socket.emit('send_message', {
                ...sentMsg,
                receiverId: otherUser._id
            });
            scrollToBottom();
        } catch (err) {
            console.error("Failed to send", err);
            toast.error("Failed to send message");
        } finally {
            setIsSending(false);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setSelectedFiles(prev => [...prev, ...files]);
        e.target.value = null; // Reset
    };

    const handleUploadAndSend = async () => {
        if (selectedFiles.length === 0 && !newMessage.trim()) return;
        setIsUploading(true);
        setIsSending(true);

        try {
            const attachments = [];
            for (const file of selectedFiles) {
                const { url } = await API.uploadFile(file);
                let type = 'file';
                if (file.type.startsWith('image')) type = 'image';
                else if (file.type.startsWith('video')) type = 'video';
                else if (file.type.startsWith('audio')) type = 'audio';

                attachments.push({
                    url, type, name: file.name, size: file.size
                });
            }
            await handleSend(newMessage, attachments.length > 0 ? (attachments[0].type === 'image' ? 'image' : 'file') : 'text', null, attachments);
        } catch (err) {
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
            setIsSending(false);
        }
    }

    const handleLocation = () => {
        if (!navigator.geolocation) return toast.error("Geolocation is not supported by your browser");

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            await handleSend('Shared a location', 'location', null, [], null, {
                latitude, longitude
            });
        }, () => {
            toast.error("Unable to retrieve your location");
        });
        setShowPlusMenu(false);
    };

    const handlePollSubmit = async (pollData) => {
        await handleSend('Created a poll', 'poll', null, [], pollData);
    };

    const handleVote = async (msgId, optionIndex) => {
        try {
             await API.put(`/messages/${msgId}/vote`, { optionIndex });
        } catch (err) {
            toast.error("Failed to vote");
        }
    };

    const deleteMessage = async (msgId) => {
        if (!window.confirm("Unsend this message?")) return;
        try {
            setMessages(prev => prev.filter(m => m._id !== msgId));
            await API.deleteMessage(msgId);
        } catch (err) {
            toast.error("Failed to unsend");
        }
    };

    const onEmojiClick = (emojiObject) => {
        setNewMessage(prev => prev + emojiObject.emoji);
        setShowEmojiPicker(false);
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

    const updateSettings = async (updates) => {
        try {
            const newSettings = { ...conversationSettings, ...updates };
            setConversationSettings(newSettings);
            await API.put(`/messages/conversations/${conversation._id}/settings`, updates);
            toast.success("Settings updated");
        } catch (err) {
            toast.error("Failed to update settings");
        }
    };

    const handleMute = async () => {
        try {
            await API.put(`/messages/conversations/${conversation._id}/mute`);
            setIsMuted(!isMuted);
            toast.success(isMuted ? "Notifications unmuted" : "Notifications muted");
        } catch(e) { toast.error("Failed to mute"); }
    };

    const handleBlock = async () => {
        if(!window.confirm(`Block ${otherUser.firstName}?`)) return;
        try {
            await API.put(`/users/${otherUser._id}/block`);
            toast.success("User blocked");
            onBack();
        } catch(e) { toast.error("Failed to block"); }
    };

    const handleDeleteConversation = () => {
        if(!window.confirm("Delete this conversation?")) return;
        onDeleteConversation(conversation._id);
    };

    // --- Message Rendering Helpers ---
    const renderContent = (msg, isMe) => {
        if (msg.isDeletedForEveryone) {
            return <em className="text-muted">Message unsent</em>;
        }

        if (msg.type === 'system') {
            return <div className="text-center small text-secondary my-2">{msg.content}</div>;
        }

        if (msg.type === 'location' && msg.locationData) {
            const { latitude, longitude } = msg.locationData;
            const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
            return (
                <div className="bg-white p-2 rounded-3 cursor-pointer" style={{width: 200}}>
                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="d-block text-decoration-none text-dark">
                        <div className="bg-light d-flex align-items-center justify-content-center rounded mb-2" style={{height: 100}}>
                            <FaLocationDot size={32} className="text-danger" />
                        </div>
                        <div className="fw-bold small">Location</div>
                        <small className="text-muted d-block text-truncate">View on Maps</small>
                    </a>
                </div>
            );
        }

        if (msg.type === 'poll' && msg.pollData) {
             const { question, options, allowMultipleAnswers } = msg.pollData;
             const totalVotes = options.reduce((acc, opt) => acc + opt.votes.length, 0);

             return (
                 <div className="bg-white p-3 rounded-3 shadow-sm cursor-pointer" style={{minWidth: 250}}>
                     <div className="fw-bold mb-2">{question}</div>
                     <small className="text-muted mb-3 d-block">{allowMultipleAnswers ? 'Multiple Choice' : 'Select one'}</small>
                     <div className="d-flex flex-column gap-2">
                         {options.map((opt, idx) => {
                             const isVoted = opt.votes.includes(currentUser._id);
                             const percent = totalVotes > 0 ? (opt.votes.length / totalVotes) * 100 : 0;
                             return (
                                 <div key={idx} className="cursor-pointer" onClick={() => handleVote(msg._id, idx)}>
                                     <div className="d-flex justify-content-between small mb-1">
                                         <span>{opt.text}</span>
                                         <span>{opt.votes.length}</span>
                                     </div>
                                     <div className="progress" style={{height: 8}}>
                                         <div className={`progress-bar ${isVoted ? 'bg-primary' : 'bg-secondary'}`} style={{width: `${percent}%`}}></div>
                                     </div>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
             );
        }

        return (
            <div
                className={`px-3 py-2 ${msg.type === 'text' ? (isMe ? 'text-white' : 'text-dark') : ''}`}
                style={{
                    backgroundColor: msg.type === 'text' ? (isMe ? conversationSettings.theme : '#f0f2f5') : 'transparent',
                    borderRadius: '18px',
                    borderBottomRightRadius: isMe ? '4px' : '18px',
                    borderBottomLeftRadius: !isMe ? '4px' : '18px',
                    wordWrap: 'break-word',
                    cursor: 'pointer'
                }}
            >
                {msg.content}
            </div>
        );
    };

    const renderAttachment = (att, index) => {
        const url = att.url || att;
        const type = att.type || 'file';

        if (type === 'image') {
            return (
                <img
                    key={index} src={url} alt="att"
                    className="rounded-3 cursor-pointer shadow-sm"
                    style={{maxHeight: '200px', maxWidth: '100%', objectFit: 'cover'}}
                    onClick={() => setLightboxMedia({url, type})}
                />
            );
        }
        if (type === 'sticker') {
            return (
                <img
                    key={index} src={url} alt="sticker"
                    className="cursor-pointer hover-scale"
                    style={{width: 120, height: 120, objectFit: 'contain'}}
                />
            );
        }
        if (type === 'video') {
            return (
                <div key={index} className="position-relative rounded-3 overflow-hidden cursor-pointer" onClick={() => setLightboxMedia({url, type})}>
                    <video src={url} className="w-100" style={{maxHeight: '200px', objectFit: 'cover'}} />
                    <div className="position-absolute top-50 start-50 translate-middle text-white">
                        <FaPlay size={24} />
                    </div>
                </div>
            );
        }
        if (type === 'audio') {
            const isPlaying = playingAudio === url;
            return (
                <div key={index} className="d-flex align-items-center gap-2 p-2 bg-white rounded-pill border shadow-sm" style={{minWidth: '200px'}}>
                    <button className="btn btn-primary rounded-circle btn-sm p-0 d-flex align-items-center justify-content-center" style={{width: 30, height: 30}} onClick={() => toggleAudio(url)}>
                        {isPlaying ? <FaPause size={12}/> : <FaPlay size={12}/>}
                    </button>
                    <div className="flex-grow-1 mx-1" style={{height: 4, background: '#eee'}}>
                        <div className="h-100 bg-primary" style={{width: isPlaying ? '100%' : '0%', transition: 'width 0.2s linear'}}></div>
                    </div>
                    <small className="text-muted" style={{fontSize: '0.7rem'}}>{formatDuration(att.duration || 0)}</small>
                    <audio ref={el => audioRefs.current[url] = el} src={url} />
                </div>
            );
        }
        return (
            <div key={index} className="d-flex align-items-center gap-2 p-2 bg-dark text-white rounded-3 cursor-pointer" onClick={() => window.open(url, '_blank')}>
                <div className="p-2 bg-secondary rounded-circle"><FaFile /></div>
                <div className="overflow-hidden">
                    <div className="text-truncate fw-bold" style={{maxWidth: '150px'}}>{att.name || 'File'}</div>
                    <small style={{fontSize: '0.7rem'}}>{att.size ? (att.size/1024/1024).toFixed(2) + ' MB' : 'Download'}</small>
                </div>
            </div>
        );
    };

    // --- Double Tap & Long Press & Swipe ---
    const tapTimeout = useRef(null);
    const lastTap = useRef(0);

    const handleTouchStart = (msg) => {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            // Double Tap
            handleReaction(msg, '❤️');
            lastTap.current = 0;
        } else {
            lastTap.current = now;
        }
    };

    const handleReaction = async (msg, emoji) => {
        try {
             const updated = await API.put(`/messages/${msg._id}/react`, { emoji });
             setMessages(prev => prev.map(m => m._id === updated._id ? updated : m));
        } catch (err) {
            console.error(err);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const getNickname = (user) => {
        return (conversationSettings.nicknames && conversationSettings.nicknames[user._id]) || user.firstName;
    }

    return (
        <div className="d-flex h-100 w-100 overflow-hidden">
            <div className="d-flex flex-column h-100 w-100 flex-grow-1 bg-white position-relative" onClick={() => { setMenuOpenId(null); setShowPlusMenu(false); setShowStickerPicker(false); }}>
                {/* Header */}
                <div className="p-2 border-bottom d-flex align-items-center justify-content-between shadow-sm flex-shrink-0" style={{height: '60px'}}>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-messenger text-primary d-md-none me-2 cursor-pointer" onClick={onBack}><FaArrowLeft size={20}/></button>
                        <div className="me-2 cursor-pointer" onClick={() => setShowInfoModal(true)}>
                            <UserAvatar user={otherUser} size={40} showOnlineStatus={true} isOnline={otherUser.isOnline} />
                        </div>
                        <div className="cursor-pointer" onClick={() => setShowInfoModal(true)}>
                            <h6 className="mb-0 fw-bold">{getNickname(otherUser)} {otherUser.lastName}</h6>
                            <small className="text-muted" style={{fontSize: '0.75rem'}}>
                                {otherUser.isOnline ? 'Active now' : (otherUser.lastSeen ? `Active ${Math.floor((new Date() - new Date(otherUser.lastSeen))/60000)}m ago` : 'Offline')}
                            </small>
                        </div>
                    </div>
                    <div className="d-flex gap-2 text-primary me-2">
                        <div className="btn-messenger" onClick={() => callUser(otherUser._id, false)}><FaPhone size={20} /></div>
                        <div className="btn-messenger" onClick={() => callUser(otherUser._id, true)}><FaVideo size={20} /></div>
                        <div className="btn-messenger" onClick={() => setShowInfoModal(true)}><FaCircleInfo size={20} /></div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-1 w-100">
                    {messages.map((msg, idx) => {
                        const isMe = msg.sender._id === currentUser._id || msg.sender === currentUser._id;
                        const isSystem = msg.type === 'system';
                        const isLast = idx === messages.length - 1 || messages[idx+1]?.sender._id !== msg.sender._id;
                        const isMenuOpen = menuOpenId === msg._id;

                        if (isSystem) {
                             return <div key={msg._id} className="text-center small text-secondary my-2 w-100">{msg.content}</div>;
                        }

                        return (
                            <div
                                key={msg._id}
                                className={`d-flex align-items-center gap-2 ${isMe ? 'flex-row-reverse' : ''} mb-1 position-relative message-row`}
                                onContextMenu={(e) => { e.preventDefault(); setMenuOpenId(msg._id); }}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={() => onTouchEnd(msg)}
                            >
                                {!isMe && (
                                    <div style={{width: 28}}>
                                        {isLast && <UserAvatar user={otherUser} size={28} />}
                                    </div>
                                )}

                                {/* Hover Actions (Desktop) - Left of My Message, Right of Their Message */}
                                <div className={`message-actions d-none d-md-flex gap-1 ${isMe ? 'order-1 me-2' : 'order-2 ms-2'}`} style={{zIndex: 1}}>
                                    <div className="btn-messenger text-muted" style={{width: 24, height: 24}} onClick={() => handleReaction(msg, '👍')} title="Like"><FaThumbsUp size={12} /></div>
                                    <div className="btn-messenger text-muted" style={{width: 24, height: 24}} onClick={() => setReplyTo(msg)} title="Reply"><FaReply size={12} /></div>
                                    <div className="btn-messenger text-muted" style={{width: 24, height: 24}} onClick={() => setMenuOpenId(msg._id)}><FaEllipsisVertical size={12} /></div>
                                </div>

                                <div className={`d-flex flex-column ${isMe ? 'align-items-end order-2' : 'align-items-start order-1'}`} style={{maxWidth: '70%'}}>
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="d-flex flex-column gap-1 mb-1">
                                            {msg.attachments.map((att, i) => renderAttachment(att, i))}
                                        </div>
                                    )}
                                    {msg.content || msg.type === 'poll' || msg.type === 'location' ? (
                                        <div
                                            onClick={() => handleTouchStart(msg)}
                                        >
                                            {renderContent(msg, isMe)}
                                        </div>
                                    ) : null}

                                    {/* Reactions */}
                                    {msg.reactions && msg.reactions.length > 0 && (
                                        <div className="position-absolute bg-white rounded-pill shadow-sm px-1 border cursor-pointer" style={{bottom: -10, [isMe ? 'right' : 'left']: 0, fontSize: '0.8rem', zIndex: 1}}>
                                            {msg.reactions.map((r, i) => <span key={i}>{r.emoji}</span>)}
                                        </div>
                                    )}
                                </div>

                                {/* Message Actions Menu (Popover) - Mobile Long Press or Desktop Click */}
                                {isMenuOpen && (
                                    <div
                                        className={`position-absolute bg-white shadow rounded-3 p-1 z-3 d-flex gap-2`}
                                        style={{
                                            bottom: '100%',
                                            [isMe ? 'right' : 'left']: '0',
                                            marginBottom: '5px'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button className="btn btn-sm btn-light rounded-circle cursor-pointer" onClick={() => setReplyTo(msg)} title="Reply">
                                            <FaReply size={12} />
                                        </button>
                                        {isMe && (
                                            <button className="btn btn-sm btn-light rounded-circle text-danger cursor-pointer" onClick={() => deleteMessage(msg._id)} title="Unsend">
                                                <FaTrash size={12} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Media Preview before send */}
                <MediaPreview
                    files={selectedFiles}
                    onRemove={(idx) => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                    onAddMore={() => fileInputRef.current.click()}
                />

                {/* Footer */}
                <div className="p-2 border-top position-relative flex-shrink-0 bg-white" style={{zIndex: 10}}>
                    {replyTo && (
                        <div className="px-3 py-2 bg-light border-bottom d-flex justify-content-between align-items-center">
                            <small className="text-muted">Replying to {replyTo.sender._id === currentUser._id ? 'yourself' : otherUser.firstName}</small>
                            <button className="btn-close btn-sm" onClick={() => setReplyTo(null)}></button>
                        </div>
                    )}

                    <div className="d-flex align-items-center gap-2 pt-2">
                        {showEmojiPicker && (
                            <div className="position-absolute bottom-100 start-0 mb-2 ms-3 shadow-lg z-3">
                                <EmojiPicker onEmojiClick={onEmojiClick} />
                            </div>
                        )}

                        {/* Sticker Picker */}
                        {showStickerPicker && (
                            <div className="position-absolute bottom-100 start-0 mb-2 ms-3 shadow-lg z-3">
                                <StickerPicker onSelect={(url) => {
                                    handleSend('', 'sticker', null, [{ url, type: 'sticker' }]);
                                    setShowStickerPicker(false);
                                }} />
                            </div>
                        )}

                        {/* Plus Menu Popup */}
                        {showPlusMenu && (
                             <div className="position-absolute bottom-100 start-0 mb-2 ms-2 bg-white shadow-lg rounded-3 p-2 z-3 d-flex flex-column gap-2" style={{minWidth: 150}}>
                                 <div className="d-flex align-items-center gap-2 p-2 hover-bg-light rounded cursor-pointer" onClick={() => setShowPollModal(true)}>
                                     <div className="bg-warning text-white rounded-circle p-1 d-flex align-items-center justify-content-center" style={{width:30, height:30}}><FaSquarePollVertical /></div>
                                     <span className="small fw-bold cursor-pointer">Polls</span>
                                 </div>
                                 <div className="d-flex align-items-center gap-2 p-2 hover-bg-light rounded cursor-pointer" onClick={handleLocation}>
                                     <div className="bg-danger text-white rounded-circle p-1 d-flex align-items-center justify-content-center" style={{width:30, height:30}}><FaLocationDot /></div>
                                     <span className="small fw-bold cursor-pointer">Location</span>
                                 </div>
                             </div>
                        )}

                        <input type="file" ref={fileInputRef} className="d-none" multiple onChange={handleFileSelect} />

                        {/* Plus Button */}
                        <div className={`btn-messenger ${showPlusMenu ? 'rotate-45' : ''}`} style={{transition: 'transform 0.2s', zIndex: 11}} onClick={() => setShowPlusMenu(!showPlusMenu)}>
                             <FaPlus className="text-primary" size={20} />
                        </div>
                        <div className="btn-messenger" style={{zIndex: 11}} onClick={() => fileInputRef.current.click()}>
                             <FaImages className="text-primary" size={20} />
                        </div>
                        <div className="btn-messenger" style={{zIndex: 11}} onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }}>
                             <FaStickyNote className="text-primary" size={20} />
                        </div>

                        <div className="flex-grow-1 bg-light rounded-pill px-3 py-2 d-flex align-items-center">
                            {isRecording ? (
                                <div className="d-flex align-items-center w-100 text-danger animate-pulse">
                                     <div className="bg-danger rounded-circle me-2" style={{width:10, height:10}}></div>
                                     <span className="fw-bold flex-grow-1">{formatDuration(recordingDuration)}</span>
                                     <div className="btn-messenger text-danger" onClick={cancelRecording}><FaXmark /></div>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="text"
                                        className="bg-transparent border-0 w-100 no-focus-outline"
                                        placeholder="Aa"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && !isSending && (selectedFiles.length > 0 ? handleUploadAndSend() : handleSend())}
                                        disabled={isSending}
                                    />
                                    <div className="btn-messenger text-primary" style={{width:30, height:30}} onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}>
                                         <FaFaceSmile size={20} />
                                    </div>
                                </>
                            )}
                        </div>

                        {isRecording ? (
                             <div className={`btn-messenger text-primary ${isSending ? 'opacity-50' : ''}`} onClick={!isSending ? sendRecording : null}><FaPaperPlane size={20} /></div>
                        ) : (
                            newMessage || selectedFiles.length > 0 || isUploading ? (
                                <div className={`btn-messenger text-primary ${(isUploading || isSending) ? 'opacity-50' : ''}`} onClick={(!isUploading && !isSending) ? () => selectedFiles.length > 0 ? handleUploadAndSend() : handleSend() : null}>
                                     <FaPaperPlane size={20} />
                                </div>
                            ) : (
                                <div className="btn-messenger text-primary" onClick={startRecording}>
                                     <FaMicrophone size={20} />
                                </div>
                            )
                        )}

                        {!newMessage && !selectedFiles.length && !isRecording && (
                             <div className="btn-messenger text-primary fs-4" onClick={() => handleSend(conversationSettings.quickReaction, 'text')}>
                                 {conversationSettings.quickReaction}
                            </div>
                        )}
                    </div>
                </div>

                {/* Lightbox */}
                {lightboxMedia && (
                    <div className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-90 z-3 d-flex align-items-center justify-content-center p-4" onClick={() => setLightboxMedia(null)} style={{zIndex: 9999}}>
                        {lightboxMedia.type === 'video' ? (
                            <video src={lightboxMedia.url} controls autoPlay className="mw-100 mh-100" />
                        ) : (
                            <img src={lightboxMedia.url} className="mw-100 mh-100 object-fit-contain" />
                        )}
                    </div>
                )}

                <PollModal show={showPollModal} onClose={() => setShowPollModal(false)} onSubmit={handlePollSubmit} />

                <ChatInfoModal
                    show={showInfoModal}
                    onClose={() => setShowInfoModal(false)}
                    user={otherUser}
                    conversation={{...conversation, ...conversationSettings}}
                    currentUser={currentUser}
                    onUpdateSettings={updateSettings}
                    onDelete={handleDeleteConversation}
                    onBlock={handleBlock}
                    onMute={handleMute}
                    nickname={getNickname(otherUser)}
                    isMuted={isMuted}
                />
            </div>
        </div>
    );
};

export default ChatWindow;
