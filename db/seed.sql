-- =====================================================================
-- Argus Database Seeds (Snovasys Fresher Challenge 2026)
-- Password for all seed accounts: Password@Argus2026!
-- Generated using bcryptjs cost 12
-- =====================================================================

INSERT INTO users (id, email, password_hash, full_name, role, department, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin@argus.local', '$2a$12$e7kY7OQzXy7sZz1mO8v7.eaFz8Tz5bHj6b4.s4H6.7J1uL.M3wK8y', 'Alice Admin', 'admin', 'Security Operations', true),
    ('b0000000-0000-0000-0000-000000000001', 'owner1@argus.local', '$2a$12$e7kY7OQzXy7sZz1mO8v7.eaFz8Tz5bHj6b4.s4H6.7J1uL.M3wK8y', 'Bob Owner (Engineering)', 'owner', 'Engineering', true),
    ('b0000000-0000-0000-0000-000000000002', 'owner2@argus.local', '$2a$12$e7kY7OQzXy7sZz1mO8v7.eaFz8Tz5bHj6b4.s4H6.7J1uL.M3wK8y', 'Carol Owner (Finance)', 'owner', 'Finance', true),
    ('c0000000-0000-0000-0000-000000000001', 'viewer1@argus.local', '$2a$12$e7kY7OQzXy7sZz1mO8v7.eaFz8Tz5bHj6b4.s4H6.7J1uL.M3wK8y', 'Dave Viewer (Auditor)', 'viewer', 'Compliance', true),
    ('c0000000-0000-0000-0000-000000000002', 'viewer2@argus.local', '$2a$12$e7kY7OQzXy7sZz1mO8v7.eaFz8Tz5bHj6b4.s4H6.7J1uL.M3wK8y', 'Eve Viewer (External)', 'viewer', 'Contractor', true),
    ('d0000000-0000-0000-0000-000000000001', 'disabled@argus.local', '$2a$12$e7kY7OQzXy7sZz1mO8v7.eaFz8Tz5bHj6b4.s4H6.7J1uL.M3wK8y', 'Dan Disabled', 'viewer', 'Terminated', false)
ON CONFLICT (email) DO UPDATE 
SET password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Initial Genesis Audit Record (Chain anchor sequence_id 1)
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
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
)
ON CONFLICT (id) DO NOTHING;
