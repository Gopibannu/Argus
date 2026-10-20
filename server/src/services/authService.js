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

    async register({ email, password, fullName, role = 'viewer', department = 'General' }, ipAddress = '127.0.0.1', userAgent = 'Unknown') {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanName = (fullName || '').trim();
        const cleanDept = (department || 'General').trim();

        if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
            const err = new Error('A valid email address is required.');
            err.status = 400;
            throw err;
        }

        if (!password || password.length < 8) {
            const err = new Error('Password must be at least 8 characters long.');
            err.status = 400;
            throw err;
        }

        if (!cleanName) {
            const err = new Error('Full name is required.');
            err.status = 400;
            throw err;
        }

        // Allowed self-registration roles: 'owner' or 'viewer'. 'admin' role requires existing admin provisioning.
        const cleanRole = (role === 'owner') ? 'owner' : 'viewer';

        // Check if email already registered
        const existing = await db.query(`
            SELECT id FROM users WHERE email = $1 LIMIT 1;
        `, [cleanEmail]);

        if (existing.rows && existing.rows.length > 0) {
            const err = new Error('An account with this email already exists.');
            err.status = 409;
            throw err;
        }

        const passwordHash = bcrypt.hashSync(password, 10);
        const newUserId = crypto.randomUUID();

        await db.query(`
            INSERT INTO users (id, email, password_hash, full_name, role, department, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true);
        `, [newUserId, cleanEmail, passwordHash, cleanName, cleanRole, cleanDept]);

        // Auto-login session creation
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await db.query(`
            INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6);
        `, [crypto.randomUUID(), newUserId, tokenHash, ipAddress, userAgent, expiresAt]);

        const csrfToken = generateCsrfToken(rawToken);

        return {
            user: {
                id: newUserId,
                email: cleanEmail,
                fullName: cleanName,
                role: cleanRole,
                department: cleanDept
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
