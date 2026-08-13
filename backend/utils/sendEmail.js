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

  const path = require('path');
  const fs = require('fs');
  const attachments = [];
  const logoPath = path.join(__dirname, 'logo.png');
  if (fs.existsSync(logoPath)) {
    attachments.push({
      filename: 'uc-central-logo.png',
      path: logoPath,
      cid: 'uc_central_logo' // matches <img src="cid:uc_central_logo" />
    });
  }

  const mailOptions = {
    from: `"UC-Central" <${user}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
    attachments: attachments
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
