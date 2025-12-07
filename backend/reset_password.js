const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const updatePassword = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = require('./models/User');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Test@123', salt);

        await User.updateOne({ studentId: '25009381' }, { password: hashedPassword });
        console.log("Password updated");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

updatePassword();
