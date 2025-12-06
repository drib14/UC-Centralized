const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const parser = require('../config/cloudinary');
const { notifyUser } = require('../utils/notificationService');

// Upload File
router.post('/upload', verifyToken, (req, res) => {
    parser.single('file')(req, res, (err) => {
        if (err || !req.file) return res.status(500).json({ message: "Upload failed" });
        res.status(200).json({ url: req.file.path });
    });
});

// Get conversations (Sorted by update)
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: { $in: [req.user.id] },
            hiddenFor: { $ne: req.user.id }
        })
        .populate('participants', 'firstName lastName profileImage isOnline lastSeen')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

        res.status(200).json(conversations);
    } catch (err) { res.status(500).json(err); }
});

// Create/Get Conversation
router.post('/conversations', verifyToken, async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.user.id;

        // Exact match for 2 participants
        let query = (senderId === receiverId)
            ? { participants: { $size: 2, $not: { $elemMatch: { $ne: senderId } } } }
            : { participants: { $all: [senderId, receiverId], $size: 2 } };

        let conv = await Conversation.findOne(query);
        if (!conv) {
            conv = new Conversation({ participants: [senderId, receiverId] });
            await conv.save();
        }

        const fullConv = await Conversation.findById(conv._id)
            .populate('participants', 'firstName lastName profileImage isOnline lastSeen')
            .populate('lastMessage');

        res.status(200).json(fullConv);
    } catch (err) { res.status(500).json(err); }
});

// Global Search (Users + Messages)
router.get('/search/global', verifyToken, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) return res.json({ users: [], messages: [] });

        // 1. Search Users (excluding self)
        const users = await User.find({
            _id: { $ne: req.user.id },
            $or: [
                { firstName: { $regex: q, $options: 'i' } },
                { lastName: { $regex: q, $options: 'i' } }
            ]
        }).select('firstName lastName profileImage isOnline lastSeen').limit(10);

        // 2. Search Messages in user's conversations
        const myConvs = await Conversation.find({
            participants: { $in: [req.user.id] },
            hiddenFor: { $ne: req.user.id }
        }).select('_id');

        const convIds = myConvs.map(c => c._id);

        const messages = await Message.find({
            conversationId: { $in: convIds },
            content: { $regex: q, $options: 'i' },
            type: 'text',
            deletedFor: { $ne: req.user.id },
            isDeletedForEveryone: false
        })
        .populate('sender', 'firstName lastName profileImage')
        .populate({
            path: 'conversationId',
            populate: { path: 'participants', select: 'firstName lastName profileImage' }
        })
        .sort({ createdAt: -1 })
        .limit(10);

        res.status(200).json({ users, messages });
    } catch (err) { res.status(500).json(err); }
});

// Get Messages
router.get('/:conversationId', verifyToken, async (req, res) => {
    try {
        const messages = await Message.find({
            conversationId: req.params.conversationId,
            deletedFor: { $ne: req.user.id }
        })
        .populate('sender', 'firstName lastName profileImage')
        .populate('replyTo') // Populate replied message if any
        .sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (err) { res.status(500).json(err); }
});

// Send Message
router.post('/', verifyToken, async (req, res) => {
    try {
        let { conversationId, content, type, attachments, pollData, locationData, replyTo } = req.body;

        // Parsing Guards
        if (typeof attachments === 'string') try { attachments = JSON.parse(attachments); } catch(e){}
        if (typeof pollData === 'string') try { pollData = JSON.parse(pollData); } catch(e){}
        if (typeof locationData === 'string') try { locationData = JSON.parse(locationData); } catch(e){}

        const newMessage = new Message({
            conversationId,
            sender: req.user.id,
            content,
            type: type || 'text',
            attachments: attachments || [],
            pollData,
            locationData,
            replyTo,
            readBy: [req.user.id]
        });

        const savedMsg = await newMessage.save();

        // Update Conversation
        const conv = await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: savedMsg._id,
            updatedAt: Date.now(),
            $pull: { hiddenFor: { $in: [req.user.id] } } // Unhide for sender
        }, { new: true });

        // Also unhide for receiver
        const receiver = conv.participants.find(p => p.toString() !== req.user.id);
        if (receiver) {
            await Conversation.findByIdAndUpdate(conversationId, {
                $pull: { hiddenFor: receiver }
            });

             // Notify via Notification System (DB)
             // Only if text or media, not system messages
             if (['text', 'image', 'video', 'audio', 'file'].includes(type)) {
                 await notifyUser(
                    receiver,
                    'message',
                    `New message from ${req.user.firstName}`,
                    conversationId,
                    '/student/messages',
                    false, // No email spam
                    req,
                    req.user.id
                 );
             }
        }

        const populatedMsg = await Message.findById(savedMsg._id)
            .populate('sender', 'firstName lastName profileImage')
            .populate('replyTo'); // Return populated reply

        res.status(200).json(populatedMsg);
    } catch (err) { res.status(500).json(err); }
});

