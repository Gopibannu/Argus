# Argus: System Architecture & Security Design

> **Argus (Audit, Revoke, Grant, Unified Security)**  
> *Snovasys Fresher Hiring Challenge 2026*  
> Document platform where the wrong person can never read a file, and every access—allowed or denied—is provably auditable and tamper-evident.

---

## 1. System Mind Map

```mermaid
mindmap
  root((Argus))
    Users & Roles
      Admin (Metadata & Audit only, No direct file access)
      Document Owner (Upload, Manage, Grant, Revoke, Delete)
      Viewer (Read/Edit only on granted documents)
      Disabled User (Instant session termination)
    Auth & Sessions
      Argon2id Password Hashing
      Server-side Opaque DB Sessions (SHA-256 token hash)
      HttpOnly Secure SameSite=Strict Cookies
      No Long-Lived JWTs
      Log Out Everywhere & Instant Kill
      CSRF Protection & Rate Limiting
    Documents
      Metadata (Title, Category, Tags, MIME, Size, Hash)
      Sanitised Filename on Download
      UUID Storage Keys (No predictable paths)
      Soft-Delete & Retention
    Storage
      Private Supabase / Cloudflare R2 Bucket
      Zero Public URLs
      Backend Streams File via authorize()
      Envelope Encryption (AES-256-GCM per-file key)
    Permission Model
      Per-Document Named Grants (read, edit)
      Single Choke Point: authorize(user, doc, action)
      Default Deny
      Return 404 on Unauthorized (Prevent IDOR / Existence Leaks)
      SQL-Filtered Search & Listings (INNER JOIN grants)
      Postgres Row Level Security (Defense-in-depth)
    Revocation
      Immediate Effect (No cache / No stale JWTs)
      Live DB Query per Request
      Short-Lived (<=60s) Single-Use Download Tickets
      Tickets bound to Grant Version
    Audit Trail
      Tamper-Evident Hash Chain (prev_hash, row_hash)
      Denied Attempts Recorded with Reason
      DB Trigger: UPDATE & DELETE Prohibited
      App Role: INSERT and SELECT Only
      Verification Endpoint (/api/admin/audit/verify)
      Atomic Writes (Action fails if audit fails)
      External Anchor (Periodic head hash publication)
    Search
      Filtered in SQL (Join on grants)
      Filters: Name, Owner, Category, Date
      Zero Leakage of Unauthorized Titles
    Upload Validation
      Strict MIME & Magic-Byte Sniffing
      Extension & Double-Extension Sanitization
      Zip Bomb & Macro Office Rejection
      Size Limit (10MB) & Rate Limiting
      SHA-256 Checksum Stored
    Admin Dashboard
      Audit Chain Integrity Check (Green / Red)
      Denied Access Heatmap / Anomaly Detection
      Permission Change Stream
      Bulk Download Alerts & Off-Hours Access
      Dormant Account & Expiring Grant Audits
    AI Suggestions
      Google Gemini API (Free Tier)
      Human-in-the-Loop Only (Never auto-grants)
      Metadata Only Input (Title, Category, Depts)
      Prompt Injection Hardening (UUID validation)
      Audit: Suggestion Made & Human Decision Recorded
    Testing & QA
      Supertest + Real Postgres Matrix
      Every Endpoint x Every User Role
      Threats-to-Tests 1:1 Mapping
      Mutation Check Script (patch authorize -> tests fail)
      Route Inventory Auth Coverage Verification
    Threats & Security
      THREATS.md Matrix
      Default Deny Architecture
      Secure Headers (CSP, HSTS, no-sniff, frame-ancestors none)
      No Secrets in Repo
    Deployment
      Render Free Web Service (Single-origin Express + React)
      Supabase Free Postgres & Private Storage
      GitHub Actions CI (Lint, Test, Audit verification)
    Docs & Demo
      API.md (RBAC & Authz per endpoint)
      5-Minute Video Demo Script
      Interview Prep (Choke point walkthrough)
      PROMPTS.md (Honest critique log)
```

