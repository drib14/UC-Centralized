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
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    department: {
        type: String,
        default: 'CCS'
    },
    program: {
        type: String
    },
    year: {
        type: String
    },
    profileImage: {
        type: String
    },
    resetCode: {
        type: String
    },
    resetCodeExpires: {
        type: Date
    },
    resetAttempts: {
        type: Number,
        default: 0
    },
    resetLockoutUntil: {
        type: Date
    },
    resetPasswordToken: {
        type: String,
    },
    resetPasswordExpires: {
        type: Date,
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
