const getBaseTemplate = (content) => {
    const year = new Date().getFullYear();
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #003399 0%, #001f5c 100%); color: #ffffff; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; letter-spacing: 1px; }
            .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
            .btn { display: inline-block; padding: 12px 24px; background-color: #FFCC00; color: #003399; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #888888; border-top: 1px solid #eeeeee; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>UC-Central</h1>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                &copy; ${year} UC-Central School System. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    `;
};

const getResetPasswordTemplate = (resetUrl) => {
    const content = `
        <h2>Password Reset Request</h2>
        <p>You recently requested to reset your password for your UC-Central account.</p>
        <p>Please click the button below to reset it:</p>
        <div style="text-align: center;">
            <a href="${resetUrl}" class="btn">Reset Password</a>
        </div>
        <p style="margin-top: 30px; font-size: 13px; color: #666;">If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
    `;
    return getBaseTemplate(content);
};

const getNotificationTemplate = (title, message, actionUrl = null, actionText = 'View Details') => {
    let actionButton = '';
    if (actionUrl) {
        actionButton = `
        <div style="text-align: center;">
            <a href="${actionUrl}" class="btn">${actionText}</a>
        </div>`;
    }

    const content = `
        <h2>${title}</h2>
        <p>${message}</p>
        ${actionButton}
    `;
    return getBaseTemplate(content);
};

module.exports = {
    getResetPasswordTemplate,
    getNotificationTemplate
};
