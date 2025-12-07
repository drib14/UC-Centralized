const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const parser = require('../config/cloudinary');
const { notifyUser } = require('../utils/notificationService');
const mongoose = require('mongoose');

// --- Helper Functions ---
const populateConversation = (query) => {
    return query
        .populate('participants', 'firstName lastName profileImage isOnline lastSeen email role')
        .populate({
            path: 'lastMessage',
            populate: { path: 'sender', select: 'firstName lastName profileImage' }
        });
};

// --- Routes ---

// Upload File
router.post('/upload', verifyToken, (req, res) => {
    parser.single('file')(req, res, (err) => {
        if (err) return res.status(500).json({ message: "Upload failed", error: err.message });
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        res.status(200).json({ url: req.file.path });
    });
});

// Get unread count
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const convs = await Conversation.find({ participants: { $in: [req.user.id] } }).populate('lastMessage');
        let count = 0;
        convs.forEach(c => {
            if (c.lastMessage &&
                c.lastMessage.sender.toString() !== req.user.id &&
                !c.lastMessage.readBy.includes(req.user.id)) {
                count++;
            }
        });
        res.status(200).json({ count });
    } catch(err) { res.status(500).json(err); }
});

// Get All Conversations (List)
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const conversations = await populateConversation(
            Conversation.find({
                participants: { $in: [req.user.id] },
                archivedBy: { $ne: req.user.id }
            })
        ).sort({ updatedAt: -1 });

        res.status(200).json(conversations);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// Create Conversation (Direct or Group)
