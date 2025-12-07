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
    onRequestForward
}) => {
    return (
        <div className="container-fluid p-0" style={{ height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
            <div className="row g-0 h-100">
                {/* Sidebar Column */}
                <div className={`${isMobile && selectedConversation ? 'd-none' : 'd-block'} col-12 col-md-4 col-lg-3 h-100 border-end`}>
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
                <div className={`${isMobile && !selectedConversation ? 'd-none' : 'd-block'} col-12 col-md-8 col-lg-9 h-100`}>
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
                        />
                    ) : (
                        <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-light text-muted p-4 text-center">
                            <div className="display-1 mb-3">👋</div>
                            <h3 className="fw-bold">Welcome to Messages</h3>
                            <p className="lead">Select a conversation or start a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatLayout;
