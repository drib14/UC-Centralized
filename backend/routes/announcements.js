const router = require('express').Router();
const Announcement = require('../models/Announcement');
const { notifyAllStudents } = require('../utils/notificationService');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// CREATE
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const newAnnouncement = new Announcement(req.body);
        const savedAnnouncement = await newAnnouncement.save();

        // Notify Students
        await notifyAllStudents(
            'announcement',
            `New Announcement: ${savedAnnouncement.title}`,
            savedAnnouncement._id,
            `${process.env.CLIENT_URL || 'http://localhost:5173'}/student/dashboard`,
            req
        );

        res.status(200).json(savedAnnouncement);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET ALL
router.get('/', verifyToken, async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ date: -1 });
        res.status(200).json(announcements);
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.status(200).json("Announcement deleted");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
