const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const parser = require('../config/cloudinary');

// Upload File
router.post('/upload', verifyToken, (req, res, next) => {
    parser.single('file')(req, res, (err) => {
        if (err) {
            console.error("Upload Error:", err);
            return res.status(500).json({ message: "File upload failed", error: err.message || err });
        }
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        res.status(200).json({ url: req.file.path });
    });
});

// Get all conversations for current user
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: { $in: [req.user.id] },
            hiddenFor: { $ne: req.user.id } // Filter out hidden/deleted
        })
        .populate('participants', 'firstName lastName profileImage role studentId department program email')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

        res.status(200).json(conversations);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Mute/Unmute Conversation
router.put('/conversations/:id/mute', verifyToken, async (req, res) => {
    try {
        const conversation = await Conversation.findById(req.params.id);
        if (!conversation) return res.status(404).json("Conversation not found");

        const index = conversation.mutedBy.indexOf(req.user.id);
        if (index > -1) {
            conversation.mutedBy.splice(index, 1);
        } else {
            conversation.mutedBy.push(req.user.id);
        }
        await conversation.save();
        res.status(200).json(conversation);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Delete Conversation (Hide) and Clear Messages
router.delete('/conversations/:id', verifyToken, async (req, res) => {
    try {
        await Conversation.findByIdAndUpdate(req.params.id, {
            $addToSet: { hiddenFor: req.user.id }
        });

        // Also mark all messages in this conversation as deleted for this user
        await Message.updateMany(
            { conversationId: req.params.id },
            { $addToSet: { deletedFor: req.user.id } }
        );

        res.status(200).json("Conversation deleted");
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get messages for a specific conversation
router.get('/:conversationId', verifyToken, async (req, res) => {
    try {
        const messages = await Message.find({
            conversationId: req.params.conversationId,
            deletedFor: { $ne: req.user.id } // Filter out messages deleted for this user
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

        // Check if conversation already exists (Strict Matching)
        let query;
        if (senderId === receiverId) {
            // Self-chat: Find conv with exactly 2 participants, both being senderId (or however it's stored, usually [id, id])
            // Wait, previous fix used $size: 2, $not: { $elemMatch: { $ne: senderId } }
            // Let's re-apply that fix carefully.
            query = {
                participants: {
                    $size: 2,
                    $not: { $elemMatch: { $ne: senderId } }
                }
            };
        } else {
            // Normal chat: Find conv with exactly 2 participants, containing both IDs
            query = {
                participants: {
                    $all: [senderId, receiverId],
                    $size: 2
                }
            };
        }

        let conversation = await Conversation.findOne(query);

        if (!conversation) {
            conversation = new Conversation({
                participants: [senderId, receiverId]
            });
            await conversation.save();
        }

        const populatedConv = await Conversation.findById(conversation._id)
            .populate('participants', 'firstName lastName profileImage role studentId department program email')
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

// Edit Message
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json("Message not found");
        if (message.sender.toString() !== req.user.id) return res.status(403).json("You can only edit your own messages");
        if (message.isDeletedForEveryone) return res.status(400).json("Cannot edit deleted message");

        const updatedMessage = await Message.findByIdAndUpdate(
            req.params.id,
            { $set: { content: req.body.content, isEdited: true } },
            { new: true }
        ).populate('sender', 'firstName lastName profileImage');

        // Notify
        const io = req.app.get('io');
        const conversation = await Conversation.findById(message.conversationId);
        const receiver = conversation.participants.find(p => p.toString() !== req.user.id);
        if (receiver) io.to(receiver.toString()).emit("message_updated", updatedMessage);

        res.status(200).json(updatedMessage);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Toggle Reaction
router.put('/:id/react', verifyToken, async (req, res) => {
    try {
        const { emoji } = req.body;
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json("Message not found");

        const existingReactionIndex = message.reactions.findIndex(
            r => r.user.toString() === req.user.id && r.emoji === emoji
        );

        if (existingReactionIndex > -1) {
            // Remove
            message.reactions.splice(existingReactionIndex, 1);
        } else {
            // Add
            message.reactions.push({ user: req.user.id, emoji });
        }

        const updatedMessage = await message.save();
        await updatedMessage.populate('sender', 'firstName lastName profileImage'); // Repopulate for frontend

        // Notify
        const io = req.app.get('io');
        const conversation = await Conversation.findById(message.conversationId);
        const receiver = conversation.participants.find(p => p.toString() !== req.user.id);
        if (receiver) io.to(receiver.toString()).emit("message_updated", updatedMessage);

        res.status(200).json(updatedMessage);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Delete Message
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { mode } = req.query; // 'me' or 'everyone'
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json("Message not found");

        if (mode === 'everyone') {
            if (message.sender.toString() !== req.user.id) return res.status(403).json("You can only unsend your own messages");

            const updatedMessage = await Message.findByIdAndUpdate(
                req.params.id,
                { $set: { isDeletedForEveryone: true, content: '' } }, // Clear content
                { new: true }
            ).populate('sender', 'firstName lastName profileImage');

            // Notify
            const io = req.app.get('io');
            const conversation = await Conversation.findById(message.conversationId);
            const receiver = conversation.participants.find(p => p.toString() !== req.user.id);
            if (receiver) io.to(receiver.toString()).emit("message_updated", updatedMessage);

            res.status(200).json(updatedMessage);
        } else {
            // Delete for me
            await Message.findByIdAndUpdate(req.params.id, {
                $addToSet: { deletedFor: req.user.id }
            });
            res.status(200).json("Message deleted for you");
        }
    } catch (err) {
        res.status(500).json(err);
    }
});

// Send a message
router.post('/', verifyToken, async (req, res) => {
    try {
        let { conversationId, content, type, fileUrl, attachments } = req.body;

        // Backend Parse Guard: Handle double-encoded JSON strings from client
        if (typeof attachments === 'string') {
            try {
                attachments = JSON.parse(attachments);
            } catch (e) {
                console.error("Failed to parse attachments string", e);
                attachments = [];
            }
        }

        // Block check
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return res.status(404).json("Conversation not found");

        const receiverId = conversation.participants.find(p => p.toString() !== req.user.id);
        if (receiverId) {
             const receiver = await User.findById(receiverId);
             if (receiver.blockedUsers.includes(req.user.id)) {
                 return res.status(403).json({ message: "You are blocked by this user" });
             }
             const sender = await User.findById(req.user.id);
             if (sender.blockedUsers.includes(receiverId)) {
                 return res.status(403).json({ message: "You have blocked this user. Unblock to send messages." });
             }
        }

        const newMessage = new Message({
            conversationId,
            sender: req.user.id,
            content: content || '',
            type: type || 'text',
            fileUrl: fileUrl || '',
            attachments: attachments || [],
            readBy: [req.user.id]
        });

        const savedMessage = await newMessage.save();

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: savedMessage._id,
            updatedAt: Date.now(),
            $pull: { hiddenFor: receiverId } // Unhide for recipient if they deleted it
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
