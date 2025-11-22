const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: Date, default: Date.now },
    author: { type: String, default: 'Admin' },
    department: { type: String, default: 'ALL' }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
