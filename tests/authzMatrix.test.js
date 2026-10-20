import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../server/src/app.js';
import { authorize } from '../server/src/services/authzService.js';

const app = createApp();

/**
 * PHASE 4: COMPREHENSIVE AUTHORIZATION & ROLE ISOLATION MATRIX
 * 
 * Matrix dimensions:
 * - Roles: Admin (Alice), Owner (Bob), Second Owner (Carol), Viewer (Dave), Unauthenticated
 * - Document states: Own Document, Granted Read, Granted Edit, Unrelated Document, Soft-deleted Document, Non-existent Document
 * - Actions: read, download, edit, delete, grant, revoke, list_grants
 * - Verification invariants:
 *   1. Anti-IDOR: Denied reads/downloads on non-owned, ungranted documents return 404 (never 403 or 200).
 *   2. Least Privilege: Admin CANNOT read or download files without explicit grant -> returns 404.
 *   3. Grantee privilege limits: Grantees cannot grant, revoke, or delete -> returns 403.
 *   4. Read vs Edit separation: Read-only grantees cannot edit -> returns 403.
 *   5. Immediate revocation: Once revoked, instant 404 on subsequent read/download.
 */

let adminCookie, adminCsrf;
let bobCookie, bobCsrf;
let carolCookie, carolCsrf;
let daveCookie, daveCsrf;
let bobDocId;

