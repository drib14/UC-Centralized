import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify'; // Import toast
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

            // Global Message Listener (for toasts when not in chat)
            newSocket.on('receive_message', (data) => {
                // If we are not in the chat page (or generic handler), show toast
                // Note: The ChatWindow will handle the specific conversation update.
                // We can check URL or state, but for now let's just show a toast if the user
                // isn't actively looking at this specific conversation?
                // Hard to know exact "active conversation" here without more global state.
                // Simple approach: Always toast, unless we filter it in the component.

                // Let's rely on the fact that if a user is in the chat, they see it.
                // If they are elsewhere, a toast is nice.
                // Ideally, we'd check window.location.pathname.
                if (!window.location.pathname.includes('/messages')) {
                    toast.info(`New message from ${data.sender.firstName}: ${data.content.substring(0, 20)}...`);
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
        <SocketContext.Provider value={{ socket, onlineUsers, notifications, setNotifications, unreadCount, setUnreadCount }}>
            {children}
        </SocketContext.Provider>
    );
};
