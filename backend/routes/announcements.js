const router = require('express').Router();
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { getNotificationTemplate } = require('../utils/emailTemplates');

// CREATE
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const newAnnouncement = new Announcement(req.body);
        const savedAnnouncement = await newAnnouncement.save();

        // --- NOTIFICATION LOGIC ---
        // 1. Find target users (currently all students or filtered by department if needed)
        // Note: Announcement model has 'department' field (default 'ALL')
        let filter = {};
        if (req.body.department && req.body.department !== 'ALL') {
            filter = { department: req.body.department };
        }
        // Also exclude the admin who posted it? Maybe not strictly necessary.

        const users = await User.find(filter);

        // 2. Create Notifications & Send Emails
        const notifications = [];
        const emailPromises = [];

        // Access Socket.IO instance
        const io = req.app.get('io');

        for (const user of users) {
            // Check Preferences
            const prefs = user.notificationPreferences || { email: true, inApp: true };

            if (prefs.inApp) {
                notifications.push({
                    recipient: user._id,
                    type: 'announcement',
                    title: 'New Announcement: ' + req.body.title,
                    message: req.body.message.substring(0, 100) + (req.body.message.length > 100 ? '...' : ''),
                    relatedId: savedAnnouncement._id
                });
                // Emit socket event if user is connected
                if (io) {
                    io.to(user._id.toString()).emit('receive_notification', {
                        title: 'New Announcement: ' + req.body.title,
                        message: req.body.message
                    });
                }
            }

            if (prefs.email) {
                const emailHtml = getNotificationTemplate(
                    `New Announcement: ${req.body.title}`,
                    req.body.message,
                    `${process.env.CLIENT_URL || 'http://localhost:3000'}/student/dashboard`, // Link to dashboard
                    'View Dashboard'
                );

                emailPromises.push(sendEmail({
                    email: user.email,
                    subject: `New Announcement: ${req.body.title}`,
                    html: emailHtml
                }).catch(err => console.error(`Failed to email user ${user.email}:`, err)));
            }
        }

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        // Run email sending in background (don't await strictly for response)
        Promise.all(emailPromises);

        res.status(200).json(savedAnnouncement);
    } catch (err) {
        console.error(err);
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
