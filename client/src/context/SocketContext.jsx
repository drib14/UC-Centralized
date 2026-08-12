import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';
import API from '../utils/api';
import { playMessageSound, playNotificationSound } from '../utils/soundPlayer';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    // Initialize as Array for compatibility with .includes(), or handle Set conversion
    // The previous error was `onlineUsers.includes is not a function`.
    // If we use Set, we must use .has(). If consumers use .includes(), we must use Array.
    // Let's use Array to fix the crash immediately.
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0); // Notification count
    const [unreadMessageCount, setUnreadMessageCount] = useState(0); // Message count
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            // Fetch initial counts
            const fetchCounts = async () => {
                try {
                    const msgData = await API.getUnreadMessageCount();
                    setUnreadMessageCount(msgData.count || 0);
                } catch (e) {
                    console.error("Failed to fetch unread counts", e);
                }
            };
            fetchCounts();

            // Setup Socket
            const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? '/' : 'http://localhost:5000');
            const newSocket = io(socketUrl, {
                transports: ['websocket', 'polling'], // Allow fallback
                reconnection: true,
                withCredentials: true
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
                    const currentSet = new Set(prev);
                    if (data.isOnline) currentSet.add(data.userId);
                    else currentSet.delete(data.userId);
                    return Array.from(currentSet); // Return array to satisfy consumers using .includes()
                });
            });

            newSocket.on('new_notification', (data) => {
                playNotificationSound();
                setUnreadCount(prev => prev + 1);
                setNotifications(prev => [data, ...prev]);
                toast.info(data.content, { icon: "🔔" });
            });

            newSocket.on('receive_message', (data) => {
                // If the user is sender, don't increment unread count
                if (data.sender._id === user._id) return;

                const isChatOpen = window.location.pathname.includes('/messages');
                if (!isChatOpen) {
                    playMessageSound();
                    toast.info(`New message from ${data.sender.firstName}`);
                    setUnreadMessageCount(prev => prev + 1);
                } else {
                    playMessageSound();
                }
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
        <SocketContext.Provider value={{ socket, onlineUsers, notifications, setNotifications, unreadCount, setUnreadCount, unreadMessageCount, setUnreadMessageCount }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;
