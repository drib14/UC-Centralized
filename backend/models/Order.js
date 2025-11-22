const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String },
    items: [{
        merch: { type: mongoose.Schema.Types.ObjectId, ref: 'Merch', required: true },
        quantity: { type: Number, required: true, min: 1 }
    }],
    totalPrice: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'claimed', 'cancelled'],
        default: 'pending'
    },
    orderDate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
