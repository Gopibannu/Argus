import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import { db } from '../db/pool.js';
import { requireAuth } from '../middleware/session.js';
import { uploadValidator } from '../services/uploadValidator.js';
import { cryptoEngine } from '../services/cryptoEngine.js';
import { storageService } from '../services/storageService.js';
import { auditService } from '../services/auditService.js';
import { authorize } from '../services/authzService.js';
import { hashToken } from '../middleware/session.js';
import { aiService } from '../services/aiService.js';

const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB memory limit
});

// Helper for audit context
function getReqContext(req) {
    return {
        ip: req.ip || req.connection?.remoteAddress || '127.0.0.1',
        userAgent: req.headers['user-agent'] || 'Unknown'
    };
}

// Middleware supporting both 'file' and 'document' field names
const handleUploadFile = (req, res, next) => {
    upload.fields([{ name: 'file', maxCount: 1 }, { name: 'document', maxCount: 1 }])(req, res, (err) => {
        if (err) return next(err);
        if (req.files) {
            req.file = req.files['file']?.[0] || req.files['document']?.[0] || null;
        }
        next();
    });
};

const handleUploadAction = async (req, res, next) => {
    try {
        const { title, category } = req.body || {};
        const context = getReqContext(req);

        // A. Validate file payload (magic bytes, size, extensions)
        const validated = uploadValidator.validateUpload(req.file);

        // B. Envelope encryption at rest
        const { ciphertext, encryptedDataKey, encryptionIv } = cryptoEngine.encryptFile(req.file.buffer);

        // C. Save encrypted blob to private storage
        const storageKey = crypto.randomUUID();
        await storageService.saveEncryptedFile(storageKey, ciphertext);

        // D. Insert metadata into PostgreSQL
        const docId = crypto.randomUUID();
        const docTitle = (title && typeof title === 'string' && title.trim()) ? title.trim().substring(0, 255) : validated.sanitizedFilename;
        const docCategory = (category && typeof category === 'string' && category.trim()) ? category.trim().substring(0, 100) : 'General';

        await db.query(`
            INSERT INTO documents (
                id, owner_id, title, original_filename, storage_key,
                mime_type, file_size_bytes, sha256_checksum,
                encrypted_data_key, encryption_iv, category, grant_version
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1);
        `, [
            docId,
            req.user.id,
            docTitle,
            validated.sanitizedFilename,
            storageKey,
            validated.mimeType,
            validated.sizeBytes,
            validated.sha256,
            encryptedDataKey,
            encryptionIv,
            docCategory
        ]);

        // E. Audit log upload
        await auditService.logEvent({
            actorId: req.user.id,
            actorIp: context.ip,
            userAgent: context.userAgent,
            action: 'upload',
            documentId: docId,
            outcome: 'allowed',
            reason: 'DOCUMENT_UPLOADED',
            metadata: {
                title: docTitle,
                filename: validated.sanitizedFilename,
                sha256: validated.sha256,
                sizeBytes: validated.sizeBytes
            }
        });

        res.status(201).json({
            message: 'Document uploaded and encrypted successfully.',
            document: {
                id: docId,
                title: docTitle,
                originalFilename: validated.sanitizedFilename,
                mimeType: validated.mimeType,
                fileSizeBytes: validated.sizeBytes,
                sha256Checksum: validated.sha256,
                category: docCategory,
                createdAt: new Date().toISOString()
            }
        });
    } catch (err) {
        next(err);
    }
};

// 1. Support both POST /api/documents/upload and POST /api/documents
router.post('/upload', requireAuth, handleUploadFile, handleUploadAction);
router.post('/', requireAuth, handleUploadFile, handleUploadAction);