### Walkthrough: "Explain it like I'm presenting to a judge"
> "Judges, Argus is engineered around three unbreakable pillars: **Strict Server-Side Authorization**, **Instant Revocation**, and a **Cryptographic Audit Trail**. Rather than scattering checks across frontend pages or routing controllers, every operation routes through an invariant gatekeeper: `authorize()`. Admins cannot snoop on confidential files because role permissions adhere strictly to least-privilege—administering the platform does not confer blanket read rights over user documents. Everything from upload validation with file magic bytes to envelope encryption at rest and single-origin cookie sessions exists to eliminate entire vulnerability classes (IDOR, session hijacking, poisoned file storage, and data leaks) on a completely free-tier infrastructure."

---

## 2. System Architecture & Trust Boundaries

```mermaid
flowchart TD
    subgraph UntrustedZone ["Client / Untrusted Zone"]
        Browser["User Browser (React Single Page App)"]
    end

    subgraph Perimeter ["Network Edge & Perimeter Security"]
        HTTPS["TLS Termination / HTTPS (Render Proxy)"]
        Headers["Security Headers (Helmet, CSP, no-sniff)"]
    end

    subgraph AppTrustBoundary ["Application Trust Boundary (Node.js + Express)"]
        direction TB
        StaticServer["React Vite Static Asset Server (Same-Origin)"]
        RateLimiter["Rate Limiter & CSRF Filter"]
        SessionAuth["Session Middleware (DB Session Lookup & Cookie Hash Check)"]
        ChokePoint["AUTHORIZE() Choke Point Gatekeeper"]
        CryptoEngine["Envelope Encryption Engine (AES-256-GCM)"]
        UploadValidator["Upload Validator (Magic Bytes & File Sanitizer)"]
        AuditRecorder["Audit Trail Manager (Atomic Tx & Hash Engine)"]
    end

    subgraph DataTrustBoundary ["Data Persistence Trust Boundary"]
        subgraph Postgres ["Supabase PostgreSQL (Free Tier)"]
            AppUserRole["Restricted App DB Role (INSERT/SELECT on audit)"]
            DBTables["Tables: users, sessions, documents, grants"]
            AuditTable["Table: audit_log (Tamper-evident chain)"]
            ImmutabilityTrigger["Trigger: PREVENT_UPDATE_DELETE_AUDIT"]
            RLS["Row Level Security (Defense-in-depth)"]
        end
        subgraph ObjectStorage ["Private Storage (Supabase Storage / R2)"]
            PrivateBucket["Encrypted Blob Storage (Zero Public Access)"]
        end
    end

    subgraph ExternalServices ["External AI Boundary"]
        GeminiAPI["Google Gemini API (Free Tier) - Suggestions Only"]
    end

    %% Flow Connections
    Browser <-->|HTTPS + SameSite=Strict Cookie| HTTPS
    HTTPS --> Headers --> StaticServer
    Headers --> RateLimiter --> SessionAuth --> ChokePoint
    
    ChokePoint -->|1. Validate Grant| DBTables
    ChokePoint -->|2. Log Access Decision| AuditRecorder
    AuditRecorder -->|Atomic Append Only| AuditTable
    ImmutabilityTrigger -.->|Aborts Edits/Drops| AuditTable
    
    ChokePoint -->|3. On Auth Success| CryptoEngine
    CryptoEngine <-->|Fetch Raw Encrypted Blob| PrivateBucket
    CryptoEngine -->|Stream Decrypted Content| Browser

    Browser -.->|Upload Document| UploadValidator
    UploadValidator -->|Store Encrypted Blob| PrivateBucket
    UploadValidator -->|Write Metadata| DBTables

    ChokePoint -.->|Metadata Only / Opt-In| GeminiAPI
    GeminiAPI -.->|Ranked Suggestions| Browser
```

### Walkthrough: "Explain it like I'm presenting to a judge"
> "Notice the clear separation of trust boundaries. The browser is completely untrusted; it receives no public storage URLs and no long-lived client tokens. Express serves both the built React assets and the API on the exact same origin, which eliminates cross-origin security flaws and allows strict `SameSite=Strict, HttpOnly` cookies. Within our application layer, no route can talk directly to storage or return file bytes without passing the `authorize()` choke point. Even inside the database boundary, we operate under defense-in-depth: the application database user has rights revoked for `UPDATE` and `DELETE` on the audit log, reinforced by an unbypassable PostgreSQL trigger that raises exceptions on alteration."

---

