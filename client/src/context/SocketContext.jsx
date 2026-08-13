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

const notifyDevice = (title, body, tag) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
            const notif = new Notification(title, {
                body: body,
                icon: '/uc-central-logo.png',
                badge: '/uc-central-logo.png',
                tag: tag || `uc-${Date.now()}`,
                renotify: true
            });
            notif.onclick = () => {
                window.focus();
                notif.close();
            };
        } catch (e) {
            console.error("Device notification error:", e);
        }
    }
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0); // Notification count
    const [unreadMessageCount, setUnreadMessageCount] = useState(0); // Message count
    const [devicePermission, setDevicePermission] = useState(
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
    );
    const { user } = useAuth();

    const requestDeviceNotificationPermission = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            toast.warn("Native device notifications are not supported on this browser.");
            return 'unsupported';
        }
        try {
            const perm = await Notification.requestPermission();
            setDevicePermission(perm);
            return perm;
        } catch (e) {
            console.error("Notification permission error:", e);
            return 'denied';
        }
    };

    const sendTestDeviceNotification = () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            toast.error("Device notifications are not supported on this device.");
            return false;
        }
        if (Notification.permission !== 'granted') {
            toast.warn("Please grant notification permission first.");
            return false;
        }
        notifyDevice(
            "🔔 UC-Central Notification Test",
            "Device notifications are functioning properly on this device!",
            "test-notification"
        );
        toast.success("Test notification dispatched to your device!");
        return true;
    };

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
                transports: ['websocket', 'polling'],
                reconnection: true,
                withCredentials: true
            });

            newSocket.on('connect', () => {
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
                    return Array.from(currentSet);
                });
            });

            newSocket.on('new_notification', (data) => {
                playNotificationSound();
                setUnreadCount(prev => prev + 1);
                setNotifications(prev => [data, ...prev]);
                toast.info(data.content, { icon: "🔔" });

                // Cross-device push notification if enabled
                if (user?.notificationPreferences?.app !== false) {
                    notifyDevice("UC-Central Campus Alert", data.content || "You have a new campus notification.");
                }
            });

            newSocket.on('receive_message', (data) => {
                // If the user is sender, don't increment unread count
                if (data.sender._id === user._id) return;

                const isChatOpen = window.location.pathname.includes('/messages');
                if (!isChatOpen) {
                    playMessageSound();
                    toast.info(`New message from ${data.sender.firstName}`);
                    setUnreadMessageCount(prev => prev + 1);

                    // Native device notification when outside of chat
                    if (user?.notificationPreferences?.app !== false) {
                        notifyDevice(
                            `Message from ${data.sender.firstName}`,
                            data.type === 'text' ? data.content : `Sent an attachment (${data.type})`,
                            `msg-${data.sender._id}`
                        );
                    }
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
        <SocketContext.Provider value={{
            socket,
            onlineUsers,
            notifications,
            setNotifications,
            unreadCount,
            setUnreadCount,
            unreadMessageCount,
            setUnreadMessageCount,
            devicePermission,
            requestDeviceNotificationPermission,
            sendTestDeviceNotification
        }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;
