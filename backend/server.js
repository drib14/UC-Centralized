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
// Cleaned up socket logic for maintenance mode
io.on("connection", (socket) => {
    // Basic connectivity logs
    // console.log("Socket connected:", socket.id);
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
