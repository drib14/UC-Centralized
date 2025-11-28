const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoute = require('./routes/auth');
const userRoute = require('./routes/users');
const eventRoute = require('./routes/events');
const merchRoute = require('./routes/merch');
const orderRoute = require('./routes/orders');
const announcementRoute = require('./routes/announcements');
const statsRoute = require('./routes/stats');
const docsRoute = require('./routes/docs');
const oauthRoute = require('./routes/oauth');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.enable('trust proxy'); // Important for Vercel

// Request Logger (Debug Vercel Routing)
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

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
    { path: '/oauth', handler: oauthRoute }
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
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

// Export for Vercel
module.exports = app;
