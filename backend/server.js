const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const User = require('./models/User'); // Import User model

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

// Initiate DB connection immediately
connectDB();

// --- SOCKET.IO LOGIC ---
const userSocketMap = new Map(); // Map<userId, socketId>
const socketUserMap = new Map(); // Map<socketId, userId>

io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // Join Room & Set Online
    socket.on('join_room', async (userId) => {
        if (!userId) return;

        socket.join(userId);
        userSocketMap.set(userId, socket.id);
        socketUserMap.set(socket.id, userId);

        // Update User Status (Only if DB connected)
        if (mongoose.connection.readyState === 1) {
            try {
                await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
                io.emit('user_status_change', { userId, isOnline: true });
            } catch (err) {
                console.error("Error updating online status:", err);
            }
        }
    });

    // Typing Indicators
    socket.on('typing', (data) => {
        // data: { recipientId, conversationId }
        // Emit to the recipient
        io.to(data.recipientId).emit('typing', {
            conversationId: data.conversationId,
            senderId: socketUserMap.get(socket.id)
        });
    });

    socket.on('stop_typing', (data) => {
        io.to(data.recipientId).emit('stop_typing', {
            conversationId: data.conversationId,
            senderId: socketUserMap.get(socket.id)
        });
    });

    // Disconnect
    socket.on('disconnect', async () => {
        console.log("Socket disconnected:", socket.id);
        const userId = socketUserMap.get(socket.id);

        if (userId) {
            userSocketMap.delete(userId);
            socketUserMap.delete(socket.id);

            // Update Offline Status (Only if DB connected)
            if (mongoose.connection.readyState === 1) {
                try {
                    await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
                    io.emit('user_status_change', { userId, isOnline: false, lastSeen: new Date() });
                } catch (err) {
                    console.error("Error updating offline status:", err);
                }
            }
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
