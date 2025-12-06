const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    // For personalized settings per user
    mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Chat Customization
    theme: { type: String, default: '#003399' },
    quickReaction: { type: String, default: '👍' },
    nicknames: {
        type: Map,
        of: String,
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
