/**
 * Dynamic URL Resolution & Professional Email Template Engine for UC-Central
 */

/**
 * Dynamically resolves the active frontend client URL based on request headers,
 * environment variables, and deployment domains to ensure email CTAs never break
 * or redirect to localhost on production deployments.
 */
const resolveClientUrl = (req, targetPath = '') => {
    let baseUrl = '';

    // 1. Check req origin or referer header
    if (req) {
        const origin = req.get ? req.get('origin') : (req.headers && req.headers.origin);
        if (origin && typeof origin === 'string' && origin.trim()) {
            baseUrl = origin.trim();
        } else {
            const referer = req.get ? req.get('referer') : (req.headers && req.headers.referer);
            if (referer && typeof referer === 'string') {
                try {
                    const parsed = new URL(referer);
                    baseUrl = parsed.origin;
                } catch (e) {}
            }
        }

        // If behind proxy/load balancer
        if (!baseUrl && req.headers) {
            const forwardedHost = req.headers['x-forwarded-host'] || req.headers['host'];
            const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
            if (forwardedHost) {
                baseUrl = `${forwardedProto}://${forwardedHost}`;
            }
        }
    }

    // 2. Fall back to process.env.CLIENT_URL or deployment environment
    if (!baseUrl || (baseUrl.includes('localhost') && process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost'))) {
        baseUrl = process.env.CLIENT_URL || process.env.VERCEL_URL || 'https://uc-central.vercel.app';
        if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
            baseUrl = `https://${baseUrl}`;
        }
    }

    // Strip trailing slashes
    baseUrl = baseUrl.replace(/\/+$/, '');

    // Normalize target path
    if (!targetPath) return baseUrl;
    const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;

    // If targetPath already includes http/https, replace origin if host was localhost
    if (targetPath.startsWith('http://') || targetPath.startsWith('https://')) {
        try {
            const parsedTarget = new URL(targetPath);
            if (parsedTarget.hostname.includes('localhost') && !baseUrl.includes('localhost')) {
                return `${baseUrl}${parsedTarget.pathname}${parsedTarget.search}`;
            }
            return targetPath;
        } catch (e) {
            return targetPath;
        }
    }

    return `${baseUrl}${cleanPath}`;
};

/**
 * Common Header with University of Cebu Seal & UC-Central Branding
 */
const getEmailHeader = (categoryTitle = 'Campus Notification', badgeColor = '#002b7f', badgeText = 'UC-CENTRAL BULLETIN') => {
    return `
    <!-- Header Block -->
    <tr>
        <td align="center" style="background: linear-gradient(135deg, #002b7f 0%, #001f5c 50%, #001238 100%); padding: 32px 24px; border-bottom: 4px solid #fbbf24; text-align: center;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto; text-align: center;">
                <tr>
                    <td align="center" style="padding-bottom: 12px;">
                        <!-- Logo Seal Emblem -->
                        <div style="display: inline-block; width: 68px; height: 68px; background: #ffffff; border-radius: 50%; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 2px solid #fbbf24;">
                            <img src="https://uc-central.vercel.app/uc-central-logo.png" alt="University of Cebu Seal" width="60" height="60" style="display: block; border-radius: 50%; width: 60px; height: 60px; object-fit: contain; margin: 0 auto;" />
                        </div>
                    </td>
                </tr>
                <tr>
                    <td align="center">
                        <span style="display: inline-block; background-color: #fbbf24; color: #001f5c; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 4px 14px; border-radius: 20px; margin-bottom: 8px;">
                            ${badgeText}
                        </span>
                        <h1 style="color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 800; margin: 6px 0 2px 0; letter-spacing: -0.5px;">
                            UNIVERSITY OF CEBU
                        </h1>
                        <p style="color: #cbd5e1; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; margin: 0; letter-spacing: 0.5px;">
                            ${categoryTitle}
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    `;
};

/**
 * Common Footer with Campus Info and Live Links
 */
const getEmailFooter = (req) => {
    const year = new Date().getFullYear();
    const portalUrl = resolveClientUrl(req, '/');

    return `
    <!-- Footer Block -->
    <tr>
        <td style="background-color: #f8fafc; padding: 28px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto; text-align: center;">
                <tr>
                    <td align="center" style="color: #64748b; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.6;">
                        <p style="margin: 0 0 6px 0; font-weight: 700; color: #334155;">
                            University of Cebu • UC-Central Portal
                        </p>
                        <p style="margin: 0 0 12px 0;">
                            Cebu City, Philippines • Quality Affordable Education
                        </p>
                        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                            &copy; ${year} UC-Centralized Campus Ecosystem. All rights reserved.
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    `;
};

