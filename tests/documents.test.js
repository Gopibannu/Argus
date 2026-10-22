import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/src/app.js';

const app = createApp();

let bobCookie, bobCsrf;
let carolCookie, carolCsrf;
let daveCookie, daveCsrf;
let adminCookie, adminCsrf;

let bobDocId;
let bobGrantId;

describe('Document Security, Authorization & Revocation Tests (Phase 2)', () => {
    beforeAll(async () => {
        // 1. Login as Bob (Owner 1)
        const bobRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'owner1@argus.local', password: 'Password@Argus2026!' });
        bobCookie = bobRes.headers['set-cookie'];
        bobCsrf = bobRes.body.csrfToken;

        // 2. Login as Carol (Owner 2)
        const carolRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'owner2@argus.local', password: 'Password@Argus2026!' });
        carolCookie = carolRes.headers['set-cookie'];
        carolCsrf = carolRes.body.csrfToken;

        // 3. Login as Dave (Viewer 1)
        const daveRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'viewer1@argus.local', password: 'Password@Argus2026!' });
        daveCookie = daveRes.headers['set-cookie'];
        daveCsrf = daveRes.body.csrfToken;

        // 4. Login as Alice (Admin)
        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@argus.local', password: 'Password@Argus2026!' });
        adminCookie = adminRes.headers['set-cookie'];
        adminCsrf = adminRes.body.csrfToken;
    });

    it('1. Upload validation: reject file with fake extension and bad magic bytes', async () => {
        // Disguised executable pretending to be PDF
        const fakePdfBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00FakeExecutableHeader');

        const res = await request(app)
            .post('/api/documents/upload')
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf)
            .attach('file', fakePdfBuffer, 'trojan.pdf');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/unsupported or malicious/i);
    });

    it('2. Upload validation: reject macro-enabled office documents', async () => {
        // ZIP PK header containing vbaProject.bin signature
        const macroDocx = Buffer.from('PK\x03\x04...vbaProject.bin...fakeMacroOfficePayload');

        const res = await request(app)
            .post('/api/documents/upload')
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf)
            .attach('file', macroDocx, 'invoice.docx');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/macro-enabled/i);
    });

    it('3. Successful document upload by Bob (Owner 1) with envelope encryption', async () => {
        const validPdfContent = '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (Confidential Engineering Blueprint) >>\nendobj\n%%EOF';
        const fileBuffer = Buffer.from(validPdfContent, 'utf-8');

        const res = await request(app)
            .post('/api/documents/upload')
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf)
            .field('title', 'Project Argus Core Blueprint')
            .field('category', 'Engineering')
            .attach('file', fileBuffer, 'blueprint.pdf');

        expect(res.status).toBe(201);
        expect(res.body.document).toHaveProperty('id');
        expect(res.body.document.title).toBe('Project Argus Core Blueprint');
        expect(res.body.document.category).toBe('Engineering');
        expect(res.body.document.mimeType).toBe('application/pdf');

        bobDocId = res.body.document.id;
    });

    it('4. Bob (Owner) downloads decrypted document successfully', async () => {
        const res = await request(app)
            .get(`/api/documents/${bobDocId}/download`)
            .set('Cookie', bobCookie);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('application/pdf');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['cache-control']).toMatch(/no-store/);
        const textContent = res.text || res.body?.toString('utf-8') || '';
        expect(textContent).toContain('Confidential Engineering Blueprint');
    });

    it('5. ANTI-IDOR / EXISTENCE LEAK: Carol (Owner 2) attempts download -> returns 404 (not 403)', async () => {
        const res = await request(app)
            .get(`/api/documents/${bobDocId}/download`)
            .set('Cookie', carolCookie);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Document not found.');
    });

    it('6. ANTI-IDOR / EXISTENCE LEAK: Dave (Viewer 1) attempts download without grant -> returns 404', async () => {
        const res = await request(app)
            .get(`/api/documents/${bobDocId}/download`)
            .set('Cookie', daveCookie);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Document not found.');
    });

    it('7. LEAST PRIVILEGE ADMIN: Alice (Admin) without grant cannot download content -> returns 404', async () => {
        const res = await request(app)
            .get(`/api/documents/${bobDocId}/download`)
            .set('Cookie', adminCookie);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('Document not found.');
    });

    it('8. SQL Search Isolation: Carol cannot see Bob\'s document in search results', async () => {
        const res = await request(app)
            .get('/api/documents')
            .set('Cookie', carolCookie);

        expect(res.status).toBe(200);
        const ids = res.body.documents.map(d => d.id);
        expect(ids).not.toContain(bobDocId);
    });

    it('9. Bob grants "read" permission to Dave (Viewer 1)', async () => {
        const res = await request(app)
            .post(`/api/documents/${bobDocId}/grants`)
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf)
            .send({
                granteeEmail: 'viewer1@argus.local',
                permission: 'read'
            });

        expect(res.status).toBe(201);
        expect(res.body.grant.granteeEmail).toBe('viewer1@argus.local');
        expect(res.body.grant.permission).toBe('read');
        bobGrantId = res.body.grant.id;
    });

    it('10. Dave now sees the document in search results and downloads decrypted file', async () => {
        // Check search
        const listRes = await request(app)
            .get('/api/documents')
            .set('Cookie', daveCookie);

        expect(listRes.status).toBe(200);
        const doc = listRes.body.documents.find(d => d.id === bobDocId);
        expect(doc).toBeDefined();
        expect(doc.permission).toBe('read');

        // Download
        const downloadRes = await request(app)
            .get(`/api/documents/${bobDocId}/download`)
            .set('Cookie', daveCookie);

        expect(downloadRes.status).toBe(200);
        const textContent = downloadRes.text || downloadRes.body?.toString('utf-8') || '';
        expect(textContent).toContain('Confidential Engineering Blueprint');
    });

    it('11. PRIVILEGE ESCALATION PREVENTION: Dave (grantee) cannot grant permissions to Eve', async () => {
        const res = await request(app)
            .post(`/api/documents/${bobDocId}/grants`)
            .set('Cookie', daveCookie)
            .set('X-CSRF-Token', daveCsrf)
            .send({
                granteeEmail: 'viewer2@argus.local',
                permission: 'read'
            });

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/only the document owner/i);
    });

    it('12. PRIVILEGE ESCALATION PREVENTION: Dave (grantee) cannot delete Bob\'s document', async () => {
        const res = await request(app)
            .delete(`/api/documents/${bobDocId}`)
            .set('Cookie', daveCookie)
            .set('X-CSRF-Token', daveCsrf);

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/only the document owner/i);
    });

    it('13. Dave generates a 60-second download ticket', async () => {
        const res = await request(app)
            .post(`/api/documents/${bobDocId}/ticket`)
            .set('Cookie', daveCookie)
            .set('X-CSRF-Token', daveCsrf);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('ticket');
        expect(res.body.expiresInSeconds).toBe(60);

        // Save ticket for revocation test
        const ticket = res.body.ticket;

        // Bob revokes Dave's grant immediately
        const revokeRes = await request(app)
            .post(`/api/documents/${bobDocId}/grants/${bobGrantId}/revoke`)
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf);

        expect(revokeRes.status).toBe(200);
        expect(revokeRes.body.message).toMatch(/revoked immediately/i);

        // 14. INSTANT REVOCATION TEST A: Dave's subsequent direct download fails immediately (404)
        const directDownloadAfterRevoke = await request(app)
            .get(`/api/documents/${bobDocId}/download`)
            .set('Cookie', daveCookie);

        expect(directDownloadAfterRevoke.status).toBe(404);

        // 15. INSTANT REVOCATION TEST B: Dave's pre-issued 60s ticket is invalidated immediately
        const ticketDownloadAfterRevoke = await request(app)
            .get(`/api/documents/tickets/${ticket}`);

        expect(ticketDownloadAfterRevoke.status).toBe(403);
        expect(ticketDownloadAfterRevoke.body.error).toMatch(/access revoked/i);
    });

    it('14. SINGLE-USE TICKET ENFORCEMENT: Redeeming ticket once invalidates it for replay', async () => {
        // Bob issues new grant to Dave
        const grantRes = await request(app)
            .post(`/api/documents/${bobDocId}/grants`)
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf)
            .send({ granteeEmail: 'viewer1@argus.local', permission: 'read' });
        expect(grantRes.status).toBe(201);

        // Dave generates ticket
        const ticketRes = await request(app)
            .post(`/api/documents/${bobDocId}/ticket`)
            .set('Cookie', daveCookie)
            .set('X-CSRF-Token', daveCsrf);
        expect(ticketRes.status).toBe(200);
        const ticket = ticketRes.body.ticket;

        // Redemption #1: Success
        const redeem1 = await request(app).get(`/api/documents/tickets/${ticket}`);
        expect(redeem1.status).toBe(200);

        // Redemption #2 (Replay attack): Rejected with 403 single-use violation
        const redeem2 = await request(app).get(`/api/documents/tickets/${ticket}`);
        expect(redeem2.status).toBe(403);
        expect(redeem2.body.error).toMatch(/already used|single-use/i);
    });
});

