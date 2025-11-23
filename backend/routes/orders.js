const router = require('express').Router();
const Order = require('../models/Order');
const Merch = require('../models/Merch');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// CREATE
router.post('/', verifyToken, async (req, res) => {
    try {
        // Check stock first
        for (const item of req.body.items) {
            const product = await Merch.findById(item.merch);
            if (!product) return res.status(404).json({ message: "Product not found" });
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Not enough stock for ${product.name}` });
            }
        }

        // Decrement Stock
        for (const item of req.body.items) {
            await Merch.findByIdAndUpdate(item.merch, { $inc: { stock: -item.quantity } });
        }

        const orderData = {
            items: req.body.items,
            totalPrice: req.body.totalPrice,
            status: req.body.status || 'pending'
        };

        if (req.body.customerName) {
            orderData.customerName = req.body.customerName;
            orderData.user = null;
        } else {
            orderData.user = req.user.id;
        }

        const newOrder = new Order(orderData);
        const savedOrder = await newOrder.save();
        res.status(200).json(savedOrder);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

// GET ALL
router.get('/', verifyToken, async (req, res) => {
    try {
        let orders;
        if (req.user.role === 'admin') {
            orders = await Order.find().populate('user', 'firstName lastName studentId').populate('items.merch').sort({ createdAt: -1 });
        } else {
            orders = await Order.find({ user: req.user.id }).populate('items.merch').sort({ createdAt: -1 });
        }
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json(err);
    }
});

// UPDATE STATUS
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );
        res.status(200).json(updatedOrder);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
