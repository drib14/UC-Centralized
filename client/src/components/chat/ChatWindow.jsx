import React, { useState, useEffect, useRef } from 'react';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import UserAvatar from './UserAvatar';
import PollModal from './PollModal';
import MediaPreview from './MediaPreview';
import ChatInfoModal from './ChatInfoModal';
import StickerPicker from './StickerPicker';
import EmojiPicker from 'emoji-picker-react';
import { toast } from 'react-toastify';
import {
    FaPhone, FaVideo, FaCircleInfo, FaImages, FaFaceSmile, FaPlus, FaThumbsUp,
    FaPaperPlane, FaArrowLeft, FaPlay, FaPause, FaFile, FaReply, FaTrash,
    FaLocationDot, FaSquarePollVertical, FaMicrophone, FaEllipsisVertical,
    FaXmark, FaPhoneSlash
} from 'react-icons/fa6';
import { FaStickyNote } from 'react-icons/fa';

const ChatWindow = ({ conversationId, onBack }) => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const { callUser } = useCall();

    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    // UI State
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showPollModal, setShowPollModal] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState(null);
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [replyTo, setReplyTo] = useState(null);

    // File/Media Upload
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Voice Recording
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);

    // Swipe & Touch
    const touchStartRef = useRef(null);
    const touchEndRef = useRef(null);

    // Refs
    const messagesEndRef = useRef(null);
    const audioRefs = useRef({});
    const [playingAudio, setPlayingAudio] = useState(null);

    // Initial Load
    useEffect(() => {
        if (conversationId) loadData();
    }, [conversationId]);

    // Socket Listeners
    useEffect(() => {
        if (!socket || !conversationId) return;

        const handleReceive = (msg) => {
            if (msg.conversationId === conversationId || msg.conversationId._id === conversationId) {
                setMessages(prev => {
                    if (prev.some(m => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });
                scrollToBottom();
            }
        };

        const handleUpdate = (msg) => {
            if (msg.conversationId === conversationId || msg.conversationId._id === conversationId) {
                setMessages(prev => prev.map(m => m._id === msg._id ? msg : m));
            }
        };

        const handleSettingsUpdate = (data) => {
            if (data.conversationId === conversationId) {
                setConversation(prev => ({ ...prev, ...data }));
            }
        };

        socket.on('receive_message', handleReceive);
        socket.on('message_updated', handleUpdate);
        socket.on('conversation_settings_updated', handleSettingsUpdate);

        // Mark read on entry
        socket.emit('mark_messages_read', { conversationId, readerId: user._id, senderId: getOtherUserId() });

        return () => {
            socket.off('receive_message', handleReceive);
            socket.off('message_updated', handleUpdate);
            socket.off('conversation_settings_updated', handleSettingsUpdate);
        };
    }, [socket, conversationId, conversation]);

    const loadData = async () => {
        try {
            // Load Messages
            const msgs = await API.get(`/messages/${conversationId}`);
            setMessages(msgs);
            scrollToBottom();

            // Need conversation details for theme/nicknames.
            // Optimized fetch: We can reuse the list endpoint or add a specific one.
            // Since we need it "fast", and API `getMessages` only returns array.
            // Let's assume we can fetch it via conversation creation/get endpoint which handles existing check
            // Or just filter from list if cached.
            // For robustness, let's fetch list and find.
            const convs = await API.get('/messages/conversations');
            const currentConv = convs.find(c => c._id === conversationId);
            if(currentConv) setConversation(currentConv);

            API.markMessagesRead(conversationId);
        } catch (err) {
            console.error(err);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const getOtherUserId = () => {
        if (!conversation) return null;
        const other = conversation.participants.find(p => p._id !== user._id);
        return other ? other._id : null;
    };

    const getOtherUser = () => {
        if (!conversation) return {};
        return conversation.participants.find(p => p._id !== user._id) || conversation.participants[0];
    };

    // --- Sending Logic ---
    const handleSend = async (content = newMessage, type = 'text', attachments = [], pollData = null, locationData = null) => {
        if (!content.trim() && attachments.length === 0 && !pollData && !locationData && type === 'text') return;

        // Optimistic Update
        const tempId = Date.now().toString();
        const optimisticMsg = {
            _id: tempId,
            conversationId,
            sender: user,
            content,
            type,
            attachments,
            pollData,
            locationData,
            createdAt: new Date().toISOString(),
            isPending: true,
            replyTo // Include reply context
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        setReplyTo(null);
        setSelectedFiles([]);
        scrollToBottom();
        setIsSending(true);

        try {
            const res = await API.post('/messages', {
                conversationId,
                content,
                type,
                attachments,
                pollData,
                locationData,
                replyTo: replyTo?._id
            });

            setMessages(prev => prev.map(m => m._id === tempId ? res : m));
            socket.emit('send_message', { ...res, receiverId: getOtherUserId() });
        } catch (err) {
            console.error(err);
            toast.error("Failed to send");
            setMessages(prev => prev.filter(m => m._id !== tempId));
        } finally {
            setIsSending(false);
        }
    };

    const handleFileUpload = async () => {
        if (selectedFiles.length === 0) return;
        setIsUploading(true);
        try {
            const uploadedAttachments = [];
            for (const file of selectedFiles) {
                const { url } = await API.uploadFile(file);
                let type = 'file';
                if (file.type.startsWith('image')) type = 'image';
                else if (file.type.startsWith('video')) type = 'video';
                else if (file.type.startsWith('audio')) type = 'audio';

                uploadedAttachments.push({
                    url, type, name: file.name, size: file.size
                });
            }
            const primaryType = uploadedAttachments[0].type === 'image' ? 'image' : 'file';
            await handleSend(newMessage, primaryType, uploadedAttachments);
        } catch (err) {
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    // --- Voice Recording ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = e => audioChunksRef.current.push(e.data);
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingDuration(0);
            recordingTimerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
        } catch (e) { toast.error("Microphone access denied"); }
    };

    const stopRecording = (shouldSend) => {
        if (!mediaRecorderRef.current) return;
        mediaRecorderRef.current.onstop = async () => {
            clearInterval(recordingTimerRef.current);
            setIsRecording(false);
            if (shouldSend) {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([blob], "voice.webm", { type: 'audio/webm' });
                setIsUploading(true);
                try {
                    const { url } = await API.uploadFile(file);
                    await handleSend('', 'audio', [{ url, type: 'audio', duration: recordingDuration }]);
                } catch(e) { toast.error("Failed to send audio"); }
                setIsUploading(false);
            }
        };
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    };

    // --- Location ---
    const handleLocation = () => {
        if (!navigator.geolocation) return toast.error("Geolocation not supported");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                handleSend('Shared Location', 'location', [], null, {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                });
                setShowPlusMenu(false);
            },
            () => toast.error("Unable to get location")
        );
    };

    // --- Actions ---
    const handleReaction = async (msg, emoji) => {
        try {
            setMessages(prev => prev.map(m => {
                if (m._id === msg._id) {
                    const existingIdx = m.reactions?.findIndex(r => r.user === user._id || r.user._id === user._id);
                    let newReactions = m.reactions ? [...m.reactions] : [];
                    if (existingIdx > -1) {
                         if (newReactions[existingIdx].emoji === emoji) newReactions.splice(existingIdx, 1);
                         else newReactions[existingIdx].emoji = emoji;
                    } else {
                        newReactions.push({ user, emoji });
                    }
                    return { ...m, reactions: newReactions };
                }
                return m;
            }));
            await API.put(`/messages/${msg._id}/react`, { emoji });
        } catch (e) { console.error(e); }
    };

    // --- Swipe Handlers ---
    const onTouchStart = (e) => {
        touchEndRef.current = null;
        touchStartRef.current = e.targetTouches[0].clientX;
    };
    const onTouchMove = (e) => {
        touchEndRef.current = e.targetTouches[0].clientX;
    };
    const onTouchEnd = (msg) => {
        if (!touchStartRef.current || !touchEndRef.current) return;
        const distance = touchStartRef.current - touchEndRef.current;
        // Swipe Right (Drag left to right) is usually negative distance in X coords?
        // Wait, Start (Left) - End (Right) = Negative.
        // If I drag from left (50) to right (200): 50 - 200 = -150.
        // Yes, swipe right.
        if (distance < -50) {
            setReplyTo(msg);
        }
    };

    const handleDeleteMessage = async (msgId) => {
        if (!window.confirm("Unsend for everyone?")) return;
        try {
            await API.delete( `/messages/${msgId}?mode=everyone`);
            setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isDeletedForEveryone: true, content: 'Message unsent', attachments: [] } : m));
        } catch(e) { toast.error("Failed"); }
    };

    // --- Renderers ---
    if (!conversation) return <div className="h-100 d-flex align-items-center justify-content-center">Loading...</div>;

    const otherUser = getOtherUser();
    const nickname = conversation.nicknames?.[otherUser._id] || otherUser.firstName;
    const themeColor = conversation.theme || '#003399';

    const renderContent = (msg, isMe) => {
        if (msg.type === 'location' && msg.locationData) {
            return (
                <div className="bg-white p-2 rounded-3 cursor-pointer" style={{width: 200}}>
                     <a href={`https://www.google.com/maps?q=${msg.locationData.latitude},${msg.locationData.longitude}`} target="_blank" className="text-decoration-none text-dark">
                         <div className="bg-light d-flex align-items-center justify-content-center rounded mb-2" style={{height: 100}}>
                             <FaLocationDot size={32} className="text-danger" />
                         </div>
                         <div className="fw-bold small">Shared Location</div>
                     </a>
                </div>
            );
        }
        if (msg.type === 'poll' && msg.pollData) {
            return (
                <div className="bg-white p-3 rounded-3 shadow-sm cursor-pointer" style={{minWidth: 200}}>
                    <div className="fw-bold mb-2">{msg.pollData.question}</div>
                    <small className="text-muted d-block mb-2">Tap to vote</small>
                    <button className="btn btn-sm btn-outline-primary w-100" onClick={() => setShowPollModal(true)}>View Poll</button>
                </div>
            );
        }
        return msg.content;
    };

    return (
        <div className="d-flex flex-column h-100 bg-white position-relative">
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between p-2 border-bottom shadow-sm" style={{height: 60}}>
                <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-messenger d-md-none text-primary" onClick={onBack}><FaArrowLeft /></button>
                    <div className="cursor-pointer" onClick={() => setShowInfoModal(true)}>
                        <UserAvatar user={otherUser} size={40} showOnlineStatus={true} isOnline={otherUser.isOnline} />
                    </div>
                    <div className="cursor-pointer" onClick={() => setShowInfoModal(true)}>
                        <div className="fw-bold lh-1">{nickname} {otherUser.lastName}</div>
                        <small className="text-muted" style={{fontSize: '0.75rem'}}>
                            {otherUser.isOnline ? 'Active now' : 'Offline'}
                        </small>
                    </div>
                </div>
                <div className="d-flex gap-3 text-primary me-2">
                    <FaPhone size={20} className="cursor-pointer" onClick={() => callUser(otherUser._id, false)} />
                    <FaVideo size={20} className="cursor-pointer" onClick={() => callUser(otherUser._id, true)} />
                    <FaCircleInfo size={20} className="cursor-pointer" onClick={() => setShowInfoModal(true)} />
                </div>
            </div>

            {/* Messages */}
            <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-1" onClick={() => { setShowPlusMenu(false); setShowEmojiPicker(false); setShowStickerPicker(false); setMenuOpenId(null); }}>
                {messages.map((msg, i) => {
                    const isMe = msg.sender._id === user._id;
                    const isContinuous = messages[i+1]?.sender._id === msg.sender._id;

                    if (msg.type === 'system' || msg.type === 'call_log') {
                        return (
                            <div key={msg._id} className="text-center my-3">
                                {msg.type === 'call_log' ? (
                                    <div className="d-inline-flex align-items-center gap-2 bg-light px-3 py-2 rounded-pill text-secondary border">
                                        <FaPhoneSlash /> <span>{msg.content}</span>
                                    </div>
                                ) : (
                                    <small className="text-muted">{msg.content}</small>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div key={msg._id}
                            className={`d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'} mb-1 position-relative group`}
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={() => onTouchEnd(msg)}
                            onContextMenu={(e) => { e.preventDefault(); setMenuOpenId(msg._id); }}
                        >
                             {!isMe && (
                                 <div className="me-2" style={{width: 28, opacity: isContinuous ? 0 : 1}}>
                                     <UserAvatar user={otherUser} size={28} />
                                 </div>
                             )}

                             <div className="position-relative" style={{ maxWidth: '75%' }}>
                                 {msg.replyTo && (
                                     <div className="small text-muted mb-1 ms-2 border-start border-2 ps-2">
                                         Replying to {msg.replyTo.sender.firstName}: {msg.replyTo.content || 'Attachment'}
                                     </div>
                                 )}

                                 {msg.isDeletedForEveryone ? (
                                     <div className="border px-3 py-2 rounded-3 text-muted fst-italic bg-light">Message unsent</div>
                                 ) : (
                                     <div
                                         className={`px-3 py-2 ${msg.type === 'text' ? (isMe ? 'text-white' : 'text-dark') : ''}`}
                                         style={{
                                             backgroundColor: msg.type === 'text' ? (isMe ? themeColor : '#e4e6eb') : 'transparent',
                                             borderRadius: '18px',
                                             borderBottomRightRadius: isMe && isContinuous ? '4px' : '18px',
                                             borderTopRightRadius: isMe && !isContinuous ? '18px' : (isMe ? '4px' : '18px'),
                                             borderBottomLeftRadius: !isMe && isContinuous ? '4px' : '18px',
                                             borderTopLeftRadius: !isMe && !isContinuous ? '18px' : (!isMe ? '4px' : '18px'),
                                         }}
                                         onDoubleClick={() => handleReaction(msg, '❤️')}
                                     >
                                         {msg.attachments?.map((att, idx) => (
                                             <div key={idx} className="mb-1">
                                                 {att.type === 'image' && <img src={att.url} className="rounded-3 mw-100 cursor-pointer" onClick={() => setLightboxMedia(att)} />}
                                                 {att.type === 'video' && <video src={att.url} controls className="rounded-3 mw-100" />}
                                                 {att.type === 'audio' && (
                                                     <div className="d-flex align-items-center gap-2 bg-white rounded-pill px-2 py-1 border shadow-sm" style={{minWidth: 150}}>
                                                         <button className="btn btn-sm btn-primary rounded-circle" onClick={() => {
                                                             const a = audioRefs.current[att.url];
                                                             if(a?.paused) a.play(); else a?.pause();
                                                         }}><FaPlay size={10} /></button>
                                                         <audio ref={el => audioRefs.current[att.url] = el} src={att.url} />
                                                     </div>
                                                 )}
                                                 {att.type === 'sticker' && <img src={att.url} style={{width: 120}} />}
                                             </div>
                                         ))}
                                         {renderContent(msg, isMe)}
                                     </div>
                                 )}

                                 {msg.reactions?.length > 0 && (
                                     <div className="position-absolute bg-white rounded-pill px-1 shadow-sm border" style={{bottom: -10, [isMe ? 'right' : 'left']: 0, fontSize: '0.8rem'}}>
                                         {msg.reactions.map((r, idx) => <span key={idx}>{r.emoji}</span>)}
                                     </div>
                                 )}
                             </div>

                             {menuOpenId === msg._id && (
                                 <div className="position-absolute bg-white shadow rounded p-2 d-flex gap-2 z-3" style={{top: -40, [isMe ? 'right' : 'left']: 0}}>
                                     <FaReply className="text-secondary cursor-pointer" onClick={() => { setReplyTo(msg); setMenuOpenId(null); }} />
                                     {isMe && <FaTrash className="text-danger cursor-pointer" onClick={() => handleDeleteMessage(msg._id)} />}
                                 </div>
                             )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-2 bg-white border-top">
                 {replyTo && (
                     <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded mb-2 border-start border-primary border-4">
                         <small>Replying to {replyTo.sender.firstName}</small>
                         <FaXmark className="cursor-pointer" onClick={() => setReplyTo(null)} />
                     </div>
                 )}

                 <MediaPreview files={selectedFiles} onRemove={i => setSelectedFiles(p => p.filter((_, idx) => idx !== i))} />

                 <div className="d-flex align-items-center gap-2">
                     <FaPlus className="text-primary cursor-pointer fs-4" onClick={() => setShowPlusMenu(!showPlusMenu)} />
                     {showPlusMenu && (
                         <div className="position-absolute bottom-100 start-0 m-2 bg-white shadow rounded p-2 d-flex flex-column gap-2" style={{width: 150}}>
                             <div className="d-flex align-items-center gap-2 cursor-pointer p-1 hover-bg-light" onClick={() => setShowPollModal(true)}><FaSquarePollVertical /> Poll</div>
                             <div className="d-flex align-items-center gap-2 cursor-pointer p-1 hover-bg-light" onClick={handleLocation}><FaLocationDot /> Location</div>
                             <div className="d-flex align-items-center gap-2 cursor-pointer p-1 hover-bg-light" onClick={() => fileInputRef.current.click()}><FaImages /> Media</div>
                         </div>
                     )}
                     <input type="file" multiple className="d-none" ref={fileInputRef} onChange={e => setSelectedFiles([...selectedFiles, ...e.target.files])} />

                     <div className="flex-grow-1 bg-light rounded-pill px-3 py-2 d-flex align-items-center position-relative">
                         {isRecording ? (
                             <div className="d-flex align-items-center w-100 text-danger justify-content-between">
                                 <div className="record-pulse rounded-circle bg-danger" style={{width: 10, height: 10}}></div>
                                 <span className="fw-bold">{new Date(recordingDuration * 1000).toISOString().substr(14, 5)}</span>
                                 <FaXmark className="cursor-pointer" onClick={() => stopRecording(false)} />
                             </div>
                         ) : (
                             <>
                                <input
                                    className="bg-transparent border-0 w-100 no-focus-outline"
                                    placeholder="Aa"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (selectedFiles.length ? handleFileUpload() : handleSend())}
                                />
                                <FaFaceSmile className="text-primary cursor-pointer fs-5" onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
                             </>
                         )}
                     </div>

                     {isRecording ? (
                         <FaPaperPlane className="text-primary cursor-pointer fs-4" onClick={() => stopRecording(true)} />
                     ) : (
                         (newMessage || selectedFiles.length) ? (
                            <FaPaperPlane className="text-primary cursor-pointer fs-4" onClick={selectedFiles.length ? handleFileUpload : () => handleSend()} />
                         ) : (
                             <FaMicrophone className="text-primary cursor-pointer fs-4" onClick={startRecording} />
                         )
                     )}

                     {!newMessage && !selectedFiles.length && !isRecording && (
                         <span className="fs-4 cursor-pointer" onClick={() => handleSend(conversation.quickReaction || '👍', 'text')}>{conversation.quickReaction || '👍'}</span>
                     )}
                 </div>

                 {showEmojiPicker && (
                     <div className="position-absolute bottom-100 right-0 mb-2 shadow"><EmojiPicker onEmojiClick={e => setNewMessage(p => p + e.emoji)} /></div>
                 )}
                 {showStickerPicker && (
                    <div className="position-absolute bottom-100 start-0 mb-2 ms-3 shadow-lg z-3">
                        <StickerPicker onSelect={(url) => {
                            handleSend('', 'sticker', [{ url, type: 'sticker' }]);
                            setShowStickerPicker(false);
                        }} />
                    </div>
                )}
            </div>

            {/* Modals */}
            <PollModal show={showPollModal} onClose={() => setShowPollModal(false)} onSubmit={(data) => { handleSend('Poll', 'poll', [], data); setShowPollModal(false); }} />
            <ChatInfoModal show={showInfoModal} onClose={() => setShowInfoModal(false)} user={otherUser} conversation={conversation} currentUser={user} onUpdateSettings={d => setConversation(p => ({...p, ...d}))} />
            {lightboxMedia && (
                <div className="position-fixed top-0 start-0 w-100 h-100 bg-black z-3 d-flex justify-content-center align-items-center" onClick={() => setLightboxMedia(null)}>
                     <img src={lightboxMedia.url} className="mh-100 mw-100" />
                </div>
            )}
        </div>
    );
};

export default ChatWindow;
