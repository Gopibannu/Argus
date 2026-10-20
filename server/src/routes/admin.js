import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/session.js';
import { auditService } from '../services/auditService.js';
import { db } from '../db/pool.js';

const router = Router();

// SECURITY: Strictly restrict all admin routes to users with role = 'admin'
router.use(requireAuth, requireRole('admin'));

// ============================================================================
// 1. GET /api/admin/audit/verify (Cryptographic Hash Chain Integrity Check)
// ============================================================================
router.get('/audit/verify', async (req, res, next) => {
    try {
        const verification = await auditService.verifyChain();

        res.json({
            status: verification.valid ? 'INTEACT' : 'TAMPERED',
            valid: verification.valid,
            totalRowsVerified: verification.totalRows,
            headHash: verification.headHash,
            brokenRowIndex: verification.brokenRowIndex,
            sequenceId: verification.sequenceId,
            error: verification.error,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 2. GET /api/admin/audit (Search, filter, and stream audit trail entries)
// ============================================================================
router.get('/audit', async (req, res, next) => {
    try {
        const { limit, outcome, action, actorId } = req.query;
        const entries = await auditService.getAuditTrail({
            limit: limit ? parseInt(limit, 10) : 100,
            outcome,
            action,
            actorId
        });

        res.json({
            auditTrail: entries.map(row => ({
                sequenceId: parseInt(row.sequence_id, 10),
                id: row.id,
                timestamp: row.timestamp,
                actor: {
                    id: row.actor_id,
                    name: row.actor_name || 'System / Unauthenticated',
                    email: row.actor_email || 'N/A',
                    ip: row.actor_ip,
                    userAgent: row.user_agent
                },
                action: row.action,
                outcome: row.outcome,
                reason: row.reason,
                document: row.document_id ? {
                    id: row.document_id,
                    title: row.document_title || 'N/A'
                } : null,
                targetUser: row.target_user_id ? {
                    id: row.target_user_id,
                    name: row.target_name,
                    email: row.target_email
                } : null,
                metadata: row.metadata,
                prevHash: row.prev_hash,
                rowHash: row.row_hash
            }))
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 2b. GET /api/admin/audit/export (Export verifiable audit trail snapshot)
// ============================================================================
router.get('/audit/export', async (req, res, next) => {
    try {
        const entries = await auditService.getAuditTrail({ limit: 1000 });
        const verification = await auditService.verifyChain();

        const exportBundle = {
            exportTimestamp: new Date().toISOString(),
            exportedBy: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role
            },
            chainIntegrity: {
                valid: verification.valid,
                totalRecords: verification.totalRows,
                headHash: verification.headHash,
                algorithm: 'SHA-256'
            },
            records: entries.map(row => ({
                sequenceId: parseInt(row.sequence_id, 10),
                timestamp: row.timestamp,
                actorId: row.actor_id,
                action: row.action,
                outcome: row.outcome,
                reason: row.reason,
                documentId: row.document_id,
                targetUserId: row.target_user_id,
                prevHash: row.prev_hash,
                rowHash: row.row_hash
            }))
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="argus-audit-chain.json"');
        res.json(exportBundle);
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 3. GET /api/admin/metrics (Security metrics & Anomaly detection stats)
// ============================================================================
router.get('/metrics', async (req, res, next) => {
    try {
        const metrics = await auditService.getSecurityMetrics();
        res.json(metrics);
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 4. GET /api/admin/users (List users and account status)
// ============================================================================
router.get('/users', async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT id, email, full_name, role, department, is_active, created_at, updated_at
            FROM users
            ORDER BY created_at ASC;
        `);

        res.json({
            users: result.rows.map(u => ({
                id: u.id,
                email: u.email,
                fullName: u.full_name,
                role: u.role,
                department: u.department,
                isActive: u.is_active,
                createdAt: u.created_at
            }))
        });
    } catch (err) {
        next(err);
    }
});

// ============================================================================
// 5. POST /api/admin/users/:id/toggle-status (Enable/Disable user with instant lockout)
// ============================================================================
router.post('/users/:id/toggle-status', async (req, res, next) => {
    try {
        const targetUserId = req.params.id;

        // Fetch current status
        const userRes = await db.query('SELECT id, email, is_active FROM users WHERE id = $1', [targetUserId]);
        const targetUser = userRes.rows[0];

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const newStatus = !targetUser.is_active;

        // Update user status
        await db.query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [newStatus, targetUserId]);

        // If disabling, terminate all active sessions immediately
        if (!newStatus) {
            await db.query('DELETE FROM sessions WHERE user_id = $1', [targetUserId]);
        }

        // Audit log action
        await auditService.logEvent({
            actorId: req.user.id,
            action: newStatus ? 'user_enabled' : 'user_disabled',
            targetUserId: targetUser.id,
            outcome: 'allowed',
            reason: `ADMIN_${newStatus ? 'ENABLED' : 'DISABLED'}_USER_ACCOUNT`,
            metadata: { targetEmail: targetUser.email, newStatus }
        });

        res.json({
            message: `User ${targetUser.email} account ${newStatus ? 'activated' : 'deactivated (all sessions terminated)'}.`,
            isActive: newStatus
        });
    } catch (err) {
        next(err);
    }
});

export default router;
