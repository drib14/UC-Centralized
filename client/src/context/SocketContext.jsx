import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            const newSocket = io('/');

            newSocket.on('connect', () => {
                newSocket.emit('join_room', user._id);
            });

            // Listen for user status changes (this is a simplified broadcast)
            // In a real app, you'd fetch initial online users list
            newSocket.on('user_status_change', (data) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    if (data.isOnline) next.add(data.userId);
                    else next.delete(data.userId);
                    return next;
                });
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
        <SocketContext.Provider value={{ socket, onlineUsers, notifications, setNotifications, unreadCount, setUnreadCount }}>
            {children}
        </SocketContext.Provider>
    );
};
