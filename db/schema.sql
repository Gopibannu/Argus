-- =====================================================================
-- Argus Database Schema (PostgreSQL)
-- Architecture: Default Deny, Tamper-Evident Audit Chain, Versioned Grants
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'owner', 'viewer')),
    department VARCHAR(100) DEFAULT 'General',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. SESSIONS TABLE (Opaque tokens stored as SHA-256 hashes)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- 2b. PENDING REGISTRATIONS (Signup OTP flow)
CREATE TABLE IF NOT EXISTS pending_registrations (
    email VARCHAR(255) PRIMARY KEY,
    otp_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    department VARCHAR(100) NOT NULL DEFAULT 'General',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256_checksum VARCHAR(64) NOT NULL,
    encrypted_data_key TEXT NOT NULL,
    encryption_iv VARCHAR(32) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    grant_version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON documents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- 4. GRANTS TABLE (Per-document permissions granted to named users)
CREATE TABLE IF NOT EXISTS grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    grantee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'edit')),
    expires_at TIMESTAMPTZ DEFAULT NULL,
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grants_lookup ON grants(document_id, grantee_user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_grants_grantee ON grants(grantee_user_id);

-- 5. DOWNLOAD TICKETS (Short-lived single-use tickets bound to grant version)
CREATE TABLE IF NOT EXISTS download_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_hash VARCHAR(64) NOT NULL UNIQUE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grant_version_at_issue INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_hash ON download_tickets(ticket_hash);

-- 6. AUDIT LOG (Cryptographically chained, tamper-evident audit trail)
CREATE TABLE IF NOT EXISTS audit_log (
    sequence_id BIGSERIAL PRIMARY KEY,
    id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_ip VARCHAR(45) NOT NULL,
    user_agent TEXT,
    action VARCHAR(50) NOT NULL,
    document_id UUID,
    target_user_id UUID,
    outcome VARCHAR(20) NOT NULL CHECK (outcome IN ('allowed', 'denied')),
    reason VARCHAR(255),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    prev_hash VARCHAR(64) NOT NULL,
    row_hash VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_sequence_id ON audit_log(sequence_id);
CREATE INDEX IF NOT EXISTS idx_audit_document_id ON audit_log(document_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);

-- =====================================================================
-- DATABASE-LEVEL IMMUTABILITY: PREVENT UPDATE OR DELETE ON audit_log
-- =====================================================================

CREATE OR REPLACE FUNCTION prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'SECURITY VIOLATION: The audit_log table is append-only. Modifying, deleting, or truncating audit records is strictly prohibited.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_audit_log ON audit_log;
CREATE TRIGGER trg_protect_audit_log
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_protect_audit_truncate ON audit_log;
CREATE TRIGGER trg_protect_audit_truncate
BEFORE TRUNCATE ON audit_log
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_audit_tampering();

-- =====================================================================
-- LEAST PRIVILEGE APP ROLE SETUP (Template for production database hardening)
-- In production Supabase / PostgreSQL SQL editor, run:
--   CREATE ROLE argus_app_user WITH LOGIN PASSWORD 'your_secure_password';
--   GRANT CONNECT ON DATABASE postgres TO argus_app_user;
--   GRANT USAGE ON SCHEMA public TO argus_app_user;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON users, sessions, documents, grants, download_tickets, pending_registrations TO argus_app_user;
--   GRANT SELECT, INSERT ON audit_log TO argus_app_user;
--   REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM argus_app_user;
--   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO argus_app_user;
-- =====================================================================