## 3. Request Flow Sequence: Document Download & Single Choke Point

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant API as Express Router (/api/documents/:id/download)
    participant Session as SessionMiddleware
    participant Choke as authorize(user, doc, 'read')
    participant DB as PostgreSQL
    participant Audit as AuditLogger
    participant Storage as Private Bucket (Supabase Storage)
    participant Decrypt as Envelope Decryption (AES-256-GCM)

    User->>API: GET /api/documents/7f2a.../download (Session Cookie)
    API->>Session: Extract and hash session token
    Session->>DB: SELECT user, session WHERE token_hash = $1 AND expires_at > NOW()
    
    alt Session Invalid or User Disabled
        Session-->>User: 401 Unauthorized (Redirect to Login)
    else Session Valid
        Session->>API: Attach req.user (id, role, status)
    end

    API->>Choke: authorize(req.user, document_id, 'read')
    Choke->>DB: SELECT * FROM documents WHERE id = $1 AND deleted_at IS NULL
    
    alt Document Does Not Exist OR Soft-Deleted
        Choke->>Audit: record(actor=user.id, action='download', outcome='denied', reason='NOT_FOUND')
        Audit->>DB: INSERT INTO audit_log (...)
        Choke-->>User: 404 Not Found (Prevents IDOR existence leaks)
    else Document Exists
        Choke->>DB: Check Owner OR Active Grant (grantee_user_id = $1 AND permission IN ('read','edit') AND revoked_at IS NULL)
        
        alt Grant Missing or Revoked
            Choke->>Audit: record(actor=user.id, action='download', outcome='denied', reason='ACCESS_REVOKED_OR_ABSENT')
            Audit->>DB: INSERT INTO audit_log (...)
            Choke-->>User: 404 Not Found (Uniform 404 prevents existence enumeration)
        else Access Allowed
            Choke->>Audit: record(actor=user.id, action='download', outcome='allowed', reason='VALID_GRANT')
            Audit->>DB: INSERT INTO audit_log (..., prev_hash, row_hash)
            Choke->>API: Authorized (Return document record + storage_key)
            
            API->>Storage: Fetch encrypted stream (storage_key) with Server Service Key
            Storage-->>API: Encrypted stream bytes
            API->>Decrypt: Decrypt stream (Wrapped File Key via Master Key)
            API-->>User: 200 OK (Stream file with Content-Disposition: attachment; nosniff)
        end
    end
```

### Walkthrough: "Explain it like I'm presenting to a judge"
> "Here is our exact choke-point implementation for document downloads. First, authentication verifies the opaque session in Postgres. Second, `authorize()` performs the permission check. If someone attempts to access an unauthorized document ID, we intentionally return a **404 Not Found** instead of a 403 Forbidden. This prevents malicious actors from brute-forcing UUIDs to confirm whether sensitive documents exist. Crucially, even though the attacker receives a generic 404, the server **still writes a 'denied' audit record** with the actor's ID, IP, and timestamp. The file is never downloaded directly from storage; it is streamed through our backend after on-the-fly envelope decryption."

---

## 4. Permission Model & Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : "has active"
    USERS ||--o{ DOCUMENTS : "owns"
    USERS ||--o{ GRANTS : "receives"
    USERS ||--o{ GRANTS : "grants"
    USERS ||--o{ AUDIT_LOG : "triggers (actor)"
    DOCUMENTS ||--o{ GRANTS : "governed by"
    DOCUMENTS ||--o{ AUDIT_LOG : "target of"
    DOCUMENTS ||--o{ DOWNLOAD_TICKETS : "generates"

    USERS {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar role "admin | owner | viewer"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    SESSIONS {
        uuid id PK
        uuid user_id FK
        varchar token_hash UK
        varchar ip_address
        text user_agent
        timestamp expires_at
        timestamp created_at
    }

    DOCUMENTS {
        uuid id PK
        uuid owner_id FK
        varchar title
        varchar original_filename
        varchar storage_key UK
        varchar mime_type
        bigint file_size_bytes
        varchar sha256_checksum
        text encrypted_data_key
        varchar encryption_iv
        varchar category
        int grant_version
        timestamp deleted_at
        timestamp created_at
        timestamp updated_at
    }

    GRANTS {
        uuid id PK
        uuid document_id FK
        uuid grantee_user_id FK
        uuid granted_by_user_id FK
        varchar permission "read | edit"
        timestamp expires_at
        timestamp revoked_at
        timestamp created_at
    }

    DOWNLOAD_TICKETS {
        uuid id PK
        varchar ticket_hash UK
        uuid document_id FK
        uuid user_id FK
        int grant_version_at_issue
        timestamp expires_at
        boolean used
        timestamp created_at
    }

    AUDIT_LOG {
        bigserial sequence_id PK
        uuid id UK
        timestamp timestamp
        uuid actor_id FK
        varchar actor_ip
        text user_agent
        varchar action "upload | read | download | edit | delete | grant | revoke | ai_suggest"
        uuid document_id
        uuid target_user_id
        varchar outcome "allowed | denied"
        varchar reason
        jsonb metadata
        varchar prev_hash "SHA-256 of row N-1"
        varchar row_hash "SHA-256 canonical hash"
    }
```

