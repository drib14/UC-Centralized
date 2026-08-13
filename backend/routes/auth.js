const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/auth');
const parser = require('../config/cloudinary');

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { studentId, email, password, firstName, lastName, department, program, year } = req.body;

        if (!studentId || !email || !password || !firstName || !lastName) {
            return res.status(400).json({ message: "All required fields must be provided." });
        }

        if (!/^\d+$/.test(String(studentId).trim())) {
            return res.status(400).json({ message: "Student ID must contain numbers only." });
        }

        // Check if user exists (by studentId or email)
        const existingUser = await User.findOne({
            $or: [{ studentId: String(studentId).trim() }, { email: String(email).trim().toLowerCase() }]
        });
        if (existingUser) return res.status(400).json({ message: "User with this Student ID or Email already exists." });

        // Password strength check
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!passRegex.test(password)) {
            return res.status(400).json({
                message: "Password is not strong enough. It must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
            });
        }

        // Generate hashed password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user - STRICTLY ENFORCE student role for public registration
        const newUser = new User({
            studentId: String(studentId).trim(),
            email: String(email).trim().toLowerCase(),
            password: hashedPassword,
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            department: department ? String(department).trim() : 'CCS',
            program: program ? String(program).trim() : '',
            year: year ? String(year).trim() : '',
            role: 'student' // Strictly student. Admins cannot be created via public registration.
        });

        // Save user and respond without password
        const user = await newUser.save();
        const { password: userPassword, ...userData } = user._doc;
        res.status(201).json(userData);
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "Registration failed. Please try again later." });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const identifier = (req.body.studentId || req.body.identifier || req.body.email || req.body.idNumber || '').toString().trim();
        const { password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ message: "ID Number / Email and password are required." });
        }

        // Find user by ID Number (studentId) or Email for versatile login across any role
        const user = await User.findOne({
            $or: [
                { studentId: identifier },
                { email: identifier.toLowerCase() }
            ]
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        const validPassword = await bcrypt.compare(String(password), user.password);
        if (!validPassword) return res.status(400).json({ message: "Wrong password" });

        const accessToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "5d" }
        );

        const { password: userPassword, ...others } = user._doc;
        res.status(200).json({ ...others, accessToken });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Login failed. Please try again later." });
    }
});

// GET CURRENT USER
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password -resetCode -resetPasswordToken');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (err) {
        console.error("Get /me Error:", err);
        res.status(500).json({ message: "Failed to fetch user details" });
    }
});

// UPDATE PROFILE (Students / Users Self-Management)
router.put('/profile', verifyToken, parser.single('image'), async (req, res) => {
    try {
        const updateData = {};

        // 1. Email Address (The only editable student identity field)
        if (req.body.email !== undefined && req.body.email !== null) {
            const newEmail = String(req.body.email).trim().toLowerCase();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newEmail)) {
                return res.status(400).json({ message: "Please provide a valid email address." });
            }

            // Check if already taken by another user
            const existingEmailUser = await User.findOne({
                email: newEmail,
                _id: { $ne: req.user.id }
            });
            if (existingEmailUser) {
                return res.status(400).json({ message: "Email address is already in use by another account." });
            }

            updateData.email = newEmail;
        }

        // 2. Notification Preferences
        if (req.body.notificationPreferences !== undefined) {
            let notifPrefs = req.body.notificationPreferences;
            if (typeof notifPrefs === 'string') {
                try {
                    notifPrefs = JSON.parse(notifPrefs);
                } catch (e) {
                    // Ignore parse error
                }
            }
            if (typeof notifPrefs === 'object' && notifPrefs !== null) {
                updateData.notificationPreferences = {
                    email: notifPrefs.email !== undefined ? Boolean(notifPrefs.email) : true,
                    app: notifPrefs.app !== undefined ? Boolean(notifPrefs.app) : true
                };
            }
        }

        // 3. Password Security Update
        if (req.body.password) {
            const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (!passRegex.test(req.body.password)) {
                return res.status(400).json({
                    message: "New password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
                });
            }
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(req.body.password, salt);
        }

        // 4. Profile Photo
        if (req.file) {
            updateData.profileImage = req.file.path;
        } else if (req.body.removeImage === 'true' || req.body.removeImage === true) {
            updateData.profileImage = '';
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true }
        ).select('-password -resetCode -resetPasswordToken');

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error("Update Profile Error:", err);
        res.status(500).json({ message: "Failed to update profile" });
    }
});

