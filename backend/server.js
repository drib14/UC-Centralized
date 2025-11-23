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

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_URL || '*', // Allow all for demo/Vercel
    credentials: true
}));

// Database Connection (Serverless optimized)
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
    }
};

// Connect DB on every request (cached by Mongoose)
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// Routes - Mount on both / and /api to handle local and Vercel paths
const routes = [
    { path: '/auth', handler: authRoute },
    { path: '/users', handler: userRoute },
    { path: '/events', handler: eventRoute },
    { path: '/merch', handler: merchRoute },
    { path: '/orders', handler: orderRoute },
    { path: '/announcements', handler: announcementRoute },
    { path: '/stats', handler: statsRoute }
];

routes.forEach(r => {
    app.use(r.path, r.handler);
    app.use(`/api${r.path}`, r.handler);
});

app.get('/', (req, res) => {
    res.send('UC-Central Backend is running');
});
app.get('/api', (req, res) => {
    res.send('UC-Central Backend is running (API)');
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
