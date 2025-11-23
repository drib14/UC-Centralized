const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { verifyAdmin } = require('../middleware/auth');

// GET ALL (Admins + Students)
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

// UPDATE USER
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        if (req.body.password) {
             const salt = await bcrypt.genSalt(10);
             req.body.password = await bcrypt.hash(req.body.password, salt);
        }
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        ).select('-password');
        res.status(200).json(updatedUser);
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE USER
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json("User deleted");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
