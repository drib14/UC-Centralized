const router = require('express').Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');
const parser = require('../config/cloudinary');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');

// Helper to safely escape regex special characters
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Helper to determine specific file type
function detectFileType(mimetype = '', originalname = '') {
    const mime = (mimetype || '').toLowerCase();
    const ext = ((originalname || '').split('.').pop() || '').toLowerCase();
    const nameLower = (originalname || '').toLowerCase();

    // 1. Audio Priority: Detect all audio types, voice messages, and audio-based webm files
    if (
        mime.startsWith('audio/') ||
        ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma', 'opus', 'weba', 'mid', 'midi', 'amr', 'aiff', 'caf', 'oga', 'spx', '3ga', 'voc'].includes(ext) ||
        ((ext === 'webm' || ext === 'ogg' || ext === 'mp4') && (nameLower.includes('voice') || nameLower.includes('audio') || nameLower.includes('record') || mime.includes('audio')))
    ) {
        return 'audio';
    }

    // 2. Images
    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'heic', 'tiff'].includes(ext)) {
        return 'image';
    }

    // 3. Videos (excluding audio webm)
    if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', '3gp', 'ogv', 'webm'].includes(ext)) {
        return 'video';
    }

    // 4. Documents, Spreadsheets, Presentations, PDFs, Archives, Code
    if (mime === 'application/pdf' || ext === 'pdf') {
        return 'pdf';
    }
    if (['doc', 'docx', 'rtf', 'odt', 'pages'].includes(ext)) {
        return 'document';
    }
    if (['xls', 'xlsx', 'csv', 'tsv', 'ods', 'numbers'].includes(ext)) {
        return 'spreadsheet';
    }
    if (['ppt', 'pptx', 'odp', 'key'].includes(ext)) {
        return 'presentation';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso'].includes(ext)) {
        return 'archive';
    }
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'json', 'py', 'java', 'c', 'cpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'sql', 'sh', 'xml', 'yaml', 'yml', 'md', 'txt'].includes(ext)) {
        return 'code';
    }
    return 'file';
}

// --- STATIC & SPECIFIC ROUTES (Must come before dynamic /:id) ---

// GET CLOUDINARY UPLOAD SIGNATURE (Allows Direct-to-Cloudinary upload, bypassing Vercel 4.5MB payload limits)
router.get('/upload-signature', verifyToken, (req, res) => {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = 'uc-central';
        const rawFileName = req.query.fileName || 'file';
        const extMatch = rawFileName.match(/\.([a-zA-Z0-9]+)$/);
        const rawExt = extMatch ? extMatch[1].toLowerCase() : '';
        const baseName = (rawFileName.replace(/\.[^/.]+$/, '')).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40) || 'file';
        
        // For raw files (audio, pdf, documents, etc.), include extension in public_id
        const isRaw = req.query.isRaw === 'true';
        const public_id = isRaw && rawExt ? `${Date.now()}-${baseName}.${rawExt}` : `${Date.now()}-${baseName}`;

        const paramsToSign = {
            folder,
            public_id,
            timestamp
        };

        const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

        res.status(200).json({
            signature,
            timestamp,
            public_id,
            folder,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME
        });
    } catch (err) {
        console.error("Upload signature error:", err);
        res.status(500).json({ message: "Failed to generate upload signature" });
    }
});

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
        })
        .populate('sender', 'firstName lastName profileImage name role')
        .populate('reactions.user', 'firstName lastName profileImage name role');

        const mappedMessages = messages.map(m => {
            const msgObj = m.toObject();
            if (msgObj.sender) {
                msgObj.sender.profilePicture = msgObj.sender.profileImage || msgObj.sender.profilePicture;
            }
            if (msgObj.reactions) {
                msgObj.reactions = msgObj.reactions.map(r => ({
                    ...r,
                    user: r.user ? {
                        ...r.user,
                        profilePicture: r.user.profileImage || r.user.profilePicture
                    } : r.user
                }));
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

// Middleware to safely handle file uploads and return clean JSON errors on upload failure
const uploadAttachment = (req, res, next) => {
    parser.single('file')(req, res, (err) => {
        if (err) {
            console.error("Message attachment upload error:", err);
            return res.status(err.http_code || err.status || 400).json({
                message: err.message || "Failed to upload file attachment. Please try again."
            });
        }
        next();
    });
};

// SEND MESSAGE (POST /)
router.post('/', verifyToken, uploadAttachment, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            return res.status(403).json({ message: "Administrators manage the application and cannot participate in direct messaging." });
        }

        const { recipientId, content, conversationId } = req.body;
        let requestedType = req.body.type;
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

        let detectedType = requestedType || 'text';
        let fileUrl = req.body.fileUrl || "";
        let fileName = req.body.fileName || "";
        let fileSize = Number(req.body.fileSize) || 0;
        let fileType = req.body.fileType || "";

        if (req.file) {
            fileUrl = req.file.path || req.file.secure_url || "";
            fileName = req.file.originalname || "";
            fileSize = req.file.size || 0;
            fileType = req.file.mimetype || "";
            detectedType = detectFileType(req.file.mimetype, req.file.originalname);
        } else if (fileUrl && (!requestedType || requestedType === 'text')) {
            detectedType = detectFileType('', fileName || fileUrl);
        }

        let messageData = {
            conversationId: chatId,
            sender: senderId,
            content: content || "",
            type: detectedType,
            fileUrl: fileUrl,
            fileName: fileName,
            fileSize: fileSize,
            fileType: fileType,
            reactions: [],
            readBy: [senderId]
        };

        const newMessage = new Message(messageData);
        const savedMessage = await newMessage.save();

        await Conversation.findByIdAndUpdate(chatId, {
            lastMessage: savedMessage._id,
            updatedAt: Date.now()
        });

        const io = req.app.get('io');
        await savedMessage.populate('sender', 'firstName lastName profileImage name role');
        await savedMessage.populate('reactions.user', 'firstName lastName profileImage name role');

        const responseMessage = savedMessage.toObject();
        if (responseMessage.sender) {
             responseMessage.sender.profilePicture = responseMessage.sender.profileImage || responseMessage.sender.profilePicture;
        }

        const conversation = await Conversation.findById(chatId);
        if (conversation && conversation.participants) {
            conversation.participants.forEach(participantId => {
                const pId = participantId.toString();
                if (io) {
                    io.to(pId).emit("receive_message", responseMessage);
                    io.to(pId).emit("conversation_updated", {
                        conversationId: chatId,
                        lastMessage: responseMessage
                    });
                }
            });
        }

        res.status(200).json(responseMessage);

    } catch (err) {
        console.error("Send message error:", err);
        res.status(500).json({ message: err.message || "Failed to send message" });
    }
});

