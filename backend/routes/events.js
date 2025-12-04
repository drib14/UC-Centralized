const router = require('express').Router();
const Event = require('../models/Event');
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
        // Assuming event.date is a Date object or YYYY-MM-DD string
        const dateStr = event.endDate || event.date;
        // Parse time if needed, but simple Date comparison is robust enough for basic requirement
        // If event.date is a full Date object stored in Mongo, we can compare directly.
        // However, the previous code constructed a specific Datetime string.

        // Let's ensure robust parsing
        let eventEnd = new Date(dateStr);
        if (event.endTime) {
            // If date is date-only, append time.
            // Warning: Handling timezones can be tricky.
            // If the schema stores Date object, it likely has 00:00:00 time if strictly date.
            const datePart = eventEnd.toISOString().split('T')[0];
            eventEnd = new Date(`${datePart}T${event.endTime}`);
        } else {
             // If no time specified, assume end of day
             eventEnd.setHours(23, 59, 59, 999);
        }

        if (now > eventEnd) {
             // Return JSON object for consistency with frontend api.js error handling
            return res.status(400).json({ message: "Event has already ended" });
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
