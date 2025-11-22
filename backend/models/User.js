const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    studentId: {
        type: String,
        required: true,
        unique: true,
        match: [/^\d+$/, 'Student ID must be numeric']
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    name: {
        type: String,
        required: true
    },
    department: {
        type: String,
        default: 'CCS'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
