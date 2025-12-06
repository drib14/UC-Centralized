const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { verifyAdmin, verifyToken } = require('../middleware/auth');

// SEARCH USERS
router.get('/search', verifyToken, async (req, res) => {
    try {
        const query = req.query.q;
        let searchCriteria = {};

        if (query && query.trim() !== '') {
            searchCriteria = {
                $or: [
                    { firstName: { $regex: query, $options: 'i' } },
                    { lastName: { $regex: query, $options: 'i' } },
                    { studentId: { $regex: query, $options: 'i' } }
                ]
            };
        }

        // Return top 50 users if no query (for active list)
        const users = await User.find(searchCriteria)
            .select('firstName lastName studentId profileImage role isOnline lastSeen')
            .limit(50);

        res.status(200).json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

// BLOCK USER
router.put('/:id/block', verifyToken, async (req, res) => {
    try {
        const userToBlock = req.params.id;
        if (userToBlock === req.user.id) return res.status(400).json("You cannot block yourself");

        await User.findByIdAndUpdate(req.user.id, { $addToSet: { blockedUsers: userToBlock } });
        res.status(200).json("User blocked");
    } catch (err) {
        res.status(500).json(err);
    }
});

// UNBLOCK USER
router.put('/:id/unblock', verifyToken, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.id, { $pull: { blockedUsers: req.params.id } });
        res.status(200).json("User unblocked");
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET ME (Extended to include blocked list)
router.get('/me/details', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('blockedUsers');
        res.status(200).json(user);
    } catch (err) {
         res.status(500).json(err);
    }
});

// GET BLOCK STATUS (Bidirectional)
router.get('/:id/block-status', verifyToken, async (req, res) => {
    try {
        const otherUserId = req.params.id;
        const myId = req.user.id;

        const me = await User.findById(myId).select('blockedUsers');
        const other = await User.findById(otherUserId).select('blockedUsers');

        res.status(200).json({
            iBlockedThem: me.blockedUsers.includes(otherUserId),
            theyBlockedMe: other.blockedUsers.includes(myId)
        });
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET ALL (Admins Only)
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
