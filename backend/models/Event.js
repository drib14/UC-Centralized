const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true }, // Start Date
    time: { type: String }, // Start Time
    endDate: { type: String }, // End Date
    endTime: { type: String }, // End Time
    image: { type: String },
    location: { type: String, required: true },
    department: { type: String, default: 'ALL' },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
