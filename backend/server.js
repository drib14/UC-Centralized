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

// Health Check (No DB dependency) to verify server status
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
    // Skip DB connection for health check
    if (req.path === '/health') return next();

    const isConnected = await connectDB();
    if (!isConnected) {
        return res.status(500).json({ message: 'Database connection failed. Check server logs.' });
    }
    next();
});

// Main API Router
const apiRouter = express.Router();

apiRouter.use('/auth', authRoute);
apiRouter.use('/users', userRoute);
apiRouter.use('/events', eventRoute);
apiRouter.use('/merch', merchRoute);
apiRouter.use('/orders', orderRoute);
apiRouter.use('/announcements', announcementRoute);
apiRouter.use('/stats', statsRoute);
apiRouter.use('/documentation', docsRoute);
apiRouter.use('/oauth', oauthRoute);

apiRouter.get('/', (req, res) => {
    res.send('UC-Central Backend is running');
});

// ROUTING FIX:
// Vercel's rewrite sends "/api/..." to this function.
// Depending on configuration, req.url might be "/api/auth/login" OR just "/auth/login".
// We mount the router at BOTH /api and root / to be safe.
// AND we explicitly handle the case where /api might be repeated.

app.use('/api', apiRouter);
app.use('/', apiRouter);

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
