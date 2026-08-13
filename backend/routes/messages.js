const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const parser = require('../config/cloudinary');

const mongoose = require('mongoose');

// Helper to safely escape regex special characters
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// --- STATIC & SPECIFIC ROUTES (Must come before dynamic /:id) ---

// UNREAD COUNT
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const userConversations = await Conversation.find({ participants: req.user.id }).distinct('_id');
        const count = await Message.countDocuments({
            sender: { $ne: req.user.id },
            readBy: { $ne: req.user.id },
            conversationId: { $in: userConversations },
            deletedFor: { $ne: req.user.id }
        });
        res.status(200).json({ count });
    } catch (err) {
        console.error("Unread count error:", err);
        res.status(500).json({ message: "Failed to get unread count" });
    }
});

// GET CONVERSATIONS
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: { $in: [req.user.id] }
        })
        .populate('participants', 'firstName lastName profileImage name role isOnline lastSeen')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });

        const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                sender: { $ne: req.user.id },
                readBy: { $ne: req.user.id },
                deletedFor: { $ne: req.user.id }
            });
            const convObj = conv.toObject();
            convObj.unreadCount = unreadCount;
            convObj.participants = (convObj.participants || []).map(p => ({
                ...p,
                profilePicture: p.profileImage || p.profilePicture
            }));
            convObj.otherUser = (convObj.participants || []).find(p => p._id && p._id.toString() !== req.user.id);
            return convObj;
        }));

        res.status(200).json(conversationsWithUnread);
    } catch (err) {
        console.error("Get conversations error:", err);
        res.status(500).json({ message: "Failed to get conversations" });
    }
});

// GET MESSAGES (Dynamic ID - Namespaced)
router.get('/conversations/:conversationId', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.conversationId)) {
            return res.status(400).json({ message: "Invalid conversation ID" });
        }

        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: { $in: [req.user.id] }
        });

        if (!conversation) return res.status(403).json({ message: "Access denied or conversation not found" });

        const messages = await Message.find({
            conversationId: req.params.conversationId,
            deletedFor: { $ne: req.user.id }
        }).populate('sender', 'firstName lastName profileImage name role');

        const mappedMessages = messages.map(m => {
            const msgObj = m.toObject();
            if(msgObj.sender) {
                msgObj.sender.profilePicture = msgObj.sender.profileImage || msgObj.sender.profilePicture;
            }
            return msgObj;
        });

        res.status(200).json(mappedMessages);
    } catch (err) {
        console.error("Get Messages Error:", err);
        res.status(500).json({ message: "Failed to fetch messages" });
    }
});

// DELETE CONVERSATION
router.delete('/conversations/:conversationId', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.conversationId)) {
            return res.status(400).json({ message: "Invalid conversation ID" });
        }

        const conversation = await Conversation.findOneAndDelete({
            _id: req.params.conversationId,
            participants: { $in: [req.user.id] }
        });

        if (!conversation) return res.status(404).json({ message: "Conversation not found or access denied" });

        await Message.deleteMany({ conversationId: req.params.conversationId });

        const io = req.app.get('io');
        if (io) {
            conversation.participants.forEach(p => {
                io.to(p.toString()).emit("conversation_deleted", req.params.conversationId);
            });
        }

        res.status(200).json({ message: "Conversation deleted" });
    } catch (err) {
        console.error("Delete Conversation Error:", err);
        res.status(500).json({ message: "Failed to delete conversation" });
    }
});

// MUTE CONVERSATION
router.put('/conversations/:conversationId/mute', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.conversationId)) {
            return res.status(400).json({ message: "Invalid conversation ID" });
        }

        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: { $in: [req.user.id] }
        });

        if (!conversation) return res.status(404).json({ message: "Conversation not found or access denied" });

        const isMuted = (conversation.mutedBy || []).some(id => id.toString() === req.user.id);

        if (isMuted) {
            await Conversation.findByIdAndUpdate(req.params.conversationId, {
                $pull: { mutedBy: req.user.id }
            });
        } else {
            await Conversation.findByIdAndUpdate(req.params.conversationId, {
                $addToSet: { mutedBy: req.user.id }
            });
        }

        res.status(200).json({ muted: !isMuted });
    } catch (err) {
        console.error("Mute Conversation Error:", err);
        res.status(500).json({ message: "Failed to mute conversation" });
    }
});

// MARK READ
router.put('/conversations/:conversationId/read', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.conversationId)) {
            return res.status(400).json({ message: "Invalid conversation ID" });
        }

        await Message.updateMany(
            {
                conversationId: req.params.conversationId,
                sender: { $ne: req.user.id },
                readBy: { $ne: req.user.id }
            },
            { $addToSet: { readBy: req.user.id } }
        );

        const conversation = await Conversation.findById(req.params.conversationId);
        if (conversation) {
            const io = req.app.get('io');
            if (io) {
                const otherParticipants = (conversation.participants || []).filter(p => p.toString() !== req.user.id);
                otherParticipants.forEach(p => {
                    io.to(p.toString()).emit("messages_read", {
                        conversationId: req.params.conversationId,
                        readBy: req.user.id
                    });
                });
            }
        }

        res.status(200).json({ message: "Messages marked as read" });
    } catch (err) {
        console.error("Mark Read Error:", err);
        res.status(500).json({ message: "Failed to mark messages as read" });
    }
});

