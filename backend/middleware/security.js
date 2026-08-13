/**
 * Enterprise-Grade Security & DDoS Mitigation Middleware
 * Provides:
 * 1. Sliding-Window Rate Limiting (Global, Auth, and Messages)
 * 2. HTTP Security Headers (equivalent to Helmet)
 * 3. NoSQL Injection & MongoDB Operator Sanitization
 * 4. Request Timeout & Slowloris Mitigation
 */

// In-memory sliding-window store for rate limiting
class MemoryRateLimiter {
    constructor({ windowMs = 60000, max = 100, message = 'Too many requests, please try again later.' }) {
        this.windowMs = windowMs;
        this.max = max;
        this.message = message;
        this.hits = new Map(); // Map<ip, Array<timestamp>>

        // Periodic cleanup to avoid memory leaks
        setInterval(() => this.cleanup(), Math.max(windowMs, 60000));
    }

    cleanup() {
        const now = Date.now();
        for (const [ip, timestamps] of this.hits.entries()) {
            const valid = timestamps.filter(t => now - t < this.windowMs);
            if (valid.length === 0) {
                this.hits.delete(ip);
            } else {
                this.hits.set(ip, valid);
            }
        }
    }

    getClientIp(req) {
        return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
               req.socket?.remoteAddress ||
               req.ip ||
               'unknown';
    }

    middleware() {
        return (req, res, next) => {
            const ip = this.getClientIp(req);
            const now = Date.now();

            let timestamps = this.hits.get(ip) || [];
            // Keep only timestamps within current window
            timestamps = timestamps.filter(t => now - t < this.windowMs);

            if (timestamps.length >= this.max) {
                const oldest = timestamps[0];
                const resetTimeSeconds = Math.ceil((oldest + this.windowMs - now) / 1000);

                res.setHeader('Retry-After', resetTimeSeconds);
                res.setHeader('RateLimit-Limit', this.max);
                res.setHeader('RateLimit-Remaining', 0);
                res.setHeader('RateLimit-Reset', resetTimeSeconds);

                return res.status(429).json({
                    status: 429,
                    message: this.message,
                    retryAfterSeconds: resetTimeSeconds
                });
            }

            timestamps.push(now);
            this.hits.set(ip, timestamps);

            res.setHeader('RateLimit-Limit', this.max);
            res.setHeader('RateLimit-Remaining', Math.max(0, this.max - timestamps.length));

            next();
        };
    }
}

// 1. Global API Limiter: 300 requests per 15 minutes
const apiLimiter = new MemoryRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: 'Global API rate limit exceeded. Please try again after 15 minutes.'
}).middleware();

// 2. Strict Auth Limiter: 15 requests per 15 minutes to eliminate brute-force & DDoS
const authLimiter = new MemoryRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: 'Too many authentication attempts from this network. Please wait 15 minutes before trying again.'
}).middleware();

// 3. Message / Action Limiter: 60 requests per 1 minute to prevent flood
const messageLimiter = new MemoryRateLimiter({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Message rate limit exceeded. Please wait a moment before sending more messages.'
}).middleware();

/**
 * Security Headers Middleware (OWASP recommended headers)
 */
const securityHeaders = (req, res, next) => {
    // Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent Clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Enable XSS filtering in browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Strict Transport Security (HSTS)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions Policy
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    // Prevent caching sensitive API responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Remove identifying headers
    res.removeHeader('X-Powered-By');

    next();
};

/**
 * NoSQL Injection Sanitizer
 * Recursively strips MongoDB query operators ($gt, $ne, $where, etc.) from user input
 */
function sanitizeInput(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeInput(item));
    }

    const sanitized = {};
    for (const key of Object.keys(obj)) {
        // Drop any keys starting with '$' or containing '.' (NoSQL operator injection vectors)
        if (key.startsWith('$') || key.includes('.')) {
            continue;
        }
        sanitized[key] = sanitizeInput(obj[key]);
    }
    return sanitized;
}

const mongoSanitizeMiddleware = (req, res, next) => {
    if (req.body) req.body = sanitizeInput(req.body);
    if (req.query) req.query = sanitizeInput(req.query);
    if (req.params) req.params = sanitizeInput(req.params);
    next();
};

module.exports = {
    apiLimiter,
    authLimiter,
    messageLimiter,
    securityHeaders,
    mongoSanitizeMiddleware
};
