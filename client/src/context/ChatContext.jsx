import React, { createContext, useContext, useState, useEffect } from 'react';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [showRightPanel, setShowRightPanel] = useState(true); // Default open on large screens
    const [viewMode, setViewMode] = useState('desktop'); // 'mobile' | 'tablet' | 'desktop'

    // Responsive Listener
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width <= 768) {
                setViewMode('mobile');
                setShowRightPanel(false);
            } else if (width <= 1200) {
                setViewMode('tablet');
                setShowRightPanel(false);
            } else {
                setViewMode('desktop');
                setShowRightPanel(true);
            }
        };
        handleResize(); // Init
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleRightPanel = () => setShowRightPanel(prev => !prev);

    return (
        <ChatContext.Provider value={{
            selectedConversation,
            setSelectedConversation,
            showRightPanel,
            setShowRightPanel,
            toggleRightPanel,
            viewMode
        }}>
            {children}
        </ChatContext.Provider>
    );
};
