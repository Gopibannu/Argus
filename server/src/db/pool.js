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
        this.auditLog.push({
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
            row_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        });
        this.sequenceId = 2;
    }

    async query(text, params = []) {
        const queryText = text.trim();
        const upper = queryText.toUpperCase();

        // 1. Transaction statements
        if (upper === 'BEGIN' || upper === 'COMMIT' || upper === 'ROLLBACK') {
            return { rows: [], rowCount: 0 };
        }

        // 2. Select user by email
        if (upper.includes('FROM USERS') && upper.includes('EMAIL = $1')) {
            const email = params[0]?.toLowerCase();
            const user = Array.from(this.users.values()).find(u => u.email.toLowerCase() === email);
            return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
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

        // 8. Select latest audit row
        if (upper.includes('FROM AUDIT_LOG') && upper.includes('ORDER BY SEQUENCE_ID DESC LIMIT 1')) {
            if (this.auditLog.length === 0) return { rows: [], rowCount: 0 };
            const latest = this.auditLog[this.auditLog.length - 1];
            return { rows: [latest], rowCount: 1 };
        }

        // 9. Insert into audit_log
        if (upper.startsWith('INSERT INTO AUDIT_LOG')) {
            const [id, actorId, ip, ua, action, docId, targetUserId, outcome, reason, metadata, prevHash, rowHash] = params;
            const entry = {
                sequence_id: this.sequenceId++,
                id: id || crypto.randomUUID(),
                timestamp: new Date(),
                actor_id: actorId,
                actor_ip: ip,
                user_agent: ua,
                action,
                document_id: docId,
                target_user_id: targetUserId,
                outcome,
                reason,
                metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
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

        // 11. Generic SELECT 1 health check
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