// Mark Read
router.put('/:conversationId/read', verifyToken, async (req, res) => {
    try {
        await Message.updateMany(
            { conversationId: req.params.conversationId, readBy: { $ne: req.user.id } },
            { $push: { readBy: req.user.id } }
        );
        res.status(200).json("Read");
    } catch (err) { res.status(500).json(err); }
});

// React
router.put('/:id/react', verifyToken, async (req, res) => {
    try {
        const { emoji } = req.body;
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json("Not found");

        const idx = msg.reactions.findIndex(r => r.user.toString() === req.user.id);
        if (idx > -1) {
            if (msg.reactions[idx].emoji === emoji) msg.reactions.splice(idx, 1); // Toggle off
            else msg.reactions[idx].emoji = emoji; // Change
        } else {
            msg.reactions.push({ user: req.user.id, emoji });
        }

        await msg.save();
        const fullMsg = await Message.findById(msg._id).populate('sender', 'firstName lastName profileImage').populate('replyTo');

        // Emit socket event via Server
        const io = req.app.get('io');
        const conv = await Conversation.findById(msg.conversationId);
        const receiver = conv.participants.find(p => p.toString() !== req.user.id);
        if (receiver) io.to(receiver.toString()).emit("message_updated", fullMsg);

        res.status(200).json(fullMsg);
    } catch (err) { res.status(500).json(err); }
});

// Delete
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { mode } = req.query;
        const msg = await Message.findById(req.params.id);
        if (!msg) return res.status(404).json("Not found");

        if (mode === 'everyone') {
            if (msg.sender.toString() !== req.user.id) return res.status(403).json("No permission");
            msg.isDeletedForEveryone = true;
            msg.content = "Message unsent";
            msg.attachments = [];
            msg.type = 'text'; // Revert to text to show placeholder
            await msg.save();

            // Notify
            const io = req.app.get('io');
            const conv = await Conversation.findById(msg.conversationId);
            const receiver = conv.participants.find(p => p.toString() !== req.user.id);
            if(receiver) {
                 const fullMsg = await Message.findById(msg._id).populate('sender', 'firstName lastName profileImage');
                 io.to(receiver.toString()).emit("message_updated", fullMsg);
            }
            res.status(200).json(msg);
        } else {
            msg.deletedFor.push(req.user.id);
            await msg.save();
            res.status(200).json("Deleted for you");
        }
    } catch (err) { res.status(500).json(err); }
});

// Update Settings
router.put('/conversations/:id/settings', verifyToken, async (req, res) => {
    try {
        const { theme, quickReaction, nicknames } = req.body;
        const conv = await Conversation.findById(req.params.id).populate('participants');
        if (!conv) return res.status(404).json("Not found");

        if (theme) conv.theme = theme;
        if (quickReaction) conv.quickReaction = quickReaction;
        if (nicknames) conv.nicknames = nicknames;

        await conv.save();

        // Notify
        const io = req.app.get('io');
        const receiver = conv.participants.find(p => p._id.toString() !== req.user.id);
        if (receiver) {
            io.to(receiver._id.toString()).emit("conversation_settings_updated", {
                conversationId: conv._id,
                theme: conv.theme,
                quickReaction: conv.quickReaction,
                nicknames: conv.nicknames,
                receiverId: receiver._id // Helper for debugging
            });
        }

        res.status(200).json(conv);
    } catch(err) { res.status(500).json(err); }
});

module.exports = router;
