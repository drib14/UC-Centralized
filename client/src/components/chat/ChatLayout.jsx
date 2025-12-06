import React, { useState, useEffect } from 'react';
import { FaEdit } from 'react-icons/fa';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import API from '../../utils/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import CallOverlay from './CallOverlay';

const ChatLayout = () => {
    const { user } = useAuth();
    const { socket, setUnreadMessageCount } = useSocket();
    const { showCallModal } = useCall();
    const [conversations, setConversations] = useState([]);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [mobileView, setMobileView] = useState('list'); // 'list' or 'chat'

    useEffect(() => {
        loadConversations();
        setUnreadMessageCount(0);

        const handleSelectionChange = () => {
            loadConversations();
            const storedId = localStorage.getItem('selectedConversationId');
            if (storedId) {
                // We might need to fetch the specific conversation if it's not in the list yet
                // But for now, let's rely on loadConversations
            }
        };

        window.addEventListener('chat_selection_change', handleSelectionChange);
        return () => window.removeEventListener('chat_selection_change', handleSelectionChange);
    }, []);

    useEffect(() => {
        // Persist Selection
        const storedId = localStorage.getItem('selectedConversationId');
        if (storedId && conversations.length > 0 && !selectedConversation) {
            const found = conversations.find(c => c._id === storedId);
            if (found) {
                setSelectedConversation(found);
                if (window.innerWidth <= 768) setMobileView('chat');
            }
        }
    }, [conversations]);

    const loadConversations = async () => {
        try {
            const data = await API.getConversations();
            setConversations(data);
        } catch (err) {
            console.error("Failed to load conversations", err);
        }
    };

    const handleSelectConversation = (conv) => {
        setSelectedConversation(conv);
        setMobileView('chat');
        localStorage.setItem('selectedConversationId', conv._id);
    };

    const handleNewChat = async (targetUser) => {
        try {
            const existing = conversations.find(c => c.participants.some(p => p._id === targetUser._id && p._id !== user._id));
            if (existing) {
                handleSelectConversation(existing);
            } else {
                const newConv = await API.createConversation(targetUser._id);
                setConversations([newConv, ...conversations]);
                handleSelectConversation(newConv);
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteConversation = async (convId) => {
        try {
             // Optimistic update
             setConversations(prev => prev.filter(c => c._id !== convId));
             if (selectedConversation?._id === convId) {
                 setSelectedConversation(null);
                 setMobileView('list');
             }
             await API.deleteConversation(convId);
        } catch (err) {
            console.error("Failed to delete", err);
            loadConversations(); // Revert on error
        }
    };

    return (
        <div className="d-flex h-100 w-100 overflow-hidden bg-white chat-layout-container">
            <CallOverlay />

            {/* Sidebar Column */}
            <div className={`d-flex flex-column border-end chat-sidebar-wrapper ${mobileView === 'chat' ? 'd-none d-md-flex' : 'd-flex'}`}>
                <ChatSidebar
                    conversations={conversations}
                    selectedId={selectedConversation?._id}
                    onSelect={handleSelectConversation}
                    onNewChat={() => {/* Trigger active user list or search focus? For now handled in Sidebar */}}
                    onDeleteConversation={handleDeleteConversation}
                    currentUser={user}
                />
            </div>

            {/* Chat Window Column */}
            <div className={`flex-grow-1 d-flex flex-column chat-window-wrapper ${mobileView === 'list' ? 'd-none d-md-flex' : 'd-flex'}`}>
                {selectedConversation ? (
                    <ChatWindow
                        conversation={selectedConversation}
                        currentUser={user}
                        socket={socket}
                        onBack={() => setMobileView('list')}
                        onDeleteConversation={() => handleDeleteConversation(selectedConversation._id)}
                    />
                ) : (
                    <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                        <h3>Select a chat to start messaging</h3>
                    </div>
                )}
            </div>
            <style>{`
                .chat-sidebar-wrapper {
                    width: 360px;
                    min-width: 360px; /* Fixed width on desktop */
                    max-width: 360px;
                }
                .chat-window-wrapper {
                    min-width: 0; /* Prevents flex item from overflowing */
                }
                @media (max-width: 768px) {
                    .chat-sidebar-wrapper {
                        width: 100%;
                        min-width: 100%;
                        max-width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default ChatLayout;
