import React, { useState, useEffect, useRef } from 'react';
import { FaPhone, FaVideo, FaCircleInfo, FaImages, FaFaceSmile, FaPlus, FaThumbsUp, FaPaperPlane, FaArrowLeft } from 'react-icons/fa6';
import { useCall } from '../../context/CallContext';
import API from '../../utils/api';

const ChatWindow = ({ conversation, currentUser, onBack }) => {
    const [newMessage, setNewMessage] = useState('');
    const [messages, setMessages] = useState([]); // Fetch logic omitted for brevity
    const { callUser } = useCall();
    const otherUser = conversation.participants.find(p => p._id !== currentUser._id);

    // Fetch messages on mount (mocked here, assume existing logic)
    useEffect(() => {
        API.getMessages(conversation._id).then(setMessages).catch(console.error);
    }, [conversation]);

    const handleSend = () => {
        // Send logic
        setNewMessage('');
    };

    return (
        <div className="d-flex flex-column h-100 bg-white">
            {/* Header */}
            <div className="p-2 border-bottom d-flex align-items-center justify-content-between shadow-sm" style={{height: '60px'}}>
                <div className="d-flex align-items-center">
                    <button className="btn btn-link text-primary d-md-none me-2" onClick={onBack}><FaArrowLeft size={20}/></button>
                    <div className="position-relative me-2">
                        <img src={otherUser.profileImage} className="rounded-circle" width={40} height={40} />
                        {otherUser.isOnline && <span className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-white" style={{width:10, height:10}}></span>}
                    </div>
                    <div>
                        <h6 className="mb-0 fw-bold">{otherUser.firstName} {otherUser.lastName}</h6>
                        <small className="text-muted" style={{fontSize: '0.75rem'}}>Active now</small>
                    </div>
                </div>
                <div className="d-flex gap-3 text-primary me-2">
                    <FaPhone size={20} className="cursor-pointer" onClick={() => callUser(otherUser._id, false)} />
                    <FaVideo size={20} className="cursor-pointer" onClick={() => callUser(otherUser._id, true)} />
                    <FaCircleInfo size={20} className="cursor-pointer" />
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-1">
                {messages.map((msg, idx) => {
                    const isMe = msg.sender._id === currentUser._id;
                    const isLast = idx === messages.length - 1 || messages[idx+1]?.sender._id !== msg.sender._id;

                    return (
                        <div key={msg._id} className={`d-flex align-items-end gap-2 ${isMe ? 'flex-row-reverse' : ''} mb-1`}>
                            {!isMe && (
                                <div style={{width: 28}}>
                                    {isLast && <img src={otherUser.profileImage} className="rounded-circle" width={28} height={28} />}
                                </div>
                            )}
                            <div
                                className={`px-3 py-2 ${isMe ? 'bg-primary text-white' : 'bg-light text-dark'}`}
                                style={{
                                    borderRadius: '18px',
                                    borderBottomRightRadius: isMe ? '4px' : '18px',
                                    borderBottomLeftRadius: !isMe ? '4px' : '18px',
                                    maxWidth: '70%'
                                }}
                            >
                                {msg.content}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-2 d-flex align-items-center gap-2">
                <FaPlus className="text-primary cursor-pointer" size={20} />
                <FaImages className="text-primary cursor-pointer" size={20} />
                <div className="flex-grow-1 bg-light rounded-pill px-3 py-2 d-flex align-items-center">
                    <input
                        type="text"
                        className="bg-transparent border-0 w-100 no-focus-outline"
                        placeholder="Aa"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                    />
                    <FaFaceSmile className="text-primary cursor-pointer" size={20} />
                </div>
                {newMessage ? (
                    <FaPaperPlane className="text-primary cursor-pointer" size={20} onClick={handleSend} />
                ) : (
                    <FaThumbsUp className="text-primary cursor-pointer" size={20} />
                )}
            </div>
        </div>
    );
};

export default ChatWindow;
