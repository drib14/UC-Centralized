const mongoose = require('mongoose');

const merchSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    image: {
        type: String,
        default: ''
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    department: {
        type: String,
        default: 'ALL',
        trim: true
    },
    category: {
        type: String,
        default: 'wearable',
        trim: true
    },
    variants: [{
        size: { type: String, trim: true },
        color: { type: String, trim: true },
        stock: { type: Number, default: 0, min: 0 }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Merch', merchSchema);
