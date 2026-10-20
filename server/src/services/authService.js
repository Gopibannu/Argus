import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db/pool.js';
import { hashToken, generateCsrfToken } from '../middleware/session.js';

// Dummy hash for constant-time comparisons when user is not found (anti-user enumeration)
const DUMMY_HASH = '$2a$12$e7kY7OQzXy7sZz1mO8v7.eaFz8Tz5bHj6b4.s4H6.7J1uL.M3wK8y';

export const authService = {
    async login(email, password, ipAddress = '127.0.0.1', userAgent = 'Unknown') {
        const cleanEmail = (email || '').trim().toLowerCase();

        // 1. Fetch user by email
        const result = await db.query(`
            SELECT id, email, password_hash, full_name, role, department, is_active
            FROM users
            WHERE email = $1
            LIMIT 1;
        `, [cleanEmail]);

        const user = result.rows[0];

        // 2. Constant-time timing mitigation: compare against dummy hash if user not found
        const hashToCompare = user ? user.password_hash : DUMMY_HASH;
        const passwordMatches = bcrypt.compareSync(password || '', hashToCompare);

        // 3. Generic authentication error (Prevents user enumeration)
        if (!user || !passwordMatches) {
            const err = new Error('Invalid email or password.');
            err.status = 401;
            throw err;
        }

        // 4. Inactive / disabled account check
        if (!user.is_active) {
            const err = new Error('Your account has been deactivated. Please contact your security administrator.');
            err.status = 401;
            throw err;
        }

        // 5. Generate cryptographically strong session token (32 random bytes)
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        // 6. Persist session in PostgreSQL
        await db.query(`
            INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6);
        `, [crypto.randomUUID(), user.id, tokenHash, ipAddress, userAgent, expiresAt]);

        const csrfToken = generateCsrfToken(rawToken);

        return {
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                department: user.department
            },
            rawToken,
            csrfToken,
            expiresAt
        };
    },

    async logout(rawToken) {
        if (!rawToken) return;
        const tokenHash = hashToken(rawToken);
        await db.query(`
            DELETE FROM sessions WHERE token_hash = $1;
        `, [tokenHash]);
    },

    async logoutAll(userId) {
        if (!userId) return;
        await db.query(`
            DELETE FROM sessions WHERE user_id = $1;
        `, [userId]);
    }
};
