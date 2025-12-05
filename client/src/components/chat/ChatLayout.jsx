import React, { useState, useEffect } from 'react';
import { FaPaperPlane, FaSearch, FaArrowLeft } from 'react-icons/fa';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const ChatLayout = () => {
    const { user } = useAuth();
    const { socket, setUnreadMessageCount } = useSocket();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [mobileShowChat, setMobileShowChat] = useState(false); // For mobile responsiveness

    useEffect(() => {
        loadConversations();
        setUnreadMessageCount(0); // Clear unread count when entering messages
    }, []);

    // Persist selection on refresh
    useEffect(() => {
        const storedId = localStorage.getItem('selectedConversationId');
        if (storedId && conversations.length > 0 && !selectedConversation) {
            const found = conversations.find(c => c._id === storedId);
            if (found) {
                setSelectedConversation(found);
                if (window.innerWidth <= 768) setMobileShowChat(true);
            }
        }
    }, [conversations]); // Run when conversations load

    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (data) => {
            updateConversationList(data);
        };

        const handleReadUpdate = (data) => {
            // data: { conversationId, readBy }
            setConversations(prev => prev.map(c => {
                if (c._id === data.conversationId && c.lastMessage) {
                    // Update readBy of last message if it matches
                    const msg = c.lastMessage;
                    if (!msg.readBy.includes(data.readBy)) {
                        return { ...c, lastMessage: { ...msg, readBy: [...msg.readBy, data.readBy] } };
                    }
                }
                return c;
            }));
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('messages_read_update', handleReadUpdate);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('messages_read_update', handleReadUpdate);
        };
    }, [socket, conversations]);

    const loadConversations = async () => {
        try {
            const data = await API.getConversations();
            setConversations(data);
        } catch (err) {
            console.error("Failed to load conversations", err);
        }
    };

    const updateConversationList = (newMessage) => {
        setConversations(prev => {
            // Find conv
            const idx = prev.findIndex(c => c._id === newMessage.conversationId);
            if (idx === -1) {
                // New conversation? Reload to be safe or fetch it.
                // For now, simpler to reload list if not found (e.g. someone started chat with us)
                loadConversations();
                return prev;
            }

            const updatedConv = { ...prev[idx], lastMessage: newMessage, updatedAt: new Date().toISOString() };
            const newList = [...prev];
            newList.splice(idx, 1);
            newList.unshift(updatedConv);
            return newList;
        });
    };

    const handleSelectConversation = (conv) => {
        setSelectedConversation(conv);
        setMobileShowChat(true);
        localStorage.setItem('selectedConversationId', conv._id);
    };

    const handleStartNewChat = async (targetUser) => {
        try {
            // Check if conversation exists in local list
            // If target is self, check for a conversation where all participants are me
            const existing = conversations.find(c => {
                if (targetUser._id === user._id) {
                    // Self chat: both participants are me? Or strictly participants length is 2 and both are me?
                    // Or populated returns me twice.
                    // The safest check: are ALL participants equal to target ID?
                    return c.participants.every(p => p._id === user._id);
                }
                // Normal chat: Contains target AND contains me (implicit for fetch) AND target is not me
                return c.participants.some(p => p._id === targetUser._id && p._id !== user._id);
            });

            if (existing) {
                handleSelectConversation(existing);
            } else {
                // Create on backend
                const newConv = await API.createConversation(targetUser._id);
                // Avoid duplicates if race condition
                if (!conversations.some(c => c._id === newConv._id)) {
                    setConversations([newConv, ...conversations]);
                }
                handleSelectConversation(newConv);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteConversation = (convId) => {
        setConversations(prev => prev.filter(c => c._id !== convId));
        if (selectedConversation && selectedConversation._id === convId) {
            setSelectedConversation(null);
            setMobileShowChat(false);
            localStorage.removeItem('selectedConversationId');
        }
    };

    const handleUpdateConversation = (updatedConv) => {
        setConversations(prev => prev.map(c => c._id === updatedConv._id ? updatedConv : c));
        if (selectedConversation && selectedConversation._id === updatedConv._id) {
            setSelectedConversation(updatedConv);
        }
    };

    return (
        <div className="d-flex w-100 shadow-sm rounded overflow-hidden chat-layout-container" style={{ border: '1px solid #dee2e6' }}>
            {/* Sidebar */}
            <div className={`d-flex flex-column border-end bg-white chat-sidebar-container ${mobileShowChat ? 'd-none d-md-flex' : 'd-flex'}`}>
                <ChatSidebar
                    conversations={conversations}
                    selectedId={selectedConversation?._id}
                    onSelect={handleSelectConversation}
                    onNewChat={handleStartNewChat}
                    currentUser={user}
                    onDeleteConversation={handleDeleteConversation}
                    onUpdateConversation={handleUpdateConversation}
                />
            </div>

            {/* Chat Window */}
            <div className={`flex-grow-1 bg-light d-flex flex-column chat-window-container ${!mobileShowChat ? 'd-none d-md-flex' : 'd-flex'}`}>
                {selectedConversation ? (
                    <ChatWindow
                        conversation={selectedConversation}
                        currentUser={user}
                        socket={socket}
                        onBack={() => setMobileShowChat(false)}
                        onMessageSent={updateConversationList}
                        onDeleteConversation={handleDeleteConversation}
                        onUpdateConversation={handleUpdateConversation}
                    />
                ) : (
                    <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                        <FaPaperPlane size={50} className="mb-3" />
                        <h4>Select a conversation to start chatting</h4>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatLayout;
