const router = require('express').Router();
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { getNotificationEmail } = require('../utils/emailTemplates');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const parser = require('../config/cloudinary');

// CREATE
router.post('/', verifyAdmin, parser.single('image'), async (req, res) => {
    try {
        const newEvent = new Event({
            ...req.body,
            image: req.file ? req.file.path : ''
        });
        const savedEvent = await newEvent.save();

        // Notify Students
        const users = await User.find({ role: 'student' });

        // 1. Create Notifications
        const notifications = users.map(user => ({
            recipient: user._id,
            type: 'event',
            content: `New Event: ${savedEvent.title}`,
            relatedId: savedEvent._id
        }));
        await Notification.insertMany(notifications);

        // 2. Socket Broadcast
        const io = req.app.get('io');
        io.emit('new_notification', {
            type: 'event',
            content: `New Event: ${savedEvent.title}`,
            relatedId: savedEvent._id
        });

        // 3. Email
        users.forEach(user => {
            if (user.email && user.notificationPreferences?.email !== false) {
                 const emailContent = getNotificationEmail(
                    user.firstName,
                    'Event',
                    `<strong>${savedEvent.title}</strong><br/>Date: ${new Date(savedEvent.date).toLocaleDateString()}<br/>${savedEvent.description.substring(0, 100)}...`,
                    `${process.env.CLIENT_URL || 'http://localhost:5173'}/student/events`
                 );
                 sendEmail({
                     email: user.email,
                     subject: `New Event: ${savedEvent.title}`,
                     html: emailContent
                 }).catch(err => console.error("Email failed", err));
            }
        });

        res.status(200).json(savedEvent);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

// GET ALL
router.get('/', verifyToken, async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.status(200).json(events);
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.status(200).json("Event has been deleted...");
    } catch (err) {
        res.status(500).json(err);
    }
});

// UPDATE
router.put('/:id', verifyAdmin, parser.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = req.file.path;

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );
        res.status(200).json(updatedEvent);
    } catch (err) {
        res.status(500).json(err);
    }
});

// RSVP
router.post('/:id/rsvp', verifyToken, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json("Event not found");

        // Check Expiry (Use End Date/Time if available, else Start)
        const now = new Date();
        const dateStr = event.endDate || event.date;
        const timeStr = event.endTime || event.time || '23:59';

        const eventDateStr = dateStr instanceof Date ? dateStr.toISOString().split('T')[0] : dateStr;
        const eventDateTime = new Date(`${eventDateStr}T${timeStr}`);

        if (now > eventDateTime) {
            return res.status(400).json("Event has already ended");
        }

        if (!event.attendees.includes(req.user.id)) {
            await event.updateOne({ $push: { attendees: req.user.id } });
            res.status(200).json("The event has been RSVP'd");
        } else {
            res.status(403).json("You already RSVP'd to this event");
        }
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

module.exports = router;
