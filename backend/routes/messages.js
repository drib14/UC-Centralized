const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { verifyToken } = require('../middleware/auth');
const parser = require('../config/cloudinary');

// Upload File
router.post('/upload', verifyToken, parser.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    res.status(200).json({ url: req.file.path });
});

// Get all conversations for current user
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: { $in: [req.user.id] }
        })
        .populate('participants', 'firstName lastName profileImage role studentId')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

        res.status(200).json(conversations);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get messages for a specific conversation
router.get('/:conversationId', verifyToken, async (req, res) => {
    try {
        const messages = await Message.find({
            conversationId: req.params.conversationId
        })
        .populate('sender', 'firstName lastName profileImage')
        .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Create a new conversation or get existing one
router.post('/conversations', verifyToken, async (req, res) => {
    try {
        const senderId = req.user.id;
        const receiverId = req.body.receiverId;

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, receiverId]
            });
            await conversation.save();
        }

        const populatedConv = await Conversation.findById(conversation._id)
            .populate('participants', 'firstName lastName profileImage role studentId')
            .populate('lastMessage');

        res.status(200).json(populatedConv);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Mark messages as read
router.put('/:conversationId/read', verifyToken, async (req, res) => {
    try {
        await Message.updateMany(
            { conversationId: req.params.conversationId, readBy: { $ne: req.user.id } },
            { $push: { readBy: req.user.id } }
        );
        res.status(200).json("Messages marked as read");
    } catch (err) {
        res.status(500).json(err);
    }
});

// Send a message
router.post('/', verifyToken, async (req, res) => {
    try {
        const { conversationId, content, type, fileUrl } = req.body;

        const newMessage = new Message({
            conversationId,
            sender: req.user.id,
            content: content || '',
            type: type || 'text',
            fileUrl: fileUrl || '',
            readBy: [req.user.id]
        });

        const savedMessage = await newMessage.save();

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: savedMessage._id,
            updatedAt: Date.now()
        });

        // Populate sender info for the socket event or frontend update
        const populatedMessage = await Message.findById(savedMessage._id)
             .populate('sender', 'firstName lastName profileImage');

        res.status(200).json(populatedMessage);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
