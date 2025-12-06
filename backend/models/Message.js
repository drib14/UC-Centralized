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
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'file', 'call_log', 'system', 'poll', 'location'],
        default: 'text'
    },
    // Attachments
    attachments: [{
        url: String,
        type: { type: String, enum: ['image', 'video', 'audio', 'file'] },
        name: String,
        size: Number,
        duration: Number
    }],

    // Feature Data
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
        longitude: Number,
        address: String
    },

    // Threading / Context
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    mentions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Status & Read Receipts
    readBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Edits & Deletions
    isEdited: { type: Boolean, default: false },
    isDeletedForEveryone: { type: Boolean, default: false },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // "Delete for me"

    // Reactions
    reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String
    }]

}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
