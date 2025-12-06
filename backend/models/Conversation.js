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
    mutedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    hiddenFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    theme: {
        type: String,
        default: '#003399' // Default UC Blue
    },
    quickReaction: {
        type: String,
        default: '👍'
    },
    nicknames: {
        type: Map,
        of: String,
        default: {}
    }
}, { timestamps: true });

// Ensure unique conversation between specific participants
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
