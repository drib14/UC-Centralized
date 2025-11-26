/**
 * @swagger
 * tags:
 *   name: Events
 *   description: API for managing events
 */
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
