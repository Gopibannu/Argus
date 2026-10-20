import { generateCsrfToken } from './session.js';

export function csrfProtection(req, res, next) {
    // 1. Safe HTTP methods do not alter state
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // 2. Unauthenticated requests (e.g. login) do not use session CSRF
    if (!req.user || !req.rawSessionToken) {
        return next();
    }

    // 3. Verify CSRF token header against session-derived HMAC
    const clientToken = req.headers['x-csrf-token'];
    const expectedToken = generateCsrfToken(req.rawSessionToken);

    if (!clientToken || clientToken !== expectedToken) {
        return res.status(403).json({
            error: 'CSRF token mismatch or missing. Action rejected for your security.'
        });
    }

    next();
}
