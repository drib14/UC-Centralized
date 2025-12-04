const getNotificationEmail = (name, type, content, link) => {
    const year = new Date().getFullYear();
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #003399 0%, #0056b3 100%); color: white; padding: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
            .btn { display: inline-block; background-color: #FFCC00; color: #003399; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
            .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New ${type} Alert</h1>
            </div>
            <div class="content">
                <h2>Hello ${name},</h2>
                <p>You have a new notification from UC-Central.</p>
                <div style="background: #f1f3f5; padding: 15px; border-left: 4px solid #003399; margin: 20px 0;">
                    ${content}
                </div>
                <p>Stay updated with the latest happenings at UC.</p>
                <a href="${link}" class="btn">View Details</a>
            </div>
            <div class="footer">
                <p>&copy; ${year} UC-Central. All rights reserved.</p>
                <p>University of Cebu</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { getNotificationEmail };
