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

// Strict limiter for OTP generation and verification (Anti-SMS/Email Bombing & Brute Force)
export const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 OTP requests per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many OTP requests from this IP. Please wait 15 minutes before requesting a new code.'
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

