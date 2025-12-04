const router = require('express').Router();
const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/auth');

// Get all notifications for user
router.get('/', verifyToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);

        // Count unread
        const unreadCount = await Notification.countDocuments({ recipient: req.user.id, read: false });

        res.status(200).json({ notifications, unreadCount });
    } catch (err) {
        res.status(500).json(err);
    }
});

// Mark as read
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        res.status(200).json("Notification marked as read");
    } catch (err) {
        res.status(500).json(err);
    }
});

// Mark all as read
router.put('/read-all', verifyToken, async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
        res.status(200).json("All notifications marked as read");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
