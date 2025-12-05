const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

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
const notificationRoute = require('./routes/notifications'); // Create this next
const User = require('./models/User');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Store io instance in app
app.set('io', io);

// Track online users: Map<userId, socketId> or Set
// We will simply broadcast presence updates.
// Ideally use Redis or DB, but for this scope, let's update DB on connect/disconnect.

// Ensure DB is connected for Socket Events
io.on("connection", async (socket) => {
    // We only attempt to connect if completely disconnected.
    // We swallow the error to prevent crashing the socket process, trusting the main app to handle retries or logging.
    if (mongoose.connection.readyState === 0) {
        mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
            .then(() => console.log("MongoDB Connected via Socket"))
            .catch(err => console.error("MongoDB Socket Connection Error (Non-fatal):", err.message));
    }

    socket.on("join_room", async (userId) => {
        socket.join(userId);

        // Update User Status
        try {
            await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: Date.now() });
            io.emit("user_status_change", { userId, isOnline: true });
        } catch (e) {
            console.error("Socket Update Status Error:", e);
        }

        // Handle Disconnect (captured within the closure to know userId)
        socket.on("disconnect", async () => {
             try {
                await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: Date.now() });
                io.emit("user_status_change", { userId, isOnline: false, lastSeen: Date.now() });
            } catch (e) {
                // Ignore errors on disconnect if DB is gone
            }
        });
    });

    socket.on("send_message", (data) => {
        // data: { conversationId, senderId, receiverId, content, ... }
        socket.to(data.receiverId).emit("receive_message", data);
    });

    socket.on("typing", (data) => {
        socket.to(data.receiverId).emit("user_typing", data);
    });

    socket.on("stop_typing", (data) => {
        socket.to(data.receiverId).emit("user_stop_typing", data);
    });

    socket.on("mark_messages_read", (data) => {
        // data: { conversationId, readerId, senderId }
        socket.to(data.senderId).emit("messages_read_update", {
            conversationId: data.conversationId,
            readBy: data.readerId
        });
    });

});

// Middleware
app.use(express.json());
app.enable('trust proxy'); // Important for Vercel

// CORS Configuration
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        // Allow any origin
        callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Health Check (No DB dependency)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Database Connection (Serverless optimized)
// We define this OUTSIDE the request handler context if possible,
// but inside the function scope it works via caching.
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return true;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('MongoDB Connected');
        return true;
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        return false;
    }
};

// Connect DB on every request
app.use(async (req, res, next) => {
    // Skip DB connection for health check and root
    if (req.path === '/health' || req.path === '/') return next();

    const isConnected = await connectDB();
    if (!isConnected) {
        return res.status(500).json({ message: 'Database connection failed. Check server logs.' });
    }
    next();
});

// --- ROUTE DEFINITIONS ---
// We mount routes directly to 'app' to avoid nested router path issues in Serverless.
// We handle both /api prefix (standard) and root (if stripped)

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
    // Mount at /api/...
    app.use(`/api${route.path}`, route.handler);
    // Mount at /... (fallback for when Vercel rewrites strips /api)
    app.use(route.path, route.handler);
});

app.get('/api', (req, res) => {
    res.send('UC-Central Backend is running at /api');
});

app.get('/', (req, res) => {
    res.send('UC-Central Backend is running');
});

// Global 404 Handler
app.use((req, res) => {
    console.log(`[404] Route not found: ${req.method} ${req.url}`);
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.url}`,
        originalUrl: req.originalUrl,
        path: req.path
    });
});

// Local Development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
