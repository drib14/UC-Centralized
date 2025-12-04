const router = require('express').Router();
const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { getNotificationEmail } = require('../utils/emailTemplates');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// CREATE
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const newAnnouncement = new Announcement(req.body);
        const savedAnnouncement = await newAnnouncement.save();

        // Notify All Users
        // In a real app, optimize this (bulk insert, job queue)
        // For this scale, we loop.
        const users = await User.find({ role: 'student' }); // Notify students

        // 1. Create Notifications
        const notifications = users.map(user => ({
            recipient: user._id,
            type: 'announcement',
            content: `New Announcement: ${savedAnnouncement.title}`,
            relatedId: savedAnnouncement._id
        }));
        await Notification.insertMany(notifications);

        // 2. Real-time Socket Event (Broadcast)
        const io = req.app.get('io');
        io.emit('new_notification', {
            type: 'announcement',
            content: `New Announcement: ${savedAnnouncement.title}`,
            relatedId: savedAnnouncement._id
        });

        // 3. Send Emails (Async - don't await loop)
        users.forEach(user => {
            if (user.email && user.notificationPreferences?.email !== false) {
                 const emailContent = getNotificationEmail(
                    user.firstName,
                    'Announcement',
                    `<strong>${savedAnnouncement.title}</strong><br/>${savedAnnouncement.content.substring(0, 100)}...`,
                    `${process.env.CLIENT_URL || 'http://localhost:5173'}/student/dashboard`
                 );
                 sendEmail({
                     email: user.email,
                     subject: `New Announcement: ${savedAnnouncement.title}`,
                     html: emailContent
                 }).catch(err => console.error("Email failed", err));
            }
        });

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
