const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ['suspension', 'academic', 'administrative', 'event_notice', 'general'],
        default: 'general'
    },
    priority: {
        type: String,
        enum: ['urgent', 'high', 'normal'],
        default: 'normal'
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    department: {
        type: String,
        default: 'ALL',
        trim: true
    },
    author: {
        type: String,
        default: 'Campus Administration'
    },
    date: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Pre-save middleware to keep content synced with message
announcementSchema.pre('save', function(next) {
    if (!this.content && this.message) {
        this.content = this.message;
    }
    if (!this.message && this.content) {
        this.message = this.content;
    }
    if (!this.startDate) {
        this.startDate = this.date || new Date();
    }
    next();
});

module.exports = mongoose.model('Announcement', announcementSchema);
