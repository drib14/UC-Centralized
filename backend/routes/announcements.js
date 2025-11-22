const router = require('express').Router();
const Announcement = require('../models/Announcement');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// CREATE
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const newAnnouncement = new Announcement(req.body);
        const savedAnnouncement = await newAnnouncement.save();
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

module.exports = router;
