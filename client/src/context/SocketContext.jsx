import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import API from '../utils/api';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0); // Notification count
    const [unreadMessageCount, setUnreadMessageCount] = useState(0); // Message count
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            // Fetch initial counts
            const fetchCounts = async () => {
                try {
                    // API.getNotifications() // If implemented
                    const msgData = await API.getUnreadMessageCount();
                    setUnreadMessageCount(msgData.count || 0);
                } catch (e) {
                    console.error("Failed to fetch unread counts", e);
                }
            };
            fetchCounts();

            // Force connection URL if needed, but relative '/' usually works with proxy
            const newSocket = io(window.location.origin.replace('5173', '5000'), {
                transports: ['websocket'], // Force websocket
                reconnection: true
            });

            newSocket.on('connect', () => {
                console.log("Socket Connected:", newSocket.id);
                newSocket.emit('join_room', user._id);
            });

            newSocket.on('connect_error', (err) => {
                console.error("Socket Connection Error:", err);
            });

            // Listen for user status changes
            newSocket.on('user_status_change', (data) => {
                setOnlineUsers(prev => {
                    const next = new Set(prev);
                    if (data.isOnline) next.add(data.userId);
                    else next.delete(data.userId);
                    return next;
                });
            });

            // Global Notification Listener
            newSocket.on('new_notification', (data) => {
                setUnreadCount(prev => prev + 1);
                setNotifications(prev => [data, ...prev]);
                toast.info(data.content, {
                    icon: "🔔",
                    onClick: () => {
                        // Handle click if needed
                    }
                });
            });

            // Global Message Listener (for toasts and badges)
            newSocket.on('receive_message', (data) => {
                if (!window.location.pathname.includes('/messages')) {
                    toast.info(`New message from ${data.sender.firstName}: ${data.content.substring(0, 20)}...`);
                    setUnreadMessageCount(prev => prev + 1);
                }
            });

            // Listen for read updates to decrement count?
            // This is tricky without fetching. We'll rely on the Message page to reset it.

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
        <SocketContext.Provider value={{ socket, onlineUsers, notifications, setNotifications, unreadCount, setUnreadCount, unreadMessageCount, setUnreadMessageCount }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider; // Default export for HMR compatibility
