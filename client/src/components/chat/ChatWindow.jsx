import React, { useState, useEffect, useRef } from 'react';
import {
    FaPhone, FaVideo, FaCircleInfo, FaImages, FaFaceSmile, FaPlus, FaThumbsUp, FaPaperPlane, FaArrowLeft,
    FaPlay, FaPause, FaFile
} from 'react-icons/fa6';
import EmojiPicker from 'emoji-picker-react';
import { useCall } from '../../context/CallContext';
import API from '../../utils/api';
import { toast } from 'react-toastify';

const ChatWindow = ({ conversation, currentUser, socket, onBack, onMessageSent }) => {
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [lightboxMedia, setLightboxMedia] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const { callUser } = useCall();
    const otherUser = conversation.participants.find(p => p._id !== currentUser._id) || conversation.participants[0];
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const audioRefs = useRef({});
    const [playingAudio, setPlayingAudio] = useState(null);

    useEffect(() => {
        loadMessages();
        // Mark read
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
                if (onMessageSent) onMessageSent(data);
            }
        };
        socket.on('receive_message', handleReceive);
        return () => socket.off('receive_message', handleReceive);
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

    const handleSend = async (overrideContent = null, overrideType = 'text', fileUrl = null, attachments = []) => {
        const content = overrideContent !== null ? overrideContent : newMessage;
        if (!content.trim() && attachments.length === 0 && !fileUrl && overrideType === 'text') return;

        try {
            const sentMsg = await API.sendMessage(conversation._id, content, overrideType, fileUrl, attachments);
            setMessages(prev => [...prev, sentMsg]);
            setNewMessage('');
            if (onMessageSent) onMessageSent(sentMsg);

            socket.emit('send_message', {
                ...sentMsg,
                receiverId: otherUser._id
            });
            scrollToBottom();
        } catch (err) {
            console.error("Failed to send", err);
            toast.error("Failed to send message");
        }
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setIsUploading(true);

        try {
            const attachments = [];
            for (const file of files) {
                const { url } = await API.uploadFile(file);
                let type = 'file';
                if (file.type.startsWith('image')) type = 'image';
                else if (file.type.startsWith('video')) type = 'video';
                else if (file.type.startsWith('audio')) type = 'audio';

                attachments.push({
                    url, type, name: file.name, size: file.size
                });
            }
            await handleSend('', 'file', null, attachments);
        } catch (err) {
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
            e.target.value = null; // Reset
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
                audioRefs.current[playingAudio].currentTime = 0; // Reset previous
            }
            audio.play();
            setPlayingAudio(url);
            audio.onended = () => setPlayingAudio(null);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const renderAttachment = (att, index) => {
        const url = att.url || att; // Backward compat
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
                        <div className="h-100 bg-primary" style={{width: isPlaying ? '100%' : '0%', transition: 'width 10s linear'}}></div>
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

    return (
        <div className="d-flex flex-column h-100 bg-white">
            {/* Header */}
            <div className="p-2 border-bottom d-flex align-items-center justify-content-between shadow-sm" style={{height: '60px'}}>
                <div className="d-flex align-items-center">
                    <button className="btn btn-link text-primary d-md-none me-2" onClick={onBack}><FaArrowLeft size={20}/></button>
                    <div className="position-relative me-2">
                        <img src={otherUser.profileImage || 'https://via.placeholder.com/40'} className="rounded-circle" width={40} height={40} style={{objectFit:'cover'}} />
                        {otherUser.isOnline && <span className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-white" style={{width:10, height:10}}></span>}
                    </div>
                    <div>
                        <h6 className="mb-0 fw-bold">{otherUser.firstName} {otherUser.lastName}</h6>
                        <small className="text-muted" style={{fontSize: '0.75rem'}}>Active now</small>
                    </div>
                </div>
                <div className="d-flex gap-3 text-primary me-2">
                    <FaPhone size={20} className="cursor-pointer hover-scale" onClick={() => callUser(otherUser._id, false)} />
                    <FaVideo size={20} className="cursor-pointer hover-scale" onClick={() => callUser(otherUser._id, true)} />
                    <FaCircleInfo size={20} className="cursor-pointer hover-scale" />
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-1">
                {messages.map((msg, idx) => {
                    const isMe = msg.sender._id === currentUser._id || msg.sender === currentUser._id;
                    const isLast = idx === messages.length - 1 || messages[idx+1]?.sender._id !== msg.sender._id;

                    return (
                        <div key={msg._id} className={`d-flex align-items-end gap-2 ${isMe ? 'flex-row-reverse' : ''} mb-1`}>
                            {!isMe && (
                                <div style={{width: 28}}>
                                    {isLast && <img src={otherUser.profileImage} className="rounded-circle" width={28} height={28} style={{objectFit:'cover'}} />}
                                </div>
                            )}
                            <div className={`d-flex flex-column ${isMe ? 'align-items-end' : 'align-items-start'}`} style={{maxWidth: '70%'}}>
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="d-flex flex-column gap-1 mb-1">
                                        {msg.attachments.map((att, i) => renderAttachment(att, i))}
                                    </div>
                                )}
                                {msg.content && (
                                    <div
                                        className={`px-3 py-2 ${isMe ? 'bg-primary text-white' : 'bg-light text-dark'}`}
                                        style={{
                                            borderRadius: '18px',
                                            borderBottomRightRadius: isMe ? '4px' : '18px',
                                            borderBottomLeftRadius: !isMe ? '4px' : '18px',
                                            wordWrap: 'break-word'
                                        }}
                                    >
                                        {msg.content}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Footer */}
            <div className="p-2 d-flex align-items-center gap-2 border-top position-relative">
                {showEmojiPicker && (
                    <div className="position-absolute bottom-100 start-0 mb-2 ms-3 shadow-lg z-3">
                        <EmojiPicker onEmojiClick={onEmojiClick} />
                    </div>
                )}

                <input type="file" ref={fileInputRef} className="d-none" multiple onChange={handleFileSelect} />
                <FaPlus className="text-primary cursor-pointer hover-scale" size={20} />
                <FaImages className="text-primary cursor-pointer hover-scale" size={20} onClick={() => fileInputRef.current.click()} />

                <div className="flex-grow-1 bg-light rounded-pill px-3 py-2 d-flex align-items-center">
                    <input
                        type="text"
                        className="bg-transparent border-0 w-100 no-focus-outline"
                        placeholder="Aa"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <FaFaceSmile className="text-primary cursor-pointer hover-scale" size={20} onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
                </div>

                {newMessage || isUploading ? (
                    <FaPaperPlane className={`text-primary cursor-pointer hover-scale ${isUploading ? 'opacity-50' : ''}`} size={20} onClick={() => handleSend()} />
                ) : (
                    <FaThumbsUp className="text-primary cursor-pointer hover-scale" size={20} onClick={() => handleSend('👍', 'text')} />
                )}
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
        </div>
    );
};

export default ChatWindow;
