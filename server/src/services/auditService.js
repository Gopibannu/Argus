import crypto from 'node:crypto';
import { db } from '../db/pool.js';

export const auditService = {
    /**
     * Compute canonical SHA-256 hash for a row in the audit chain
     */
    computeRowHash(row, prevHash) {
        const canonical = [
            row.sequence_id,
            new Date(row.timestamp).toISOString(),
            row.actor_id || 'SYSTEM',
            row.action,
            row.outcome,
            row.document_id || 'NONE',
            row.target_user_id || 'NONE',
            JSON.stringify(row.metadata || {}),
            prevHash
        ].join('|');

        return crypto.createHash('sha256').update(canonical).digest('hex');
    },

    /**
     * Record an audit event into the tamper-evident hash chain
     * @param {Object} event Event details
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
            // 1. Fetch latest audit row to get prev_hash and sequence_id
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
            // Non-negotiable #2: Actions must fail if audit write fails
            throw new Error(`Audit log failure: ${err.message}`);
        }
    }
};
