const router = require('express').Router();
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const { notifyAllStudents } = require('../utils/notificationService');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const parser = require('../config/cloudinary');

const mongoose = require('mongoose');

// CREATE
router.post('/', verifyAdmin, parser.single('image'), async (req, res) => {
    try {
        const { title, description, date, time, endDate, endTime, location, department } = req.body;

        if (!title || !description || !date || !location) {
            return res.status(400).json({ message: "Title, description, date, and location are required." });
        }

        const newEvent = new Event({
            title: String(title).trim(),
            description: String(description).trim(),
            date: String(date).trim(),
            time: time ? String(time).trim() : '',
            endDate: endDate ? String(endDate).trim() : '',
            endTime: endTime ? String(endTime).trim() : '',
            location: String(location).trim(),
            department: department ? String(department).trim() : 'ALL',
            image: req.file ? req.file.path : ''
        });
        const savedEvent = await newEvent.save();

        // Notify Students
        await notifyAllStudents(
            'event',
            `New Event: ${savedEvent.title}`,
            savedEvent._id,
            '/student/events',
            req
        );

        res.status(201).json(savedEvent);
    } catch (err) {
        console.error("Create Event Error:", err);
        res.status(500).json({ message: "Failed to create event" });
    }
});

// GET ALL
router.get('/', verifyToken, async (req, res) => {
    try {
        const events = await Event.find().sort({ date: 1 });
        res.status(200).json(events);
    } catch (err) {
        console.error("Get Events Error:", err);
        res.status(500).json({ message: "Failed to fetch events" });
    }
});

// DELETE
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid event ID" });
        }
        const deleted = await Event.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Event not found" });
        res.status(200).json({ message: "Event has been deleted" });
    } catch (err) {
        console.error("Delete Event Error:", err);
        res.status(500).json({ message: "Failed to delete event" });
    }
});

// UPDATE
router.put('/:id', verifyAdmin, parser.single('image'), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid event ID" });
        }
        const updateData = { ...req.body };
        if (req.file) updateData.image = req.file.path;

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );
        if (!updatedEvent) return res.status(404).json({ message: "Event not found" });
        res.status(200).json(updatedEvent);
    } catch (err) {
        console.error("Update Event Error:", err);
        res.status(500).json({ message: "Failed to update event" });
    }
});

// RSVP
router.post('/:id/rsvp', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid event ID" });
        }
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        // Check Expiry (Use End Date/Time if available, else Start)
        const now = new Date();
        const dateStr = event.endDate || event.date;
        const timeStr = event.endTime || event.time || '23:59';

        const eventDateStr = dateStr instanceof Date ? dateStr.toISOString().split('T')[0] : dateStr;
        const eventDateTime = new Date(`${eventDateStr}T${timeStr}`);

        if (now > eventDateTime) {
            return res.status(400).json({ message: "Event has already ended" });
        }

        if (!event.attendees.includes(req.user.id)) {
            await event.updateOne({ $push: { attendees: req.user.id } });
            res.status(200).json({ message: "The event has been RSVP'd" });
        } else {
            res.status(400).json({ message: "You already RSVP'd to this event" });
        }
    } catch (err) {
        console.error("RSVP Event Error:", err);
        res.status(500).json({ message: "Failed to RSVP to event" });
    }
});

module.exports = router;
