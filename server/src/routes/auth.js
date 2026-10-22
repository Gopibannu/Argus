import { Router } from 'express';
import { authService } from '../services/authService.js';
import { COOKIE_NAME, requireAuth } from '../middleware/session.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import { config } from '../config/env.js';

const router = Router();

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({
            error: 'Email and password are required.'
        });
    }

    try {
        const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Unknown';

        const { user, rawToken, csrfToken, expiresAt } = await authService.login(
            email,
            password,
            clientIp,
            userAgent
        );

        // Set HttpOnly, Secure, SameSite=Strict cookie
        res.cookie(COOKIE_NAME, rawToken, {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'strict',
            path: '/',
            expires: expiresAt
        });

        res.json({
            message: 'Authentication successful.',
            user,
            csrfToken
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/initiate-register (Step 1: Validate & Send OTP with Strict Rate Limiting)
router.post('/initiate-register', otpLimiter, async (req, res, next) => {
    // SECURITY: Whitelist permitted fields only to block mass assignment / role self-escalation
    const { email, password, fullName, department } = req.body || {};

    try {
        const result = await authService.initiateRegister({
            email,
            password,
            fullName,
            department
        });

        res.json({
            message: result.message,
            email: result.email,
            mode: result.mode,
            demoOtp: result.demoOtp
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/verify-register (Step 2: Verify OTP & Establish Session)
router.post('/verify-register', otpLimiter, async (req, res, next) => {
    const { email, otp } = req.body || {};


    try {
        const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Unknown';

        const { user, rawToken, csrfToken, expiresAt } = await authService.verifyOtpAndRegister(
            { email, otp },
            clientIp,
            userAgent
        );

        res.cookie(COOKIE_NAME, rawToken, {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'strict',
            path: '/',
            expires: expiresAt
        });

        res.status(201).json({
            message: 'Email verified successfully. Welcome to Argus.',
            user,
            csrfToken
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/register (Direct registration fallback)
router.post('/register', authLimiter, async (req, res, next) => {
    const { email, password, fullName, role, department } = req.body || {};

    try {
        const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Unknown';

        const { user, rawToken, csrfToken, expiresAt } = await authService.register(
            { email, password, fullName, role, department },
            clientIp,
            userAgent
        );

        res.cookie(COOKIE_NAME, rawToken, {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'strict',
            path: '/',
            expires: expiresAt
        });

        res.status(201).json({
            message: 'Registration successful. Session established.',
            user,
            csrfToken
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res, next) => {
    try {
        await authService.logout(req.rawSessionToken);

        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'strict',
            path: '/'
        });

        res.json({ message: 'Logged out successfully.' });
    } catch (err) {
        next(err);
    }
});

// POST /api/auth/logout-all (Invalidates all sessions across devices)
router.post('/logout-all', requireAuth, async (req, res, next) => {
    try {
        await authService.logoutAll(req.user.id);

        res.clearCookie(COOKIE_NAME, {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'strict',
            path: '/'
        });

        res.json({ message: 'All active sessions terminated.' });
    } catch (err) {
        next(err);
    }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    if (!req.user) {
        return res.json({
            authenticated: false,
            user: null,
            csrfToken: null
        });
    }

    res.json({
        authenticated: true,
        user: req.user,
        csrfToken: req.csrfToken
    });
});

export default router;
