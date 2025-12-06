const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('./sendEmail');
const { getNotificationEmail } = require('./emailTemplates');

const notifyUser = async (userId, type, content, relatedId, link = null, shouldSendEmail = true, req = null) => {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        // 1. Create DB Notification
        const notification = new Notification({
            recipient: userId,
            type,
            content,
            relatedId
        });
        await notification.save();

        // 2. Socket Emit
        if (req) {
            const io = req.app.get('io');
            // Check if user is online? We emit to specific room or just filter on client?
            // Assuming socket is setup with user IDs as rooms or global broadcast
            // Based on earlier context, we might emit to a user-specific room if available, or broadcast.
            // Let's check how 'receive_message' works. Usually io.to(userId).emit...
            // If room logic isn't robust, we might emit global 'new_notification' and client filters.
            // But let's try to be specific if possible.
            // Fallback: Emit 'new_notification' with recipientId data.
            io.emit('new_notification', {
                _id: notification._id,
                recipientId: userId,
                type,
                content,
                relatedId,
                createdAt: notification.createdAt
            });
        }

        // 3. Email
        if (shouldSendEmail && user.email && user.notificationPreferences?.email !== false) {
            const emailHtml = getNotificationEmail(
                user.firstName,
                type.charAt(0).toUpperCase() + type.slice(1), // Capitalize
                content,
                link || process.env.CLIENT_URL || 'http://localhost:5173'
            );

            await sendEmail({
                email: user.email,
                subject: `New Notification: ${type}`,
                html: emailHtml
            });
        }

    } catch (err) {
        console.error("Notification Service Error:", err);
    }
};

const notifyAdmins = async (type, content, relatedId, link, req) => {
    try {
        const admins = await User.find({ role: 'admin' });
        for (const admin of admins) {
            await notifyUser(admin._id, type, content, relatedId, link, true, req);
        }
    } catch (err) {
        console.error(err);
    }
};

const notifyAllStudents = async (type, content, relatedId, link, req) => {
    try {
        const students = await User.find({ role: 'student' });
        // Optimization: Create DB entries in bulk, but for emails/sockets, loop is safer for now.
        // For strict real-time, individual sockets are best.

        // Bulk Insert Notifications
        const notificationsData = students.map(s => ({
            recipient: s._id,
            type,
            content,
            relatedId
        }));
        const savedNotifications = await Notification.insertMany(notificationsData);

        // Socket Emit (Global/Batch)
        // If we emit once with "all students", clients can check their role.
        // But reusing 'new_notification' with recipientId is standard.
        // We'll emit one event that says "broadcast to students" if possible, or loop.
        // Looping 1000 users for socket might be slow.
        // Better: emit 'broadcast_notification' { role: 'student', ... }
        if (req) {
            const io = req.app.get('io');
            io.emit('broadcast_notification', {
                role: 'student',
                type,
                content,
                relatedId,
                createdAt: new Date()
            });
        }

        // Emails (Async loop)
        students.forEach(user => {
            if (user.email && user.notificationPreferences?.email !== false) {
                const emailHtml = getNotificationEmail(
                    user.firstName,
                    type.charAt(0).toUpperCase() + type.slice(1),
                    content,
                    link || process.env.CLIENT_URL
                );
                sendEmail({
                    email: user.email,
                    subject: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
                    html: emailHtml
                }).catch(e => console.error("Email failed", e));
            }
        });

    } catch (err) {
        console.error(err);
    }
};

module.exports = { notifyUser, notifyAdmins, notifyAllStudents };
