const router = require('express').Router();
const User = require('../models/User');
const { verifyAdmin } = require('../middleware/auth');

router.get('/', verifyAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'student' }).select('-password');
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json("User deleted");
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
