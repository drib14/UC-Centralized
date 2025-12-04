const router = require('express').Router();
const Order = require('../models/Order');
const Merch = require('../models/Merch');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const sendEmail = require('../utils/sendEmail');
const { getNotificationTemplate } = require('../utils/emailTemplates');

// CREATE
router.post('/', verifyToken, async (req, res) => {
    try {
        // Idempotency Check for Payment ID
        if (req.body.paymentId) {
            const existingOrder = await Order.findOne({ paymentId: req.body.paymentId });
            if (existingOrder) {
                return res.status(200).json(existingOrder);
            }
        }

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
            status: req.body.status || 'pending',
            paymentMethod: req.body.paymentMethod,
            paymentStatus: req.body.paymentStatus,
            paymentId: req.body.paymentId
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
        const originalOrder = await Order.findById(req.params.id);
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        ).populate('user');

        // --- NOTIFICATION LOGIC ---
        // Only notify if status changed and user exists (not a guest/walk-in)
        if (originalOrder.status !== updatedOrder.status && updatedOrder.user) {
            const user = await User.findById(updatedOrder.user._id);
            if (user) {
                const prefs = user.notificationPreferences || { email: true, inApp: true };
                const io = req.app.get('io');
                const message = `Your order #${updatedOrder._id.toString().slice(-6)} is now ${updatedOrder.status}.`;

                if (prefs.inApp) {
                     const notif = new Notification({
                        recipient: user._id,
                        type: 'order',
                        title: 'Order Updated',
                        message: message,
                        relatedId: updatedOrder._id
                     });
                     await notif.save();

                     if (io) {
                        io.to(user._id.toString()).emit('receive_notification', {
                            title: 'Order Updated',
                            message: message
                        });
                     }
                }

                if (prefs.email) {
                    const emailHtml = getNotificationTemplate(
                        'Order Status Update',
                        message,
                        `${process.env.CLIENT_URL || 'http://localhost:3000'}/student/cart`, // Link to order history/cart
                        'View Order'
                    );

                    sendEmail({
                        email: user.email,
                        subject: `Order Update: ${updatedOrder.status}`,
                        html: emailHtml
                    }).catch(err => console.error(err));
                }
            }
        }

        res.status(200).json(updatedOrder);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