const sendEmail = require('../utils/sendEmail');
const { getPasswordResetEmail } = require('../utils/emailTemplates');
const crypto = require('crypto');

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
    try {
        const identifier = (req.body.studentId || req.body.identifier || req.body.email || req.body.idNumber || '').toString().trim();
        const inputEmail = (req.body.email || '').toString().trim().toLowerCase();

        if (!identifier || !inputEmail) {
            return res.status(400).json({ message: "ID number and registered email are required." });
        }

        const user = await User.findOne({
            $or: [
                { studentId: identifier },
                { email: identifier.toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: "ID number doesn't exist" });
        }

        if (user.email.toLowerCase() !== inputEmail) {
            return res.status(400).json({ message: "Email doesn't match the record for this account." });
        }

        if (user.resetLockoutUntil && user.resetLockoutUntil > new Date()) {
            const remainingTime = Math.ceil((user.resetLockoutUntil - new Date()) / 60000);
            return res.status(429).json({ message: `You have made too many attempts. Please try again in ${remainingTime} minutes.` });
        }

        const resetCode = crypto.randomInt(100000, 999999).toString();
        await User.updateOne({ _id: user._id }, {
            $set: {
                resetCode: resetCode,
                resetCodeExpires: new Date(new Date().getTime() + 5 * 60 * 1000), // 5 minutes
                resetAttempts: 0
            }
        });

        const emailTemplate = getPasswordResetEmail(
            user.firstName || 'Student',
            resetCode,
            `/verify-code?email=${encodeURIComponent(user.email)}`,
            req
        );

        await sendEmail({
            email: user.email,
            subject: 'UC-Central: Password Reset Verification Code',
            html: emailTemplate,
        });

        res.status(200).json({ message: 'Verification code sent to your email.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// VERIFY CODE
router.post('/verify-code', async (req, res) => {
    try {
        const identifier = (req.body.studentId || req.body.identifier || req.body.idNumber || '').toString().trim();
        const { code } = req.body;

        if (!identifier || !code) {
            return res.status(400).json({ message: 'ID number and verification code are required.' });
        }

        const user = await User.findOne({
            $or: [
                { studentId: identifier },
                { email: identifier.toLowerCase() }
            ]
        });

        if (!user || !user.resetCode) {
            return res.status(400).json({ message: 'Invalid request.' });
        }

        if (user.resetLockoutUntil && user.resetLockoutUntil > new Date()) {
            const remainingTime = Math.ceil((user.resetLockoutUntil - new Date()) / 60000);
            return res.status(429).json({ message: `You have made too many attempts. Please try again in ${remainingTime} minutes.` });
        }

        if (user.resetCodeExpires < new Date()) {
            return res.status(400).json({ message: 'Code has expired. Please request a new one.' });
        }

        const stringCode = String(code).trim();
        if (user.resetCode !== stringCode) {
            const update = { $inc: { resetAttempts: 1 } };
            if (user.resetAttempts + 1 >= 10) {
                update.$set = {
                    resetLockoutUntil: new Date(new Date().getTime() + 60 * 60 * 1000), // 1 hour lockout
                    resetCode: undefined,
                    resetCodeExpires: undefined
                };
            }
            await User.updateOne({ _id: user._id }, update);
            return res.status(400).json({ message: 'Invalid verification code.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        await User.updateOne({ _id: user._id }, {
            $set: {
                resetPasswordToken: crypto.createHash('sha256').update(resetToken).digest('hex'),
                resetPasswordExpires: new Date(new Date().getTime() + 10 * 60 * 1000), // 10 minutes
                resetCode: undefined,
                resetCodeExpires: undefined,
                resetAttempts: 0
            }
        });

        res.status(200).json({ message: 'Verification successful. You can now reset your password.', resetToken });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;

        if (!token || !password || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required." });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match." });
        }

        // Password strength check
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!passRegex.test(password)) {
            return res.status(400).json({
                message: "Password is not strong enough. It must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
            });
        }

        const hashedToken = crypto.createHash('sha256').update(String(token)).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired password reset token.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await User.updateOne({ _id: user._id }, {
            $set: {
                password: hashedPassword,
                resetPasswordToken: undefined,
                resetPasswordExpires: undefined,
                resetLockoutUntil: undefined // Clear any lockout
            }
        });

        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
