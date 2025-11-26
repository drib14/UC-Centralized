const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now },
    author: { type: String, default: 'Admin' },
    target: {
        type: String,
        enum: ['ALL', 'DEPARTMENT', 'PROGRAM', 'YEAR_LEVEL', 'CUSTOM'],
        default: 'ALL'
    },
    department: { type: String },
    program: { type: String },
    yearLevel: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
