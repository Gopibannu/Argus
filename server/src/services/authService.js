import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../db/pool.js';
import { hashToken, generateCsrfToken } from '../middleware/session.js';
import { emailService } from './emailService.js';

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

        // SECURITY: Role self-assignment is forbidden. All self-registrations default to 'viewer'.
        // Admin or Owner roles must be provisioned directly by an active administrator.
        const cleanRole = 'viewer';

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

    /**
     * Step 1: Initiate signup by validating input and sending a 6-digit OTP to the email.
     * Non-negotiable security: Role self-assignment is forbidden. All public registrations default strictly to 'viewer'.
     */
    async initiateRegister({ email, password, fullName, department = 'General' }) {
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

        // SECURITY: Role self-assignment is blocked. Elevated roles (owner, admin) require existing admin provisioning.
        const cleanRole = 'viewer';


        // Check if user already exists
        const existing = await db.query(`
            SELECT id FROM users WHERE email = $1 LIMIT 1;
        `, [cleanEmail]);

        if (existing.rows && existing.rows.length > 0) {
            const err = new Error('An account with this email already exists.');
            err.status = 409;
            throw err;
        }

        // Generate cryptographically secure 6-digit OTP
        const otpNum = crypto.randomInt(100000, 999999).toString();
        const otpHash = bcrypt.hashSync(otpNum, 10);
        const passwordHash = bcrypt.hashSync(password, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Remove any previous pending registration for this email
        await db.query(`
            DELETE FROM pending_registrations WHERE email = $1;
        `, [cleanEmail]);

        // Insert pending registration
        await db.query(`
            INSERT INTO pending_registrations (email, otp_hash, full_name, password_hash, role, department, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7);
        `, [cleanEmail, otpHash, cleanName, passwordHash, cleanRole, cleanDept, expiresAt]);

        // Dispatch OTP via email service
        const emailResult = await emailService.sendSignupOtp(cleanEmail, otpNum, cleanName);

        return {
            email: cleanEmail,
            message: `Verification code sent to ${cleanEmail}. Please enter the 6-digit code.`,
            mode: emailResult.mode,
            // Provide OTP in dev/test/console mode for smooth testing without checking mailbox
            demoOtp: emailResult.mode === 'console' || emailResult.mode === 'fallback_console' ? otpNum : undefined
        };
    },

    /**
     * Step 2: Verify the 6-digit OTP and complete user account creation
     */
    async verifyOtpAndRegister({ email, otp }, ipAddress = '127.0.0.1', userAgent = 'Unknown') {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanOtp = (otp || '').trim();

        if (!cleanEmail || !cleanOtp) {
            const err = new Error('Email and 6-digit verification code are required.');
            err.status = 400;
            throw err;
        }

        const pendingRes = await db.query(`
            SELECT email, otp_hash, full_name, password_hash, role, department, expires_at
            FROM pending_registrations
            WHERE email = $1
            LIMIT 1;
        `, [cleanEmail]);

        const pending = pendingRes.rows[0];
        if (!pending) {
            const err = new Error('No pending registration found or verification code expired. Please sign up again.');
            err.status = 400;
            throw err;
        }

        if (new Date(pending.expires_at) < new Date()) {
            await db.query('DELETE FROM pending_registrations WHERE email = $1;', [cleanEmail]);
            const err = new Error('Verification code has expired. Please request a new one.');
            err.status = 400;
            throw err;
        }

        const otpValid = bcrypt.compareSync(cleanOtp, pending.otp_hash);
        if (!otpValid) {
            const err = new Error('Invalid verification code. Please check your email and try again.');
            err.status = 400;
            throw err;
        }

        // OTP verified: create the actual user
        const newUserId = crypto.randomUUID();
        await db.query(`
            INSERT INTO users (id, email, password_hash, full_name, role, department, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true);
        `, [newUserId, pending.email, pending.password_hash, pending.full_name, pending.role, pending.department]);

        // Cleanup pending registration
        await db.query('DELETE FROM pending_registrations WHERE email = $1;', [cleanEmail]);

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
                email: pending.email,
                fullName: pending.full_name,
                role: pending.role,
                department: pending.department
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
