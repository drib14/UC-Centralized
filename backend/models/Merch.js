const mongoose = require('mongoose');

const merchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String },
    // Total stock (aggregate of variants or standalone for accessories)
    stock: { type: Number, required: true, default: 0 },
    department: { type: String, default: 'ALL' },
    category: {
        type: String,
        enum: ['wearable', 'accessories'],
        default: 'accessories'
    },
    // For wearables: [{ size: 'M', color: 'Red', stock: 10 }]
    variants: [{
        size: { type: String }, // e.g., S, M, L, XL
        color: { type: String }, // e.g., Red, Blue
        stock: { type: Number, default: 0 }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Merch', merchSchema);
