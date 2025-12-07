import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ChatLayout from '../components/chat/ChatLayout';
import ImageModal from '../components/modals/ImageModal';
import VideoModal from '../components/modals/VideoModal';
import DeleteMessageModal from '../components/modals/DeleteMessageModal';
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
    const [sidebarUserResults, setSidebarUserResults] = useState([]);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);

    // Media Modal State
    const [viewImage, setViewImage] = useState(null);
    const [viewVideo, setViewVideo] = useState(null);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState({ show: false, messageId: null, isOwn: false });

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

    // --- HANDLERS ---

    const handleEditMessage = async (messageId, newContent) => {
        try {
            await api.editMessage(messageId, newContent);
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, content: newContent } : m));
        } catch (err) {
            console.error(err);
            toast.error("Failed to edit message");
        }
    };

    const handleRequestDelete = (messageId, isOwn) => {
        setDeleteModal({ show: true, messageId, isOwn });
    };

    const confirmDeleteForMe = async () => {
        try {
            await api.deleteMessage(deleteModal.messageId, 'me');
            setMessages(prev => prev.filter(m => m._id !== deleteModal.messageId));
            setDeleteModal({ show: false, messageId: null, isOwn: false });
            toast.success("Deleted for you");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete");
        }
    };

    const confirmDeleteForEveryone = async () => {
        try {
            await api.deleteMessage(deleteModal.messageId, 'everyone');
            // Optimistic update
            setMessages(prev => prev.filter(m => m._id !== deleteModal.messageId));
            setDeleteModal({ show: false, messageId: null, isOwn: false });
            toast.success("Deleted for everyone");
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete");
        }
    };

    // --- SOCKET EVENTS ---
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (message) => {
            if (selectedConversation && selectedConversation._id === message.conversationId) {
                setMessages(prev => {
                    if (prev.some(m => m._id === message._id)) return prev;
                    return [...prev, message];
                });
                markAsRead(message.conversationId);
                setConversations(prev => prev.map(c =>
                    c._id === message.conversationId ? { ...c, lastMessage: message } : c
                ));
            } else {
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
             setConversations(prev => prev.map(c => {
                 const isParticipant = c.participants.some(p => p._id === data.userId);
                 if (isParticipant) {
                     const updatedParticipants = c.participants.map(p =>
                         p._id === data.userId ? { ...p, isOnline: data.isOnline, lastSeen: data.lastSeen } : p
                     );
                     let updatedOtherUser = c.otherUser;
                     if (c.otherUser && c.otherUser._id === data.userId) {
                         updatedOtherUser = { ...c.otherUser, isOnline: data.isOnline, lastSeen: data.lastSeen };
                     }
                     return { ...c, participants: updatedParticipants, otherUser: updatedOtherUser };
                 }
                 return c;
             }));

             if (selectedConversation && selectedConversation.otherUser?._id === data.userId) {
                 setSelectedConversation(prev => ({
                     ...prev,
                     otherUser: { ...prev.otherUser, isOnline: data.isOnline, lastSeen: data.lastSeen }
                 }));
             }
        };

        const handleMessageUpdated = (updatedMessage) => {
            if (selectedConversation && selectedConversation._id === updatedMessage.conversationId) {
                setMessages(prev => prev.map(m => m._id === updatedMessage._id ? updatedMessage : m));
            }
            setConversations(prev => prev.map(c => {
                if (c._id === updatedMessage.conversationId && c.lastMessage?._id === updatedMessage._id) {
                    return { ...c, lastMessage: updatedMessage };
                }
                return c;
            }));
        };

        const handleMessageDeleted = (deletedMessageId) => {
            setMessages(prev => prev.filter(m => m._id !== deletedMessageId));
            fetchConversations();
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
        socket.on('message_updated', handleMessageUpdated);
        socket.on('message_deleted', handleMessageDeleted);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("conversation_updated", handleConversationUpdated);
            socket.off("conversation_deleted");
            socket.off("typing", handleTyping);
            socket.off("stop_typing", handleStopTyping);
            socket.off("messages_read", handleMessagesRead);
            socket.off("user_status_change", handleUserStatusChange);
            socket.off('message_updated', handleMessageUpdated);
            socket.off('message_deleted', handleMessageDeleted);
        };
    }, [socket, selectedConversation, fetchConversations, user._id]);


    // --- HANDLERS (SEARCH & MISC) ---

    const handleSelectConversation = (conv) => {
        setSelectedConversation(conv);
        setMessages([]);
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

    // SEARCH LOGIC
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

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (sidebarSearch.trim()) {
                try {
                    const res = await api.get(`/messages/search/users?q=${sidebarSearch}`);
                    setSidebarUserResults(Array.isArray(res) ? res : []);
                } catch (err) {
                    console.error("Sidebar Search error:", err);
                    setSidebarUserResults([]);
                }
            } else {
                setSidebarUserResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [sidebarSearch]);

    const handleSearchUser = (query) => {
        setNewChatSearch(query);
    };

    const handleNewChat = async (targetUser) => {
        const existing = conversations.find(c => c.participants.some(p => p._id === targetUser._id));
        if (existing) {
            handleSelectConversation(existing);
            setShowNewChatModal(false);
            setNewChatSearch("");
            setSidebarSearch("");
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
            setSidebarSearch("");
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
                sidebarUserResults={sidebarUserResults}
                showNewChatModal={showNewChatModal}
                setShowNewChatModal={setShowNewChatModal}
                newChatSearch={newChatSearch}
                setNewChatSearch={handleSearchUser}
                isTyping={isTyping}
                onTyping={handleTyping}
                onStopTyping={handleStopTyping}
                onViewImage={handleViewImage}
                onViewVideo={handleViewVideo}
                onEditMessage={handleEditMessage}
                onRequestDelete={handleRequestDelete} // Changed prop name
            />
            <ImageModal show={!!viewImage} onClose={() => setViewImage(null)} imageUrl={viewImage} />
            <VideoModal show={!!viewVideo} onClose={() => setViewVideo(null)} videoUrl={viewVideo} />
            <DeleteMessageModal
                show={deleteModal.show}
                onClose={() => setDeleteModal({ ...deleteModal, show: false })}
                onDeleteForMe={confirmDeleteForMe}
                onDeleteForEveryone={confirmDeleteForEveryone}
                isOwnMessage={deleteModal.isOwn}
            />
        </>
    );
};

export default Messages;
