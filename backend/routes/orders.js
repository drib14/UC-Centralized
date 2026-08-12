const router = require('express').Router();
const Order = require('../models/Order');
const Merch = require('../models/Merch');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { notifyAdmins, notifyUser } = require('../utils/notificationService');

// CREATE ORDER
router.post('/', verifyToken, async (req, res) => {
    try {
        const { items, customerName, status } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "Order must contain at least one item." });
        }

        // Validate quantities and products, calculate authoritative totalPrice
        let calculatedTotalPrice = 0;
        const processedItems = [];

        for (const item of items) {
            if (!item.merch || !item.quantity || Number(item.quantity) <= 0) {
                return res.status(400).json({ message: "Invalid item format or non-positive quantity." });
            }

            const quantity = parseInt(item.quantity, 10);
            const product = await Merch.findById(item.merch);

            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.merch}` });
            }

            if (product.stock < quantity) {
                return res.status(400).json({
                    message: `Not enough stock for ${product.name}. Available: ${product.stock}, requested: ${quantity}`
                });
            }

            calculatedTotalPrice += product.price * quantity;
            processedItems.push({
                merch: product._id,
                quantity: quantity,
                variant: item.variant || null
            });
        }

        // Decrement Stock and Check Low Stock Threshold
        for (const item of processedItems) {
            const updatedProduct = await Merch.findByIdAndUpdate(
                item.merch,
                { $inc: { stock: -item.quantity } },
                { new: true }
            );

            // Low Stock Alert (Threshold: 5)
            if (updatedProduct && updatedProduct.stock <= 5) {
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
            items: processedItems,
            totalPrice: calculatedTotalPrice, // Authoritative server-calculated total
            status: status || 'pending'
        };

        if (customerName) {
            orderData.customerName = String(customerName).trim();
            orderData.user = null;
        } else {
            orderData.user = req.user.id;
        }

        const newOrder = new Order(orderData);
        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (err) {
        console.error("Create Order Error:", err);
        res.status(500).json({ message: "Failed to create order. Please try again." });
    }
});

const mongoose = require('mongoose');

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
        console.error("Get Orders Error:", err);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
});

// UPDATE STATUS
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const allowedStatuses = ['pending', 'processing', 'completed', 'claimed', 'cancelled'];
        if (req.body.status && !allowedStatuses.includes(req.body.status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` });
        }

        const updateFields = {};
        if (req.body.status) updateFields.status = req.body.status;

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { $set: updateFields },
            { new: true }
        ).populate('user');

        if (!updatedOrder) return res.status(404).json({ message: "Order not found" });

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
        console.error("Update Order Error:", err);
        res.status(500).json({ message: "Failed to update order" });
    }
});

module.exports = router;
