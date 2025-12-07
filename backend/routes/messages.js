const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const parser = require('../config/cloudinary');

// --- STATIC & SPECIFIC ROUTES (Must come before dynamic /:id) ---

// UNREAD COUNT
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const count = await Message.countDocuments({
            sender: { $ne: req.user.id },
            readBy: { $ne: req.user.id },
            conversationId: { $in: await Conversation.find({ participants: req.user.id }).distinct('_id') },
            deletedFor: { $ne: req.user.id }
        });
        res.status(200).json({ count });
    } catch (err) {
        console.error("Unread count error:", err);
        res.status(500).json(err);
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
            convObj.participants = convObj.participants.map(p => ({
                ...p,
                profilePicture: p.profileImage || p.profilePicture
            }));
            convObj.otherUser = convObj.participants.find(p => p._id.toString() !== req.user.id);
            return convObj;
        }));

        res.status(200).json(conversationsWithUnread);
    } catch (err) {
        console.error("Get conversations error:", err);
        res.status(500).json(err);
    }
});

// GET MESSAGES (Dynamic ID - Namespaced)
router.get('/conversations/:conversationId', verifyToken, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: { $in: [req.user.id] }
        });

        if (!conversation) return res.status(403).json("Access denied or not found");

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
        res.status(500).json(err);
    }
});

// DELETE CONVERSATION
router.delete('/conversations/:conversationId', verifyToken, async (req, res) => {
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

// MUTE CONVERSATION
router.put('/conversations/:conversationId/mute', verifyToken, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.conversationId,
            participants: { $in: [req.user.id] }
        });

        if (!conversation) return res.status(404).json("Conversation not found");

        const isMuted = conversation.mutedBy.includes(req.user.id);

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
        res.status(500).json(err);
    }
});

// MARK READ
router.put('/conversations/:conversationId/read', verifyToken, async (req, res) => {
    try {
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

        const allMatches = await User.find({
            _id: { $ne: req.user.id },
            $or: searchConditions
        }).select('firstName lastName profileImage name department role isOnline lastSeen');

        const validRoles = ['student', 'admin', 'developer'];
        const filteredMatches = allMatches.filter(u => {
            const userRole = u.role || 'student';
            return validRoles.includes(userRole);
        });

        const mappedUsers = filteredMatches.map(u => {
            const userObj = u.toObject();
            userObj.profilePicture = userObj.profileImage || userObj.profilePicture;
            return userObj;
        });

        res.status(200).json(mappedUsers);
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json(err);
    }
});

// --- DYNAMIC ROUTES (Must be last) ---

// SEND MESSAGE (POST /)
router.post('/', verifyToken, parser.single('file'), async (req, res) => {
    try {
        const { recipientId, content, conversationId, type } = req.body;
        const senderId = req.user.id;
        let chatId = conversationId;

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
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json("Message not found");
        if (message.sender.toString() !== req.user.id) return res.status(403).json("You can only edit your own messages");

        const updatedMessage = await Message.findByIdAndUpdate(
            req.params.id,
            { $set: { content: req.body.content } },
            { new: true }
        ).populate('sender', 'firstName lastName profileImage name role');

        const conversation = await Conversation.findById(message.conversationId);
        const io = req.app.get('io');
        conversation.participants.forEach(participantId => {
             io.to(participantId.toString()).emit("message_updated", updatedMessage);
        });

        res.status(200).json(updatedMessage);
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE MESSAGE
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const mode = req.query.mode || 'everyone';
        const message = await Message.findById(req.params.id);

        if (!message) return res.status(404).json("Message not found");

        if (mode === 'everyone') {
            if (message.sender.toString() !== req.user.id) return res.status(403).json("You can only delete your own messages for everyone");

             await Message.findByIdAndDelete(req.params.id);

             const conversation = await Conversation.findById(message.conversationId);
             const io = req.app.get('io');
             conversation.participants.forEach(participantId => {
                  io.to(participantId.toString()).emit("message_deleted", req.params.id);
             });

             res.status(200).json("Message deleted");
        } else {
             await Message.findByIdAndUpdate(req.params.id, {
                 $addToSet: { deletedFor: req.user.id }
             });
             res.status(200).json("Message deleted for you");
        }
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
