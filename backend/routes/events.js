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

// RSVP
router.post('/:id/rsvp', verifyToken, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json("Event not found");

        // Check Expiry
        const now = new Date();
        const eventDateStr = event.date instanceof Date ? event.date.toISOString().split('T')[0] : event.date;
        const eventTimeStr = event.time || '23:59';
        const eventDateTime = new Date(`${eventDateStr}T${eventTimeStr}`);

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
