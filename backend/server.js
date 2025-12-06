const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

// Routes
const authRoute = require('./routes/auth');
const userRoute = require('./routes/users');
const eventRoute = require('./routes/events');
const merchRoute = require('./routes/merch');
const orderRoute = require('./routes/orders');
const announcementRoute = require('./routes/announcements');
const statsRoute = require('./routes/stats');
const docsRoute = require('./routes/docs');
const oauthRoute = require('./routes/oauth');
const messageRoute = require('./routes/messages');
const notificationRoute = require('./routes/notifications');

// Models
const User = require('./models/User');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173", process.env.CLIENT_URL],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// App Config
app.set('io', io);
app.use(express.json());
app.enable('trust proxy');
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    optionsSuccessStatus: 200
}));

// --- DATABASE ---
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return true;
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('MongoDB Connected');
        return true;
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        return false;
    }
};

// --- SOCKET.IO LOGIC ---
io.on("connection", async (socket) => {
    // Ensure DB connectivity for socket events
    if (mongoose.connection.readyState === 0) connectDB();

    // User Presence
    socket.on("join_room", async (userId) => {
        if (!userId) return;
        socket.join(userId);
        try {
            await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: Date.now() });
            io.emit("user_status_change", { userId, isOnline: true });
        } catch (e) { console.error("Status Update Error:", e); }

        socket.on("disconnect", async () => {
            try {
                await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: Date.now() });
                io.emit("user_status_change", { userId, isOnline: false, lastSeen: Date.now() });
            } catch (e) {}
        });
    });

    // Messaging
    socket.on("send_message", (data) => {
        // Broadcast to receiver AND sender (for multi-device sync)
        socket.to(data.receiverId).emit("receive_message", data);
        socket.to(data.senderId).emit("receive_message", data);
    });

    socket.on("typing", (data) => socket.to(data.receiverId).emit("user_typing", data));
    socket.on("stop_typing", (data) => socket.to(data.receiverId).emit("user_stop_typing", data));

    socket.on("mark_messages_read", (data) => {
        socket.to(data.senderId).emit("messages_read_update", {
            conversationId: data.conversationId,
            readBy: data.readerId
        });
    });

    socket.on("conversation_settings_updated", (data) => {
         // Broadcast settings update to the room participants (handled by frontend checking convId)
         // Since we don't have conv rooms, we emit to the known other user via user ID room.
         // Front-end emits this event, we just relay? No, front-end emits API call, API emits socket.
         // If client emits this directly:
         if (data.receiverId) {
             socket.to(data.receiverId).emit("conversation_settings_updated", data);
         }
    });

    // WebRTC Signaling
    socket.on("call_user", (data) => {
        io.to(data.userToCall).emit("call_user", {
            signal: data.signalData,
            from: data.from,
            name: data.name,
            isVideo: data.isVideo
        });
    });
    socket.on("answer_call", (data) => io.to(data.to).emit("call_accepted", data.signal));
    socket.on("ice_candidate", (data) => io.to(data.to).emit("ice_candidate", data.candidate));

    // Call Logs
    const createCallLog = async (from, to, content) => {
        try {
            const conv = await Conversation.findOne({ participants: { $all: [from, to], $size: 2 } });
            if (conv) {
                const sysMsg = new Message({
                    conversationId: conv._id,
                    sender: from,
                    content,
                    type: 'call_log',
                    readBy: [from]
                });
                await sysMsg.save();
                await conv.updateOne({ lastMessage: sysMsg._id, updatedAt: Date.now() });
                const populated = await sysMsg.populate('sender', 'firstName lastName profileImage');
                io.to(to).emit("receive_message", populated);
                io.to(from).emit("receive_message", populated);
            }
        } catch (e) { console.error("Call Log Error:", e); }
    };

    socket.on("end_call", (data) => {
        io.to(data.to).emit("call_ended");
        if (data.from && data.to) {
            createCallLog(data.from, data.to, data.duration ? `Call ended • ${data.duration}` : 'Call ended');
        }
    });

    socket.on("call_missed", (data) => {
        if (data.from && data.to) {
            createCallLog(data.from, data.to, "Missed call");
        }
    });
});

// --- ROUTES ---
app.use(async (req, res, next) => {
    if (req.path === '/health' || req.path === '/') return next();
    if (!await connectDB()) return res.status(500).json({ message: 'DB connection failed' });
    next();
});

const routes = [
    { path: '/auth', handler: authRoute },
    { path: '/users', handler: userRoute },
    { path: '/events', handler: eventRoute },
    { path: '/merch', handler: merchRoute },
    { path: '/orders', handler: orderRoute },
    { path: '/announcements', handler: announcementRoute },
    { path: '/stats', handler: statsRoute },
    { path: '/documentation', handler: docsRoute },
    { path: '/oauth', handler: oauthRoute },
    { path: '/messages', handler: messageRoute },
    { path: '/notifications', handler: notificationRoute }
];

routes.forEach(route => {
    app.use(`/api${route.path}`, route.handler);
    app.use(route.path, route.handler);
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/', (req, res) => res.send('UC-Central Backend is running'));
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
