const router = require('express').Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// SEND MESSAGE
router.post('/', verifyToken, async (req, res) => {
    try {
        const { recipientId, content } = req.body;

        if (!recipientId || !content) {
            return res.status(400).json({ message: "Recipient and content are required." });
        }

        const newMessage = new Message({
            sender: req.user.id,
            recipient: recipientId,
            content: content
        });

        const savedMessage = await newMessage.save();

        // Socket Emission
        const io = req.app.get('io');
        if (io) {
            io.to(recipientId).emit('receive_message', savedMessage);
        }

        res.status(200).json(savedMessage);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// GET CONVERSATION (Between current user and another user)
router.get('/conversation/:userId', verifyToken, async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.user.id;

        const messages = await Message.find({
            $or: [
                { sender: currentUserId, recipient: otherUserId },
                { sender: otherUserId, recipient: currentUserId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET RECENT CONVERSATIONS (For Admin mostly, or Student list)
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        // Aggregation to find unique conversation partners
        // This is complex in mongo, simpler approach for now:
        // Find all messages involving this user, sort by date desc, then uniq by partner

        const currentUserId = req.user.id;

        const allMessages = await Message.find({
            $or: [{ sender: currentUserId }, { recipient: currentUserId }]
        })
        .sort({ createdAt: -1 })
        .populate('sender', 'firstName lastName profileImage role')
        .populate('recipient', 'firstName lastName profileImage role');

        const conversations = [];
        const seenIds = new Set();

        allMessages.forEach(msg => {
            const partner = msg.sender._id.toString() === currentUserId
                ? msg.recipient
                : msg.sender;

            if (!seenIds.has(partner._id.toString())) {
                seenIds.add(partner._id.toString());
                conversations.push({
                    partner: partner,
                    lastMessage: msg
                });
            }
        });

        res.status(200).json(conversations);

    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

module.exports = router;
