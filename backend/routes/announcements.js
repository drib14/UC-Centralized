const router = require('express').Router();
const Announcement = require('../models/Announcement');
const { notifyAllStudents } = require('../utils/notificationService');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');

// CREATE
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { title, message, content, department, type, priority, startDate, endDate, author } = req.body;
        
        if (!title || !String(title).trim()) {
            return res.status(400).json({ message: "Announcement title is required." });
        }

        const msgContent = String(message || content || '').trim();
        if (!msgContent) {
            return res.status(400).json({ message: "Announcement message details are required." });
        }

        const announcementType = ['suspension', 'academic', 'administrative', 'event_notice', 'general'].includes(type)
            ? type
            : 'general';

        const announcementPriority = ['urgent', 'high', 'normal'].includes(priority)
            ? priority
            : (announcementType === 'suspension' ? 'urgent' : 'normal');

        const parsedStartDate = startDate ? new Date(startDate) : new Date();
        const parsedEndDate = endDate ? new Date(endDate) : null;

        const newAnnouncement = new Announcement({
            title: String(title).trim(),
            message: msgContent,
            content: msgContent,
            type: announcementType,
            priority: announcementPriority,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            department: department ? String(department).trim() : 'ALL',
            author: author ? String(author).trim() : 'Campus Administration',
            date: parsedStartDate
        });

        const savedAnnouncement = await newAnnouncement.save();

        // Notify Students if urgent or class suspension or general
        try {
            await notifyAllStudents(
                'announcement',
                `${announcementType === 'suspension' ? '🚨 Class Suspension: ' : 'New Announcement: '}${savedAnnouncement.title}`,
                savedAnnouncement._id,
                '/student/dashboard',
                req
            );
        } catch (notifErr) {
            console.error("Notification broadcast error (non-fatal):", notifErr.message);
        }

        res.status(201).json(savedAnnouncement);
    } catch (err) {
        console.error("Create Announcement Error:", err);
        res.status(500).json({ message: err.message || "Failed to create announcement" });
    }
});

// GET ALL / FILTERED
router.get('/', verifyToken, async (req, res) => {
    try {
        const { department, type, priority } = req.query;
        let query = {};

        if (department && department !== 'ALL') {
            query.$or = [{ department: 'ALL' }, { department: String(department) }];
        }

        if (type && type !== 'ALL') {
            query.type = String(type);
        }

        if (priority) {
            query.priority = String(priority);
        }

        const announcements = await Announcement.find(query).sort({ startDate: -1, createdAt: -1 });
        res.status(200).json(announcements);
    } catch (err) {
        console.error("Get Announcements Error:", err);
        res.status(500).json({ message: "Failed to fetch announcements" });
    }
});

// UPDATE
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid announcement ID" });
        }

        const { title, message, content, department, type, priority, startDate, endDate, author } = req.body;
        const msgContent = String(message || content || '').trim();

        const updateData = {};
        if (title) updateData.title = String(title).trim();
        if (msgContent) {
            updateData.message = msgContent;
            updateData.content = msgContent;
        }
        if (department) updateData.department = String(department).trim();
        if (type) updateData.type = type;
        if (priority) updateData.priority = priority;
        if (startDate) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
        if (author) updateData.author = String(author).trim();

        const updated = await Announcement.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updated) return res.status(404).json({ message: "Announcement not found" });

        res.status(200).json(updated);
    } catch (err) {
        console.error("Update Announcement Error:", err);
        res.status(500).json({ message: err.message || "Failed to update announcement" });
    }
});

// DELETE
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid announcement ID" });
        }
        const deleted = await Announcement.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Announcement not found" });
        res.status(200).json({ message: "Announcement deleted" });
    } catch (err) {
        console.error("Delete Announcement Error:", err);
        res.status(500).json({ message: "Failed to delete announcement" });
    }
});

module.exports = router;