### Walkthrough: "Explain it like I'm presenting to a judge"
> "The data model is deliberately normalized and defensive. Notice `grant_version` on the `DOCUMENTS` table: whenever an owner revokes or alters a grant, this version counter increments. Any short-lived download ticket issued even a few seconds earlier becomes immediately invalid because its embedded `grant_version_at_issue` no longer matches the document's current version. Notice also that the `AUDIT_LOG` stores both `prev_hash` and `row_hash`, forming a verifiable cryptographic blockchain inside Postgres."

---

## 5. Immediate Revocation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Document Owner
    actor RevokedUser as Revoked Viewer
    participant API as Express Server
    participant DB as PostgreSQL
    participant TicketStore as Download Tickets

    Note over Owner, DB: Step A: Owner revokes access
    Owner->>API: POST /api/documents/:id/grants/:grantId/revoke
    API->>DB: BEGIN TRANSACTION
    API->>DB: UPDATE grants SET revoked_at = NOW() WHERE id = $grantId
    API->>DB: UPDATE documents SET grant_version = grant_version + 1 WHERE id = $docId
    API->>DB: INSERT INTO audit_log (action='revoke', outcome='allowed', target_user=viewer.id, ...)
    API->>DB: COMMIT
    API-->>Owner: 200 OK (Revocation finalized)

    Note over RevokedUser, DB: Step B: Revoked user attempts download immediately
    RevokedUser->>API: GET /api/documents/:id/download (Valid Session Cookie)
    API->>DB: SELECT * FROM documents WHERE id = $id
    API->>DB: SELECT * FROM grants WHERE document_id = $id AND grantee_user_id = $viewerId AND revoked_at IS NULL
    DB-->>API: 0 Rows Returned (Grant is revoked)
    API->>DB: INSERT INTO audit_log (action='download', outcome='denied', reason='REVOKED_ACCESS')
    API-->>RevokedUser: 404 Not Found (Instant Denial)

    Note over RevokedUser, DB: Step C: Revoked user tries pre-issued 60s ticket
    RevokedUser->>API: GET /api/documents/tickets/:ticketId
    API->>DB: SELECT t.*, d.grant_version FROM download_tickets t JOIN documents d ON t.document_id = d.id WHERE t.ticket_hash = $hash
    alt Grant Version Mismatch (Ticket grant_version < document.grant_version)
        API->>DB: UPDATE download_tickets SET used = true WHERE id = t.id
        API->>DB: INSERT INTO audit_log (action='ticket_download', outcome='denied', reason='TICKET_STALE_GRANT_VERSION')
        API-->>RevokedUser: 403 / 404 Expired or Invalid Ticket
    end
