const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const parser = require('../config/cloudinary');

// --- STATIC ROUTES (Must come before dynamic /:id routes) ---

// UNREAD COUNT (Specific route)
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const count = await Message.countDocuments({
            sender: { $ne: req.user.id },
            readBy: { $ne: req.user.id },
            // Ensure message belongs to a conversation user is in
            // Ideally we filter messages in conversations the user participates in.
            // But checking 'readBy' for non-sender is usually sufficient if strict access control isn't 100% required here,
            // however, to be correct:
            conversationId: { $in: await Conversation.find({ participants: req.user.id }).distinct('_id') }
        });
        res.status(200).json({ count });
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET CONVERSATIONS
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const conversations = await Conversation.find({
            participants: { $in: [req.user.id] }
        })
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
            // Helper to get the other user
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

        // Split query to handle full name search "First Last"
        const parts = query.trim().split(/\s+/);
        let searchConditions = [
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } },
            { name: { $regex: query, $options: 'i' } }, // Legacy support
            { email: { $regex: query, $options: 'i' } },
            { studentId: { $regex: query, $options: 'i' } }
        ];

        // If query has spaces, try to match First + Last
        if (parts.length > 1) {
            const firstPart = parts[0];
            const lastPart = parts.slice(1).join(' '); // Join the rest as last name
            searchConditions.push({
                $and: [
                    { firstName: { $regex: firstPart, $options: 'i' } },
                    { lastName: { $regex: lastPart, $options: 'i' } }
                ]
            });
        }

        const users = await User.find({
            // Expanded to include admins in search
            role: { $in: ['student', 'admin', 'developer'] },
            _id: { $ne: req.user.id },
            $or: searchConditions
        }).select('firstName lastName profilePicture name department role isOnline lastSeen');

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
            // Check if conversation exists
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

        // Prepare message data
        let messageData = {
            conversationId: chatId,
            sender: senderId,
            content: content || "",
            type: type || 'text',
            readBy: [senderId] // Sender has read their own message
        };

        // Handle File Upload
        if (req.file) {
            messageData.fileUrl = req.file.path;
            // Determine type based on mimetype if not explicitly sent (though frontend should send it)
            if (!messageData.type || messageData.type === 'text') {
                if (req.file.mimetype.startsWith('image')) messageData.type = 'image';
                else if (req.file.mimetype.startsWith('video')) messageData.type = 'video';
                else if (req.file.mimetype.startsWith('audio')) messageData.type = 'audio';
                else messageData.type = 'file';
            }
        }

        const newMessage = new Message(messageData);
        const savedMessage = await newMessage.save();

        // Update Conversation with last message
        await Conversation.findByIdAndUpdate(chatId, {
            lastMessage: savedMessage._id
        });

        // Socket.io Emission
        const io = req.app.get('io');
        // We need to emit to the recipient.
        // Assuming we have a room for the conversation or individual user rooms.
        // If we use conversation room:
        io.to(chatId.toString()).emit("receive_message", savedMessage);

        // Also emit to participants' personal rooms for "new message" notification (sidebar update)
        // Find participants to notify
        const conversation = await Conversation.findById(chatId);
        conversation.participants.forEach(participantId => {
            // Do not emit to sender if they are just receiving the ack, but here we want to update their sidebar too
            io.to(participantId.toString()).emit("conversation_updated", {
                conversationId: chatId,
                lastMessage: savedMessage
            });
        });

        // Populate sender for the response
        await savedMessage.populate('sender', 'firstName lastName profilePicture name role');

        res.status(200).json(savedMessage);

    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

// GET MESSAGES (Dynamic ID)
router.get('/:conversationId', verifyToken, async (req, res) => {
    try {
        // Verify participation
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: { $in: [req.user.id] }
        });

        if (!conversation) return res.status(403).json("Access denied or not found");

        const messages = await Message.find({
            conversationId: req.params.conversationId
        }).populate('sender', 'firstName lastName profilePicture name role');

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE CONVERSATION
router.delete('/:conversationId', verifyToken, async (req, res) => {
    try {
        const conversation = await Conversation.findOneAndDelete({
            _id: req.params.conversationId,
            participants: { $in: [req.user.id] } // Only participant can delete
        });

        if (!conversation) return res.status(404).json("Conversation not found");

        await Message.deleteMany({ conversationId: req.params.conversationId });

        // Notify other participants
        const io = req.app.get('io');
        conversation.participants.forEach(p => {
             io.to(p.toString()).emit("conversation_deleted", req.params.conversationId);
        });

        res.status(200).json("Conversation deleted");
    } catch (err) {
        res.status(500).json(err);
    }
});

// MUTE CONVERSATION
router.put('/:conversationId/mute', verifyToken, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: { $in: [req.user.id] }
        });

        if (!conversation) return res.status(404).json("Conversation not found");

        const isMuted = conversation.mutedBy.includes(req.user.id);

        if (isMuted) {
            // Unmute
            await Conversation.findByIdAndUpdate(req.params.conversationId, {
                $pull: { mutedBy: req.user.id }
            });
        } else {
            // Mute
            await Conversation.findByIdAndUpdate(req.params.conversationId, {
                $addToSet: { mutedBy: req.user.id }
            });
        }

        res.status(200).json({ muted: !isMuted });
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

        // Notify sender via socket that messages are read (for "seen" indicators)
        const conversation = await Conversation.findById(req.params.conversationId);
        if (conversation) {
            const io = req.app.get('io');
            const otherParticipants = conversation.participants.filter(p => p.toString() !== req.user.id);
            otherParticipants.forEach(p => {
                 io.to(p.toString()).emit("messages_read", {
                     conversationId: req.params.conversationId,
                     readBy: req.user.id
                 });
            });
        }

        res.status(200).json("Messages read");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
