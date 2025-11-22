const mongoose = require('mongoose');

const merchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String },
    stock: { type: Number, required: true, default: 0 },
    department: { type: String, default: 'ALL' }
}, { timestamps: true });

module.exports = mongoose.model('Merch', merchSchema);
