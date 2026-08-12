const router = require('express').Router();
const Department = require('../models/Department');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const mongoose = require('mongoose');

// GET ALL DEPARTMENTS (Accessible to any authenticated user or public for registration)
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find({ isActive: true }).sort({ code: 1 });
        res.status(200).json(departments);
    } catch (err) {
        console.error("Get Departments Error:", err);
        res.status(500).json({ message: "Failed to fetch departments" });
    }
});

// GET ALL (Including Inactive - Admin Only)
router.get('/all', verifyAdmin, async (req, res) => {
    try {
        const departments = await Department.find().sort({ code: 1 });
        res.status(200).json(departments);
    } catch (err) {
        console.error("Get All Departments Error:", err);
        res.status(500).json({ message: "Failed to fetch all departments" });
    }
});

// CREATE DEPARTMENT (Admin Only)
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { code, name, description, color } = req.body;

        if (!code || !name) {
            return res.status(400).json({ message: "Department code and name are required." });
        }

        const formattedCode = String(code).trim().toUpperCase();

        const existing = await Department.findOne({ code: formattedCode });
        if (existing) {
            return res.status(400).json({ message: `Department code ${formattedCode} already exists.` });
        }

        const newDept = new Department({
            code: formattedCode,
            name: String(name).trim(),
            description: description ? String(description).trim() : '',
            color: color || '#003399',
            createdBy: req.user.id
        });

        const saved = await newDept.save();
        res.status(201).json(saved);
    } catch (err) {
        console.error("Create Department Error:", err);
        res.status(500).json({ message: "Failed to create department" });
    }
});

// UPDATE DEPARTMENT (Admin Only)
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid department ID" });
        }

        const { code, name, description, color, isActive } = req.body;
        const updateData = {};

        if (code) updateData.code = String(code).trim().toUpperCase();
        if (name) updateData.name = String(name).trim();
        if (description !== undefined) updateData.description = String(description).trim();
        if (color) updateData.color = color;
        if (isActive !== undefined) updateData.isActive = isActive;

        const updated = await Department.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        if (!updated) return res.status(404).json({ message: "Department not found" });

        res.status(200).json(updated);
    } catch (err) {
        console.error("Update Department Error:", err);
        res.status(500).json({ message: "Failed to update department" });
    }
});

// DELETE DEPARTMENT (Admin Only)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid department ID" });
        }

        const deleted = await Department.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Department not found" });

        res.status(200).json({ message: "Department deleted successfully" });
    } catch (err) {
        console.error("Delete Department Error:", err);
        res.status(500).json({ message: "Failed to delete department" });
    }
});

module.exports = router;
