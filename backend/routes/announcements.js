const router = require('express').Router();
const Announcement = require('../models/Announcement');
const { notifyAllStudents } = require('../utils/notificationService');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const mongoose = require('mongoose');

// CREATE
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { title, content, department, priority } = req.body;
        if (!title) {
            return res.status(400).json({ message: "Announcement title is required" });
        }

        const newAnnouncement = new Announcement({
            title: String(title).trim(),
            content: content ? String(content).trim() : '',
            department: department || 'ALL',
            priority: priority || 'normal'
        });
        const savedAnnouncement = await newAnnouncement.save();

        // Notify Students
        await notifyAllStudents(
            'announcement',
            `New Announcement: ${savedAnnouncement.title}`,
            savedAnnouncement._id,
            `${process.env.CLIENT_URL || 'http://localhost:5173'}/student/dashboard`,
            req
        );

        res.status(201).json(savedAnnouncement);
    } catch (err) {
        console.error("Create Announcement Error:", err);
        res.status(500).json({ message: "Failed to create announcement" });
    }
});

// GET ALL
router.get('/', verifyToken, async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ date: -1, createdAt: -1 });
        res.status(200).json(announcements);
    } catch (err) {
        console.error("Get Announcements Error:", err);
        res.status(500).json({ message: "Failed to fetch announcements" });
    }
});

// DELETE
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid announcement ID" });
        }
        const deleted = await Announcement.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Announcement not found" });
        res.status(200).json({ message: "Announcement deleted" });
    } catch (err) {
        console.error("Delete Announcement Error:", err);
        res.status(500).json({ message: "Failed to delete announcement" });
    }
});

module.exports = router;