router.post('/conversations', verifyToken, async (req, res) => {
    try {
        const { receiverId, isGroup, groupName, groupPhoto, participants } = req.body;
        const senderId = req.user.id;

        if (isGroup) {
            // Create Group Chat
            const allParticipants = [...new Set([senderId, ...participants])]; // Ensure unique
            const newConv = new Conversation({
                participants: allParticipants,
                type: 'group',
                name: groupName || 'New Group',
                image: groupPhoto,
                admins: [senderId]
            });
            await newConv.save();
            const populated = await populateConversation(Conversation.findById(newConv._id));
            return res.status(201).json(populated);
        } else {
            // Create/Find Direct Chat
            if (!receiverId) return res.status(400).json({ message: "Receiver ID required for direct chat" });

            // Check if receiverId is valid ObjectId, otherwise it might be a search query passed mistakenly
            if (!mongoose.Types.ObjectId.isValid(receiverId)) {
                 return res.status(400).json({ message: "Invalid user ID" });
            }

            let conv = await Conversation.findOne({
                type: 'direct',
                participants: { $all: [senderId, receiverId], $size: 2 }
            });

            if (!conv) {
                conv = new Conversation({
                    participants: [senderId, receiverId],
                    type: 'direct'
                });
                await conv.save();
            } else {
                if (conv.archivedBy.includes(senderId)) {
                    await conv.updateOne({ $pull: { archivedBy: senderId } });
                }
            }

            const populated = await populateConversation(Conversation.findById(conv._id));
            return res.status(200).json(populated);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// Global Search
router.get('/search/global', verifyToken, async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) return res.json({ users: [], messages: [] });

        const users = await User.find({
            _id: { $ne: req.user.id },
            $or: [
                { firstName: { $regex: q, $options: 'i' } },
                { lastName: { $regex: q, $options: 'i' } }
            ]
        }).select('firstName lastName profileImage role').limit(5);

        const myConvs = await Conversation.find({ participants: { $in: [req.user.id] } }).select('_id');
        const convIds = myConvs.map(c => c._id);

        const messages = await Message.find({
            conversationId: { $in: convIds },
            content: { $regex: q, $options: 'i' },
            type: 'text',
            deletedFor: { $ne: req.user.id }
        })
        .populate('sender', 'firstName lastName')
        .populate('conversationId')
        .sort({ createdAt: -1 })
        .limit(5);

        res.status(200).json({ users, messages });
    } catch (err) { res.status(500).json(err); }
});

// Update Conversation (Group Info, Members, Settings)
router.put('/conversations/:id', verifyToken, async (req, res) => {
    try {
        const { name, image, addMembers, removeMembers, theme, quickReaction, nicknames, mute, block, unblock } = req.body;
        const conv = await Conversation.findById(req.params.id);

        if (!conv) return res.status(404).json({ message: "Conversation not found" });

        // Admin checks for group details
        const isAdmin = conv.admins?.includes(req.user.id);

        if (conv.type === 'group') {
            if (name && isAdmin) conv.name = name;
            if (image && isAdmin) conv.image = image;
            if (addMembers && isAdmin) {
                const newMembers = addMembers.filter(id => !conv.participants.includes(id));
                conv.participants.push(...newMembers);
            }
            if (removeMembers && isAdmin) {
                conv.participants = conv.participants.filter(id => !removeMembers.includes(id));
            }
        }

        // Customization & Settings
        if (theme) conv.theme = theme;
        if (quickReaction) conv.quickReaction = quickReaction;
        if (nicknames) conv.nicknames = { ...conv.nicknames, ...nicknames };

        if (mute !== undefined) {
            if (mute) {
                if (!conv.mutedBy.includes(req.user.id)) conv.mutedBy.push(req.user.id);
            } else {
                conv.mutedBy = conv.mutedBy.filter(id => id.toString() !== req.user.id);
            }
        }

        // Block logic: we don't store "blocked" on conversation usually, but on User model.
        // But user asked for conversation blocking visual.
        // Let's store "blockedBy" in conversation for direct chats?
        // Actually best practice is User.blockedUsers array.
        // But for this request, let's allow "archived/blocked" state on conversation if simpler.
        // Let's stick to User model for blocking, but here we can handle the request proxy.
        if (block && conv.type === 'direct') {
             const otherId = conv.participants.find(p => p.toString() !== req.user.id);
             await User.findByIdAndUpdate(req.user.id, { $addToSet: { blockedUsers: otherId } });
        }
        if (unblock && conv.type === 'direct') {
             const otherId = conv.participants.find(p => p.toString() !== req.user.id);
             await User.findByIdAndUpdate(req.user.id, { $pull: { blockedUsers: otherId } });
        }

        await conv.save();

        const io = req.app.get('io');
        const populated = await populateConversation(Conversation.findById(conv._id));

        populated.participants.forEach(p => {
            if (p._id.toString() !== req.user.id) {
                io.to(p._id.toString()).emit("conversation_updated", populated);
            }
        });

        res.status(200).json(populated);
    } catch (err) {
        res.status(500).json(err);
    }
});

// Get Media
router.get('/:conversationId/media', verifyToken, async (req, res) => {
    try {
        const type = req.query.type || 'media';

        const query = {
            conversationId: req.params.conversationId,
            deletedFor: { $ne: req.user.id },
            'attachments.0': { $exists: true }
        };

        const messages = await Message.find(query)
            .select('attachments createdAt sender')
            .sort({ createdAt: -1 })
            .limit(50);

        const items = [];
        messages.forEach(m => {
            m.attachments.forEach(att => {
                const isMedia = ['image', 'video'].includes(att.type);
                if ((type === 'media' && isMedia) || (type === 'docs' && !isMedia)) {
                    items.push({
                        _id: m._id,
                        url: att.url,
                        name: att.name,
                        type: att.type,
                        sender: m.sender,
                        createdAt: m.createdAt
                    });
                }
            });
        });

        res.status(200).json(items);
    } catch(err) { res.status(500).json(err); }
});

// Get Messages
router.get('/:conversationId', verifyToken, async (req, res) => {
    try {
        const { limit = 50, before } = req.query;
        const query = {
            conversationId: req.params.conversationId,
            deletedFor: { $ne: req.user.id }
        };

        if (before) {
            query.createdAt = { $lt: before };
        }

        const messages = await Message.find(query)
            .populate('sender', 'firstName lastName profileImage')
            .populate({
                path: 'replyTo',
                populate: { path: 'sender', select: 'firstName lastName' }
            })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        res.status(200).json(messages.reverse());
    } catch (err) {
        res.status(500).json(err);
    }
});

// Send Message
router.post('/', verifyToken, async (req, res) => {
    try {
        let { conversationId, content, type, attachments, pollData, locationData, replyTo } = req.body;

        if (typeof attachments === 'string') try { attachments = JSON.parse(attachments); } catch(e){}
        if (typeof pollData === 'string') try { pollData = JSON.parse(pollData); } catch(e){}
        if (typeof locationData === 'string') try { locationData = JSON.parse(locationData); } catch(e){}

        // Check blocking
        const conv = await Conversation.findById(conversationId);
        if (conv.type === 'direct') {
            const otherId = conv.participants.find(p => p.toString() !== req.user.id);
            const otherUser = await User.findById(otherId);
            if (otherUser.blockedUsers.includes(req.user.id)) {
                return res.status(403).json({ message: "You cannot message this user." });
            }
            // Check if I blocked them? Usually allowed to send, but let's be strict if UI disables it.
        }

        const msg = new Message({
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

        const savedMsg = await msg.save();
        const populatedMsg = await Message.findById(savedMsg._id)
            .populate('sender', 'firstName lastName profileImage')
            .populate('replyTo');

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: savedMsg._id,
            updatedAt: Date.now(),
            $pull: { archivedBy: req.user.id }
        });

        await Conversation.findByIdAndUpdate(conversationId, {
            $set: { archivedBy: [] }
        });

        const io = req.app.get('io');

        conv.participants.forEach(p => {
            io.to(p.toString()).emit("receive_message", populatedMsg);

            if (p.toString() !== req.user.id) {
                 if (['text', 'image', 'video', 'file'].includes(type)) {
                     notifyUser(p, 'message', `New message`, conversationId, '/student/messages', false, req, req.user.id).catch(console.error);
                 }
            }
        });

        res.status(200).json(populatedMsg);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

module.exports = router;
