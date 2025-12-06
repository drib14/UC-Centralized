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
    // Ensure DB connectivity
    if (mongoose.connection.readyState === 0) connectDB();

    // 1. User Presence & Rooms
    socket.on("join_room", async (userId) => {
        if (!userId) return;
        socket.join(userId); // Join room named by User ID
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

    // 2. Messaging Events
    // Note: Main message sending is handled via API POST /messages which then broadcasts using io.to(userId).
    // However, we can handle typing indicators here.
    socket.on("typing", (data) => {
        // data: { receiverId, conversationId }
        socket.to(data.receiverId).emit("user_typing", data);
    });

    socket.on("stop_typing", (data) => {
        socket.to(data.receiverId).emit("user_stop_typing", data);
    });

    // 3. WebRTC Signaling (Restored)
    socket.on("call_user", (data) => {
        // data: { userToCall, signalData, from, name, isVideo }
        io.to(data.userToCall).emit("call_user", {
            signal: data.signalData,
            from: data.from,
            name: data.name,
            isVideo: data.isVideo
        });
    });

    socket.on("answer_call", (data) => {
        // data: { to, signal }
        io.to(data.to).emit("call_accepted", data.signal);
    });

    socket.on("ice_candidate", (data) => {
        // data: { to, candidate }
        io.to(data.to).emit("ice_candidate", data.candidate);
    });

    socket.on("end_call", (data) => {
        io.to(data.to).emit("call_ended");
    });

    // 4. Call Logs (Optional - handled via API usually, but if client emits end_call we can log)
    // For now, we rely on the API or client-side logic to post a 'call_log' message.
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
