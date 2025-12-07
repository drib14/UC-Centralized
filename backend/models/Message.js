const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    // Minimal schema to prevent crashes if code references it
    content: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
