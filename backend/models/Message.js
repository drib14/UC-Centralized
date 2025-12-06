const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        default: ''
    },
    // Simplified Types: 'text', 'file' (includes images/videos/audio in attachments), 'system', 'call_log'
    // But keeping explicit 'audio' type for voice messages is useful for UI distinction
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'file', 'call_log', 'system', 'poll', 'location'],
        default: 'text'
    },
    // Attachments Array for multi-media
    attachments: [{
        url: String,
        type: { type: String, enum: ['image', 'video', 'audio', 'file'] },
        name: String,
        size: Number,
        duration: Number // For audio/video
    }],

    // Feature Specific Data
    pollData: {
        question: String,
        options: [{
            text: String,
            votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
        }],
        allowMultipleAnswers: { type: Boolean, default: false }
    },
    locationData: {
        latitude: Number,
        longitude: Number
    },

    // Status
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Deletion
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isDeletedForEveryone: {
        type: Boolean,
        default: false
    },

    // Reactions
    reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String
    }],

    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }

}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