// TOGGLE REACTION (PUT /:id/react)
router.put('/:id/react', verifyToken, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid message ID" });
        }

        const { emoji } = req.body;
        if (!emoji || typeof emoji !== 'string') {
            return res.status(400).json({ message: "Emoji is required" });
        }

        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: "Message not found" });

        const userIdStr = req.user.id.toString();
        const existingIndex = (message.reactions || []).findIndex(
            r => r.user && r.user.toString() === userIdStr
        );

        if (existingIndex > -1) {
            if (message.reactions[existingIndex].emoji === emoji) {
                // Same emoji clicked -> remove reaction (toggle off)
                message.reactions.splice(existingIndex, 1);
            } else {
                // Different emoji clicked -> change reaction
                message.reactions[existingIndex].emoji = emoji;
                message.reactions[existingIndex].createdAt = new Date();
            }
        } else {
            // New reaction
            message.reactions.push({
                user: req.user.id,
                emoji: emoji,
                createdAt: new Date()
            });
        }

        await message.save();

        const updatedMessage = await Message.findById(req.params.id)
            .populate('sender', 'firstName lastName profileImage name role')
            .populate('reactions.user', 'firstName lastName profileImage name role');

        const mappedMessage = updatedMessage.toObject();
        if (mappedMessage.sender) {
            mappedMessage.sender.profilePicture = mappedMessage.sender.profileImage || mappedMessage.sender.profilePicture;
        }
        if (mappedMessage.reactions) {
            mappedMessage.reactions = mappedMessage.reactions.map(r => ({
                ...r,
                user: r.user ? {
                    ...r.user,
                    profilePicture: r.user.profileImage || r.user.profilePicture
                } : r.user
            }));
        }

        const conversation = await Conversation.findById(message.conversationId);
        const io = req.app.get('io');
        if (io && conversation) {
            conversation.participants.forEach(participantId => {
                const pId = participantId.toString();
                io.to(pId).emit("message_reaction_updated", {
                    messageId: req.params.id,
                    conversationId: message.conversationId,
                    reactions: mappedMessage.reactions
                });
                io.to(pId).emit("message_updated", mappedMessage);
            });
        }

        res.status(200).json(mappedMessage);
    } catch (err) {
        console.error("Toggle reaction error:", err);
        res.status(500).json({ message: "Failed to update reaction" });
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
        )
        .populate('sender', 'firstName lastName profileImage name role')
        .populate('reactions.user', 'firstName lastName profileImage name role');

        const mappedMessage = updatedMessage.toObject();
        if (mappedMessage.sender) {
            mappedMessage.sender.profilePicture = mappedMessage.sender.profileImage || mappedMessage.sender.profilePicture;
        }

        const conversation = await Conversation.findById(message.conversationId);
        const io = req.app.get('io');
        if (io && conversation) {
            conversation.participants.forEach(participantId => {
                io.to(participantId.toString()).emit("message_updated", mappedMessage);
            });
        }

        res.status(200).json(mappedMessage);
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
