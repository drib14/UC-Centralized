const router = require('express').Router();
const Merch = require('../models/Merch');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const parser = require('../config/cloudinary');

const mongoose = require('mongoose');

// CREATE
router.post('/', verifyAdmin, parser.single('image'), async (req, res) => {
    try {
        let merchData = { ...req.body };

        if (!merchData.name || merchData.price === undefined) {
            return res.status(400).json({ message: "Merchandise name and price are required." });
        }

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
        } else {
            merchData.stock = Number(merchData.stock || 0);
        }

        const newMerch = new Merch({
            ...merchData,
            price: Number(merchData.price),
            image: req.file ? req.file.path : ''
        });
        const savedMerch = await newMerch.save();
        res.status(201).json(savedMerch);
    } catch (err) {
        console.error("Create Merch Error:", err);
        res.status(500).json({ message: "Failed to create merchandise item" });
    }
});

// GET ALL
router.get('/', verifyToken, async (req, res) => {
    try {
        const merch = await Merch.find();
        res.status(200).json(merch);
    } catch (err) {
        console.error("Get Merch Error:", err);
        res.status(500).json({ message: "Failed to fetch merchandise" });
    }
});

// DELETE
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid merchandise ID" });
        }
        const deleted = await Merch.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Merchandise not found" });
        res.status(200).json({ message: "Merchandise has been deleted" });
    } catch (err) {
        console.error("Delete Merch Error:", err);
        res.status(500).json({ message: "Failed to delete merchandise" });
    }
});

// UPDATE
router.put('/:id', verifyAdmin, parser.single('image'), async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid merchandise ID" });
        }
        const updateData = { ...req.body };
        if (req.file) updateData.image = req.file.path;

        // Parse variants if string
        if (typeof updateData.variants === 'string') {
            try {
                updateData.variants = JSON.parse(updateData.variants);
            } catch (e) {
                delete updateData.variants;
            }
        }

        // Recalculate stock if variants are present and category is wearable
        if (updateData.category === 'wearable' && Array.isArray(updateData.variants)) {
            updateData.stock = updateData.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
        } else if (updateData.stock !== undefined) {
            updateData.stock = Number(updateData.stock);
        }

        if (updateData.price !== undefined) {
            updateData.price = Number(updateData.price);
        }

        const updatedMerch = await Merch.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );
        if (!updatedMerch) return res.status(404).json({ message: "Merchandise not found" });
        res.status(200).json(updatedMerch);
    } catch (err) {
        console.error("Update Merch Error:", err);
        res.status(500).json({ message: "Failed to update merchandise" });
    }
});

module.exports = router;
