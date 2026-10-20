import pg from 'pg';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config/env.js';

const { Pool } = pg;

let pool = null;

// ============================================================================
// In-Memory Database Fallback (For offline testing & zero-setup CI)
// Maintains users, sessions, documents, grants, download_tickets, audit_log
// ============================================================================
class InMemoryDatabase {
    constructor() {
        this.users = new Map();
        this.sessions = new Map();
        this.documents = new Map();
        this.grants = new Map();
        this.downloadTickets = new Map();
        this.auditLog = [];
        this.sequenceId = 1;
        this.initSeedData();
    }

    initSeedData() {
        const hash = bcrypt.hashSync('Password@Argus2026!', 10);
        const seedUsers = [
            { id: 'a0000000-0000-0000-0000-000000000001', email: 'admin@argus.local', password_hash: hash, full_name: 'Alice Admin', role: 'admin', department: 'Security Operations', is_active: true },
            { id: 'b0000000-0000-0000-0000-000000000001', email: 'owner1@argus.local', password_hash: hash, full_name: 'Bob Owner', role: 'owner', department: 'Engineering', is_active: true },
            { id: 'b0000000-0000-0000-0000-000000000002', email: 'owner2@argus.local', password_hash: hash, full_name: 'Carol Owner', role: 'owner', department: 'Finance', is_active: true },
            { id: 'c0000000-0000-0000-0000-000000000001', email: 'viewer1@argus.local', password_hash: hash, full_name: 'Dave Viewer', role: 'viewer', department: 'Compliance', is_active: true },
            { id: 'c0000000-0000-0000-0000-000000000002', email: 'viewer2@argus.local', password_hash: hash, full_name: 'Eve Viewer', role: 'viewer', department: 'Contractor', is_active: true },
            { id: 'd0000000-0000-0000-0000-000000000001', email: 'disabled@argus.local', password_hash: hash, full_name: 'Dan Disabled', role: 'viewer', department: 'Terminated', is_active: false }
        ];

        for (const u of seedUsers) {
            this.users.set(u.id, { ...u, created_at: new Date(), updated_at: new Date() });
        }

        // Genesis row for audit
        const genesisRow = {
            sequence_id: 1,
            id: '00000000-0000-0000-0000-000000000001',
            timestamp: new Date('2026-10-19T00:00:00Z'),
            actor_id: 'a0000000-0000-0000-0000-000000000001',
            actor_ip: '127.0.0.1',
            user_agent: 'System/Genesis',
            action: 'system_init',
            document_id: null,
            target_user_id: null,
            outcome: 'allowed',
            reason: 'Argus Security Engine Initialized',
            metadata: { version: '1.0.0', chain: 'genesis' },
            prev_hash: '0'.repeat(64),
            row_hash: 'a86159f4308d18327bb958ec90c78f2d6dae2118ffc4494b05d2701a8acf8e6a'
        };
        this.auditLog.push(genesisRow);
        this.sequenceId = 2;
    }

