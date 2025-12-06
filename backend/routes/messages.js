const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');

// Placeholder routes to stop 404/500 errors if frontend still tries to hit them
router.get('/conversations', verifyToken, (req, res) => res.json([]));
router.get('/unread-count', verifyToken, (req, res) => res.json({ count: 0 }));
router.get('/search/global', verifyToken, (req, res) => res.json({ users: [], messages: [] }));
router.get('/:id', verifyToken, (req, res) => res.json([]));
router.post('/', verifyToken, (req, res) => res.status(503).json({ message: "Messaging disabled" }));

module.exports = router;
