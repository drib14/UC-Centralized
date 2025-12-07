import React from 'react';

const TypingIndicator = () => {
    return (
        <div className="d-flex align-items-center bg-white border rounded-pill px-3 py-2 shadow-sm" style={{ width: 'fit-content' }}>
            <div className="typing-dot" style={{ animationDelay: '0s' }}></div>
            <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
            <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
            <style>{`
                .typing-dot {
                    width: 6px;
                    height: 6px;
                    background-color: #6c757d;
                    border-radius: 50%;
                    margin: 0 2px;
                    animation: typing 1.4s infinite ease-in-out both;
                }
                @keyframes typing {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default TypingIndicator;
