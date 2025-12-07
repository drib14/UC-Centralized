const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    unreadCount: { type: Number, default: 0 }, // May need map per user if we track unread per user
    // Better unread tracking: Map or Array
    // For simplicity, let's just use 'unreadBy' array or similar?
    // Usually unread counts are derived or stored per user.
    // Existing schema might have been too simple.
    // Let's add the requested fields.
    theme: { type: String, default: 'default' },
    nicknames: {
        type: Map,
        of: String,
        default: {}
    },
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