// ============================================================================
// 2. GET /api/documents (Search & list, SQL-filtered by authorization)
// ============================================================================
router.get('/', requireAuth, async (req, res, next) => {
    try {
        const { q, category, owner, startDate, endDate } = req.query;
        const searchPattern = q ? `%${q.trim()}%` : null;
        const categoryFilter = category ? category.trim() : null;
        const ownerFilter = owner ? `%${owner.trim()}%` : null;
        const startFilter = startDate ? new Date(startDate).toISOString() : null;
        const endFilter = endDate ? new Date(endDate).toISOString() : null;

        // SECURITY: Search filtering directly inside the SQL join.
        // Returns ONLY documents the caller owns or is actively granted.
        const queryParams = [req.user.id];
        let paramIdx = 2;

        let dynamicWhere = '';
        if (searchPattern) {
            dynamicWhere += ` AND (d.title ILIKE $${paramIdx} OR d.original_filename ILIKE $${paramIdx})`;
            queryParams.push(searchPattern);
            paramIdx++;
        }
        if (categoryFilter) {
            dynamicWhere += ` AND d.category = $${paramIdx}`;
            queryParams.push(categoryFilter);
            paramIdx++;
        }
        if (ownerFilter) {
            dynamicWhere += ` AND (u.full_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`;
            queryParams.push(ownerFilter);
            paramIdx++;
        }
        if (startFilter) {
            dynamicWhere += ` AND d.created_at >= $${paramIdx}`;
            queryParams.push(startFilter);
            paramIdx++;
        }
        if (endFilter) {
            dynamicWhere += ` AND d.created_at <= $${paramIdx}`;
            queryParams.push(endFilter);
            paramIdx++;
        }

        const queryText = `
            SELECT DISTINCT 
                d.id, d.owner_id, d.title, d.original_filename, d.mime_type,
                d.file_size_bytes, d.category, d.grant_version, d.created_at, d.updated_at,
                u.full_name AS owner_name, u.email AS owner_email,
                CASE 
                    WHEN d.owner_id = $1 THEN 'owner'
                    ELSE g.permission
                END AS permission
            FROM documents d
            JOIN users u ON d.owner_id = u.id
            LEFT JOIN grants g ON d.id = g.document_id 
                AND g.grantee_user_id = $1 
                AND g.revoked_at IS NULL 
                AND (g.expires_at IS NULL OR g.expires_at > NOW())
            WHERE d.deleted_at IS NULL
              AND (d.owner_id = $1 OR g.id IS NOT NULL)
              ${dynamicWhere}
            ORDER BY d.created_at DESC;
        `;

        const result = await db.query(queryText, queryParams);

        res.json({
            documents: result.rows.map(row => ({
                id: row.id,
                title: row.title,
                originalFilename: row.original_filename,
                mimeType: row.mime_type,
                fileSizeBytes: parseInt(row.file_size_bytes, 10),
                category: row.category,
                permission: row.permission,
                owner: {
                    id: row.owner_id,
                    name: row.owner_name,
                    email: row.owner_email
                },
                createdAt: row.created_at
            }))
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 3. GET /api/documents/:id (Get Metadata)
// ============================================================================
router.get('/:id', requireAuth, async (req, res, next) => {
    try {
        const { document, role } = await authorize(req.user, req.params.id, 'read', getReqContext(req));

        res.json({
            document: {
                id: document.id,
                title: document.title,
                originalFilename: document.original_filename,
                mimeType: document.mime_type,
                fileSizeBytes: parseInt(document.file_size_bytes, 10),
                sha256Checksum: document.sha256_checksum,
                category: document.category,
                grantVersion: document.grant_version,
                permission: role,
                createdAt: document.created_at
            }
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 4. GET /api/documents/:id/download (Stream Decrypted Content via Choke Point)
// ============================================================================
router.get('/:id/download', requireAuth, async (req, res, next) => {
    try {
        const { document } = await authorize(req.user, req.params.id, 'download', getReqContext(req));

        // Retrieve encrypted ciphertext from storage
        const ciphertext = await storageService.getEncryptedFile(document.storage_key);

        // Decrypt on the fly using wrapped DEK
        const decryptedBuffer = cryptoEngine.decryptFile(ciphertext, document.encrypted_data_key);

        // Sanitized Content-Disposition attachment header
        const safeFilename = encodeURIComponent(document.original_filename).replace(/['()]/g, escape);

        res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Content-Length', decryptedBuffer.length);

        res.send(decryptedBuffer);
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 5. POST /api/documents/:id/ticket (Issue short-lived single-use download ticket)
// ============================================================================
router.post('/:id/ticket', requireAuth, async (req, res, next) => {
    try {
        const { document } = await authorize(req.user, req.params.id, 'download', getReqContext(req));

        const rawTicket = crypto.randomBytes(32).toString('hex');
        const ticketHash = hashToken(rawTicket);
        const expiresAt = new Date(Date.now() + 60 * 1000); // 60 seconds lifetime

        await db.query(`
            INSERT INTO download_tickets (
                id, ticket_hash, document_id, user_id,
                grant_version_at_issue, expires_at, used
            ) VALUES ($1, $2, $3, $4, $5, $6, false);
        `, [
            crypto.randomUUID(),
            ticketHash,
            document.id,
            req.user.id,
            document.grant_version,
            expiresAt
        ]);

        res.json({
            ticket: rawTicket,
            expiresInSeconds: 60,
            expiresAt: expiresAt.toISOString()
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 6. GET /api/documents/tickets/:ticket (Redeem Ticket with Live Version Check)
// ============================================================================
router.get('/tickets/:ticket', async (req, res, next) => {
    const rawTicket = req.params.ticket;
    const context = getReqContext(req);

    try {
        const ticketHash = hashToken(rawTicket);

        // Fetch ticket and document
        const result = await db.query(`
            SELECT t.id AS ticket_id, t.document_id, t.user_id, t.grant_version_at_issue,
                   t.expires_at, t.used,
                   d.original_filename, d.mime_type, d.storage_key,
                   d.encrypted_data_key, d.grant_version AS live_grant_version, d.deleted_at
            FROM download_tickets t
            JOIN documents d ON t.document_id = d.id
            WHERE t.ticket_hash = $1
            LIMIT 1;
        `, [ticketHash]);

        const ticket = result.rows[0];

        // Ticket not found or already used
        if (!ticket || ticket.used) {
            await auditService.logEvent({
                actorId: ticket?.user_id,
                actorIp: context.ip,
                userAgent: context.userAgent,
                action: 'ticket_download',
                documentId: ticket?.document_id,
                outcome: 'denied',
                reason: 'TICKET_INVALID_OR_ALREADY_USED'
            });
            return res.status(404).json({ error: 'Ticket invalid or expired.' });
        }

        // Expired ticket check
        if (new Date(ticket.expires_at) <= new Date() || ticket.deleted_at) {
            await auditService.logEvent({
                actorId: ticket.user_id,
                actorIp: context.ip,
                userAgent: context.userAgent,
                action: 'ticket_download',
                documentId: ticket.document_id,
                outcome: 'denied',
                reason: 'TICKET_EXPIRED_OR_DOCUMENT_DELETED'
            });
            return res.status(404).json({ error: 'Ticket invalid or expired.' });
        }

        // SECURITY: Grant Version Invariant Check
        // If owner revoked access after ticket was generated, live_grant_version will be > grant_version_at_issue
        if (ticket.grant_version_at_issue !== ticket.live_grant_version) {
            // Invalidate ticket immediately
            await db.query('UPDATE download_tickets SET used = true WHERE id = $1', [ticket.ticket_id]);
            await auditService.logEvent({
                actorId: ticket.user_id,
                actorIp: context.ip,
                userAgent: context.userAgent,
                action: 'ticket_download',
                documentId: ticket.document_id,
                outcome: 'denied',
                reason: 'TICKET_STALE_GRANT_VERSION_REVOKED'
            });
            return res.status(403).json({ error: 'Access revoked. This download ticket has been invalidated.' });
        }

        // Mark ticket used (single-use defense against replay)
        await db.query('UPDATE download_tickets SET used = true WHERE id = $1', [ticket.ticket_id]);

        // Stream file
        const ciphertext = await storageService.getEncryptedFile(ticket.storage_key);
        const decryptedBuffer = cryptoEngine.decryptFile(ciphertext, ticket.encrypted_data_key);

        const safeFilename = encodeURIComponent(ticket.original_filename).replace(/['()]/g, escape);
        res.setHeader('Content-Type', ticket.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-store');

        res.send(decryptedBuffer);
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 7. PATCH /api/documents/:id (Update metadata, requires 'edit')
// ============================================================================
router.patch('/:id', requireAuth, async (req, res, next) => {
    try {
        const { document } = await authorize(req.user, req.params.id, 'edit', getReqContext(req));

        // Mass assignment protection: whitelist fields
        const { title, category } = req.body || {};
        const newTitle = (title && typeof title === 'string') ? title.trim().substring(0, 255) : document.title;
        const newCategory = (category && typeof category === 'string') ? category.trim().substring(0, 100) : document.category;

        await db.query(`
            UPDATE documents 
            SET title = $1, category = $2, updated_at = NOW()
            WHERE id = $3;
        `, [newTitle, newCategory, document.id]);

        const context = getReqContext(req);
        await auditService.logEvent({
            actorId: req.user.id,
            actorIp: context.ip,
            userAgent: context.userAgent,
            action: 'edit',
            documentId: document.id,
            outcome: 'allowed',
            reason: 'DOCUMENT_METADATA_UPDATED',
            metadata: {
                previousTitle: document.title,
                newTitle,
                previousCategory: document.category,
                newCategory
            }
        });

        res.json({
            message: 'Document updated successfully.',
            document: {
                id: document.id,
                title: newTitle,
                category: newCategory
            }
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 8. DELETE /api/documents/:id (Soft-delete, requires owner)
// ============================================================================
router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        const { document } = await authorize(req.user, req.params.id, 'delete', getReqContext(req));

        // Soft delete and increment grant_version to invalidate outstanding tickets
        await db.query(`
            UPDATE documents 
            SET deleted_at = NOW(), grant_version = grant_version + 1, updated_at = NOW()
            WHERE id = $1;
        `, [document.id]);

        res.json({ message: 'Document soft-deleted successfully.' });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 9. GET /api/documents/:id/grants (List grants, owner only)
// ============================================================================
router.get('/:id/grants', requireAuth, async (req, res, next) => {
    try {
        const { document } = await authorize(req.user, req.params.id, 'list_grants', getReqContext(req));

        const result = await db.query(`
            SELECT g.id, g.permission, g.expires_at, g.revoked_at, g.created_at,
                   u.id AS grantee_id, u.email AS grantee_email, u.full_name AS grantee_name,
                   u.department AS grantee_department
            FROM grants g
            JOIN users u ON g.grantee_user_id = u.id
            WHERE g.document_id = $1
            ORDER BY g.created_at DESC;
        `, [document.id]);

        res.json({
            grants: result.rows.map(r => ({
                id: r.id,
                permission: r.permission,
                revoked: !!r.revoked_at,
                revokedAt: r.revoked_at,
                expiresAt: r.expires_at,
                createdAt: r.created_at,
                grantee: {
                    id: r.grantee_id,
                    email: r.grantee_email,
                    name: r.grantee_name,
                    department: r.grantee_department
                }
            }))
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 10. POST /api/documents/:id/grants (Create Grant, owner only)
// ============================================================================
router.post('/:id/grants', requireAuth, async (req, res, next) => {
    try {
        const { document } = await authorize(req.user, req.params.id, 'grant', getReqContext(req));
        const { granteeEmail, permission } = req.body || {};

        if (!granteeEmail || !permission || !['read', 'edit'].includes(permission)) {
            return res.status(400).json({ error: 'Valid granteeEmail and permission (read or edit) are required.' });
        }

        // Lookup grantee user
        const userRes = await db.query('SELECT id, email, full_name, is_active FROM users WHERE email = $1 LIMIT 1', [granteeEmail.trim().toLowerCase()]);
        const grantee = userRes.rows[0];

        if (!grantee || !grantee.is_active) {
            return res.status(404).json({ error: 'Grantee user account does not exist or is inactive.' });
        }

        // Cannot grant yourself
        if (grantee.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot grant permissions to yourself (you are the owner).' });
        }

        const grantId = crypto.randomUUID();

        // Insert grant
        await db.query(`
            INSERT INTO grants (id, document_id, grantee_user_id, granted_by_user_id, permission)
            VALUES ($1, $2, $3, $4, $5);
        `, [grantId, document.id, grantee.id, req.user.id, permission]);

        // Increment grant_version
        await db.query('UPDATE documents SET grant_version = grant_version + 1 WHERE id = $1', [document.id]);

        // Audit log
        await auditService.logEvent({
            actorId: req.user.id,
            action: 'grant',
            documentId: document.id,
            targetUserId: grantee.id,
            outcome: 'allowed',
            reason: `GRANTED_${permission.toUpperCase()}_ACCESS`,
            metadata: { permission, granteeEmail: grantee.email }
        });

        res.status(201).json({
            message: `Granted ${permission} access to ${grantee.email}.`,
            grant: {
                id: grantId,
                granteeEmail: grantee.email,
                permission
            }
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 11. POST /api/documents/:id/grants/:grantId/revoke (Revoke Grant, owner only)
// ============================================================================
router.post('/:id/grants/:grantId/revoke', requireAuth, async (req, res, next) => {
    try {
        const { document } = await authorize(req.user, req.params.id, 'revoke', getReqContext(req));
        const { grantId } = req.params;

        // Fetch grant to identify target user for audit
        const grantRes = await db.query('SELECT grantee_user_id, revoked_at FROM grants WHERE id = $1 AND document_id = $2', [grantId, document.id]);
        const targetGrant = grantRes.rows[0];

        if (!targetGrant) {
            return res.status(404).json({ error: 'Grant not found for this document.' });
        }

        if (targetGrant.revoked_at) {
            return res.status(400).json({ error: 'Grant has already been revoked.' });
        }

        // Revoke grant and increment grant_version (instant invalidation of tickets)
        await db.query('UPDATE grants SET revoked_at = NOW() WHERE id = $1', [grantId]);
        await db.query('UPDATE documents SET grant_version = grant_version + 1 WHERE id = $1', [document.id]);

        // Audit log revocation
        await auditService.logEvent({
            actorId: req.user.id,
            action: 'revoke',
            documentId: document.id,
            targetUserId: targetGrant.grantee_user_id,
            outcome: 'allowed',
            reason: 'GRANT_REVOKED_BY_OWNER',
            metadata: { grantId }
        });

        res.json({ message: 'Grant revoked immediately. Access has been terminated.' });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 12. POST /api/documents/:id/ai-suggest & /ai-recipients (AI Access Recommendations)
// ============================================================================
const handleAiSuggest = async (req, res, next) => {
    try {
        // Must be authorized as owner to request recipient suggestions
        const { document } = await authorize(req.user, req.params.id, 'grant', getReqContext(req));

        const result = await aiService.suggestRecipients(document, req.user, getReqContext(req));

        res.json(result);
    } catch (err) {
        next(err);
    }
};

router.post('/:id/ai-suggest', requireAuth, handleAiSuggest);
router.post('/:id/ai-recipients', requireAuth, handleAiSuggest);

export default router;