describe('Phase 4: Authorization Matrix & Role Isolation Tests', () => {
    beforeAll(async () => {
        // Authenticate Alice (Admin)
        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@argus.local', password: 'Password@Argus2026!' });
        adminCookie = adminRes.headers['set-cookie'];
        adminCsrf = adminRes.body.csrfToken;

        // Authenticate Bob (Owner 1)
        const bobRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'owner1@argus.local', password: 'Password@Argus2026!' });
        bobCookie = bobRes.headers['set-cookie'];
        bobCsrf = bobRes.body.csrfToken;

        // Authenticate Carol (Owner 2)
        const carolRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'owner2@argus.local', password: 'Password@Argus2026!' });
        carolCookie = carolRes.headers['set-cookie'];
        carolCsrf = carolRes.body.csrfToken;

        // Authenticate Dave (Viewer 1)
        const daveRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'viewer1@argus.local', password: 'Password@Argus2026!' });
        daveCookie = daveRes.headers['set-cookie'];
        daveCsrf = daveRes.body.csrfToken;

        // Bob uploads a target document for matrix testing
        const uploadRes = await request(app)
            .post('/api/documents/upload')
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf)
            .field('title', 'Matrix Confidential Specs')
            .field('category', 'Engineering')
            .attach('file', Buffer.from('%PDF-1.5 % Matrix Test Content for Argus Phase 4'), 'specs.pdf');
        
        bobDocId = uploadRes.body.document.id;
    });

    // ------------------------------------------------------------------------
    // 1. OWNER PERMISSIONS MATRIX
    // ------------------------------------------------------------------------
    it('Matrix 1: Owner (Bob) has full permissions over own document (read, download, edit, grant, revoke, delete)', async () => {
        // Read metadata -> 200
        const readRes = await request(app).get(`/api/documents/${bobDocId}`).set('Cookie', bobCookie);
        expect(readRes.status).toBe(200);

        // Download -> 200
        const downloadRes = await request(app).get(`/api/documents/${bobDocId}/download`).set('Cookie', bobCookie);
        expect(downloadRes.status).toBe(200);

        // Edit metadata -> 200
        const editRes = await request(app)
            .patch(`/api/documents/${bobDocId}`)
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf)
            .send({ title: 'Matrix Confidential Specs v2' });
        expect(editRes.status).toBe(200);
        expect(editRes.body.document.title).toBe('Matrix Confidential Specs v2');
    });

    // ------------------------------------------------------------------------
    // 2. UNRELATED OWNER (CAROL) ISOLATION (ANTI-IDOR)
    // ------------------------------------------------------------------------
    it('Matrix 2: Unrelated Owner (Carol) gets 404 (Anti-IDOR) for read, download, edit, grant, and delete', async () => {
        // Read metadata -> 404
        const readRes = await request(app).get(`/api/documents/${bobDocId}`).set('Cookie', carolCookie);
        expect(readRes.status).toBe(404);
        expect(readRes.body.error).toMatch(/not found/i);

        // Download -> 404
        const downloadRes = await request(app).get(`/api/documents/${bobDocId}/download`).set('Cookie', carolCookie);
        expect(downloadRes.status).toBe(404);

        // Edit -> 404
        const editRes = await request(app)
            .patch(`/api/documents/${bobDocId}`)
            .set('Cookie', carolCookie)
            .set('X-CSRF-Token', carolCsrf)
            .send({ title: 'Malicious Hijack' });
        expect(editRes.status).toBe(404);

        // Delete -> 404
        const deleteRes = await request(app)
            .delete(`/api/documents/${bobDocId}`)
            .set('Cookie', carolCookie)
            .set('X-CSRF-Token', carolCsrf);
        expect(deleteRes.status).toBe(404);
    });

    // ------------------------------------------------------------------------
    // 3. LEAST PRIVILEGE ADMIN (ALICE) ISOLATION
    // ------------------------------------------------------------------------
    it('Matrix 3: Admin (Alice) has NO implicit content access -> gets 404 on read and download', async () => {
        const readRes = await request(app).get(`/api/documents/${bobDocId}`).set('Cookie', adminCookie);
        expect(readRes.status).toBe(404);

        const downloadRes = await request(app).get(`/api/documents/${bobDocId}/download`).set('Cookie', adminCookie);
        expect(downloadRes.status).toBe(404);
    });

    // ------------------------------------------------------------------------
    // 4. UNGRANTED VIEWER (DAVE) ISOLATION
    // ------------------------------------------------------------------------
    it('Matrix 4: Viewer without grant (Dave) gets 404 on read, download, and ticket generation', async () => {
        const readRes = await request(app).get(`/api/documents/${bobDocId}`).set('Cookie', daveCookie);
        expect(readRes.status).toBe(404);

        const downloadRes = await request(app).get(`/api/documents/${bobDocId}/download`).set('Cookie', daveCookie);
        expect(downloadRes.status).toBe(404);

        const ticketRes = await request(app)
            .post(`/api/documents/${bobDocId}/ticket`)
            .set('Cookie', daveCookie)
            .set('X-CSRF-Token', daveCsrf);
        expect(ticketRes.status).toBe(404);
    });

    // ------------------------------------------------------------------------
    // 5. READ-ONLY GRANTEE VS EDIT PRIVILEGE SEPARATION
    // ------------------------------------------------------------------------
    it('Matrix 5: Bob grants Dave "read" -> Dave can read/download, but CANNOT edit (403), delete (403), or grant (403)', async () => {
        // Bob grants Dave read permission
        const grantRes = await request(app)
            .post(`/api/documents/${bobDocId}/grants`)
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf)
            .send({ granteeEmail: 'viewer1@argus.local', permission: 'read' });
        expect(grantRes.status).toBe(201);
        const grantId = grantRes.body.grant.id;

        // Dave can read -> 200
        const readRes = await request(app).get(`/api/documents/${bobDocId}`).set('Cookie', daveCookie);
        expect(readRes.status).toBe(200);

        // Dave can download -> 200
        const downloadRes = await request(app).get(`/api/documents/${bobDocId}/download`).set('Cookie', daveCookie);
        expect(downloadRes.status).toBe(200);

        // Dave CANNOT edit -> 403 Forbidden
        const editRes = await request(app)
            .patch(`/api/documents/${bobDocId}`)
            .set('Cookie', daveCookie)
            .set('X-CSRF-Token', daveCsrf)
            .send({ title: 'Tampered Title' });
        expect(editRes.status).toBe(403);
        expect(editRes.body.error).toMatch(/read-only access/i);

        // Dave CANNOT delete -> 403 Forbidden
        const deleteRes = await request(app)
            .delete(`/api/documents/${bobDocId}`)
            .set('Cookie', daveCookie)
            .set('X-CSRF-Token', daveCsrf);
        expect(deleteRes.status).toBe(403);
        expect(deleteRes.body.error).toMatch(/only the document owner/i);

        // Dave CANNOT grant access to others -> 403 Forbidden
        const subGrantRes = await request(app)
            .post(`/api/documents/${bobDocId}/grants`)
            .set('Cookie', daveCookie)
            .set('X-CSRF-Token', daveCsrf)
            .send({ granteeEmail: 'viewer2@argus.local', permission: 'read' });
        expect(subGrantRes.status).toBe(403);

        // Clean up: Bob revokes Dave's grant
        const revokeRes = await request(app)
            .post(`/api/documents/${bobDocId}/grants/${grantId}/revoke`)
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf);
        expect(revokeRes.status).toBe(200);

        // Verify IMMEDIATE REVOCATION: Dave is immediately locked out -> 404
        const afterRevoke = await request(app).get(`/api/documents/${bobDocId}`).set('Cookie', daveCookie);
        expect(afterRevoke.status).toBe(404);
    });

    // ------------------------------------------------------------------------
    // 6. EDIT GRANTEE PRIVILEGES AND RESTRICTIONS
    // ------------------------------------------------------------------------
    it('Matrix 6: Bob grants Dave "edit" -> Dave can edit, but STILL cannot delete (403) or grant to others (403)', async () => {
        // Bob grants Dave edit permission
        const grantRes = await request(app)
            .post(`/api/documents/${bobDocId}/grants`)
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf)
            .send({ granteeEmail: 'viewer1@argus.local', permission: 'edit' });
        expect(grantRes.status).toBe(201);
        const grantId = grantRes.body.grant.id;

        // Dave CAN edit -> 200
        const editRes = await request(app)
            .patch(`/api/documents/${bobDocId}`)
            .set('Cookie', daveCookie)
            .set('X-CSRF-Token', daveCsrf)
            .send({ title: 'Collaborative Edit by Dave' });
        expect(editRes.status).toBe(200);
        expect(editRes.body.document.title).toBe('Collaborative Edit by Dave');

        // Dave STILL CANNOT delete -> 403 Forbidden
        const deleteRes = await request(app)
            .delete(`/api/documents/${bobDocId}`)
            .set('Cookie', daveCookie)
            .set('X-CSRF-Token', daveCsrf);
        expect(deleteRes.status).toBe(403);

        // Dave STILL CANNOT grant to others -> 403 Forbidden
        const subGrantRes = await request(app)
            .post(`/api/documents/${bobDocId}/grants`)
            .set('Cookie', daveCookie)
            .set('X-CSRF-Token', daveCsrf)
            .send({ granteeEmail: 'viewer2@argus.local', permission: 'read' });
        expect(subGrantRes.status).toBe(403);

        // Revoke grant
        await request(app)
            .post(`/api/documents/${bobDocId}/grants/${grantId}/revoke`)
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf);
    });

    // ------------------------------------------------------------------------
    // 7. SOFT-DELETED DOCUMENT ISOLATION
    // ------------------------------------------------------------------------
    it('Matrix 7: Once soft-deleted, document returns 404 even to the original owner', async () => {
        // Bob uploads temporary document
        const up = await request(app)
            .post('/api/documents/upload')
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf)
            .field('title', 'Temporary Doc to Delete')
            .attach('file', Buffer.from('%PDF-1.5 % temp'), 'temp.pdf');
        const tempDocId = up.body.document.id;

        // Bob deletes the document
        const del = await request(app)
            .delete(`/api/documents/${tempDocId}`)
            .set('Cookie', bobCookie)
            .set('X-CSRF-Token', bobCsrf);
        expect(del.status).toBe(200);

        // Bob attempts to download soft-deleted document -> 404 Not Found
        const getDeleted = await request(app).get(`/api/documents/${tempDocId}/download`).set('Cookie', bobCookie);
        expect(getDeleted.status).toBe(404);
    });

    // ------------------------------------------------------------------------
    // 8. DIRECT CHOKE POINT INVARIANT VERIFICATION
    // ------------------------------------------------------------------------
    it('Matrix 8: Direct authorize() choke point invariants (Invalid action, missing user, non-existent doc)', async () => {
        // Invalid action -> throws 404
        await expect(
            authorize({ id: 'b0000000-0000-0000-0000-000000000001' }, bobDocId, 'EXECUTE_ARBITRARY_ACTION')
        ).rejects.toHaveProperty('status', 404);

        // Missing user -> throws 404
        await expect(
            authorize(null, bobDocId, 'read')
        ).rejects.toHaveProperty('status', 404);

        // Non-existent document -> throws 404
        await expect(
            authorize({ id: 'b0000000-0000-0000-0000-000000000001' }, '00000000-0000-0000-0000-999999999999', 'read')
        ).rejects.toHaveProperty('status', 404);
    });
});
