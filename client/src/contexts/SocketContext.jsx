import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext'; // CORRECT PATH: ../context/AuthContext not ./AuthContext

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth(); // Get current user to join room

    useEffect(() => {
        // Connect to the backend URL
        const newSocket = io(window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/', {
           path: '/socket.io',
           transports: ['websocket', 'polling']
        });

        setSocket(newSocket);

        return () => newSocket.close();
    }, []);

    useEffect(() => {
        if (socket && user) {
            socket.emit('join_room', user._id || user.id);
        }
    }, [socket, user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
