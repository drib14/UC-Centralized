const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    type: {
        type: String,
        enum: ['direct', 'group', 'announcement'],
        default: 'direct'
    },
    // Group Chat Fields
    name: { type: String }, // Group Name
    image: { type: String }, // Group Photo URL
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    description: { type: String },

    // Meta
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },

    // Settings per user (Map of userId -> Settings Object)
    // We use a Map to scale better than array searches for large groups
    mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Customization
    theme: { type: String, default: '#003399' },
    quickReaction: { type: String, default: '👍' },
    nicknames: {
        type: Map,
        of: String,
        default: {}
    }
}, { timestamps: true });

// Indexes for performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ type: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
