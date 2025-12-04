import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useAuth();
    // In Vite dev, this proxies to backend. In prod, it should point to backend URL.
    // Assuming backend is relative or same host for now given proxy config.
    const ENDPOINT = window.location.origin.replace('5173', '5000').replace('3000', '5000');
    // ^ This is a hacky fallback if proxy isn't perfect, but usually just '/' works if proxy is set.
    // Let's rely on relative path '/' if proxy is set in vite.config.js, or hardcode port if not.
    // Since vite proxy is set to localhost:5000, '/' should work.

    useEffect(() => {
        if (user) {
            // Check if we are in dev or prod to determine URL
            // If we assume standard proxy setup:
            const newSocket = io('/');

            newSocket.on('connect', () => {
                newSocket.emit('join_room', user._id);
            });

            setSocket(newSocket);

            return () => newSocket.close();
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
            }
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};
