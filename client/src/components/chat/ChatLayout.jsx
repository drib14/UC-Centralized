import React from 'react';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';

const ChatLayout = ({
    isMobile,
    conversations,
    selectedConversation,
    messages,
    user,
    // Handlers
    onSelectConversation,
    onSendMessage,
    onDeleteConversation,
    onMuteConversation,
    onNewChat,
    onSearchUser,
    onBack,
    // State
    sidebarSearch,
    setSidebarSearch,
    userSearchResults,
    sidebarUserResults,
    showNewChatModal,
    setShowNewChatModal,
    newChatSearch,
    setNewChatSearch,
    isTyping,
    onTyping,
    onStopTyping,
    onViewImage,
    onViewVideo,
    onEditMessage,
    onRequestDelete,
    onRequestForward,
    onToggleReaction
}) => {
    return (
        <div className="chat-layout-container w-100 position-relative" style={{ height: '100dvh', maxHeight: '100dvh', minHeight: 0, overflow: 'hidden' }}>
            <div className="row g-0 h-100 w-100 m-0" style={{ height: '100%', minHeight: 0 }}>
                {/* Sidebar Column */}
                <div className={`${isMobile && selectedConversation ? 'd-none' : 'd-flex flex-column'} col-12 col-md-5 col-lg-4 col-xl-3 h-100 border-end bg-white overflow-hidden`} style={{ minHeight: 0 }}>
                    <ChatSidebar
                        conversations={conversations}
                        selectedConversation={selectedConversation}
                        onSelectConversation={onSelectConversation}
                        onNewChat={onNewChat}
                        searchTerm={sidebarSearch}
                        setSearchTerm={setSidebarSearch}
                        onSearchUser={onSearchUser}
                        searchResults={userSearchResults}
                        sidebarUserResults={sidebarUserResults}
                        showNewChatModal={showNewChatModal}
                        setShowNewChatModal={setShowNewChatModal}
                        newChatSearchTerm={newChatSearch}
                        setNewChatSearchTerm={setNewChatSearch}
                        currentUser={user}
                    />
                </div>

                {/* Chat Window Column */}
                <div className={`${isMobile && !selectedConversation ? 'd-none' : 'd-flex flex-column'} col-12 col-md-7 col-lg-8 col-xl-9 h-100 bg-light overflow-hidden`} style={{ minHeight: 0 }}>
                    {selectedConversation ? (
                        <ChatWindow
                            conversation={selectedConversation}
                            messages={messages}
                            currentUser={user}
                            onSendMessage={onSendMessage}
                            onDeleteConversation={onDeleteConversation}
                            onMuteConversation={onMuteConversation}
                            onBack={onBack}
                            isMuted={selectedConversation.mutedBy?.includes(user._id)}
                            isTyping={isTyping}
                            onTyping={onTyping}
                            onStopTyping={onStopTyping}
                            onViewImage={onViewImage}
                            onViewVideo={onViewVideo}
                            onEditMessage={onEditMessage}
                            onDeleteMessage={onRequestDelete}
                            onRequestForward={onRequestForward}
                            onToggleReaction={onToggleReaction}
                        />
                    ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-light text-muted p-4 text-center">
                            <div className="display-1 mb-3">💬</div>
                            <h3 className="fw-bold font-outfit text-dark">UC-Central Messages</h3>
                            <p className="text-secondary" style={{ maxWidth: '360px' }}>
                                Connect with your classmates, groupmates, and faculty directly in real-time.
                            </p>
                            <button
                                className="btn btn-primary rounded-pill px-4 py-2 fw-semibold shadow-sm"
                                onClick={() => setShowNewChatModal(true)}
                            >
                                Start New Conversation
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatLayout;
