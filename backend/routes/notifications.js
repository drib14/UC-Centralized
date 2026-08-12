const router = require('express').Router();
const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/auth');

const mongoose = require('mongoose');

// Get all notifications for user
router.get('/', verifyToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate('sender', 'firstName lastName profileImage')
            .sort({ createdAt: -1 })
            .limit(50);

        // Count unread
        const unreadCount = await Notification.countDocuments({ recipient: req.user.id, read: false });

        res.status(200).json({ notifications, unreadCount });
    } catch (err) {
        console.error("Get Notifications Error:", err);
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
});

// Mark as read
router.put('/:id/read', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }
        const updated = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user.id },
            { read: true },
            { new: true }
        );
        if (!updated) return res.status(404).json({ message: "Notification not found" });
        res.status(200).json({ message: "Notification marked as read" });
    } catch (err) {
        console.error("Mark Read Error:", err);
        res.status(500).json({ message: "Failed to mark notification as read" });
    }
});

// Mark all as read
router.put('/read-all', verifyToken, async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
        res.status(200).json({ message: "All notifications marked as read" });
    } catch (err) {
        console.error("Mark All Read Error:", err);
        res.status(500).json({ message: "Failed to mark notifications as read" });
    }
});

// Delete one notification
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }
        const deleted = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
        if (!deleted) return res.status(404).json({ message: "Notification not found" });
        res.status(200).json({ message: "Notification deleted" });
    } catch (err) {
        console.error("Delete Notification Error:", err);
        res.status(500).json({ message: "Failed to delete notification" });
    }
});

// Delete all notifications
router.delete('/', verifyToken, async (req, res) => {
    try {
        await Notification.deleteMany({ recipient: req.user.id });
        res.status(200).json({ message: "All notifications deleted" });
    } catch (err) {
        console.error("Delete All Notifications Error:", err);
        res.status(500).json({ message: "Failed to delete all notifications" });
    }
});

module.exports = router;
