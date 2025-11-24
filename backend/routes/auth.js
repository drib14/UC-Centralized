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

module.exports = router;
