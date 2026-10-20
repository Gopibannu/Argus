import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/src/app.js';

const app = createApp();

describe('Auth & Session Security Tests (Phase 1)', () => {
    it('1. GET /api/health should return system status and uptime', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('uptimeSeconds');
        expect(res.body).toHaveProperty('environment');
    });

    it('2. GET /api/auth/me without cookie should return unauthenticated', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(200);
        expect(res.body.authenticated).toBe(false);
        expect(res.body.user).toBeNull();
    });

    it('3. POST /api/auth/login with wrong password should fail with 401 generic error', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@argus.local', password: 'WrongPassword123!' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid email or password.');
    });

    it('4. POST /api/auth/login for non-existent user should return generic 401 (no enumeration)', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nonexistent@argus.local', password: 'AnyPassword123!' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid email or password.');
    });

    it('5. POST /api/auth/login for disabled user should be rejected immediately', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'disabled@argus.local', password: 'Password@Argus2026!' });

        expect(res.status).toBe(401);
        expect(res.body.error).toMatch(/deactivated/i);
    });

    it('6. POST /api/auth/login with valid credentials should set HttpOnly SameSite=Strict cookie', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@argus.local', password: 'Password@Argus2026!' });

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('admin@argus.local');
        expect(res.body.user.role).toBe('admin');
        expect(res.body).toHaveProperty('csrfToken');

        // Verify Set-Cookie header
        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        const sessionCookie = cookies.find(c => c.startsWith('argus_session='));
        expect(sessionCookie).toBeDefined();
        expect(sessionCookie).toMatch(/HttpOnly/i);
        expect(sessionCookie).toMatch(/SameSite=Strict/i);
    });

    it('7. Access /api/auth/me with session cookie, then logout and verify instant invalidation', async () => {
        // Step A: Login
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'owner1@argus.local', password: 'Password@Argus2026!' });
        
        expect(loginRes.status).toBe(200);
        const cookie = loginRes.headers['set-cookie'];
        const csrfToken = loginRes.body.csrfToken;

        // Step B: Authenticated me
        const meRes = await request(app)
            .get('/api/auth/me')
            .set('Cookie', cookie);
        
        expect(meRes.status).toBe(200);
        expect(meRes.body.authenticated).toBe(true);
        expect(meRes.body.user.email).toBe('owner1@argus.local');

        // Step C: Logout (with CSRF token)
        const logoutRes = await request(app)
            .post('/api/auth/logout')
            .set('Cookie', cookie)
            .set('X-CSRF-Token', csrfToken);
        
        expect(logoutRes.status).toBe(200);

        // Step D: Immediate revocation check - Old session cookie is now dead
        const meAfterLogout = await request(app)
            .get('/api/auth/me')
            .set('Cookie', cookie);
        
        expect(meAfterLogout.body.authenticated).toBe(false);
    });

    it('8. POST /api/auth/logout-all terminates all sessions across devices', async () => {
        // Login on Device 1
        const dev1 = await request(app)
            .post('/api/auth/login')
            .send({ email: 'viewer1@argus.local', password: 'Password@Argus2026!' });
        const cookie1 = dev1.headers['set-cookie'];

        // Login on Device 2
        const dev2 = await request(app)
            .post('/api/auth/login')
            .send({ email: 'viewer1@argus.local', password: 'Password@Argus2026!' });
        const cookie2 = dev2.headers['set-cookie'];
        const csrf2 = dev2.body.csrfToken;

        // Device 2 triggers Logout All
        const logoutAllRes = await request(app)
            .post('/api/auth/logout-all')
            .set('Cookie', cookie2)
            .set('X-CSRF-Token', csrf2);
        
        expect(logoutAllRes.status).toBe(200);

        // Verify Device 1 is also terminated immediately
        const dev1Check = await request(app)
            .get('/api/auth/me')
            .set('Cookie', cookie1);
        
        expect(dev1Check.body.authenticated).toBe(false);
    });

    it('9. POST /api/auth/register creates a new user and issues a stateful session', async () => {
        const uniqueEmail = `dr.smith.${Date.now()}@argus.local`;
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: uniqueEmail,
                password: 'SecurePassword123!',
                fullName: 'Dr. Jane Smith',
                role: 'owner',
                department: 'Research'
            });

        expect(res.status).toBe(201);
        expect(res.body.user).toHaveProperty('id');
        expect(res.body.user.email).toBe(uniqueEmail);
        expect(res.body.user.role).toBe('owner');
        expect(res.body.user.department).toBe('Research');
        expect(res.headers['set-cookie']).toBeDefined();

        // Verify newly registered user can access /api/auth/me
        const meRes = await request(app)
            .get('/api/auth/me')
            .set('Cookie', res.headers['set-cookie']);

        expect(meRes.status).toBe(200);
        expect(meRes.body.authenticated).toBe(true);
        expect(meRes.body.user.email).toBe(uniqueEmail);
    });

    it('10. POST /api/auth/register rejects duplicate email registration', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                email: 'admin@argus.local',
                password: 'SecurePassword123!',
                fullName: 'Attacker Impersonator',
                role: 'owner'
            });

        expect(res.status).toBe(409);
        expect(res.body.error).toMatch(/already exists/i);
    });
});
