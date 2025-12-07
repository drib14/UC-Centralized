const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected");
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const findUser = async () => {
    await connectDB();
    const User = require('./models/User');
    const users = await User.find({ role: 'student' }).limit(1);
    if (users.length > 0) {
        console.log(JSON.stringify(users[0]));
    } else {
        console.log("No student found");
    }
    process.exit();
};

findUser();
