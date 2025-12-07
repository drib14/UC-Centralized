import React, { createContext, useContext } from 'react';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
    // Minimal placeholder to prevent crash if App.jsx still mounts it
    // No logic running in background
    return (
        <CallContext.Provider value={{
            call: {},
            callAccepted: false,
            callEnded: true,
            name: '',
            myVideo: { current: null },
            userVideo: { current: null },
            stream: null,
            callUser: () => {},
            leaveCall: () => {},
            answerCall: () => {},
            showCallModal: false,
            setShowCallModal: () => {},
            isVideoCall: false
        }}>
            {children}
        </CallContext.Provider>
    );
};
