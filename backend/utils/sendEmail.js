const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Or use generic SMTP host/port
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: `UC Central <${process.env.EMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            html: options.html
        };

        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully to:", options.to);
    } catch (error) {
        console.error("Email send failed:", error);
        // Do not throw, just log, to prevent crashing main flows
    }
};

module.exports = sendEmail;