```

### Walkthrough: "Explain it like I'm presenting to a judge"
> "One of the most dangerous vulnerabilities in modern document systems is stale access—where a user's rights are revoked in the UI, but their active JWT or pre-signed AWS URL continues to work for 15 minutes. In Argus, we solve this in two ways:
> 1. **Zero cached authorization**: every document request runs an indexed lookup against Postgres to verify that `revoked_at IS NULL`.
> 2. **Versioned download tickets**: if an owner revokes access while a user is holding a 60-second download ticket, the document's `grant_version` increments in the same transaction. When the ticket is presented, the server verifies `ticket.grant_version == document.grant_version`. The check fails instantly."

---

## 6. Audit Trail Hash Chain & Immutability Architecture

```mermaid
flowchart TD
    subgraph RowNMinus1 ["Audit Entry (N-1)"]
        H_Prev["row_hash: a8f9...3b1"]
    end

    subgraph RowN ["Audit Entry N (Current Row)"]
        direction TB
        F_Seq["sequence_id: 1042"]
        F_Time["timestamp: 2026-10-20T14:30:00Z"]
        F_Actor["actor_id: uuid-owner-1"]
        F_Act["action: revoke"]
        F_Target["target_user_id: uuid-viewer-2"]
        F_Outcome["outcome: allowed"]
        F_Meta["metadata: {'reason': 'project ended'}"]
        F_PrevHash["prev_hash: a8f9...3b1 (Equals Hash N-1)"]
        F_Canonical["Canonical Representation:\nsequence_id + timestamp + actor_id + action + outcome + metadata + prev_hash"]
        F_CurrentHash["row_hash = SHA256(Canonical Representation)"]
    end

    subgraph RowNPlus1 ["Audit Entry (N+1)"]
        Next_PrevHash["prev_hash: Matches Hash N"]
    end

    subgraph DatabaseGuards ["Database-Level Enforcement"]
        Trigger["Postgres Trigger: check_audit_immutable()\nRaises EXCEPTION on UPDATE or DELETE"]
        RoleSecurity["REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM argus_app_user;"]
    end

    subgraph VerificationEngine ["Verification & External Anchoring"]
        VerifyEndpoint["GET /api/admin/audit/verify\nRecomputes entire chain from row 1 to HEAD\nReturns: { valid: true } or { broken_row: 1042 }"]
        AnchorJob["GitHub Actions Cron / Public Gist\nAnchors HEAD hash every 24h outside Postgres"]
    end

    RowNMinus1 -->|Chain Link| F_PrevHash
    F_Canonical --> F_CurrentHash
    F_CurrentHash -->|Chain Link| Next_PrevHash

    DatabaseGuards -.->|Protects| RowN
    VerifyEndpoint -.->|Validates Integrity| RowN
    RowNPlus1 -.->|Anchor latest HEAD| AnchorJob
```

### Walkthrough: "Explain it like I'm presenting to a judge"
> "If an attacker or malicious DBA compromises the application server, how do we stop them from secretly altering the audit logs to cover their tracks? We use four overlapping safeguards:
> 1. **Cryptographic hash chain**: each log row includes the SHA-256 hash of the previous row. Changing a single character, deleting a row, or reordering rows breaks the chain for every subsequent entry.
> 2. **Database role privileges**: the application user has only `INSERT` and `SELECT` granted. `UPDATE`, `DELETE`, and `TRUNCATE` are revoked at the SQL grant level.
> 3. **Immutability trigger**: an unbypassable PostgreSQL trigger aborts any modification attempts.
> 4. **External anchoring & verification**: `/api/admin/audit/verify` walks the entire chain in O(N) time. To defend against a Supabase superuser modifying the DB and recomputing the hashes, the head hash is periodically published externally (e.g., via GitHub Actions to a public commit or gist)."

---

## 7. Production Deployment Architecture (100% Free Tier)

```mermaid
flowchart LR
    subgraph ClientEnv ["User Environment"]
        UserDevice["Desktop / Mobile Browser"]
    end

    subgraph RenderFree ["Render.com (Free Web Service)"]
        direction TB
        NodeServer["Node.js + Express Server (Port 10000)"]
        ReactApp["Pre-built React + Vite SPA (Served as Static Middleware)"]
        EnvConfig["Environment Config:\nMASTER_ENCRYPTION_KEY\nDATABASE_URL\nSUPABASE_SERVICE_ROLE_KEY\nSESSION_SECRET\nGEMINI_API_KEY"]
    end

    subgraph SupabaseFree ["Supabase Cloud (Free Tier)"]
        direction TB
        PostgresDB[("PostgreSQL 15 Database\n- Users & Sessions\n- Documents & Grants\n- Tamper-Evident Audit Log")]
        SupabaseStorage[("Supabase Private Storage Bucket\n- Envelope-encrypted document blobs\n- No public read access")]
    end

    subgraph GoogleAI ["Google AI Studio"]
        GeminiAPI["Gemini 1.5 Flash API (Free Tier Tier / 15 RPM)"]
    end

    subgraph GitHubEco ["GitHub Ecosystem"]
        GHActions["GitHub Actions CI/CD\n- Vitest Suite\n- Mutation Authz Test\n- Route Inventory Check"]
        GitRepo["GitHub Public Repository (Commit History)"]
    end

    UserDevice <-->|HTTPS (Single Origin)| NodeServer
    NodeServer --- ReactApp
    NodeServer <-->|TLS Connection Pool| PostgresDB
    NodeServer <-->|Encrypted Blob API (Service Key)| SupabaseStorage
    NodeServer <-->|HTTPS REST| GeminiAPI
    GitRepo -->|Auto-Deploy on Push| RenderFree
    GitRepo -->|Trigger CI on Push| GHActions
