const router = require('express').Router();
const Order = require('../models/Order');
const Merch = require('../models/Merch');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { notifyAdmins, notifyUser } = require('../utils/notificationService');

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

        // Decrement Stock and Check Threshold
        for (const item of req.body.items) {
            const updatedProduct = await Merch.findByIdAndUpdate(
                item.merch,
                { $inc: { stock: -item.quantity } },
                { new: true }
            );

            // Low Stock Alert (Threshold: 5)
            if (updatedProduct.stock <= 5) {
                await notifyAdmins(
                    'alert',
                    `Low Stock Alert: ${updatedProduct.name} has only ${updatedProduct.stock} items left.`,
                    updatedProduct._id,
                    `${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/merch`,
                    req
                );
            }
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
            orders = await Order.find().populate('user', 'firstName lastName name studentId').populate('items.merch').sort({ createdAt: -1 });
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
        ).populate('user'); // Populate to get user for notification

        // Notify User if order belongs to a registered student
        if (updatedOrder.user && updatedOrder.user._id) {
            await notifyUser(
                updatedOrder.user._id,
                'alert',
                `Your Order #${updatedOrder._id.toString().slice(-6)} status is now: ${updatedOrder.status}`,
                updatedOrder._id,
                `${process.env.CLIENT_URL || 'http://localhost:5173'}/student/cart`,
                true,
                req
            );
        }

        res.status(200).json(updatedOrder);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
