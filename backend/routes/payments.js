const router = require('express').Router();
const axios = require('axios');
const Order = require('../models/Order');
const Merch = require('../models/Merch');
const { verifyToken } = require('../middleware/auth');

const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const paymongo = axios.create({
    baseURL: 'https://api.paymongo.com/v1',
    headers: {
        Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString('base64')}`,
        'Content-Type': 'application/json'
    }
});

// Create Checkout Session
router.post('/create-checkout-session', verifyToken, async (req, res) => {
    try {
        const { items, payment_method_types } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "No items provided" });
        }

        const line_items = [];
        for (const item of items) {
            // Verify price/stock from DB to prevent tampering
            const product = await Merch.findById(item.merch);
            if (!product) return res.status(404).json({ message: `Product not found` });
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${product.name}` });
            }

            line_items.push({
                currency: 'PHP',
                amount: Math.round(product.price * 100), // PayMongo uses centavos
                description: product.name,
                name: product.name,
                quantity: item.quantity,
                images: product.image ? [product.image] : []
            });
        }

        const payload = {
            data: {
                attributes: {
                    line_items,
                    payment_method_types: payment_method_types || ['gcash', 'paymaya', 'grab_pay'],
                    send_email_receipt: true,
                    show_description: true,
                    show_line_items: true,
                    description: "UC-Central Merch Order",
                    success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${CLIENT_URL}/student/cart`,
                    metadata: {
                        items: JSON.stringify(items.map(i => ({ merch: i.merch, quantity: i.quantity })))
                    }
                }
            }
        };

        const response = await paymongo.post('/checkout_sessions', payload);
        res.status(200).json(response.data.data);

    } catch (err) {
        console.error("PayMongo Error:", err.response?.data || err.message);
        res.status(500).json({ message: "Payment initialization failed", error: err.response?.data || err.message });
    }
});

// Retrieve Session and Verify
router.get('/retrieve-session/:sessionId', verifyToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const response = await paymongo.get(`/checkout_sessions/${sessionId}`);
        res.status(200).json(response.data.data);
    } catch (err) {
        console.error("PayMongo Error:", err.response?.data || err.message);
        res.status(500).json({ message: "Failed to retrieve session" });
    }
});

module.exports = router;
