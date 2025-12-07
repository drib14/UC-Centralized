const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const parser = require('../config/cloudinary');

// --- HELPER: Create System Message ---
const createSystemMessage = async (conversationId, content, io) => {
    try {
        const msg = new Message({
            conversationId,
            content,
            type: 'system',
            readBy: [] // System messages are initially unread? Or maybe just informational.
        });
        const savedMsg = await msg.save();
        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: savedMsg._id });

        io.to(conversationId.toString()).emit("receive_message", savedMsg);

        // Notify lists
        const conv = await Conversation.findById(conversationId);
        if(conv) {
             conv.participants.forEach(p => {
                io.to(p.toString()).emit("conversation_updated", {
                    conversationId,
                    lastMessage: savedMsg
                });
            });
        }
        return savedMsg;
    } catch (e) {
        console.error("System message error:", e);
    }
};

// --- STATIC ROUTES (Must come before dynamic /:id routes) ---

// UNREAD COUNT
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        // Count messages in conversations the user is part of, where user is NOT sender and NOT in readBy
        // Complex query: find conversations first
        const userConvs = await Conversation.find({ participants: req.user.id, archivedBy: { $ne: req.user.id } }).distinct('_id');

        const count = await Message.countDocuments({
            conversationId: { $in: userConvs },
            sender: { $ne: req.user.id },
            readBy: { $ne: req.user.id },
            type: { $ne: 'system' } // Optional: don't count system messages as unread?
        });
        res.status(200).json({ count });
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET CONVERSATIONS
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const archived = req.query.archived === 'true';

        const query = {
            participants: { $in: [req.user.id] }
        };

        if (archived) {
            query.archivedBy = req.user.id;
        } else {
            query.archivedBy = { $ne: req.user.id };
        }

        const conversations = await Conversation.find(query)
        .populate('participants', 'firstName lastName profilePicture name role isOnline lastSeen')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

        // Add unread count for each conversation
        const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                sender: { $ne: req.user.id },
                readBy: { $ne: req.user.id }
            });
            const convObj = conv.toObject();
            convObj.unreadCount = unreadCount;
            // Helper to get the other user (for 1-on-1)
            convObj.otherUser = convObj.participants.find(p => p._id.toString() !== req.user.id);
            return convObj;
        }));

        res.status(200).json(conversationsWithUnread);
    } catch (err) {
        res.status(500).json(err);
    }
});

