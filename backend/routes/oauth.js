const router = require('express').Router();
const OAuthApp = require('../models/OAuthApp');
const OAuthCode = require('../models/OAuthCode');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// REGISTER APP
router.post('/register', verifyToken, async (req, res) => {
    try {
        const { name, redirectUris, description } = req.body;

        const clientId = crypto.randomBytes(16).toString('hex');
        const clientSecret = crypto.randomBytes(32).toString('hex');

        const newApp = new OAuthApp({
            name,
            clientId,
            clientSecret, // In real world, hash this!
            redirectUris: Array.isArray(redirectUris) ? redirectUris : [redirectUris],
            user: req.user.id,
            description
        });

        const savedApp = await newApp.save();
        res.status(201).json(savedApp);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET USER APPS
router.get('/apps', verifyToken, async (req, res) => {
    try {
        const apps = await OAuthApp.find({ user: req.user.id });
        res.status(200).json(apps);
    } catch (err) {
        res.status(500).json(err);
    }
});

// UPDATE APP
router.put('/apps/:id', verifyToken, async (req, res) => {
    try {
        const { name, redirectUris, description } = req.body;
        const app = await OAuthApp.findOne({ _id: req.params.id, user: req.user.id });

        if (!app) return res.status(404).json("App not found");

        app.name = name || app.name;
        app.description = description || app.description;
        if (redirectUris) {
            app.redirectUris = Array.isArray(redirectUris) ? redirectUris : [redirectUris];
        }

        const updatedApp = await app.save();
        res.status(200).json(updatedApp);
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE APP
router.delete('/apps/:id', verifyToken, async (req, res) => {
    try {
        const app = await OAuthApp.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!app) return res.status(404).json("App not found");
        res.status(200).json("App deleted");
    } catch (err) {
        res.status(500).json(err);
    }
});

// AUTHORIZE ENDPOINT (Called by Client)
// Validates params and returns App info for Consent Screen
// NOTE: External apps should redirect users to the FRONTEND URL /oauth/authorize, NOT this API endpoint.
router.post('/authorize', (req, res) => {
    res.status(405).json({
        message: "Method Not Allowed. To initiate OAuth, redirect the user's browser to the frontend URL: https://uc-centralized.vercel.app/oauth/authorize"
    });
});

router.get('/authorize', async (req, res) => {
    try {
        const { client_id, redirect_uri, response_type } = req.query;

        if (!client_id || !redirect_uri) return res.status(400).json("Missing parameters");

        const app = await OAuthApp.findOne({ clientId: client_id });
        if (!app) return res.status(404).json("Client not found");

        if (!app.redirectUris.includes(redirect_uri)) return res.status(400).json("Invalid redirect URI");

        // Return app info so frontend can show "App X wants access"
        res.status(200).json({
            app: { name: app.name, description: app.description },
            client_id,
            redirect_uri
        });
    } catch (err) {
        res.status(500).json(err);
    }
});

// APPROVE (Called by User after Consent)
router.post('/approve', verifyToken, async (req, res) => {
    try {
        const { client_id, redirect_uri } = req.body;

        // Generate Auth Code
        const code = crypto.randomBytes(20).toString('hex');

        const newCode = new OAuthCode({
            code,
            clientId: client_id,
            userId: req.user.id,
            redirectUri: redirect_uri,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 mins
        });

        await newCode.save();

        // Return the callback URL (Safely append param)
        const separator = redirect_uri.includes('?') ? '&' : '?';
        res.status(200).json({ redirect_to: `${redirect_uri}${separator}code=${code}` });
    } catch (err) {
        res.status(500).json(err);
    }
});

// TOKEN ENDPOINT (Exchange Code for Token)
router.post('/token', async (req, res) => {
    try {
        const { client_id, client_secret, code, redirect_uri, grant_type } = req.body;

        if (grant_type !== 'authorization_code') return res.status(400).json("Unsupported grant_type");

        const app = await OAuthApp.findOne({ clientId: client_id, clientSecret: client_secret });
        if (!app) return res.status(401).json("Invalid Client Credentials");

        const authCode = await OAuthCode.findOne({ code });
        if (!authCode) return res.status(400).json("Invalid Code");

        if (authCode.expiresAt < new Date()) return res.status(400).json("Code Expired");
        if (authCode.clientId !== client_id) return res.status(400).json("Code does not match client");

        // Get User
        const user = await User.findById(authCode.userId);

        // Generate Access Token (JWT)
        const accessToken = jwt.sign(
            { id: user._id, role: user.role, client_id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "1d" }
        );

        // Delete used code
        await OAuthCode.deleteOne({ code });

        res.status(200).json({
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: 86400,
            user: {
                studentId: user.studentId,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (err) {
        res.status(500).json(err);
    }
});

// USERINFO
router.get('/userinfo', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -apiKey -resetCode');
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
