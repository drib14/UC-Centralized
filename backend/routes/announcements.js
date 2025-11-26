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

// GET ALL (for admins)
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ date: -1 });
        res.status(200).json(announcements);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET FOR USER
router.get('/user', verifyToken, async (req, res) => {
    try {
        const user = req.user;
        const query = {
            $or: [
                { target: 'ALL' },
                { target: 'DEPARTMENT', department: user.department },
                { target: 'PROGRAM', program: user.program },
                { target: 'YEAR_LEVEL', yearLevel: user.yearLevel }
            ]
        };
        const announcements = await Announcement.find(query).sort({ date: -1 });
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
