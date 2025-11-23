const router = require('express').Router();
const User = require('../models/User');
const Order = require('../models/Order');
const Event = require('../models/Event');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

router.get('/dashboard', verifyAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Stats
        const userCount = await User.countDocuments({ role: 'student' });
        const activeOrders = await Order.countDocuments({ status: { $in: ['pending', 'processing'] } });
        const eventCount = await Event.countDocuments({ date: { $gte: today } });

        // Total Sales (Claimed orders)
        const sales = await Order.aggregate([
            { $match: { status: 'claimed' } },
            { $group: { _id: null, total: { $sum: "$totalPrice" } } }
        ]);
        const totalSales = sales.length > 0 ? sales[0].total : 0;

        // Recent Orders
        const recentOrders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'firstName lastName name studentId');

        res.status(200).json({
            userCount,
            activeOrders,
            eventCount,
            totalSales,
            recentOrders
        });
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
});

module.exports = router;
