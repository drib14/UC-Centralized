const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seed = async () => {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected.");

        const salt = await bcrypt.genSalt(10);
        const defaultPassword = await bcrypt.hash('password123', salt);

        // 1. Create Default Main Campus Admin (admin@uc.edu.ph / ID: 999999)
        const adminEmail = 'admin@uc.edu.ph';
        const adminId = '999999';
        const adminExists = await User.findOne({
            $or: [{ email: adminEmail }, { studentId: adminId }, { email: 'admin@test.com' }]
        });

        if (!adminExists) {
            console.log("Creating Default Admin...");
            await User.create({
                firstName: 'System',
                lastName: 'Admin',
                studentId: adminId,
                email: adminEmail,
                password: defaultPassword,
                role: 'admin',
                department: 'CCS',
                program: 'Administration',
                year: 'N/A',
                isOnline: false
            });
            console.log(`Default Admin created: ID ${adminId}, Email ${adminEmail}, Password: password123`);
        } else {
            console.log("Admin account already exists:", adminExists.email);
        }

        // 2. Create Default Student
        const studentExists = await User.findOne({ email: 'student@test.com' });
        if (!studentExists) {
            console.log("Creating Student...");
            await User.create({
                firstName: 'Test',
                lastName: 'Student',
                studentId: '123456',
                email: 'student@test.com',
                password: defaultPassword,
                role: 'student',
                department: 'CCS',
                program: 'BSIT',
                year: '3',
                isOnline: false
            });
            console.log("Student created: ID 123456, Email student@test.com, Password: password123");
        } else {
            console.log("Student already exists");
        }

        // 3. Create Another Student for chat testing
        const student2Exists = await User.findOne({ email: 'student2@test.com' });
        if (!student2Exists) {
            console.log("Creating Student 2...");
            await User.create({
                firstName: 'Alice',
                lastName: 'Wonderland',
                studentId: '654321',
                email: 'student2@test.com',
                password: defaultPassword,
                role: 'student',
                department: 'CCS',
                program: 'BSCS',
                year: '2',
                isOnline: false
            });
            console.log("Student 2 created: ID 654321, Email student2@test.com, Password: password123");
        } else {
            console.log("Student 2 already exists");
        }

        // 4. Create Default Departments
        const deptCount = await Department.countDocuments();
        if (deptCount === 0) {
            console.log("Creating Default Departments...");
            const defaultDepts = [
                { code: 'CCS', name: 'College of Computer Studies', description: 'Information Technology, Computer Science', color: '#003399' },
                { code: 'CBA', name: 'College of Business Administration', description: 'Business Administration, Accountancy', color: '#cc8800' },
                { code: 'CAS', name: 'College of Arts and Sciences', description: 'Arts, Sciences, Psychology, Communication', color: '#008844' },
                { code: 'CEA', name: 'College of Engineering and Architecture', description: 'Civil, Mechanical, Electrical Engineering, Architecture', color: '#cc4400' },
                { code: 'CCJ', name: 'College of Criminal Justice', description: 'Criminology, Law Enforcement', color: '#333333' },
                { code: 'COED', name: 'College of Education', description: 'Elementary and Secondary Education', color: '#660099' },
                { code: 'CN', name: 'College of Nursing', description: 'Nursing and Allied Health Sciences', color: '#009999' },
                { code: 'CHMT', name: 'College of Hospitality and Management', description: 'Hospitality and Tourism Management', color: '#996633' }
            ];
            await Department.insertMany(defaultDepts);
            console.log("Departments created");
        } else {
            console.log("Departments already exist in DB");
        }

        console.log("Seeding complete!");
        if (require.main === module) {
            process.exit(0);
        }
    } catch (e) {
        console.error("Seeding error:", e);
        if (require.main === module) {
            process.exit(1);
        }
    }
};

if (require.main === module) {
    seed();
}

module.exports = seed;