```

### Walkthrough: "Explain it like I'm presenting to a judge"
> "Argus runs entirely within production-grade free tiers with zero credit cards required. Express serves the pre-built React frontend from the static directory, ensuring single-origin deployment with zero CORS headaches and secure HTTP-only cookies. File storage is kept in a private Supabase bucket that completely forbids public requests; only our Render backend can talk to storage using the service role key. Database transactions leverage Postgres on Supabase, and Google Gemini 1.5 Flash provides intelligent permission suggestions with zero cost."

---

## 8. 7-Day Implementation Roadmap (Oct 19–25, 2026)

```mermaid
gantt
    title Argus 7-Day Implementation Roadmap (Fresher Hiring Hackathon)
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section Phase 0: Architecture
    Mindmap & System Diagrams & Walkthrough :done, p0_1, 2026-10-19, 2026-10-20
    Architecture Review & Threat Modeling   :done, p0_2, 2026-10-20, 2026-10-20

    section Phase 1: Core Foundation
    Repo Setup, Express Skeleton & React Vite :active, p1_1, 2026-10-20, 2026-10-21
    Postgres Schema, Migrations & Seeds      :p1_2, 2026-10-20, 2026-10-21
    Auth (Argon2id, Opaque DB Sessions)      :p1_3, 2026-10-21, 2026-10-21
    First Render Deployment & CI Pipeline    :p1_4, 2026-10-21, 2026-10-21

    section Phase 2: Document Security
    Private Storage & Envelope Encryption    :p2_1, 2026-10-21, 2026-10-22
    Upload Validator (Magic Bytes & Hygiene) :p2_2, 2026-10-22, 2026-10-22
    authorize() Choke Point Implementation   :p2_3, 2026-10-22, 2026-10-22
    Grant & Revocation Mechanics             :p2_4, 2026-10-22, 2026-10-23
    Permission-Filtered Search Queries       :p2_5, 2026-10-23, 2026-10-23

    section Phase 3: Audit & Admin
    Audit Hash Chain & DB Immutability       :p3_1, 2026-10-23, 2026-10-23
    Verification Endpoint & Anomaly Metrics  :p3_2, 2026-10-23, 2026-10-24
    Admin Security Dashboard UI              :p3_3, 2026-10-24, 2026-10-24

    section Phase 4: Threat Testing
    Supertest Matrix (All Users x Routes)    :p4_1, 2026-10-24, 2026-10-24
    Mutation Authz Checker (test:mutation)   :p4_2, 2026-10-24, 2026-10-25
    Red Team Vulnerability Pass & THREATS.md :p4_3, 2026-10-24, 2026-10-25

    section Phase 5: AI Suggestions
    Gemini Suggestion API (Human-in-the-loop):p5_1, 2026-10-25, 2026-10-25
    Audit Logging for AI Recommendations     :p5_2, 2026-10-25, 2026-10-25

    section Phase 6: Polish & Demo
    Documentation (README, API, THREATS)     :p6_1, 2026-10-25, 2026-10-25
    5-Min Demo Script & Interview Prep       :p6_2, 2026-10-25, 2026-10-25
    Clean-Clone Deployment Validation        :p6_3, 2026-10-25, 2026-10-25
```

### Walkthrough: "Explain it like I'm presenting to a judge"
> "Notice our cadence: we deploy a working skeleton to Render on Day 2. We never leave deployment to the final hour. The core security primitives—choke point authorization, upload validation, immediate revocation, and audit hash chains—are complete and tested by Day 4. The remaining days are devoted to rigorous automated testing, mutation tests to prove our test suite fails if security checks are bypassed, AI integration with strict human approval, and complete documentation."
