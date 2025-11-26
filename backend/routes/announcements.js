/**
 * @swagger
 * components:
 *   schemas:
 *     Announcement:
 *       type: object
 *       required:
 *         - title
 *         - message
 *       properties:
 *         title:
 *           type: string
 *         message:
 *           type: string
 *         target:
 *           type: string
 *           enum: [ALL, DEPARTMENT, PROGRAM, YEAR_LEVEL, CUSTOM]
 *         department:
 *           type: string
 *         program:
 *           type: string
 *         yearLevel:
 *           type: number
 * tags:
 *   name: Announcements
 *   description: API for managing announcements
 */
const router = require('express').Router();
const Announcement = require('../models/Announcement');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { verifyApiKey } = require('../middleware/apiKey');

/**
 * @swagger
 * /announcements:
 *   post:
 *     summary: Create a new announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Announcement'
 *     responses:
 *       200:
 *         description: The created announcement
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Announcement'
 *       500:
 *         description: Server error
 */
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const newAnnouncement = new Announcement(req.body);
        const savedAnnouncement = await newAnnouncement.save();
        res.status(200).json(savedAnnouncement);
    } catch (err) {
        res.status(500).json(err);
    }
});

/**
 * @swagger
 * /announcements:
 *   get:
 *     summary: Get all announcements (for admins)
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of all announcements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Announcement'
 *       500:
 *         description: Server error
 */
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ date: -1 });
        res.status(200).json(announcements);
    } catch (err) {
        res.status(500).json(err);
    }
});

/**
 * @swagger
 * /announcements/user:
 *   get:
 *     summary: Get announcements for the logged-in user
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of announcements relevant to the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Announcement'
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /announcements/{id}:
 *   delete:
 *     summary: Delete an announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The announcement ID
 *     responses:
 *       200:
 *         description: Announcement deleted
 *       500:
 *         description: Server error
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await Announcement.findByIdAndDelete(req.params.id);
        res.status(200).json("Announcement deleted");
    } catch (err) {
        res.status(500).json(err);
    }
});

/**
 * @swagger
 * /announcements/external:
 *   get:
 *     summary: Get all announcements (for external platforms)
 *     tags: [Announcements]
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: A list of all announcements
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Announcement'
 *       500:
 *         description: Server error
 */
router.get('/external', verifyApiKey, async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ date: -1 });
        res.status(200).json(announcements);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
