const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { verifyAdmin, verifyToken } = require('../middleware/auth');

const mongoose = require('mongoose');

// Helper to safely escape regex special characters
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// SEARCH USERS
router.get('/search', verifyToken, async (req, res) => {
    try {
        const query = req.query.q;
        let searchCriteria = {};

        if (query && query.trim() !== '') {
            const escapedQuery = escapeRegex(query.trim());
            searchCriteria = {
                $or: [
                    { firstName: { $regex: escapedQuery, $options: 'i' } },
                    { lastName: { $regex: escapedQuery, $options: 'i' } },
                    { studentId: { $regex: escapedQuery, $options: 'i' } }
                ]
            };
        }

        // Return top 50 users if no query (for active list)
        const users = await User.find(searchCriteria)
            .select('firstName lastName studentId profileImage role isOnline lastSeen')
            .limit(50);

        res.status(200).json(users);
    } catch (err) {
        console.error("User Search Error:", err);
        res.status(500).json({ message: "Failed to search users" });
    }
});

// BLOCK USER
router.put('/:id/block', verifyToken, async (req, res) => {
    try {
        const userToBlock = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(userToBlock)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        if (userToBlock === req.user.id) return res.status(400).json({ message: "You cannot block yourself" });

        await User.findByIdAndUpdate(req.user.id, { $addToSet: { blockedUsers: userToBlock } });
        res.status(200).json({ message: "User blocked" });
    } catch (err) {
        console.error("Block User Error:", err);
        res.status(500).json({ message: "Failed to block user" });
    }
});

// UNBLOCK USER
router.put('/:id/unblock', verifyToken, async (req, res) => {
    try {
        const userToUnblock = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(userToUnblock)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        await User.findByIdAndUpdate(req.user.id, { $pull: { blockedUsers: userToUnblock } });
        res.status(200).json({ message: "User unblocked" });
    } catch (err) {
        console.error("Unblock User Error:", err);
        res.status(500).json({ message: "Failed to unblock user" });
    }
});

// GET ME (Extended to include blocked list)
router.get('/me/details', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('blockedUsers');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (err) {
        console.error("Get Details Error:", err);
        res.status(500).json({ message: "Failed to fetch user details" });
    }
});

// GET BLOCK STATUS (Bidirectional)
router.get('/:id/block-status', verifyToken, async (req, res) => {
    try {
        const otherUserId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const myId = req.user.id;

        const me = await User.findById(myId).select('blockedUsers');
        const other = await User.findById(otherUserId).select('blockedUsers');

        if (!me || !other) return res.status(404).json({ message: "User not found" });

        res.status(200).json({
            iBlockedThem: (me.blockedUsers || []).some(id => id.toString() === otherUserId),
            theyBlockedMe: (other.blockedUsers || []).some(id => id.toString() === myId)
        });
    } catch (err) {
        console.error("Get Block Status Error:", err);
        res.status(500).json({ message: "Failed to get block status" });
    }
});

// GET ALL (Admins Only)
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find().select('-password -resetCode -resetPasswordToken');
        res.status(200).json(users);
    } catch (err) {
        console.error("Get All Users Error:", err);
        res.status(500).json({ message: "Failed to fetch users" });
    }
});

// UPDATE USER (Admins Only)
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const updateData = { ...req.body };
        if (updateData.password) {
            const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
            if (!passRegex.test(updateData.password)) {
                return res.status(400).json({
                    message: "Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character."
                });
            }
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        ).select('-password -resetCode -resetPasswordToken');

        if (!updatedUser) return res.status(404).json({ message: "User not found" });

        res.status(200).json(updatedUser);
    } catch (err) {
        console.error("Admin Update User Error:", err);
        res.status(500).json({ message: "Failed to update user" });
    }
});

// DELETE USER (Admins Only)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ message: "User deleted" });
    } catch (err) {
        console.error("Admin Delete User Error:", err);
        res.status(500).json({ message: "Failed to delete user" });
    }
});

module.exports = router;
