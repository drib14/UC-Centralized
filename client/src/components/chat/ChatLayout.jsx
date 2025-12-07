import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import { toast } from 'react-toastify';
import api from '../../utils/api';

const ChatLayout = () => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Initial Load
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        fetchConversations();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/messages/conversations');
            setConversations(Array.isArray(res.data) ? res.data : []);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchMessages = async (convId) => {
        try {
            const res = await api.get(`/messages/${convId}`);
            setMessages(res.data);
            markAsRead(convId);
        } catch (err) {
            console.error(err);
        }
    };

    const markAsRead = async (convId) => {
        try {
            await api.put(`/messages/${convId}/read`);
            setConversations(prev => prev.map(c =>
                c._id === convId ? { ...c, unreadCount: 0 } : c
            ));
        } catch (err) { console.error(err); }
    };

    // Socket Events
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (message) => {
            if (selectedConversation && selectedConversation._id === message.conversationId) {
                setMessages(prev => [...prev, message]);
                markAsRead(message.conversationId);
            }
            fetchConversations(); // Update list order/preview
        };

        const handleConversationUpdated = () => fetchConversations();
        const handleThemeUpdated = ({ conversationId, theme }) => {
            if (selectedConversation && selectedConversation._id === conversationId) {
                setSelectedConversation(prev => ({ ...prev, theme }));
            }
        };
        const handleNicknamesUpdated = ({ conversationId, nicknames }) => {
            if (selectedConversation && selectedConversation._id === conversationId) {
                // Convert object to Map if needed, but JSON comes as object usually.
                // However, our local state usually expects what API returns.
                // Let's assume API returns object for Map.
                setSelectedConversation(prev => ({ ...prev, nicknames }));
            }
            fetchConversations(); // Update titles in list
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("conversation_updated", handleConversationUpdated);
        socket.on("theme_updated", handleThemeUpdated);
        socket.on("nicknames_updated", handleNicknamesUpdated);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("conversation_updated", handleConversationUpdated);
            socket.off("theme_updated", handleThemeUpdated);
            socket.off("nicknames_updated", handleNicknamesUpdated);
        };
    }, [socket, selectedConversation]);

    // Handlers
    const handleSelectConversation = (conv) => {
        setSelectedConversation(conv);
        fetchMessages(conv._id);
    };

    const handleSendMessage = async (content, type = 'text', file = null) => {
        if (!selectedConversation) return;
        const formData = new FormData();
        formData.append("conversationId", selectedConversation._id);
        formData.append("content", content);
        formData.append("type", type);
        if (file) formData.append("file", file);

        try {
            const res = await api.post('/messages', formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setMessages(prev => [...prev, res.data]);
            fetchConversations();
        } catch (err) {
            console.error(err);
            toast.error("Failed to send message");
        }
    };

    const handleNewChat = async (targetUser) => {
        // Optimistic check
        const existing = conversations.find(c => c.participants.some(p => p._id === targetUser._id));
        if (existing) {
            handleSelectConversation(existing);
        } else {
            // Create immediately
            try {
                const res = await api.post('/messages', { recipientId: targetUser._id, content: "Started a conversation" });
                await fetchConversations();
                // Find the new conversation in the refreshed list (it should be first)
                // Just relying on the response might be tricky if structure differs.
                // But res.data is the message.
                // Let's fetch the specific conversation or just all again.
                // We fetched all.
                const newConvId = res.data.conversationId;
                const newConv = (await api.get('/messages/conversations')).data.find(c => c._id === newConvId);
                if(newConv) handleSelectConversation(newConv);
            } catch (err) {
                console.error(err);
            }
        }
    };

    if (loading) return <div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid p-0" style={{ height: 'calc(100vh - 60px)', background: '#f8f9fa' }}>
            <div className="row g-0 h-100 shadow-sm rounded-3 overflow-hidden" style={{ maxWidth: '1600px', margin: '0 auto' }}>
                {/* Sidebar */}
                <div className={`${isMobile && selectedConversation ? 'd-none' : 'd-block'} col-12 col-md-4 col-lg-3 h-100 bg-white border-end`}>
                    <ChatSidebar
                        conversations={conversations}
                        selectedConversation={selectedConversation}
                        onSelectConversation={handleSelectConversation}
                        onNewChat={handleNewChat}
                        currentUser={user}
                    />
                </div>

                {/* Chat Window */}
                <div className={`${isMobile && !selectedConversation ? 'd-none' : 'd-block'} col-12 col-md-8 col-lg-9 h-100`}>
                    {selectedConversation ? (
                        <ChatWindow
                            conversation={selectedConversation}
                            messages={messages}
                            currentUser={user}
                            onSendMessage={handleSendMessage}
                            onBack={() => setSelectedConversation(null)}
                            onSettingsChange={fetchConversations} // Refresh sidebar on rename/mute
                        />
                    ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted p-4">
                            <div className="display-1 mb-4 animate-bounce">💬</div>
                            <h3 className="fw-bold text-dark">Select a Conversation</h3>
                            <p className="lead">Choose a chat from the left or start a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatLayout;
