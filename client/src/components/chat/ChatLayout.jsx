import React from 'react';
import { useChat } from '../../context/ChatContext';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import RightPanel from './RightPanel';
import './ChatLayout.css';

const ChatLayout = () => {
    const { selectedConversation, showRightPanel, viewMode } = useChat();

    // Mobile Logic: If chat selected, hide sidebar. If no chat, show sidebar.
    const showSidebar = viewMode === 'desktop' || viewMode === 'tablet' || (viewMode === 'mobile' && !selectedConversation);
    const showChat = selectedConversation && (viewMode === 'desktop' || viewMode === 'tablet' || viewMode === 'mobile');
    const showInfo = showRightPanel && selectedConversation && viewMode !== 'mobile'; // Mobile uses modal for info

    return (
        <div className="d-flex w-100 h-100 overflow-hidden bg-white chat-layout-container">
            {showSidebar && (
                <div className={`chat-pane sidebar-pane ${viewMode === 'mobile' ? 'w-100' : ''}`}>
                    <ChatSidebar />
                </div>
            )}

            {showChat ? (
                <div className="chat-pane window-pane flex-grow-1 border-start border-end">
                    <ChatWindow />
                </div>
            ) : (
                !showSidebar && <div className="d-flex align-items-center justify-content-center w-100 text-muted">Select a conversation</div>
            )}

            {showInfo && (
                <div className="chat-pane info-pane">
                    <RightPanel />
                </div>
            )}
        </div>
    );
};

export default ChatLayout;