    async query(text, params = []) {
        const queryText = text.trim();
        const upper = queryText.toUpperCase();

        // 1. Transaction statements
        if (upper === 'BEGIN' || upper === 'COMMIT' || upper === 'ROLLBACK') {
            return { rows: [], rowCount: 0 };
        }

        // 1b. Update user (e.g. toggle is_active status)
        if (upper.startsWith('UPDATE USERS') && upper.includes('IS_ACTIVE = $1')) {
            const [isActive, userId] = params;
            const user = this.users.get(userId);
            if (user) {
                user.is_active = isActive;
                user.updated_at = new Date();
                return { rows: [user], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }

        // 1c. Select all users (for admin users list)
        if (upper.startsWith('SELECT') && upper.includes('FROM USERS') && upper.includes('ORDER BY CREATED_AT ASC')) {
            const list = Array.from(this.users.values()).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            return { rows: list, rowCount: list.length };
        }

        // 1d. Select active users excluding requesting user (for AI suggestions)
        if (upper.includes('FROM USERS') && upper.includes('IS_ACTIVE = TRUE') && upper.includes('ID != $1')) {
            const excludeId = params[0];
            const list = Array.from(this.users.values())
                .filter(u => u.is_active && u.id !== excludeId)
                .sort((a, b) => a.department.localeCompare(b.department));
            return { rows: list, rowCount: list.length };
        }

        // 2. Select user by email
        if (upper.includes('FROM USERS') && upper.includes('EMAIL = $1')) {
            const email = params[0]?.toLowerCase();
            const user = Array.from(this.users.values()).find(u => u.email.toLowerCase() === email);
            return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
        }

        // 2b. Insert user
        if (upper.startsWith('INSERT INTO USERS')) {
            const [id, email, passwordHash, fullName, role, department, isActive] = params;
            const newUser = {
                id: id || crypto.randomUUID(),
                email: email.toLowerCase(),
                password_hash: passwordHash,
                full_name: fullName,
                role: role || 'viewer',
                department: department || 'General',
                is_active: isActive !== undefined ? Boolean(isActive) : true,
                created_at: new Date(),
                updated_at: new Date()
            };
            this.users.set(newUser.id, newUser);
            return { rows: [newUser], rowCount: 1 };
        }

        // 3. Select user by id
        if (upper.includes('FROM USERS') && upper.includes('ID = $1')) {
            const id = params[0];
            const user = this.users.get(id);
            return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
        }

        // 4. Select session join user
        if (upper.startsWith('SELECT') && upper.includes('FROM SESSIONS') && upper.includes('TOKEN_HASH = $1')) {
            const tokenHash = params[0];
            const session = Array.from(this.sessions.values()).find(s => s.token_hash === tokenHash && new Date(s.expires_at) > new Date());
            if (!session) return { rows: [], rowCount: 0 };
            const user = this.users.get(session.user_id);
            if (!user) return { rows: [], rowCount: 0 };

            return {
                rows: [{
                    session_id: session.id,
                    user_id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    department: user.department,
                    is_active: user.is_active,
                    expires_at: session.expires_at
                }],
                rowCount: 1
            };
        }

        // 5. Insert session
        if (upper.startsWith('INSERT INTO SESSIONS')) {
            const [id, userId, tokenHash, ip, ua, expiresAt] = params;
            const newSession = {
                id: id || crypto.randomUUID(),
                user_id: userId,
                token_hash: tokenHash,
                ip_address: ip,
                user_agent: ua,
                expires_at: expiresAt,
                created_at: new Date()
            };
            this.sessions.set(newSession.id, newSession);
            return { rows: [newSession], rowCount: 1 };
        }

        // 6. Delete session by token_hash
        if (upper.startsWith('DELETE FROM SESSIONS') && upper.includes('TOKEN_HASH = $1')) {
            const tokenHash = params[0];
            let deleted = 0;
            for (const [id, s] of this.sessions.entries()) {
                if (s.token_hash === tokenHash) {
                    this.sessions.delete(id);
                    deleted++;
                }
            }
            return { rows: [], rowCount: deleted };
        }

        // 7. Delete all sessions for user_id
        if (upper.startsWith('DELETE FROM SESSIONS') && upper.includes('USER_ID = $1')) {
            const userId = params[0];
            let deleted = 0;
            for (const [id, s] of this.sessions.entries()) {
                if (s.user_id === userId) {
                    this.sessions.delete(id);
                    deleted++;
                }
            }
            return { rows: [], rowCount: deleted };
        }

        // 8a. Select audit rows by action and document_id
        if (upper.includes('FROM AUDIT_LOG') && upper.includes('WHERE ACTION =') && upper.includes('DOCUMENT_ID = $1')) {
            const docId = params[0];
            const filtered = this.auditLog.filter(e => e.action === 'ai_suggestion_generated' && e.document_id === docId);
            const sorted = [...filtered].sort((a, b) => b.sequence_id - a.sequence_id);
            return { rows: sorted, rowCount: sorted.length };
        }

        // 8. Select latest audit row
        if (upper.includes('FROM AUDIT_LOG') && upper.includes('ORDER BY SEQUENCE_ID DESC') && upper.includes('LIMIT 1')) {
            if (this.auditLog.length === 0) return { rows: [], rowCount: 0 };
            const latest = this.auditLog[this.auditLog.length - 1];
            return { rows: [latest], rowCount: 1 };
        }

        // 8b. Select all audit rows for chain verification (ORDER BY sequence_id ASC)
        if (upper.includes('FROM AUDIT_LOG') && upper.includes('ORDER BY SEQUENCE_ID ASC')) {
            const sorted = [...this.auditLog].sort((a, b) => a.sequence_id - b.sequence_id);
            return { rows: sorted, rowCount: sorted.length };
        }

        // 8c. Aggregated audit metrics
        if (upper.includes('SELECT') && upper.includes('COUNT(*) AS TOTAL_EVENTS') && upper.includes('FROM AUDIT_LOG')) {
            const total = this.auditLog.length;
            const denied = this.auditLog.filter(e => e.outcome === 'denied').length;
            const permChanges = this.auditLog.filter(e => e.action === 'grant' || e.action === 'revoke').length;
            const uniqueActors = new Set(this.auditLog.map(e => e.actor_id).filter(Boolean)).size;
            return {
                rows: [{
                    total_events: total,
                    denied_events: denied,
                    permission_changes: permChanges,
                    active_actors: uniqueActors
                }],
                rowCount: 1
            };
        }

        // 8d. Audit Trail search & filter list (ORDER BY sequence_id DESC)
        if (upper.includes('FROM AUDIT_LOG A') && upper.includes('ORDER BY A.SEQUENCE_ID DESC')) {
            const sorted = [...this.auditLog].sort((a, b) => b.sequence_id - a.sequence_id);
            const enriched = sorted.map(row => {
                const actor = this.users.get(row.actor_id);
                const target = this.users.get(row.target_user_id);
                const doc = this.documents.get(row.document_id);
                return {
                    ...row,
                    actor_name: actor ? actor.full_name : 'System / Anonymous',
                    actor_email: actor ? actor.email : 'N/A',
                    target_name: target ? target.full_name : null,
                    target_email: target ? target.email : null,
                    document_title: doc ? doc.title : null
                };
            });
            return { rows: enriched, rowCount: enriched.length };
        }

        // 9. Insert into audit_log
        if (upper.startsWith('INSERT INTO AUDIT_LOG')) {
            const [id, seq, timestamp, actorId, ip, ua, action, docId, targetUserId, outcome, reason, metadata, prevHash, rowHash] = params;
            let parsedMeta = {};
            try {
                parsedMeta = typeof metadata === 'string' ? JSON.parse(metadata) : (metadata || {});
            } catch (_) {
                parsedMeta = { raw: metadata };
            }

            const entry = {
                sequence_id: seq || this.sequenceId++,
                id: id || crypto.randomUUID(),
                timestamp: timestamp || new Date(),
                actor_id: actorId,
                actor_ip: ip,
                user_agent: ua,
                action,
                document_id: docId,
                target_user_id: targetUserId,
                outcome,
                reason,
                metadata: parsedMeta,
                prev_hash: prevHash,
                row_hash: rowHash
            };
            this.auditLog.push(entry);
            return { rows: [entry], rowCount: 1 };
        }

        // 10. Prevent UPDATE or DELETE on audit_log (mimic DB trigger)
        if (upper.includes('UPDATE AUDIT_LOG') || upper.includes('DELETE FROM AUDIT_LOG') || upper.includes('TRUNCATE AUDIT_LOG')) {
            const err = new Error('SECURITY VIOLATION: The audit_log table is append-only. Modifying or deleting audit records is strictly prohibited.');
            err.code = '42501';
            throw err;
        }

        // 11. Documents: INSERT INTO documents
        if (upper.startsWith('INSERT INTO DOCUMENTS')) {
            const [id, ownerId, title, filename, storageKey, mime, size, sha256, encKey, encIv, category] = params;
            const doc = {
                id,
                owner_id: ownerId,
                title,
                original_filename: filename,
                storage_key: storageKey,
                mime_type: mime,
                file_size_bytes: size,
                sha256_checksum: sha256,
                encrypted_data_key: encKey,
                encryption_iv: encIv,
                category: category || 'General',
                grant_version: 1,
                deleted_at: null,
                created_at: new Date(),
                updated_at: new Date()
            };
            this.documents.set(doc.id, doc);
            return { rows: [doc], rowCount: 1 };
        }

        // 12. Documents: SELECT by id WHERE deleted_at IS NULL
        if (upper.startsWith('SELECT') && upper.includes('FROM DOCUMENTS') && upper.includes('WHERE ID = $1') && upper.includes('DELETED_AT IS NULL')) {
            const id = params[0];
            const doc = this.documents.get(id);
            if (!doc || doc.deleted_at !== null) return { rows: [], rowCount: 0 };
            return { rows: [{ ...doc }], rowCount: 1 };
        }

        // 13. Documents: UPDATE grant_version = grant_version + 1
        if (upper.startsWith('UPDATE DOCUMENTS') && upper.includes('GRANT_VERSION = GRANT_VERSION + 1')) {
            const id = params[params.length - 1];
            const doc = this.documents.get(id);
            if (doc) {
                doc.grant_version = (doc.grant_version || 1) + 1;
                if (upper.includes('DELETED_AT = NOW()')) {
                    doc.deleted_at = new Date();
                }
                doc.updated_at = new Date();
                return { rows: [doc], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }

        // 14. Documents: UPDATE title & category
        if (upper.startsWith('UPDATE DOCUMENTS') && upper.includes('TITLE = $1')) {
            const [newTitle, newCategory, id] = params;
            const doc = this.documents.get(id);
            if (doc) {
                doc.title = newTitle;
                doc.category = newCategory;
                doc.updated_at = new Date();
                return { rows: [doc], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }

        // 15. Documents: Search & list query with SQL filtering
        if (upper.startsWith('SELECT DISTINCT') && upper.includes('FROM DOCUMENTS D')) {
            const userId = params[0];
            const searchPattern = params.find(p => typeof p === 'string' && p.startsWith('%') && p.endsWith('%'))?.replace(/%/g, '').toLowerCase();
            const categoryFilter = params.find(p => ['engineering', 'finance', 'legal', 'compliance', 'general'].includes(String(p).toLowerCase()));

            const results = [];
            for (const doc of this.documents.values()) {
                if (doc.deleted_at !== null) continue;

                const isOwner = doc.owner_id === userId;
                const activeGrant = Array.from(this.grants.values()).find(g => 
                    g.document_id === doc.id && 
                    g.grantee_user_id === userId && 
                    g.revoked_at === null && 
                    (!g.expires_at || new Date(g.expires_at) > new Date())
                );

                if (!isOwner && !activeGrant) continue;

                if (searchPattern) {
                    const matchTitle = doc.title.toLowerCase().includes(searchPattern);
                    const matchFilename = doc.original_filename.toLowerCase().includes(searchPattern);
                    if (!matchTitle && !matchFilename) continue;
                }

                if (categoryFilter && doc.category.toLowerCase() !== categoryFilter.toLowerCase()) {
                    continue;
                }

                const owner = this.users.get(doc.owner_id);
                results.push({
                    id: doc.id,
                    owner_id: doc.owner_id,
                    title: doc.title,
                    original_filename: doc.original_filename,
                    mime_type: doc.mime_type,
                    file_size_bytes: doc.file_size_bytes,
                    category: doc.category,
                    grant_version: doc.grant_version,
                    created_at: doc.created_at,
                    updated_at: doc.updated_at,
                    owner_name: owner ? owner.full_name : 'Unknown',
                    owner_email: owner ? owner.email : 'unknown@argus.local',
                    permission: isOwner ? 'owner' : activeGrant.permission
                });
            }

            results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            // console.log('COMPUTED RESULTS IN POOL:', results);
            return { rows: results, rowCount: results.length };
        }

        // 16. Grants: INSERT INTO grants
        if (upper.startsWith('INSERT INTO GRANTS')) {
            const [id, docId, granteeId, grantedById, permission] = params;
            const grant = {
                id,
                document_id: docId,
                grantee_user_id: granteeId,
                granted_by_user_id: grantedById,
                permission,
                expires_at: null,
                revoked_at: null,
                created_at: new Date()
            };
            this.grants.set(grant.id, grant);
            return { rows: [grant], rowCount: 1 };
        }

        // 17. Grants: SELECT by document_id and grantee_user_id (active)
        if (upper.startsWith('SELECT') && upper.includes('FROM GRANTS') && upper.includes('DOCUMENT_ID = $1') && upper.includes('GRANTEE_USER_ID = $2')) {
            const [docId, granteeId] = params;
            const grant = Array.from(this.grants.values()).find(g =>
                g.document_id === docId &&
                g.grantee_user_id === granteeId &&
                g.revoked_at === null &&
                (!g.expires_at || new Date(g.expires_at) > new Date())
            );
            return { rows: grant ? [{ ...grant }] : [], rowCount: grant ? 1 : 0 };
        }

        // 17b. Grants: SELECT grantee_user_id FROM grants WHERE document_id = $1 (active, for AI service)
        if (upper.startsWith('SELECT') && upper.includes('GRANTEE_USER_ID') && upper.includes('FROM GRANTS') && upper.includes('DOCUMENT_ID = $1')) {
            const docId = params[0];
            const activeGrants = Array.from(this.grants.values()).filter(g =>
                g.document_id === docId &&
                g.revoked_at === null &&
                (!g.expires_at || new Date(g.expires_at) > new Date())
            );
            return { rows: activeGrants.map(g => ({ grantee_user_id: g.grantee_user_id })), rowCount: activeGrants.length };
        }

        // 18. Grants: SELECT by id and document_id
        if (upper.startsWith('SELECT') && upper.includes('FROM GRANTS') && upper.includes('ID = $1') && upper.includes('DOCUMENT_ID = $2')) {
            const [grantId, docId] = params;
            const grant = Array.from(this.grants.values()).find(g => g.id === grantId && g.document_id === docId);
            return { rows: grant ? [{ ...grant }] : [], rowCount: grant ? 1 : 0 };
        }

        // 19. Grants: List all for document_id (JOIN users)
        if (upper.startsWith('SELECT') && upper.includes('FROM GRANTS G') && upper.includes('JOIN USERS U') && upper.includes('G.DOCUMENT_ID = $1')) {
            const docId = params[0];
            const results = [];
            for (const g of this.grants.values()) {
                if (g.document_id === docId) {
                    const u = this.users.get(g.grantee_user_id);
                    results.push({
                        id: g.id,
                        permission: g.permission,
                        expires_at: g.expires_at,
                        revoked_at: g.revoked_at,
                        created_at: g.created_at,
                        grantee_id: u ? u.id : g.grantee_user_id,
                        grantee_email: u ? u.email : 'unknown',
                        grantee_name: u ? u.full_name : 'Unknown User',
                        grantee_department: u ? u.department : 'General'
                    });
                }
            }
            results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return { rows: results, rowCount: results.length };
        }

        // 20. Grants: UPDATE revoked_at = NOW()
        if (upper.startsWith('UPDATE GRANTS') && upper.includes('REVOKED_AT = NOW()')) {
            const grantId = params[0];
            const grant = this.grants.get(grantId);
            if (grant) {
                grant.revoked_at = new Date();
                return { rows: [grant], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }

        // 21. Download Tickets: INSERT INTO download_tickets
        if (upper.startsWith('INSERT INTO DOWNLOAD_TICKETS')) {
            const [id, ticketHash, docId, userId, grantVer, expiresAt] = params;
            const ticket = {
                id,
                ticket_hash: ticketHash,
                document_id: docId,
                user_id: userId,
                grant_version_at_issue: grantVer,
                expires_at: expiresAt,
                used: false,
                created_at: new Date()
            };
            this.downloadTickets.set(ticket.id, ticket);
            return { rows: [ticket], rowCount: 1 };
        }

        // 22. Download Tickets: SELECT by ticket_hash JOIN documents
        if (upper.startsWith('SELECT') && upper.includes('FROM DOWNLOAD_TICKETS T') && upper.includes('JOIN DOCUMENTS D') && upper.includes('T.TICKET_HASH = $1')) {
            const ticketHash = params[0];
            const ticket = Array.from(this.downloadTickets.values()).find(t => t.ticket_hash === ticketHash);
            if (!ticket) return { rows: [], rowCount: 0 };

            const doc = this.documents.get(ticket.document_id);
            if (!doc) return { rows: [], rowCount: 0 };

            return {
                rows: [{
                    ticket_id: ticket.id,
                    document_id: ticket.document_id,
                    user_id: ticket.user_id,
                    grant_version_at_issue: ticket.grant_version_at_issue,
                    expires_at: ticket.expires_at,
                    used: ticket.used,
                    original_filename: doc.original_filename,
                    mime_type: doc.mime_type,
                    storage_key: doc.storage_key,
                    encrypted_data_key: doc.encrypted_data_key,
                    live_grant_version: doc.grant_version,
                    deleted_at: doc.deleted_at
                }],
                rowCount: 1
            };
        }

        // 23. Download Tickets: UPDATE used = true
        if (upper.startsWith('UPDATE DOWNLOAD_TICKETS') && upper.includes('USED = TRUE')) {
            const id = params[0];
            const ticket = this.downloadTickets.get(id);
            if (ticket) {
                ticket.used = true;
                return { rows: [ticket], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
        }

        // 24. Generic SELECT 1 health check
        if (upper === 'SELECT 1' || upper === 'SELECT 1 AS OK') {
            return { rows: [{ ok: 1 }], rowCount: 1 };
        }

        console.warn(`[InMemoryDB] Unhandled query pattern: ${queryText}`);
        return { rows: [], rowCount: 0 };
    }
}

const memoryDb = new InMemoryDatabase();

if (config.databaseUrl && !config.databaseUrl.includes('localhost:5432/argus_mock')) {
    pool = new Pool({
        connectionString: config.databaseUrl,
        ssl: config.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
    });

    pool.on('error', (err) => {
        console.error('❌ [PostgreSQL Pool Error]:', err);
    });
} else {
    console.log('ℹ️ [Argus DB] Running with In-Memory Secure Store (Fallback / Test mode)');
}

export const db = {
    async query(text, params) {
        if (pool) {
            return pool.query(text, params);
        }
        return memoryDb.query(text, params);
    },
    async getClient() {
        if (pool) {
            return pool.connect();
        }
        return {
            query: (text, params) => memoryDb.query(text, params),
            release: () => {}
        };
    },
    getInMemoryInstance() {
        return memoryDb;
    }
};
