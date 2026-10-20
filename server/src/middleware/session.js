import crypto from 'node:crypto';
import { db } from '../db/pool.js';
import { config } from '../config/env.js';

export const COOKIE_NAME = 'argus_session';

export function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateCsrfToken(rawToken) {
    return crypto.createHmac('sha256', config.sessionSecret).update(rawToken).digest('hex');
}

export async function sessionMiddleware(req, res, next) {
    const rawToken = req.cookies?.[COOKIE_NAME];

    if (!rawToken) {
        req.user = null;
        return next();
    }

    try {
        const tokenHash = hashToken(rawToken);

        // SECURITY: Live database lookup ensures instant revocation
        const result = await db.query(`
            SELECT 
                s.id AS session_id,
                s.user_id,
                s.expires_at,
                u.email,
                u.full_name,
                u.role,
                u.department,
                u.is_active
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token_hash = $1 AND s.expires_at > NOW()
            LIMIT 1;
        `, [tokenHash]);

        if (result.rows.length === 0) {
            // Session expired or revoked
            res.clearCookie(COOKIE_NAME, {
                httpOnly: true,
                secure: config.isProduction,
                sameSite: 'strict',
                path: '/'
            });
            req.user = null;
            return next();
        }

        const sessionUser = result.rows[0];

        // SECURITY: Immediate lockout if user account was disabled
        if (!sessionUser.is_active) {
            res.clearCookie(COOKIE_NAME, {
                httpOnly: true,
                secure: config.isProduction,
                sameSite: 'strict',
                path: '/'
            });
            req.user = null;
            return next();
        }

        req.user = {
            id: sessionUser.user_id,
            sessionId: sessionUser.session_id,
            email: sessionUser.email,
            fullName: sessionUser.full_name,
            role: sessionUser.role,
            department: sessionUser.department
        };
        req.rawSessionToken = rawToken;
        req.csrfToken = generateCsrfToken(rawToken);

        next();
    } catch (err) {
        console.error('Session middleware error:', err);
        req.user = null;
        next();
    }
}

export function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required. Please log in.'
        });
    }
    next();
}

export function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden. You do not possess the required role permissions.'
            });
        }
        next();
    };
}
