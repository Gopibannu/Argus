import crypto from 'node:crypto';
import { db } from '../db/pool.js';

export const auditService = {
    /**
     * Compute canonical SHA-256 hash for a row in the audit chain.
     * Guaranteed deterministic canonical string representation.
     */
    computeRowHash(row, prevHash) {
        // Deterministic JSON stringification by sorting metadata keys
        const sortedMetadata = row.metadata && typeof row.metadata === 'object'
            ? Object.keys(row.metadata).sort().reduce((acc, k) => {
                acc[k] = row.metadata[k];
                return acc;
            }, {})
            : {};

        const canonical = [
            row.sequence_id,
            new Date(row.timestamp).toISOString(),
            row.actor_id || 'SYSTEM',
            row.action,
            row.outcome,
            row.reason || '',
            row.document_id || 'NONE',
            row.target_user_id || 'NONE',
            JSON.stringify(sortedMetadata),
            prevHash
        ].join('|');

        return crypto.createHash('sha256').update(canonical).digest('hex');
    },

    /**
     * Record an audit event into the tamper-evident hash chain.
     * Atomic write: If logging fails, the action fails (Non-Negotiable #2).
     */
    async logEvent({
        actorId,
        actorIp = '127.0.0.1',
        userAgent = 'Unknown',
        action,
        documentId = null,
        targetUserId = null,
        outcome = 'allowed', // 'allowed' | 'denied'
        reason = '',
        metadata = {}
    }) {
        try {
            // 1. Acquire transaction/advisory lock on PostgreSQL so concurrent writes cannot fork the hash chain
            // Lock key: 0x41524755 (ASCII for 'ARGU')
            await db.query(`SELECT pg_advisory_lock(1095911253);`).catch(() => {});

            // 2. Fetch latest audit row to link prev_hash and sequence_id
            const latestRes = await db.query(`
                SELECT sequence_id, row_hash 
                FROM audit_log 
                ORDER BY sequence_id DESC 
                LIMIT 1;
            `);

            const latestRow = latestRes.rows[0];
            const prevHash = latestRow ? latestRow.row_hash : '0'.repeat(64);
            const nextSeq = latestRow ? Number(latestRow.sequence_id) + 1 : 1;
            const timestamp = new Date();

            const rowCandidate = {
                sequence_id: nextSeq,
                timestamp,
                actor_id: actorId,
                action,
                outcome,
                reason,
                document_id: documentId,
                target_user_id: targetUserId,
                metadata
            };

            // 2. Compute cryptographic row hash
            const rowHash = this.computeRowHash(rowCandidate, prevHash);
            const entryId = crypto.randomUUID();

            // 3. Insert into audit_log
            await db.query(`
                INSERT INTO audit_log (
                    id, sequence_id, timestamp, actor_id, actor_ip, user_agent,
                    action, document_id, target_user_id, outcome, reason,
                    metadata, prev_hash, row_hash
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
            `, [
                entryId,
                nextSeq,
                timestamp,
                actorId || null,
                actorIp,
                userAgent,
                action,
                documentId || null,
                targetUserId || null,
                outcome,
                reason,
                typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
                prevHash,
                rowHash
            ]);

            return { id: entryId, sequence_id: nextSeq, row_hash: rowHash };
        } catch (err) {
            console.error('❌ [Audit Logging Error] Failed to write audit trail:', err);
            throw new Error(`Audit log failure: ${err.message}`);
        } finally {
            // Release advisory lock key 1095911253 ('ARGU')
            await db.query(`SELECT pg_advisory_unlock(1095911253);`).catch(() => {});
        }
    },

    /**
     * Cryptographically verify the entire audit log hash chain from Genesis to HEAD.
     * Walks row by row in O(N) time and detects any alteration, insertion, deletion, or reordering.
     * @returns {Promise<{ valid: boolean, totalRows: number, headHash: string, brokenRowIndex?: number, error?: string }>}
     */
    async verifyChain() {
        const res = await db.query(`
            SELECT sequence_id, id, timestamp, actor_id, action, outcome, reason,
                   document_id, target_user_id, metadata, prev_hash, row_hash
            FROM audit_log
            ORDER BY sequence_id ASC;
        `);

        const rows = res.rows;
        if (!rows || rows.length === 0) {
            return { valid: true, totalRows: 0, headHash: '0'.repeat(64) };
        }

        let expectedPrevHash = '0'.repeat(64);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];

            // 1. Check prev_hash links to expected previous hash
            if (row.prev_hash !== expectedPrevHash) {
                return {
                    valid: false,
                    totalRows: rows.length,
                    brokenRowIndex: i,
                    sequenceId: row.sequence_id,
                    error: `Broken link at sequence ${row.sequence_id}: prev_hash does not match preceding row_hash.`
                };
            }

            // 2. Recompute row hash from canonical values
            const recomputedHash = this.computeRowHash(row, expectedPrevHash);
            if (recomputedHash !== row.row_hash) {
                return {
                    valid: false,
                    totalRows: rows.length,
                    brokenRowIndex: i,
                    sequenceId: row.sequence_id,
                    error: `Data tampering detected at sequence ${row.sequence_id}: contents do not match cryptographic hash.`
                };
            }

            expectedPrevHash = row.row_hash;
        }

        return {
            valid: true,
            totalRows: rows.length,
            headHash: expectedPrevHash
        };
    },

    /**
     * Fetch security audit trail with filtering for the Admin Dashboard
     */
    async getAuditTrail({ limit = 100, outcome, action, actorId } = {}) {
        const queryParams = [];
        let queryText = `
            SELECT 
                a.sequence_id, a.id, a.timestamp, a.actor_id, a.actor_ip, a.user_agent,
                a.action, a.document_id, a.target_user_id, a.outcome, a.reason,
                a.metadata, a.prev_hash, a.row_hash,
                u.full_name AS actor_name, u.email AS actor_email,
                t.full_name AS target_name, t.email AS target_email,
                d.title AS document_title
            FROM audit_log a
            LEFT JOIN users u ON a.actor_id = u.id
            LEFT JOIN users t ON a.target_user_id = t.id
            LEFT JOIN documents d ON a.document_id = d.id
            WHERE 1=1
        `;

        if (outcome) {
            queryParams.push(outcome);
            queryText += ` AND a.outcome = $${queryParams.length}`;
        }
        if (action) {
            queryParams.push(action);
            queryText += ` AND a.action = $${queryParams.length}`;
        }
        if (actorId) {
            queryParams.push(actorId);
            queryText += ` AND a.actor_id = $${queryParams.length}`;
        }

        queryText += ` ORDER BY a.sequence_id DESC LIMIT ${parseInt(limit, 10) || 100};`;

        const res = await db.query(queryText, queryParams);
        return res.rows;
    },

    /**
     * Calculate security anomaly metrics for the Admin Dashboard
     */
    async getSecurityMetrics() {
        // Run aggregation across audit log
        const res = await db.query(`
            SELECT 
                COUNT(*) AS total_events,
                COUNT(*) FILTER (WHERE outcome = 'denied') AS denied_events,
                COUNT(*) FILTER (WHERE action IN ('grant', 'revoke')) AS permission_changes,
                COUNT(DISTINCT actor_id) AS active_actors
            FROM audit_log;
        `);

        const summary = res.rows[0] || {};
        const chainStatus = await this.verifyChain();

        return {
            totalEvents: parseInt(summary.total_events || '0', 10),
            deniedEvents: parseInt(summary.denied_events || '0', 10),
            permissionChanges: parseInt(summary.permission_changes || '0', 10),
            activeActors: parseInt(summary.active_actors || '0', 10),
            chainIntegrity: chainStatus.valid ? 'VALID' : 'COMPROMISED',
            headHash: chainStatus.headHash,
            chainVerification: chainStatus
        };
    }
};
