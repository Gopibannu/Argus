import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/src/app.js';
import { db } from '../server/src/db/pool.js';
import { auditService } from '../server/src/services/auditService.js';

const app = createApp();

let adminCookie, adminCsrf;
let bobCookie, bobCsrf;
let daveCookie, daveCsrf;

describe('Audit Trail, Hash Chain & Admin Dashboard Tests (Phase 3)', () => {
    beforeAll(async () => {
        // Login as Alice (Admin)
        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@argus.local', password: 'Password@Argus2026!' });
        adminCookie = adminRes.headers['set-cookie'];
        adminCsrf = adminRes.body.csrfToken;

        // Login as Bob (Owner 1)
        const bobRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'owner1@argus.local', password: 'Password@Argus2026!' });
        bobCookie = bobRes.headers['set-cookie'];
        bobCsrf = bobRes.body.csrfToken;

        // Login as Dave (Viewer 1)
        const daveRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'viewer1@argus.local', password: 'Password@Argus2026!' });
        daveCookie = daveRes.headers['set-cookie'];
        daveCsrf = daveRes.body.csrfToken;
    });

    it('1. RBAC: Non-admin users cannot reach /api/admin endpoints', async () => {
        // Bob (Owner) attempts to access /api/admin/audit/verify -> 403 Forbidden
        const bobRes = await request(app)
            .get('/api/admin/audit/verify')
            .set('Cookie', bobCookie);

        expect(bobRes.status).toBe(403);
        expect(bobRes.body.error).toMatch(/forbidden/i);

        // Dave (Viewer) attempts to access /api/admin/metrics -> 403 Forbidden
        const daveRes = await request(app)
            .get('/api/admin/metrics')
            .set('Cookie', daveCookie);

        expect(daveRes.status).toBe(403);
    });

    it('2. Alice (Admin) verifies cryptographic audit hash chain is VALID', async () => {
        const res = await request(app)
            .get('/api/admin/audit/verify')
            .set('Cookie', adminCookie);

        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.status).toBe('INTEACT');
        expect(res.body.totalRowsVerified).toBeGreaterThan(0);
        expect(res.body).toHaveProperty('headHash');
    });

    it('3. Alice fetches Admin metrics (Total events, denied attempts, active actors)', async () => {
        const res = await request(app)
            .get('/api/admin/metrics')
            .set('Cookie', adminCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('totalEvents');
        expect(res.body).toHaveProperty('deniedEvents');
        expect(res.body).toHaveProperty('chainIntegrity');
        expect(res.body.chainIntegrity).toBe('VALID');
    });

    it('4. Alice fetches and filters the tamper-evident audit trail', async () => {
        const res = await request(app)
            .get('/api/admin/audit?limit=20')
            .set('Cookie', adminCookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('auditTrail');
        expect(Array.isArray(res.body.auditTrail)).toBe(true);
        expect(res.body.auditTrail.length).toBeGreaterThan(0);

        const firstEntry = res.body.auditTrail[0];
        expect(firstEntry).toHaveProperty('sequenceId');
        expect(firstEntry).toHaveProperty('prevHash');
        expect(firstEntry).toHaveProperty('rowHash');
        expect(firstEntry).toHaveProperty('outcome');
    });

    it('5. Database-level immutability: UPDATE on audit_log is rejected', async () => {
        await expect(
            db.query("UPDATE audit_log SET reason = 'Malicious alteration' WHERE sequence_id = 1")
        ).rejects.toThrow(/SECURITY VIOLATION.*append-only/i);
    });

    it('6. Database-level immutability: DELETE on audit_log is rejected', async () => {
        await expect(
            db.query("DELETE FROM audit_log WHERE sequence_id = 1")
        ).rejects.toThrow(/SECURITY VIOLATION.*append-only/i);
    });

    it('7. TAMPER DETECTION: Modifying a historical row breaks hash chain verification', async () => {
        const mem = db.getInMemoryInstance();
        if (mem.auditLog && mem.auditLog.length > 0) {
            // Tamper with a row in memory
            const originalReason = mem.auditLog[0].reason;
            mem.auditLog[0].reason = 'HACKED_TAMPERED_REASON';

            // Verify chain detects tampering
            const verification = await auditService.verifyChain();
            expect(verification.valid).toBe(false);
            expect(verification.error).toMatch(/tampering detected/i);

            // Restore row
            mem.auditLog[0].reason = originalReason;

            // Chain is valid again
            const restoredVerification = await auditService.verifyChain();
            expect(restoredVerification.valid).toBe(true);
        }
    });

    it('8. Admin toggles user account status (Disable & Instant Lockout)', async () => {
        // Alice deactivates Carol (Owner 2)
        const toggleRes = await request(app)
            .post('/api/admin/users/b0000000-0000-0000-0000-000000000002/toggle-status')
            .set('Cookie', adminCookie)
            .set('X-CSRF-Token', adminCsrf);

        expect(toggleRes.status).toBe(200);
        expect(toggleRes.body.isActive).toBe(false);

        // Carol attempts to log in -> Immediately rejected
        const carolLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'owner2@argus.local', password: 'Password@Argus2026!' });

        expect(carolLogin.status).toBe(401);
        expect(carolLogin.body.error).toMatch(/deactivated/i);

        // Re-enable Carol
        const enableRes = await request(app)
            .post('/api/admin/users/b0000000-0000-0000-0000-000000000002/toggle-status')
            .set('Cookie', adminCookie)
            .set('X-CSRF-Token', adminCsrf);

        expect(enableRes.status).toBe(200);
        expect(enableRes.body.isActive).toBe(true);
    });
});
