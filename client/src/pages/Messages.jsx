import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ChatLayout from '../components/chat/ChatLayout';
import { toast } from 'react-toastify';
import api from '../utils/api';

const Messages = () => {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [sidebarSearch, setSidebarSearch] = useState("");
    const [newChatSearch, setNewChatSearch] = useState("");
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false); // If the OTHER person is typing

    // Mobile Responsive State
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- FETCH DATA ---
    const fetchConversations = useCallback(async () => {
        try {
            const res = await api.get('/messages/conversations');
            setConversations(Array.isArray(res.data) ? res.data : []);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setConversations([]);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const fetchMessages = async (convId) => {
        try {
            const res = await api.get(`/messages/${convId}`);
            setMessages(res.data);
            await markAsRead(convId);
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
        } catch (err) {
            console.error(err);
        }
    };

    // --- SOCKET EVENTS ---
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (message) => {
            if (selectedConversation && selectedConversation._id === message.conversationId) {
                setMessages(prev => [...prev, message]);
                markAsRead(message.conversationId);
                // Also update last message in conversation list
                setConversations(prev => prev.map(c =>
                    c._id === message.conversationId ? { ...c, lastMessage: message } : c
                ));
            } else {
                // Update conversation list (unread count, last msg)
                fetchConversations();
            }
        };

        const handleTyping = (data) => {
            if (selectedConversation && selectedConversation._id === data.conversationId && data.senderId !== user._id) {
                setIsTyping(true);
            }
        };

        const handleStopTyping = (data) => {
            if (selectedConversation && selectedConversation._id === data.conversationId && data.senderId !== user._id) {
                setIsTyping(false);
            }
        };

        const handleMessagesRead = (data) => {
             // data: { conversationId, readBy }
             if (selectedConversation && selectedConversation._id === data.conversationId) {
                 // Update messages state to reflect read status
                 // This is a bit complex as we need to update 'readBy' array of previous messages
                 setMessages(prev => prev.map(m => {
                     // If user not in readBy, add them
                     if (!m.readBy.includes(data.readBy)) {
                         return { ...m, readBy: [...m.readBy, data.readBy] };
                     }
                     return m;
                 }));
             }
        };

        const handleConversationUpdated = (data) => {
             // Update sidebar preview
             setConversations(prev => {
                 const exists = prev.find(c => c._id === data.conversationId);
                 if (exists) {
                     return prev.map(c => c._id === data.conversationId ? { ...c, lastMessage: data.lastMessage } : c);
                 } else {
                     // New conversation started by someone else, re-fetch full list
                     fetchConversations();
                     return prev;
                 }
             });
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("conversation_updated", handleConversationUpdated);
        socket.on("conversation_deleted", (convId) => {
            setConversations(prev => prev.filter(c => c._id !== convId));
            if (selectedConversation && selectedConversation._id === convId) {
                setSelectedConversation(null);
                toast.info("This conversation was deleted.");
            }
        });
        socket.on("typing", handleTyping);
        socket.on("stop_typing", handleStopTyping);
        socket.on("messages_read", handleMessagesRead);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("conversation_updated", handleConversationUpdated);
            socket.off("conversation_deleted");
            socket.off("typing", handleTyping);
            socket.off("stop_typing", handleStopTyping);
            socket.off("messages_read", handleMessagesRead);
        };
    }, [socket, selectedConversation, fetchConversations, user._id]);


    // --- HANDLERS ---

    const handleSelectConversation = (conv) => {
        setSelectedConversation(conv);
        setMessages([]); // Clear previous messages while loading
        setIsTyping(false);
        fetchMessages(conv._id);
    };

    const handleSendMessage = async (content, type = 'text', file = null) => {
        if (!selectedConversation) return;

        const formData = new FormData();
        // If it's a temp conversation, use recipientId
        if (selectedConversation.isTemp) {
            formData.append("recipientId", selectedConversation.recipientId);
        } else {
            formData.append("conversationId", selectedConversation._id);
        }

        formData.append("content", content);
        formData.append("type", type);
        if (file) formData.append("file", file);

        try {
            const res = await api.post('/messages', formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            // If it was temp, we now have a real conversation
            if (selectedConversation.isTemp) {
                const realConvId = res.data.conversationId;
                // Fetch full conversation details to get proper object structure
                await fetchConversations();
                // We can't synchronously get the new list from state here.
                // We will rely on fetchConversations updating state, but we need to select it.
                // Hack: manually fetch all again and find it.
                const allConvs = await api.get('/messages/conversations');
                const newConv = allConvs.data.find(c => c._id === realConvId);
                setSelectedConversation(newConv);
                setMessages([res.data]);
            } else {
                setMessages(prev => [...prev, res.data]);
                // Update local conversation list last message
                setConversations(prev => prev.map(c =>
                    c._id === selectedConversation._id
                    ? { ...c, lastMessage: res.data }
                    : c
                ));
            }

        } catch (err) {
            console.error(err);
            toast.error("Failed to send message");
        }
    };

    const handleTyping = () => {
        if (socket && selectedConversation && !selectedConversation.isTemp) {
            const recipient = selectedConversation.otherUser?._id;
            if (recipient) {
                socket.emit('typing', { recipientId: recipient, conversationId: selectedConversation._id });
            }
        }
    };

    const handleStopTyping = () => {
         if (socket && selectedConversation && !selectedConversation.isTemp) {
            const recipient = selectedConversation.otherUser?._id;
            if (recipient) {
                socket.emit('stop_typing', { recipientId: recipient, conversationId: selectedConversation._id });
            }
        }
    };

    const handleDeleteConversation = async (convId) => {
        try {
            await api.delete(`/messages/${convId}`);
            setConversations(prev => prev.filter(c => c._id !== convId));
            setSelectedConversation(null);
            toast.success("Conversation deleted permanently.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete conversation");
        }
    };

    const handleMuteConversation = async (convId) => {
        try {
            const res = await api.put(`/messages/${convId}/mute`);
            const isMuted = res.data.muted;

            setConversations(prev => prev.map(c => {
                if (c._id !== convId) return c;
                let newMutedBy = [...(c.mutedBy || [])];
                if (isMuted) {
                    if (!newMutedBy.includes(user._id)) newMutedBy.push(user._id);
                } else {
                    newMutedBy = newMutedBy.filter(id => id !== user._id);
                }
                return { ...c, mutedBy: newMutedBy };
            }));

            if (selectedConversation && selectedConversation._id === convId) {
                setSelectedConversation(prev => {
                    let newMutedBy = [...(prev.mutedBy || [])];
                    if (isMuted) {
                         if (!newMutedBy.includes(user._id)) newMutedBy.push(user._id);
                    } else {
                         newMutedBy = newMutedBy.filter(id => id !== user._id);
                    }
                    return { ...prev, mutedBy: newMutedBy };
                });
            }

            toast.success(isMuted ? "Conversation muted" : "Conversation unmuted");
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearchUser = async (query) => {
        if (!query) {
            setUserSearchResults([]);
            return;
        }
        try {
            const res = await api.get(`/messages/search/users?q=${query}`);
            setUserSearchResults(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
            setUserSearchResults([]);
        }
    };

    const handleNewChat = async (targetUser) => {
        // Check if conversation already exists locally
        const existing = conversations.find(c => c.participants.some(p => p._id === targetUser._id));
        if (existing) {
            handleSelectConversation(existing);
            setShowNewChatModal(false);
            setNewChatSearch("");
        } else {
            // Temporary object for UI
            const tempConv = {
                _id: "temp_" + targetUser._id,
                participants: [user, targetUser],
                otherUser: targetUser, // Explicitly set for UI
                isTemp: true,
                recipientId: targetUser._id,
                mutedBy: []
            };
            setSelectedConversation(tempConv);
            setMessages([]);
            setShowNewChatModal(false);
            setNewChatSearch("");
        }
    };

    if (loading) return <div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary"></div></div>;

    return (
        <ChatLayout
            isMobile={isMobile}
            conversations={conversations}
            selectedConversation={selectedConversation}
            messages={messages}
            user={user}
            onSelectConversation={handleSelectConversation}
            onSendMessage={handleSendMessage}
            onDeleteConversation={handleDeleteConversation}
            onMuteConversation={handleMuteConversation}
            onNewChat={handleNewChat}
            onSearchUser={handleSearchUser}
            onBack={() => setSelectedConversation(null)}
            sidebarSearch={sidebarSearch}
            setSidebarSearch={setSidebarSearch}
            userSearchResults={userSearchResults}
            showNewChatModal={showNewChatModal}
            setShowNewChatModal={setShowNewChatModal}
            newChatSearch={newChatSearch}
            setNewChatSearch={setNewChatSearch}
            isTyping={isTyping}
            onTyping={handleTyping}
            onStopTyping={handleStopTyping}
        />
    );
};

export default Messages;
