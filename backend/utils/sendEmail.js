const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;

  if (!user || !pass) {
    console.warn('[EMAIL WARNING] Email credentials are not configured in environment variables. Email skipping.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: user,
      pass: pass.replace(/\s+/g, ''), // strip spaces from app password if present
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  const mailOptions = {
    from: `"UC-Central" <${user}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SUCCESS] Sent to ${options.email} (ID: ${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[EMAIL ERROR] Failed to send to ${options.email}:`, err.message || err);
    throw err;
  }
};

module.exports = sendEmail;
