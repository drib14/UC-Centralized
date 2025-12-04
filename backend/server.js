const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http'); // Import HTTP
const { Server } = require('socket.io'); // Import Socket.IO

const authRoute = require('./routes/auth');
const userRoute = require('./routes/users');
const eventRoute = require('./routes/events');
const merchRoute = require('./routes/merch');
const orderRoute = require('./routes/orders');
const announcementRoute = require('./routes/announcements');
const statsRoute = require('./routes/stats');
const docsRoute = require('./routes/docs');
const oauthRoute = require('./routes/oauth');
const messagesRoute = require('./routes/messages');

dotenv.config();

const app = express();

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
    { path: '/messages', handler: messagesRoute }
];

routes.forEach(route => {
    app.use(`/api${route.path}`, route.handler);
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

// --- SOCKET.IO SETUP ---
// Create HTTP server instance
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now, match express cors
        methods: ["GET", "POST"]
    }
});

// Store io instance in app to access it in routes
app.set('io', io);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join a room based on user ID for private notifications
    socket.on('join_room', (userId) => {
        if (userId) {
            socket.join(userId);
            console.log(`Socket ${socket.id} joined room: ${userId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Local Development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    // Listen on the HTTP server, not app
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export app for Vercel (Note: Socket.io won't work on Vercel Functions directly)
module.exports = app;
