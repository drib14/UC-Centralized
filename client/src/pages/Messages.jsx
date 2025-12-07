import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ChatLayout from '../components/chat/ChatLayout';
import ImageModal from '../components/modals/ImageModal';
import VideoModal from '../components/modals/VideoModal';
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

    // Media Modal State
    const [viewImage, setViewImage] = useState(null);
    const [viewVideo, setViewVideo] = useState(null);

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
            setConversations(Array.isArray(res) ? res : []);
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
            setMessages(res);
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
                // Deduplicate based on _id
                setMessages(prev => {
                    if (prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });

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
                 setMessages(prev => prev.map(m => {
                     if (!m.readBy.includes(data.readBy)) {
                         return { ...m, readBy: [...m.readBy, data.readBy] };
                     }
                     return m;
                 }));
             }
        };

        const handleConversationUpdated = (data) => {
             setConversations(prev => {
                 const exists = prev.find(c => c._id === data.conversationId);
                 if (exists) {
                     return prev.map(c => c._id === data.conversationId ? { ...c, lastMessage: data.lastMessage } : c);
                 } else {
                     fetchConversations();
                     return prev;
                 }
             });
        };

        const handleUserStatusChange = (data) => {
             // data: { userId, isOnline, lastSeen }
             setConversations(prev => prev.map(c => {
                 const isParticipant = c.participants.some(p => p._id === data.userId);
                 if (isParticipant) {
                     const updatedParticipants = c.participants.map(p =>
                         p._id === data.userId ? { ...p, isOnline: data.isOnline, lastSeen: data.lastSeen } : p
                     );
                     // Helper to update the 'otherUser' convenience object if it matches
                     let updatedOtherUser = c.otherUser;
                     if (c.otherUser && c.otherUser._id === data.userId) {
                         updatedOtherUser = { ...c.otherUser, isOnline: data.isOnline, lastSeen: data.lastSeen };
                     }

                     return { ...c, participants: updatedParticipants, otherUser: updatedOtherUser };
                 }
                 return c;
             }));

             // Update selected conversation if needed
             if (selectedConversation && selectedConversation.otherUser?._id === data.userId) {
                 setSelectedConversation(prev => ({
                     ...prev,
                     otherUser: { ...prev.otherUser, isOnline: data.isOnline, lastSeen: data.lastSeen }
                 }));
             }
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
        socket.on("user_status_change", handleUserStatusChange);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("conversation_updated", handleConversationUpdated);
            socket.off("conversation_deleted");
            socket.off("typing", handleTyping);
            socket.off("stop_typing", handleStopTyping);
            socket.off("messages_read", handleMessagesRead);
            socket.off("user_status_change", handleUserStatusChange);
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
        if (selectedConversation.isTemp) {
            formData.append("recipientId", selectedConversation.recipientId);
        } else {
            formData.append("conversationId", selectedConversation._id);
        }

        formData.append("content", content);
        formData.append("type", type);
        if (file) formData.append("file", file);

        try {
            const res = await api.request('/messages', 'POST', formData, true);

            if (selectedConversation.isTemp) {
                const realConvId = res.conversationId;
                await fetchConversations();
                const allConvs = await api.get('/messages/conversations');
                const newConv = allConvs.find(c => c._id === realConvId);
                setSelectedConversation(newConv);
                setMessages([res]);
            } else {
                // Deduplicate (in case socket event arrives fast)
                setMessages(prev => {
                    if (prev.some(m => m._id === res._id)) return prev;
                    return [...prev, res];
                });
                setConversations(prev => prev.map(c =>
                    c._id === selectedConversation._id
                    ? { ...c, lastMessage: res }
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
            const isMuted = res.muted;

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

    // SEARCH LOGIC WITH DEBOUNCE
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (newChatSearch.trim()) {
                try {
                    const res = await api.get(`/messages/search/users?q=${newChatSearch}`);
                    setUserSearchResults(Array.isArray(res) ? res : []);
                } catch (err) {
                    console.error("Search error:", err);
                    setUserSearchResults([]);
                }
            } else {
                setUserSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [newChatSearch]);

    const handleSearchUser = (query) => {
        setNewChatSearch(query);
    };

    const handleNewChat = async (targetUser) => {
        const existing = conversations.find(c => c.participants.some(p => p._id === targetUser._id));
        if (existing) {
            handleSelectConversation(existing);
            setShowNewChatModal(false);
            setNewChatSearch("");
        } else {
            const tempConv = {
                _id: "temp_" + targetUser._id,
                participants: [user, targetUser],
                otherUser: targetUser,
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

    const handleViewImage = (url) => setViewImage(url);
    const handleViewVideo = (url) => setViewVideo(url);

    if (loading) return <div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary"></div></div>;

    return (
        <>
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
                setNewChatSearch={handleSearchUser}
                isTyping={isTyping}
                onTyping={handleTyping}
                onStopTyping={handleStopTyping}
                onViewImage={handleViewImage}
                onViewVideo={handleViewVideo}
            />
            <ImageModal show={!!viewImage} onClose={() => setViewImage(null)} imageUrl={viewImage} />
            <VideoModal show={!!viewVideo} onClose={() => setViewVideo(null)} videoUrl={viewVideo} />
        </>
    );
};

export default Messages;
