const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) return res.status(403).json("Token is not valid!");
            req.user = user;
            next();
        });
    } else if (apiKey) {
        try {
            const user = await User.findOne({ apiKey: apiKey });
            if (user) {
                req.user = { id: user._id, role: user.role };
                next();
            } else {
                return res.status(401).json("Invalid API Key!");
            }
        } catch (err) {
            return res.status(500).json(err);
        }
    } else {
        return res.status(401).json("You are not authenticated!");
    }
};

const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role === 'admin') {
            next();
        } else {
            res.status(403).json("You are not allowed to do that!");
        }
    });
};

module.exports = { verifyToken, verifyAdmin };
