const router = require('express').Router();
const Merch = require('../models/Merch');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const parser = require('../config/cloudinary');

// CREATE
router.post('/', verifyAdmin, parser.single('image'), async (req, res) => {
    try {
        const newMerch = new Merch({
            ...req.body,
            image: req.file ? req.file.path : ''
        });
        const savedMerch = await newMerch.save();
        res.status(200).json(savedMerch);
    } catch (err) {
        console.log(err);
        res.status(500).json(err);
    }
});

// GET ALL
router.get('/', verifyToken, async (req, res) => {
    try {
        const merch = await Merch.find();
        res.status(200).json(merch);
    } catch (err) {
        res.status(500).json(err);
    }
});

// DELETE
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        await Merch.findByIdAndDelete(req.params.id);
        res.status(200).json("Merch has been deleted...");
    } catch (err) {
        res.status(500).json(err);
    }
});

// UPDATE
router.put('/:id', verifyAdmin, parser.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.image = req.file.path;

        const updatedMerch = await Merch.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );
        res.status(200).json(updatedMerch);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
