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

// CORS Configuration
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        // Allow any origin
        callback(null, true);
    },
    credentials: true,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
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
    const isConnected = await connectDB();
    if (!isConnected) {
        return res.status(500).json({ message: 'Database connection failed. Check server logs.' });
    }
    next();
});

// URL Normalization for Vercel
// Vercel rewrites /api/... to this file, but sometimes req.url retains the /api prefix.
// We strip it to ensure standard routing works for both Localhost and Vercel.
app.enable('trust proxy'); // Important for Vercel

app.use((req, res, next) => {
    // Regex replace to ensure we only replace the STARTING /api
    // Handles cases like /api/auth/login -> /auth/login
    // Also handles /api/ -> /
    if (req.url.startsWith('/api')) {
        req.url = req.url.replace(/^\/api/, '') || '/';
    }
    next();
});

// Routes
app.use('/auth', authRoute);
app.use('/users', userRoute);
app.use('/events', eventRoute);
app.use('/merch', merchRoute);
app.use('/orders', orderRoute);
app.use('/announcements', announcementRoute);
app.use('/stats', statsRoute);
app.use('/documentation', docsRoute);
app.use('/oauth', oauthRoute);

app.get('/', (req, res) => {
    res.send('UC-Central Backend is running');
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
