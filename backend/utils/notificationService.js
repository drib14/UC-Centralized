const Notification = require('../models/Notification');
const User = require('../models/User');
const sendEmail = require('./sendEmail');
const { getNotificationEmail } = require('./emailTemplates');

const notifyUser = async (userId, type, content, relatedId, link = null, shouldSendEmail = true, req = null, senderId = null) => {
    try {
        const user = await User.findById(userId);
        if (!user) return;

        // 1. Create DB Notification
        const notification = new Notification({
            recipient: userId,
            type,
            content,
            relatedId,
            sender: senderId
        });
        await notification.save();

        // 2. Socket Emit
        if (req && req.app) {
            const io = req.app.get('io');
            if (io) {
                const populatedNotif = await Notification.findById(notification._id).populate('sender', 'firstName lastName profileImage');

                io.emit('new_notification', {
                    _id: populatedNotif._id,
                    recipientId: userId,
                    type,
                    content,
                    relatedId,
                    sender: populatedNotif.sender,
                    createdAt: populatedNotif.createdAt
                });
            }
        }

        // 3. Email (with dynamic URL resolution)
        if (shouldSendEmail && user.email && user.notificationPreferences?.email !== false) {
            const emailHtml = getNotificationEmail(
                user.firstName,
                type.charAt(0).toUpperCase() + type.slice(1),
                content,
                link || '/student/dashboard',
                req
            );

            await sendEmail({
                email: user.email,
                subject: `UC-Central Notice: ${type.charAt(0).toUpperCase() + type.slice(1)}`,
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
        console.error("Notify Admins Error:", err);
    }
};

const notifyAllStudents = async (type, content, relatedId, link, req) => {
    try {
        const students = await User.find({ role: 'student' });

        // Bulk Insert Notifications
        const notificationsData = students.map(s => ({
            recipient: s._id,
            type,
            content,
            relatedId
        }));
        await Notification.insertMany(notificationsData);

        // Socket Broadcast
        if (req && req.app) {
            const io = req.app.get('io');
            if (io) {
                io.emit('broadcast_notification', {
                    role: 'student',
                    type,
                    content,
                    relatedId,
                    createdAt: new Date()
                });
            }
        }

        // Send Email with Dynamic CTA to all students (awaited with Promise.allSettled for serverless reliability)
        const emailPromises = students
            .filter(user => user.email && user.notificationPreferences?.email !== false)
            .map(async (user) => {
                try {
                    const emailHtml = getNotificationEmail(
                        user.firstName,
                        type.charAt(0).toUpperCase() + type.slice(1),
                        content,
                        link || '/student/dashboard',
                        req
                    );
                    await sendEmail({
                        email: user.email,
                        subject: `UC-Central: ${type.charAt(0).toUpperCase() + type.slice(1)} Notice`,
                        html: emailHtml
                    });
                } catch (e) {
                    console.error("Email delivery failed for", user.email, e.message);
                }
            });

        await Promise.allSettled(emailPromises);

    } catch (err) {
        console.error("Notify All Students Error:", err);
    }
};

module.exports = { notifyUser, notifyAdmins, notifyAllStudents };
