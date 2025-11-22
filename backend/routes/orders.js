const router = require('express').Router();
const Order = require('../models/Order');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// CREATE
router.post('/', verifyToken, async (req, res) => {
    try {
        const newOrder = new Order({
            user: req.user.id,
            items: req.body.items,
            totalPrice: req.body.totalPrice,
            status: 'pending'
        });

        const savedOrder = await newOrder.save();
        res.status(200).json(savedOrder);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

// GET ALL (Admin sees all, Student sees theirs)
router.get('/', verifyToken, async (req, res) => {
    try {
        let orders;
        if (req.user.role === 'admin') {
            orders = await Order.find().populate('user', 'name studentId').populate('items.merch');
        } else {
            orders = await Order.find({ user: req.user.id }).populate('items.merch');
        }
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json(err);
    }
});

// UPDATE STATUS (Admin only)
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
