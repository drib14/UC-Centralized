import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ChatSidebar from '../../components/chat/ChatSidebar';
import ChatWindow from '../../components/chat/ChatWindow';
import { toast } from 'react-toastify';
import api from '../../utils/api'; // Assuming you have an API utility wrapper

const StudentMessages = () => {
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

    // Mobile Responsive State
    // If selectedConversation is set, on mobile we show ChatWindow, else Sidebar
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- FETCH DATA ---
    useEffect(() => {
        fetchConversations();
    }, []);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/messages/conversations');
            setConversations(res.data);
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
            // Mark as read immediately when fetched? Or when visualized.
            // Let's mark as read.
            await markAsRead(convId);
        } catch (err) {
            console.error(err);
        }
    };

    const markAsRead = async (convId) => {
        try {
            await api.put(`/messages/${convId}/read`);
            // Update local unread count
            setConversations(prev => prev.map(c =>
                c._id === convId ? { ...c, unreadCount: 0 } : c
            ));
            // Trigger socket context update if needed via global event?
            // The socket context listens to its own events usually.
        } catch (err) {
            console.error(err);
        }
    };

    // --- SOCKET EVENTS ---
    useEffect(() => {
        if (!socket) return;

        socket.on("receive_message", (message) => {
            // If the message belongs to the currently open conversation, append it
            if (selectedConversation && selectedConversation._id === message.conversationId) {
                setMessages(prev => [...prev, message]);
                markAsRead(message.conversationId);
            } else {
                // If not open, maybe play sound if not muted
                const conv = conversations.find(c => c._id === message.conversationId);
                if (conv) {
                   const isMuted = conv.mutedBy.includes(user._id);
                   if (!isMuted) {
                       // Optional: Play sound or show toast
                       // toast.info(`New message from ${message.sender.firstName}`);
                   }
                }
            }

            // Refresh conversation list to update lastMessage and unread counts
            // Alternatively, manually update state for performance
            fetchConversations();
        });

        socket.on("conversation_updated", (data) => {
            fetchConversations();
        });

        socket.on("conversation_deleted", (convId) => {
            setConversations(prev => prev.filter(c => c._id !== convId));
            if (selectedConversation && selectedConversation._id === convId) {
                setSelectedConversation(null);
                toast.info("This conversation was deleted.");
            }
        });

        return () => {
            socket.off("receive_message");
            socket.off("conversation_updated");
            socket.off("conversation_deleted");
        };
    }, [socket, selectedConversation, conversations, user._id]);

    // --- HANDLERS ---

    const handleSelectConversation = (conv) => {
        setSelectedConversation(conv);
        fetchMessages(conv._id);
    };

    const handleSendMessage = async (content, type = 'text', file = null) => {
        if (!selectedConversation) return;

        // Optimistic UI update? Maybe wait for server for files.
        // For text we can do optimistic but for simplicity let's wait.

        const formData = new FormData();
        formData.append("conversationId", selectedConversation._id);
        formData.append("content", content);
        formData.append("type", type);
        if (file) formData.append("file", file);

        try {
            // If it's a file, we need multipart/form-data. api.post usually handles JSON.
            // If api wrapper doesn't auto-detect, use axios directly or config.
            // Assuming api.post wraps axios.
            const res = await api.post('/messages', formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setMessages(prev => [...prev, res.data]);

            // Update conversation list last message locally
            setConversations(prev => prev.map(c =>
                c._id === selectedConversation._id
                ? { ...c, lastMessage: res.data }
                : c
            ));

        } catch (err) {
            console.error(err);
            toast.error("Failed to send message");
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
            const isMuted = res.data.muted; // Expecting { muted: true/false }

            // Update local state
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

            // Also update selectedConversation if needed (it's a reference so might need explicit update if we pass it down)
            if (selectedConversation && selectedConversation._id === convId) {
                // We just need to trigger a re-render or update the prop passed to Window
                // The window reads from 'conversations' via prop? No it takes 'conversation' object.
                // So we need to update selectedConversation too.
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
            setUserSearchResults(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleNewChat = async (targetUser) => {
        // Check if conversation already exists locally
        const existing = conversations.find(c => c.participants.some(p => p._id === targetUser._id));
        if (existing) {
            setSelectedConversation(existing);
            fetchMessages(existing._id);
            setShowNewChatModal(false);
            setNewChatSearch("");
        } else {
            // Start a new one (or just open empty window with targetUser context)
            // It's easier to create it immediately or handle "temp" state.
            // Let's create it immediately via API so we have an ID.
            try {
                // Send a dummy "init" or just rely on POST /messages logic to find/create
                // But we don't have a message yet.
                // We can just set a "Draft" state?
                // Simpler: Just allow sending a message to 'recipientId'.
                // But ChatWindow expects a conversation object.

                // Let's create an empty conversation or find one via API
                // Currently API POST /messages creates it.
                // Let's add a POST /conversations endpoint?
                // Or just use the sidebar logic: Send the user object as a "fake" conversation until first message?

                // Better approach: POST /messages handles creation.
                // I'll make a helper to "ensure conversation" if I really need ID.
                // But let's try sending a fake object to ChatWindow.

                const tempConv = {
                    _id: "temp_" + targetUser._id,
                    participants: [user, targetUser],
                    isTemp: true,
                    recipientId: targetUser._id
                };

                setSelectedConversation(tempConv);
                setMessages([]);
                setShowNewChatModal(false);
                setNewChatSearch("");
            } catch (err) {
                console.error(err);
            }
        }
    };

    // Wrapper for sendMessage to handle temp conversation
    const onSendMessageWrapper = async (content, type, file) => {
        if (selectedConversation.isTemp) {
            // Creating new
             const formData = new FormData();
            formData.append("recipientId", selectedConversation.recipientId);
            formData.append("content", content);
            formData.append("type", type);
            if (file) formData.append("file", file);

            try {
                const res = await api.post('/messages', formData, {
                     headers: { "Content-Type": "multipart/form-data" }
                });
                // Now we have the real message and likely the real conversation ID in it
                const realConvId = res.data.conversationId;

                // Fetch the real conversation to replace temp
                // Or just refresh list
                await fetchConversations(); // This will put the new conv in the list

                // We need to set selectedConversation to the new one.
                // We can find it from the refreshed list.
                // But fetchConversations is async and we need to wait.
                // Let's just manually fetch the conversation details or construct it.

                // Quick fix: Set messages
                setMessages([res.data]);

                // We need to switch from temp to real so future messages use conversationId
                // We can't easily find the new object from 'conversations' state immediately due to closure/async.
                // But we can just use the ID from the message.

                // Reload page or force refresh?
                // Let's try to fetch the single conversation by ID (we need an endpoint for that, wait, we have GET /:id but that returns messages)
                // We don't have GET /conversations/:id.

                // Let's rely on the list refresh.
                const updatedList = await api.get('/messages/conversations');
                setConversations(updatedList.data);
                const newConv = updatedList.data.find(c => c._id === realConvId);
                setSelectedConversation(newConv);

            } catch (err) {
                console.error(err);
                toast.error("Failed to start conversation");
            }
        } else {
            handleSendMessage(content, type, file);
        }
    };

    // --- RENDER ---

    if (loading) return <div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid p-0 d-flex" style={{ height: 'calc(100vh - 60px)' }}> {/* Adjust height for navbar/sidebar offset if needed */}

            {/* Sidebar Column */}
            <div className={`${isMobile && selectedConversation ? 'd-none' : 'd-block'} col-md-4 col-lg-3 h-100 p-0`}>
                <ChatSidebar
                    conversations={conversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={handleSelectConversation}
                    onNewChat={handleNewChat}
                    searchTerm={sidebarSearch}
                    setSearchTerm={setSidebarSearch}
                    onSearchUser={handleSearchUser}
                    searchResults={userSearchResults}
                    showNewChatModal={showNewChatModal}
                    setShowNewChatModal={setShowNewChatModal}
                    newChatSearchTerm={newChatSearch}
                    setNewChatSearchTerm={setNewChatSearch}
                    currentUser={user}
                />
            </div>

            {/* Chat Window Column */}
            <div className={`${isMobile && !selectedConversation ? 'd-none' : 'd-block'} col-md-8 col-lg-9 h-100 p-0 border-start`}>
                {selectedConversation ? (
                    <ChatWindow
                        conversation={selectedConversation}
                        messages={messages}
                        currentUser={user}
                        onSendMessage={onSendMessageWrapper}
                        onDeleteConversation={handleDeleteConversation}
                        onMuteConversation={handleMuteConversation}
                        onBack={() => setSelectedConversation(null)}
                        isMuted={selectedConversation.mutedBy?.includes(user._id)}
                    />
                ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-light text-muted">
                        <div className="display-1">👋</div>
                        <h3>Welcome to Messages</h3>
                        <p>Select a conversation or start a new one.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentMessages;