/**
 * Dynamic Notification Email Template (Announcements, Events, Messages, Alerts)
 */
const getNotificationEmail = (name, type, content, rawLink, req = null) => {
    const dynamicCtaUrl = resolveClientUrl(req, rawLink || '/student/dashboard');
    const isSuspension = String(type).toLowerCase().includes('suspension') || String(content).toLowerCase().includes('suspension');

    const typeBadgeText = isSuspension ? '🚨 CLASS SUSPENSION ALERT' : `${String(type).toUpperCase()} BULLETIN`;
    const accentColor = isSuspension ? '#dc2626' : '#003399';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UC-Central Notification</title>
    </head>
    <body style="background-color: #f1f5f9; margin: 0; padding: 20px 0; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                        ${getEmailHeader('Campus Notification', accentColor, typeBadgeText)}
                        
                        <!-- Content Body -->
                        <tr>
                            <td style="padding: 36px 32px; color: #1e293b; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.65;">
                                <h2 style="color: #0f172a; font-size: 19px; font-weight: 700; margin: 0 0 14px 0;">
                                    Hello ${name || 'Student'},
                                </h2>
                                <p style="margin: 0 0 20px 0; color: #475569;">
                                    You have a new campus notification on your UC-Central account:
                                </p>
                                
                                <!-- Content Highlight Box -->
                                <div style="background-color: ${isSuspension ? '#fef2f2' : '#f8fafc'}; border-left: 5px solid ${accentColor}; padding: 20px; border-radius: 8px; margin: 24px 0; color: #1e293b; font-size: 15px; border-top: 1px solid ${isSuspension ? '#fecaca' : '#e2e8f0'}; border-right: 1px solid ${isSuspension ? '#fecaca' : '#e2e8f0'}; border-bottom: 1px solid ${isSuspension ? '#fecaca' : '#e2e8f0'};">
                                    <div style="font-weight: 700; color: ${accentColor}; margin-bottom: 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">
                                        Notification Details
                                    </div>
                                    <div style="white-space: pre-line; line-height: 1.6; color: #334155;">
                                        ${content}
                                    </div>
                                </div>
                                
                                <!-- Call to Action Button -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 10px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="${dynamicCtaUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #002b7f 0%, #001f5c 100%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 50px; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(0, 43, 127, 0.25); border: 2px solid #fbbf24;">
                                                Open in UC-Central Portal &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 16px;">
                                    Direct Link: <a href="${dynamicCtaUrl}" style="color: #002b7f; text-decoration: underline;">${dynamicCtaUrl}</a>
                                </p>
                            </td>
                        </tr>
                        
                        ${getEmailFooter(req)}
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

/**
 * Password Reset Verification Code Email Template
 */
const getPasswordResetEmail = (name, resetCode, rawLink, req = null) => {
    const dynamicResetUrl = resolveClientUrl(req, rawLink || '/verify-code');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - UC-Central</title>
    </head>
    <body style="background-color: #f1f5f9; margin: 0; padding: 20px 0; -webkit-font-smoothing: antialiased;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                        ${getEmailHeader('Account Security & Recovery', '#002b7f', 'PASSWORD RESET CODE')}
                        
                        <!-- Content Body -->
                        <tr>
                            <td style="padding: 36px 32px; color: #1e293b; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.65; text-align: center;">
                                <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">
                                    Password Reset Request
                                </h2>
                                <p style="margin: 0 0 24px 0; color: #475569;">
                                    Hello ${name || 'User'}, we received a request to reset your UC-Central account password. Enter the verification code below to proceed:
                                </p>
                                
                                <!-- 6-Digit Code Badge -->
                                <div style="display: inline-block; background: #001f5c; border: 2px solid #fbbf24; border-radius: 12px; padding: 16px 36px; margin: 10px 0 24px 0; box-shadow: 0 4px 12px rgba(0, 31, 92, 0.15);">
                                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #ffffff;">
                                        ${resetCode}
                                    </span>
                                </div>
                                
                                <p style="margin: 0 0 24px 0; color: #dc2626; font-size: 13px; font-weight: 600;">
                                    ⏱️ This code expires in 5 minutes.
                                </p>
                                
                                <!-- CTA Button -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 10px 0 20px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="${dynamicResetUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #002b7f 0%, #001f5c 100%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 50px; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(0, 43, 127, 0.25); border: 2px solid #fbbf24;">
                                                Enter Code & Reset Password &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                                    If you did not request this password reset, please ignore this email or contact the campus administrator.
                                </p>
                            </td>
                        </tr>
                        
                        ${getEmailFooter(req)}
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};

module.exports = {
    resolveClientUrl,
    getNotificationEmail,
    getPasswordResetEmail
};
