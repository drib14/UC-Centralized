import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import { useSocket } from '../../context/SocketContext';
import API from '../../utils/api';
import './ChatLayout.css'; // We will create this

const ChatLayout = () => {
    const [selectedConversationId, setSelectedConversationId] = useState(null);
    const [mobileView, setMobileView] = useState(window.innerWidth <= 768);

    // Check if we navigated here with a specific user to chat with
    const location = useLocation();
    const navigate = useNavigate();
    const { state } = location; // { startChatWith: userId }

    useEffect(() => {
        const handleResize = () => setMobileView(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        // If we have a state to start chat, we handle it in Sidebar by passing the intent
        // Or we can pre-select if we know the conversation ID.
        // Usually creating/finding conversation is async, so Sidebar handles "New Chat" logic best.
    }, [state]);

    const handleSelectConversation = (convId) => {
        setSelectedConversationId(convId);
    };

    const handleBack = () => {
        setSelectedConversationId(null);
    };

    return (
        <div className="d-flex w-100 h-100 overflow-hidden bg-white">
            {/* Sidebar: Visible on Desktop OR on Mobile when no chat selected */}
            <div
                className={`flex-shrink-0 h-100 border-end ${mobileView && selectedConversationId ? 'd-none' : 'd-flex'}`}
                style={{ width: mobileView ? '100%' : '360px', flexDirection: 'column' }}
            >
                <ChatSidebar
                    onSelectConversation={handleSelectConversation}
                    selectedId={selectedConversationId}
                    initialChatTarget={state?.startChatWith}
                />
            </div>

            {/* Chat Window: Visible on Desktop OR on Mobile when chat selected */}
            <div
                className={`flex-grow-1 h-100 ${mobileView && !selectedConversationId ? 'd-none' : 'd-flex'}`}
                style={{ flexDirection: 'column' }}
            >
                {selectedConversationId ? (
                    <ChatWindow
                        conversationId={selectedConversationId}
                        onBack={handleBack}
                    />
                ) : (
                    <div className="d-none d-md-flex flex-column align-items-center justify-content-center h-100 text-muted">
                        <img src="/assets/uc-central-logo.png" alt="Logo" style={{ width: 100, opacity: 0.5, marginBottom: 20 }} />
                        <h4>Select a conversation to start chatting</h4>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatLayout;
