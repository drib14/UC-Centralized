const router = require('express').Router();
const OAuthApp = require('../models/OAuthApp');
const OAuthCode = require('../models/OAuthCode');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// EXTERNAL USER REGISTRATION (Server-to-Server)
router.post('/users/register', async (req, res) => {
    try {
        const { client_id, client_secret, studentId, email, password, firstName, lastName, department, program, year } = req.body;

        // 1. Authenticate Client (External App)
        const app = await OAuthApp.findOne({ clientId: client_id, clientSecret: client_secret });
        if (!app) return res.status(401).json({ message: "Invalid Client Credentials" });

        // 2. Validate User Input
        if (!studentId || !email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: "Missing required user fields" });
        }

        // 3. Check for duplicates
        const existingUser = await User.findOne({ $or: [{ email }, { studentId }] });
        if (existingUser) return res.status(409).json({ message: "User already exists (Email or Student ID)" });

        // 4. Hash Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Create User
        const newUser = new User({
            studentId,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            department: department || 'CCS',
            program,
            year,
            role: 'student' // Default to student
        });

        const savedUser = await newUser.save();

        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: savedUser._id,
                studentId: savedUser.studentId,
                email: savedUser.email
            }
        });

    } catch (err) {
        console.error("External Reg Error:", err);
        res.status(500).json({ message: "Internal Server Error", error: err.message });
    }
});

const mongoose = require('mongoose');

// REGISTER APP
router.post('/register', verifyToken, async (req, res) => {
    try {
        const { name, redirectUris, description } = req.body;

        if (!name || !redirectUris) {
            return res.status(400).json({ message: "App name and redirect URIs are required." });
        }

        const clientId = crypto.randomBytes(16).toString('hex');
        const clientSecret = crypto.randomBytes(32).toString('hex');

        const newApp = new OAuthApp({
            name: String(name).trim(),
            clientId,
            clientSecret,
            redirectUris: Array.isArray(redirectUris) ? redirectUris : [redirectUris],
            user: req.user.id,
            description: description ? String(description).trim() : ''
        });

        const savedApp = await newApp.save();
        res.status(201).json(savedApp);
    } catch (err) {
        console.error("Register OAuth App Error:", err);
        res.status(500).json({ message: "Failed to register OAuth app" });
    }
});

// GET USER APPS
router.get('/apps', verifyToken, async (req, res) => {
    try {
        const apps = await OAuthApp.find({ user: req.user.id });
        res.status(200).json(apps);
    } catch (err) {
        console.error("Get OAuth Apps Error:", err);
        res.status(500).json({ message: "Failed to fetch OAuth apps" });
    }
});

// UPDATE APP
router.put('/apps/:id', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid app ID" });
        }
        const { name, redirectUris, description } = req.body;
        const app = await OAuthApp.findOne({ _id: req.params.id, user: req.user.id });

        if (!app) return res.status(404).json({ message: "App not found" });

        if (name) app.name = String(name).trim();
        if (description !== undefined) app.description = String(description).trim();
        if (redirectUris) {
            app.redirectUris = Array.isArray(redirectUris) ? redirectUris : [redirectUris];
        }

        const updatedApp = await app.save();
        res.status(200).json(updatedApp);
    } catch (err) {
        console.error("Update OAuth App Error:", err);
        res.status(500).json({ message: "Failed to update OAuth app" });
    }
});

// DELETE APP
router.delete('/apps/:id', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid app ID" });
        }
        const app = await OAuthApp.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!app) return res.status(404).json({ message: "App not found" });
        res.status(200).json({ message: "App deleted" });
    } catch (err) {
        console.error("Delete OAuth App Error:", err);
        res.status(500).json({ message: "Failed to delete OAuth app" });
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

        if (!client_id || !redirect_uri) return res.status(400).json({ message: "Missing parameters" });

        const app = await OAuthApp.findOne({ clientId: client_id });
        if (!app) return res.status(404).json({ message: "Client not found" });

        if (!app.redirectUris.includes(redirect_uri)) return res.status(400).json({ message: "Invalid redirect URI" });

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