// SEARCH USERS
router.get('/search/users', verifyToken, async (req, res) => {
    try {
        const query = req.query.q || '';
        if (!query) return res.status(200).json([]);

        const parts = query.trim().split(/\s+/);
        let searchConditions = [
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } },
            { name: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { studentId: { $regex: query, $options: 'i' } }
        ];

        if (parts.length > 1) {
            const firstPart = parts[0];
            const lastPart = parts.slice(1).join(' ');
            searchConditions.push({
                $and: [
                    { firstName: { $regex: firstPart, $options: 'i' } },
                    { lastName: { $regex: lastPart, $options: 'i' } }
                ]
            });
        }

        const users = await User.find({
            // Allow searching any user for simplicity, or restrict if strictly needed.
            // Requirement says "student-student, student-admin, admin-admin".
            _id: { $ne: req.user.id },
            $or: searchConditions
        }).select('firstName lastName profilePicture name department role');

        res.status(200).json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

// --- DYNAMIC ROUTES ---

// SEND MESSAGE (POST /)
router.post('/', verifyToken, parser.single('file'), async (req, res) => {
    try {
        const { recipientId, content, conversationId, type } = req.body;
        const senderId = req.user.id;
        let chatId = conversationId;

        // If no conversationId, find or create one
        if (!chatId && recipientId) {
            const existingConversation = await Conversation.findOne({
                participants: { $all: [senderId, recipientId] }
            });

            if (existingConversation) {
                chatId = existingConversation._id;
                // Unarchive if archived by sender
                if(existingConversation.archivedBy.includes(senderId)){
                    await Conversation.findByIdAndUpdate(chatId, { $pull: { archivedBy: senderId } });
                }
            } else {
                const newConversation = new Conversation({
                    participants: [senderId, recipientId]
                });
                const savedConversation = await newConversation.save();
                chatId = savedConversation._id;
            }
        }

        if (!chatId) return res.status(400).json({ message: "Recipient or Conversation ID required" });

        let messageData = {
            conversationId: chatId,
            sender: senderId,
            content: content || "",
            type: type || 'text',
            readBy: [senderId]
        };

        if (req.file) {
            messageData.fileUrl = req.file.path;
             // Determine type based on mimetype
             if (!req.body.type || req.body.type === 'text') { // Only auto-detect if not forced
                if (req.file.mimetype.startsWith('image')) messageData.type = 'image';
                else if (req.file.mimetype.startsWith('video')) messageData.type = 'video';
                else if (req.file.mimetype.startsWith('audio')) messageData.type = 'audio';
                else messageData.type = 'file';
             }
        }

        const newMessage = new Message(messageData);
        const savedMessage = await newMessage.save();

        await Conversation.findByIdAndUpdate(chatId, {
            lastMessage: savedMessage._id,
            $pull: { archivedBy: { $in: [senderId] } } // Ensure active for sender, maybe recipient too? Usually yes.
            // If we want to unarchive for recipient too:
            // $pull: { archivedBy: { $in: [senderId, recipientId] } } -- logic needs all participants
        });

        // Also unarchive for all participants (new message bumps to top)
        const conv = await Conversation.findById(chatId);
        if(conv && conv.archivedBy.length > 0) {
             conv.archivedBy = []; // Clear all archives
             await conv.save();
        }

        const io = req.app.get('io');
        io.to(chatId.toString()).emit("receive_message", savedMessage);

        // Notify participants
        conv.participants.forEach(participantId => {
            io.to(participantId.toString()).emit("conversation_updated", {
                conversationId: chatId,
                lastMessage: savedMessage
            });
        });

        await savedMessage.populate('sender', 'firstName lastName profilePicture name');
        res.status(200).json(savedMessage);

    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// GET MESSAGES
router.get('/:conversationId', verifyToken, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: { $in: [req.user.id] }
        });

        if (!conversation) return res.status(403).json("Access denied or not found");

        const messages = await Message.find({
            conversationId: req.params.conversationId
        }).populate('sender', 'firstName lastName profilePicture name');

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json(err);
    }
});

// CHANGE THEME
router.put('/:conversationId/theme', verifyToken, async (req, res) => {
    try {
        const { theme } = req.body;
        const conv = await Conversation.findOne({ _id: req.params.conversationId, participants: req.user.id });
        if(!conv) return res.status(404).json("Not found");

        conv.theme = theme;
        await conv.save();

        // Create system message
        const user = await User.findById(req.user.id);
        const userName = user.firstName; // Or nickname logic if implemented, but strict name is better for system logs
        await createSystemMessage(conv._id, `${userName} changed the theme to ${theme}`, req.app.get('io'));

        // Emit 'settings_updated' event specifically? Or rely on 'receive_message' for refresh?
        // Let's emit a specific event for live UI update without refresh
        req.app.get('io').to(conv._id.toString()).emit("theme_updated", { conversationId: conv._id, theme });

        res.status(200).json(conv);
    } catch (err) {
        res.status(500).json(err);
    }
});

// CHANGE NICKNAME
router.put('/:conversationId/nickname', verifyToken, async (req, res) => {
    try {
        const { userId, nickname } = req.body; // userId of the person whose nickname is changing
        const conv = await Conversation.findOne({ _id: req.params.conversationId, participants: req.user.id });
        if(!conv) return res.status(404).json("Not found");

        const targetUser = await User.findById(userId);
        if(!targetUser) return res.status(404).json("User not found");

        // Mongoose Map update
        if (!nickname || nickname.trim() === "") {
             conv.nicknames.delete(userId);
        } else {
             conv.nicknames.set(userId, nickname);
        }
        await conv.save();

        const actor = await User.findById(req.user.id);
        const actionText = (!nickname || nickname.trim() === "")
            ? `${actor.firstName} removed the nickname for ${targetUser.firstName}`
            : `${actor.firstName} set the nickname for ${targetUser.firstName} to ${nickname}`;

        await createSystemMessage(conv._id, actionText, req.app.get('io'));
        req.app.get('io').to(conv._id.toString()).emit("nicknames_updated", { conversationId: conv._id, nicknames: conv.nicknames });

        res.status(200).json(conv);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// ARCHIVE / UNARCHIVE
router.put('/:conversationId/archive', verifyToken, async (req, res) => {
    try {
        const conv = await Conversation.findOne({ _id: req.params.conversationId, participants: req.user.id });
        if(!conv) return res.status(404).json("Not found");

        const isArchived = conv.archivedBy.includes(req.user.id);
        if (isArchived) {
            conv.archivedBy.pull(req.user.id);
        } else {
            conv.archivedBy.push(req.user.id);
        }
        await conv.save();

        res.status(200).json({ archived: !isArchived });
    } catch (err) {
        res.status(500).json(err);
    }
});

// MUTE / UNMUTE
router.put('/:conversationId/mute', verifyToken, async (req, res) => {
    try {
        const conv = await Conversation.findOne({ _id: req.params.conversationId, participants: req.user.id });
        if(!conv) return res.status(404).json("Not found");

        const isMuted = conv.mutedBy.includes(req.user.id);
        if (isMuted) {
            conv.mutedBy.pull(req.user.id);
        } else {
            conv.mutedBy.push(req.user.id);
        }
        await conv.save();

        res.status(200).json({ muted: !isMuted });
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE CONVERSATION
router.delete('/:conversationId', verifyToken, async (req, res) => {
    try {
        const conversation = await Conversation.findOneAndDelete({
            _id: req.params.conversationId,
            participants: { $in: [req.user.id] }
        });

        if (!conversation) return res.status(404).json("Conversation not found");

        await Message.deleteMany({ conversationId: req.params.conversationId });

        const io = req.app.get('io');
        conversation.participants.forEach(p => {
             io.to(p.toString()).emit("conversation_deleted", req.params.conversationId);
        });

        res.status(200).json("Conversation deleted");
    } catch (err) {
        res.status(500).json(err);
    }
});

// MARK READ
router.put('/:conversationId/read', verifyToken, async (req, res) => {
    try {
        await Message.updateMany(
            {
                conversationId: req.params.conversationId,
                sender: { $ne: req.user.id },
                readBy: { $ne: req.user.id }
            },
            { $addToSet: { readBy: req.user.id } }
        );

        res.status(200).json("Messages read");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
