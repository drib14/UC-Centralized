const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * Ensures a default admin account exists in the database.
 * If no admin user exists (by role or email/ID), it creates the default admin.
 */
const seedDefaultAdmin = async () => {
    try {
        const adminId = process.env.DEFAULT_ADMIN_ID || '999999';
        const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@uc.edu.ph').toLowerCase();
        const rawPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'password123';

        // Check if admin already exists by email, studentId, or role
        const adminExists = await User.findOne({
            $or: [
                { email: adminEmail },
                { studentId: adminId },
                { role: 'admin' }
            ]
        });

        if (!adminExists) {
            console.log('[SEED] No admin user detected. Creating default admin account...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(rawPassword, salt);

            await User.create({
                firstName: 'System',
                lastName: 'Admin',
                studentId: adminId,
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                department: 'CCS',
                program: 'Administration',
                year: 'N/A',
                isOnline: false
            });

            console.log(`[SEED] Default admin created successfully (ID: ${adminId}, Email: ${adminEmail}).`);
        } else {
            console.log(`[SEED] Admin account verified (Role: admin found).`);
        }

        // Check and Seed Default Departments if none exist
        const Department = require('../models/Department');
        const deptCount = await Department.countDocuments();
        if (deptCount === 0) {
            console.log('[SEED] No departments found. Creating default campus departments...');
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
            console.log(`[SEED] ${defaultDepts.length} default campus departments created.`);
        }
    } catch (err) {
        console.error('[SEED ERROR] Failed to seed default admin / departments:', err.message || err);
    }
};

module.exports = { seedDefaultAdmin };
