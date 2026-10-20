import rateLimit from 'express-rate-limit';

// Strict limiter for authentication attempts (Anti-Brute Force & Credential Stuffing)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // Limit each IP to 15 login requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    }
});

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'API rate limit exceeded. Please slow down.'
    }
});
