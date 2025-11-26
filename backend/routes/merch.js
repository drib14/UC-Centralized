/**
 * @swagger
 * tags:
 *   name: Merch
 *   description: API for managing merchandise
 */
const router = require('express').Router();
const Merch = require('../models/Merch');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const parser = require('../config/cloudinary');

// CREATE
router.post('/', verifyAdmin, parser.single('image'), async (req, res) => {
    try {
        let merchData = { ...req.body };

        // Parse variants if they come as a string (from FormData)
        if (typeof merchData.variants === 'string') {
            try {
                merchData.variants = JSON.parse(merchData.variants);
            } catch (e) {
                merchData.variants = [];
            }
        }

        // Calculate total stock if category is wearable
        if (merchData.category === 'wearable' && Array.isArray(merchData.variants)) {
            merchData.stock = merchData.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
        }

        const newMerch = new Merch({
            ...merchData,
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

        // Parse variants if string
        if (typeof updateData.variants === 'string') {
            try {
                updateData.variants = JSON.parse(updateData.variants);
            } catch (e) {
                // Keep existing variants if parse fails? Or empty?
                // Better to delete if invalid or just ignore
                delete updateData.variants;
            }
        }

        // Recalculate stock if variants are present and category is wearable
        if (updateData.category === 'wearable' && Array.isArray(updateData.variants)) {
            updateData.stock = updateData.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
        }

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
