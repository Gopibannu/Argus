import { db } from '../db/pool.js';
import { auditService } from './auditService.js';

export const ALLOWED_ACTIONS = [
    'read',
    'download',
    'edit',
    'delete',
    'grant',
    'revoke',
    'list_grants'
];

/**
 * SECURITY CHOKE POINT: The single invariant authorization gatekeeper for Argus.
 * 
 * Rules:
 *  1. Default Deny on all paths.
 *  2. Return 404 (not 403) for nonexistent or unauthorized documents (anti-IDOR existence leaks).
 *  3. Admin role does NOT grant blanket content access (Least Privilege).
 *  4. Grantees cannot grant, revoke, or delete documents (only owners can).
 *  5. Every evaluation (allowed and denied) is written to the cryptographic audit trail.
 */
export async function authorize(user, documentId, action, reqContext = {}) {
    const actorIp = reqContext.ip || '127.0.0.1';
    const userAgent = reqContext.userAgent || 'Unknown';

    // 1. Invariant action allowlist validation
    if (!action || !ALLOWED_ACTIONS.includes(action)) {
        await auditService.logEvent({
            actorId: user?.id,
            actorIp,
            userAgent,
            action: action || 'unknown_action',
            documentId,
            outcome: 'denied',
            reason: 'INVALID_OR_UNKNOWN_ACTION'
        });
        const err = new Error('Document not found.'); // 404 anti-enumeration
        err.status = 404;
        throw err;
    }

    // 2. User must be authenticated
    if (!user || !user.id) {
        await auditService.logEvent({
            actorId: null,
            actorIp,
            userAgent,
            action,
            documentId,
            outcome: 'denied',
            reason: 'UNAUTHENTICATED_ACCESS_ATTEMPT'
        });
        const err = new Error('Document not found.');
        err.status = 404;
        throw err;
    }

    // 3. Query document from DB (Live database lookup, ignoring soft-deleted)
    const docRes = await db.query(`
        SELECT id, owner_id, title, original_filename, storage_key, mime_type,
               file_size_bytes, sha256_checksum, encrypted_data_key, encryption_iv,
               category, grant_version, deleted_at
        FROM documents
        WHERE id = $1 AND deleted_at IS NULL
        LIMIT 1;
    `, [documentId]);

    const document = docRes.rows[0];

    // Document does not exist or was deleted -> 404 & audit
    if (!document) {
        await auditService.logEvent({
            actorId: user.id,
            actorIp,
            userAgent,
            action,
            documentId,
            outcome: 'denied',
            reason: 'DOCUMENT_NOT_FOUND_OR_DELETED'
        });
        const err = new Error('Document not found.');
        err.status = 404;
        throw err;
    }

    // 4. Document Owner has full authority over their own document
    if (document.owner_id === user.id) {
        await auditService.logEvent({
            actorId: user.id,
            actorIp,
            userAgent,
            action,
            documentId,
            outcome: 'allowed',
            reason: 'DOCUMENT_OWNER_AUTHORIZED'
        });
        return { authorized: true, role: 'owner', document };
    }

    // 5. Actions reserved STRICTLY for the owner (Delete, Grant, Revoke)
    // Grantees (even with 'edit') and Admins CANNOT manage permissions or delete.
    if (action === 'delete' || action === 'grant' || action === 'revoke') {
        await auditService.logEvent({
            actorId: user.id,
            actorIp,
            userAgent,
            action,
            documentId,
            outcome: 'denied',
            reason: 'OWNER_ONLY_ACTION_ATTEMPTED_BY_NON_OWNER'
        });
        // 403 when user knows the document (e.g. grantee trying to grant others)
        const err = new Error('Permission denied. Only the document owner can manage permissions or delete this document.');
        err.status = 403;
        throw err;
    }

    // 6. Live Grant Lookup (Verifies non-revoked, non-expired grant in PostgreSQL)
    const grantRes = await db.query(`
        SELECT id, document_id, grantee_user_id, granted_by_user_id, permission,
               expires_at, revoked_at
        FROM grants
        WHERE document_id = $1 
          AND grantee_user_id = $2 
          AND revoked_at IS NULL 
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1;
    `, [documentId, user.id]);

    const grant = grantRes.rows[0];

    // No active grant found
    if (!grant) {
        await auditService.logEvent({
            actorId: user.id,
            actorIp,
            userAgent,
            action,
            documentId,
            outcome: 'denied',
            reason: user.role === 'admin' 
                ? 'ADMIN_LEAST_PRIVILEGE_DENIED_WITHOUT_GRANT' 
                : 'NO_ACTIVE_GRANT'
        });

        // SECURITY: Uniform 404 Not Found to prevent IDOR existence enumeration
        const err = new Error('Document not found.');
        err.status = 404;
        throw err;
    }

    // 7. Verify permission level for action
    if (action === 'edit' && grant.permission !== 'edit') {
        await auditService.logEvent({
            actorId: user.id,
            actorIp,
            userAgent,
            action,
            documentId,
            outcome: 'denied',
            reason: 'READ_ONLY_GRANTEE_ATTEMPTED_EDIT'
        });
        const err = new Error('Permission denied. You have read-only access to this document.');
        err.status = 403;
        throw err;
    }

    // 8. Access Allowed
    await auditService.logEvent({
        actorId: user.id,
        actorIp,
        userAgent,
        action,
        documentId,
        outcome: 'allowed',
        reason: `VALID_${grant.permission.toUpperCase()}_GRANT`
    });

    return { authorized: true, role: grant.permission, document, grant };
}
