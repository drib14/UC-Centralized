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
const departmentRoute = require('./routes/departments');

dotenv.config();

// Validate required environment variables
const requiredEnv = ['MONGO_URI', 'ACCESS_TOKEN_SECRET'];
for (const envKey of requiredEnv) {
    if (!process.env[envKey]) {
        console.warn(`[WARNING] Missing environment variable: ${envKey}. Please check your .env configuration.`);
    }
}

const app = express();
const server = http.createServer(app);

// Allowed Origins for CORS
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "https://uc-centralized.vercel.app",
    process.env.CLIENT_URL
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(ao => origin.startsWith(ao))) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

// App Config
app.set('io', io);
app.use(express.json({ limit: '10mb' }));
app.enable('trust proxy');

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server) or in whitelist
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(ao => origin.startsWith(ao))) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by CORS policy'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

// --- DATABASE ---
const { seedDefaultAdmin } = require('./utils/seedAdmin');

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return true;
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI is not defined in environment variables');
            return false;
        }
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        console.log('MongoDB Connected');
        // Ensure default admin account exists
        await seedDefaultAdmin();
        return true;
    } catch (err) {
        console.error('MongoDB Connection Error:', err.message || err);
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
    { path: '/notifications', handler: notificationRoute },
    { path: '/departments', handler: departmentRoute }
];

routes.forEach(route => {
    app.use(`/api${route.path}`, route.handler);
    app.use(route.path, route.handler);
});

// Health Check & Load Balancer Diagnostics
const getHealthData = () => ({
    status: 'ok',
    service: 'UC-Centralized Backend',
    campus: 'UC Main Campus',
    workerId: process.env.WORKER_ID || (require('cluster').isWorker ? require('cluster').worker.id : 'standalone'),
    processId: process.pid,
    uptimeSeconds: Math.floor(process.uptime()),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    memory: {
        rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    }
});

app.get('/health', (req, res) => res.status(200).json(getHealthData()));
app.get('/api/health', (req, res) => res.status(200).json(getHealthData()));
app.get('/api/cluster/status', (req, res) => {
    res.status(200).json({
        ...getHealthData(),
        environment: process.env.NODE_ENV || 'development',
        loadBalancerReady: true
    });
});

app.get('/', (req, res) => res.send('UC-Central Backend is running'));
app.use((req, res, next) => res.status(404).json({ message: 'Route not found' }));

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err.message || err);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        message: err.message || 'Internal Server Error'
    });
});

if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT} (PID: ${process.pid})`));
}

module.exports = app;
module.exports.server = server;
