const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (!token) return res.status(401).json({ message: "Authentication token missing." });

        if (!process.env.ACCESS_TOKEN_SECRET) {
            console.error("ACCESS_TOKEN_SECRET is not configured.");
            return res.status(500).json({ message: "Internal server error." });
        }

        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.status(403).json({ message: "Token is invalid or expired." });
            req.user = user;
            next();
        });
    } else if (apiKey) {
        try {
            const user = await User.findOne({ apiKey: String(apiKey).trim() });
            if (user) {
                req.user = { id: user._id.toString(), role: user.role };
                next();
            } else {
                return res.status(401).json({ message: "Invalid API Key." });
            }
        } catch (err) {
            console.error("Auth Middleware Error:", err);
            return res.status(500).json({ message: "Authentication verification failed." });
        }
    } else {
        return res.status(401).json({ message: "You are not authenticated." });
    }
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: "Access denied. Administrator privileges required." });
        }
    });
};

module.exports = { verifyToken, verifyAdmin };
