const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/auth');
const parser = require('../config/cloudinary');

// REGISTER
router.post('/register', async (req, res) => {
    try {
        // Check if user exists
        const existingUser = await User.findOne({ studentId: req.body.studentId });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        // Password strength check
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!passRegex.test(req.body.password)) {
            return res.status(400).json({
                message: "Password is not strong enough. It must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
            });
        }

        // Generate new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        // Create new user
        const newUser = new User({
            studentId: req.body.studentId,
            email: req.body.email,
            password: hashedPassword,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            department: req.body.department,
            program: req.body.program,
            year: req.body.year,
            role: req.body.role || 'student'
        });

        // Save user and respond
        const user = await newUser.save();
        res.status(200).json(user);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ studentId: req.body.studentId });
        if (!user) return res.status(404).json("User not found");

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) return res.status(400).json("Wrong password");

        const accessToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "5d" }
        );

        const { password, ...others } = user._doc;
        res.status(200).json({ ...others, accessToken });
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET CURRENT USER
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json("User not found");
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json(err);
    }
});

// UPDATE PROFILE
router.put('/profile', verifyToken, parser.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };

        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        } else {
            delete updateData.password;
        }

        if (req.file) {
            updateData.profileImage = req.file.path;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true }
        );
        const { password, ...others } = updatedUser._doc;
        res.status(200).json(others);
    } catch (err) {
        res.status(500).json(err);
    }
});

const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
    try {
        const { studentId, email } = req.body;
        const user = await User.findOne({ studentId });

        if (!user) {
            return res.status(404).json({ message: "ID number doesn't exist" });
        }

        if (user.email !== email) {
            return res.status(400).json({ message: "Email doesn't exist" });
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

        const emailTemplate = `
            <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
              <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                <h2 style="color: #003399;">Password Reset Request</h2>
                <p>We received a request to reset your password. Use the code below to complete the process.</p>
                <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="margin: 0; font-size: 24px; letter-spacing: 5px; color: #003399;">${resetCode}</h3>
                </div>
                <p>This code is valid for 5 minutes. If you did not request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;">
                <p style="font-size: 0.9em; color: #999;">UC-Central</p>
              </div>
            </div>`;

        await sendEmail({
            email: user.email,
            subject: 'Your Password Reset Code',
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
        const { studentId, code } = req.body;
        const user = await User.findOne({ studentId });

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

        if (user.resetCode !== code) {
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

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match." });
        }

        // Password strength check
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!passRegex.test(req.body.password)) {
            return res.status(400).json({
                message: "Password is not strong enough. It must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
            });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired password reset token.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        user.resetLockoutUntil = undefined; // Clear any lockout
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
