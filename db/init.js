import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

async function initDatabase() {
    console.log('🔄 [Argus DB Init] Connecting to PostgreSQL...');
    
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('❌ [Argus DB Init] ERROR: DATABASE_URL environment variable is missing.');
        console.error('Please configure DATABASE_URL in .env (e.g. Supabase connection string)');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log('✅ [Argus DB Init] Connected successfully.');

        // 1. Run Schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        console.log('🔄 [Argus DB Init] Applying database schema...');
        await client.query(schemaSql);
        console.log('✅ [Argus DB Init] Schema applied.');

        // 2. Compute dynamic Bcrypt hash with Cost 12 for guaranteed verification
        const defaultPassword = process.env.SEED_DEFAULT_PASSWORD || 'Password@Argus2026!';
        console.log(`🔄 [Argus DB Init] Hashing seed password with bcrypt cost 12...`);
        const salt = bcrypt.genSaltSync(12);
        const passwordHash = bcrypt.hashSync(defaultPassword, salt);

        // 3. Upsert Seed Users
        const users = [
            { id: 'a0000000-0000-0000-0000-000000000001', email: 'admin@argus.local', name: 'Alice Admin', role: 'admin', dept: 'Security Operations', active: true },
            { id: 'b0000000-0000-0000-0000-000000000001', email: 'owner1@argus.local', name: 'Bob Owner', role: 'owner', dept: 'Engineering', active: true },
            { id: 'b0000000-0000-0000-0000-000000000002', email: 'owner2@argus.local', name: 'Carol Owner', role: 'owner', dept: 'Finance', active: true },
            { id: 'c0000000-0000-0000-0000-000000000001', email: 'viewer1@argus.local', name: 'Dave Viewer', role: 'viewer', dept: 'Compliance', active: true },
            { id: 'c0000000-0000-0000-0000-000000000002', email: 'viewer2@argus.local', name: 'Eve Viewer', role: 'viewer', dept: 'Contractor', active: true },
            { id: 'd0000000-0000-0000-0000-000000000001', email: 'disabled@argus.local', name: 'Dan Disabled', role: 'viewer', dept: 'Terminated', active: false }
        ];

        console.log('🔄 [Argus DB Init] Seeding user accounts...');
        for (const u of users) {
            await client.query(`
                INSERT INTO users (id, email, password_hash, full_name, role, department, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (email) DO UPDATE
                SET password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    department = EXCLUDED.department,
                    is_active = EXCLUDED.is_active;
            `, [u.id, u.email, passwordHash, u.name, u.role, u.dept, u.active]);
        }
        console.log('✅ [Argus DB Init] Seed accounts populated.');

        // 4. Ensure Genesis Audit Row exists
        await client.query(`
            INSERT INTO audit_log (id, sequence_id, timestamp, actor_id, actor_ip, user_agent, action, document_id, target_user_id, outcome, reason, metadata, prev_hash, row_hash)
            VALUES (
                '00000000-0000-0000-0000-000000000001',
                1,
                '2026-10-19 00:00:00+00',
                'a0000000-0000-0000-0000-000000000001',
                '127.0.0.1',
                'System/Genesis',
                'system_init',
                NULL,
                NULL,
                'allowed',
                'Argus Security Engine Initialized',
                '{"version": "1.0.0", "chain": "genesis"}'::jsonb,
                '0000000000000000000000000000000000000000000000000000000000000000',
                'c00a0c1262153213e077f32bd087e0c91fac2fec78a628569b1af4d179c4f747'
            )
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ [Argus DB Init] Genesis audit record verified.');

        client.release();
        await pool.end();
        console.log('🎉 [Argus DB Init] Database initialized successfully!');
    } catch (err) {
        console.error('❌ [Argus DB Init] Failed to initialize database:', err);
        process.exit(1);
    }
}

initDatabase();
