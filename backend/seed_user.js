const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seed = async () => {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");

        // Create Admin
        const adminExists = await User.findOne({ email: 'admin@test.com' });
        if (!adminExists) {
            console.log("Creating Admin...");
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            await User.create({
                firstName: 'Admin',
                lastName: 'User',
                studentId: '999999',
                email: 'admin@test.com',
                password: hashedPassword,
                role: 'admin',
                isOnline: false
            });
            console.log("Admin created");
        } else {
            console.log("Admin already exists");
        }

        // Create Student
        const studentExists = await User.findOne({ email: 'student@test.com' });
        if (!studentExists) {
             console.log("Creating Student...");
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            await User.create({
                firstName: 'Test',
                lastName: 'Student',
                studentId: '123456',
                email: 'student@test.com',
                password: hashedPassword,
                role: 'student',
                isOnline: false
            });
             console.log("Student created");
        } else {
            console.log("Student already exists");
        }

        // Create Another Student for chat
        const student2Exists = await User.findOne({ email: 'student2@test.com' });
        if (!student2Exists) {
             console.log("Creating Student 2...");
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            await User.create({
                firstName: 'Alice',
                lastName: 'Wonderland',
                studentId: '654321',
                email: 'student2@test.com',
                password: hashedPassword,
                role: 'student',
                isOnline: false
            });
             console.log("Student 2 created");
        } else {
             console.log("Student 2 already exists");
        }

        console.log("Done");
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

seed();
