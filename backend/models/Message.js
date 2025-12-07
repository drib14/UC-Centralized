const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String }, // Text content or file description
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'file'],
        default: 'text'
    },
    fileUrl: { type: String, default: "" }, // Cloudinary URL
    fileName: { type: String, default: "" }, // Original Filename
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Track who read it
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