// SEARCH USERS (Students searching fellow students only)
router.get('/search/users', verifyToken, async (req, res) => {
    try {
        const query = req.query.q || '';
        if (!query || query.trim() === '') return res.status(200).json([]);

        const cleanQuery = query.trim();
        const escapedQuery = escapeRegex(cleanQuery);
        const parts = cleanQuery.split(/\s+/).filter(Boolean);

        let searchConditions = [
            { firstName: { $regex: escapedQuery, $options: 'i' } },
            { lastName: { $regex: escapedQuery, $options: 'i' } },
            { name: { $regex: escapedQuery, $options: 'i' } },
            { email: { $regex: escapedQuery, $options: 'i' } },
            { studentId: { $regex: escapedQuery, $options: 'i' } }
        ];

        if (parts.length > 1) {
            const firstPart = escapeRegex(parts[0]);
            const lastPart = escapeRegex(parts.slice(1).join(' '));
            searchConditions.push({
                $and: [
                    { firstName: { $regex: firstPart, $options: 'i' } },
                    { lastName: { $regex: lastPart, $options: 'i' } }
                ]
            });
        }

        // Only find fellow student accounts - students cannot search for or message admins
        const studentMatches = await User.find({
            _id: { $ne: req.user.id },
            role: 'student',
            $or: searchConditions
        }).select('firstName lastName profileImage name department role isOnline lastSeen').limit(30);

        const mappedUsers = studentMatches.map(u => {
            const userObj = u.toObject();
            userObj.profilePicture = userObj.profileImage || userObj.profilePicture;
            return userObj;
        });

        res.status(200).json(mappedUsers);
    } catch (err) {
        console.error("Search users error:", err);
        res.status(500).json({ message: "Failed to search users" });
    }
});

// --- DYNAMIC ROUTES (Must be last) ---

// SEND MESSAGE (POST /)
router.post('/', verifyToken, parser.single('file'), async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            return res.status(403).json({ message: "Administrators manage the application and cannot participate in direct messaging." });
        }

        const { recipientId, content, conversationId, type } = req.body;
        const senderId = req.user.id;
        let chatId = conversationId;

        if (recipientId) {
            const recipientUser = await User.findById(recipientId);
            if (!recipientUser) return res.status(404).json({ message: "Recipient user not found" });
            if (recipientUser.role === 'admin') {
                return res.status(400).json({ message: "Messaging administrators directly is not supported. Please visit the admin office or check official announcements." });
            }
        }

        if (!chatId && recipientId) {
            const existingConversation = await Conversation.findOne({
                participants: { $all: [senderId, recipientId] }
            });

            if (existingConversation) {
                chatId = existingConversation._id;
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
            fileUrl: req.body.fileUrl || "",
            fileName: req.body.fileName || "",
            readBy: [senderId]
        };

        if (req.file) {
            messageData.fileUrl = req.file.path;
            messageData.fileName = req.file.originalname;

            if (!messageData.type || messageData.type === 'text') {
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
            updatedAt: Date.now()
        });

        const io = req.app.get('io');
        await savedMessage.populate('sender', 'firstName lastName profileImage name role');

        const responseMessage = savedMessage.toObject();
        if(responseMessage.sender) {
             responseMessage.sender.profilePicture = responseMessage.sender.profileImage || responseMessage.sender.profilePicture;
        }

        const conversation = await Conversation.findById(chatId);
        conversation.participants.forEach(participantId => {
            const pId = participantId.toString();
            io.to(pId).emit("receive_message", responseMessage);
            io.to(pId).emit("conversation_updated", {
                conversationId: chatId,
                lastMessage: responseMessage
            });
        });

        res.status(200).json(responseMessage);

    } catch (err) {
        console.error("Send message error:", err);
        res.status(500).json(err);
    }
});

// EDIT MESSAGE
router.put('/:id', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid message ID" });
        }

        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: "Message not found" });
        if (message.sender.toString() !== req.user.id) return res.status(403).json({ message: "You can only edit your own messages" });

        const updatedMessage = await Message.findByIdAndUpdate(
            req.params.id,
            { $set: { content: req.body.content } },
            { new: true }
        ).populate('sender', 'firstName lastName profileImage name role');

        const conversation = await Conversation.findById(message.conversationId);
        const io = req.app.get('io');
        if (io && conversation) {
            conversation.participants.forEach(participantId => {
                io.to(participantId.toString()).emit("message_updated", updatedMessage);
            });
        }

        res.status(200).json(updatedMessage);
    } catch (err) {
        console.error("Edit message error:", err);
        res.status(500).json({ message: "Failed to edit message" });
    }
});

// DELETE MESSAGE
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid message ID" });
        }

        const mode = req.query.mode || 'everyone';
        const message = await Message.findById(req.params.id);

        if (!message) return res.status(404).json({ message: "Message not found" });

        if (mode === 'everyone') {
            if (message.sender.toString() !== req.user.id) {
                return res.status(403).json({ message: "You can only delete your own messages for everyone" });
            }

            await Message.findByIdAndDelete(req.params.id);

            const conversation = await Conversation.findById(message.conversationId);
            const io = req.app.get('io');
            if (io && conversation) {
                conversation.participants.forEach(participantId => {
                    io.to(participantId.toString()).emit("message_deleted", req.params.id);
                });
            }

            res.status(200).json({ message: "Message deleted" });
        } else {
            await Message.findByIdAndUpdate(req.params.id, {
                $addToSet: { deletedFor: req.user.id }
            });
            res.status(200).json({ message: "Message deleted for you" });
        }
    } catch (err) {
        console.error("Delete message error:", err);
        res.status(500).json({ message: "Failed to delete message" });
    }
});

module.exports = router;
