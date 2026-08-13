const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });

const messageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: "" }, // Text content or file caption
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'pdf', 'document', 'spreadsheet', 'presentation', 'archive', 'code', 'file'],
        default: 'text'
    },
    fileUrl: { type: String, default: "" }, // Cloudinary URL
    fileName: { type: String, default: "" }, // Original Filename
    fileSize: { type: Number, default: 0 }, // Size in bytes
    fileType: { type: String, default: "" }, // MIME type or extension
    reactions: [reactionSchema], // Messenger-style reactions
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track who read it
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Users who deleted this message for themselves
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
