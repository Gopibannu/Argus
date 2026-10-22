# ARGUS — Work Status & Project Handoff

> **Project Name:** Argus (Snovasys Fresher Hiring Challenge 2026)  
> **Repository:** `https://github.com/Gopibannu/Argus.git` (Branch: `main`)  
> **Live Deployment:** [https://argus-security-platform.onrender.com](https://argus-security-platform.onrender.com)  
> **Core Mission:** Secure Document Sharing with a Real Cryptographic Audit Trail.  
> **Status:** **100% COMPLETE & SUBMISSION READY**  
> **Last Updated:** October 23, 2026

---

## 1. Executive Summary

Argus guarantees two fundamental enterprise security invariants:
1. **The wrong person can NEVER read a file** — strictly enforced by a single server-side choke point (`authorize()`) with uniform `404 Not Found` returns on unauthorized requests to eliminate IDOR and existence leakage.
2. **You can MATHEMATICALLY PROVE who did** — through an append-only, tamper-evident SHA-256 hash chain anchored in PostgreSQL with database-level triggers that abort any `UPDATE`, `DELETE`, or `TRUNCATE` statements.

---

## 2. Architecture & Tech Stack

| Layer | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Database** | Live Supabase & Render PostgreSQL (with In-Memory Fallback) | Tables: `users`, `sessions`, `documents`, `grants`, `audit_log`, `download_tickets`, `pending_registrations`. DB triggers on `audit_log` block `UPDATE`, `DELETE`, and `TRUNCATE`. Advisory locks prevent hash chain forking. |
| **Object Storage** | Private Supabase Storage & Vault Store | `documents` bucket. Raw files never stored in plaintext; only client-encrypted ciphertext stored. |
| **Backend API** | Node.js / Express (ES Modules) | Stateful PostgreSQL sessions (`sessions` table), HMAC CSRF tokens (`X-CSRF-Token`), Helmet headers, Trust proxy enabled, Rate limiting (auth & OTP), Magic bytes validation (`file-type`). |
| **Cryptography** | Node.js `crypto` | Envelope encryption with AES-256-GCM (unique per-file Data Encryption Key DEK), Master Key KEK, Hash chain via SHA-256 with deterministic canonical JSON key sorting. |
| **AI Assistant** | Google Gemini 2.0 Flash | Context-aware document recipient suggestions with prompt sanitization, output candidate filtering, and human-in-the-loop audit decision linking (`suggestionId`). Fallback to deterministic heuristics included. |
| **Frontend** | React 19 + Vite 6 + TailwindCSS v4 | Modular component architecture, sticky enterprise Navbar, interactive pop-up authentication modal with OTP support, mobile-first responsive design. |
| **Email Service** | Nodemailer | Real SMTP dispatch with automatic console fallback for offline/demo operation. |

---

## 3. What Has Been Completed & Verified

### Phase 1: Core Foundation & Authentication
- [x] Connected to live PostgreSQL pool (`server/src/db/pool.js`) with resilient fallback to In-Memory Secure Store during cold starts.
- [x] Stateful session architecture backed by the `sessions` table (HttpOnly, SameSite=Strict cookies; zero stale JWT tokens).
- [x] Reverse proxy support: configured `app.set('trust proxy', 1)` in `server/src/middleware/security.js`.
- [x] Two-step registration with 6-digit Email OTP:
  - `POST /api/auth/initiate-register`: Generates 6-digit numeric OTP with 10-minute expiry into `pending_registrations`, sends via email/console.
  - `POST /api/auth/verify-register`: Validates OTP code, creates active user in PostgreSQL, and establishes secure session.
- [x] Dedicated OTP rate limiter (`otpLimiter`: 5 attempts per 15 minutes) to block SMS/email bombing.
- [x] Registration role self-escalation protection: request field whitelisting forces public registrations strictly to `viewer`.
- [x] Emergency multi-device session revocation: `POST /api/auth/logout-all`.

### Phase 2: Document Security & Single Choke Point
- [x] Single authorization choke point: `server/src/services/authzService.js` (`authorize()`).
- [x] Anti-IDOR enforcement: Any ungranted document access returns generic `404 Not Found` (never reveals `403` or file existence).
- [x] Envelope encryption: Every uploaded file gets a random 256-bit AES-256-GCM DEK, encrypted by Master Key (KEK).
- [x] Magic bytes file upload validation: Enforced via `file-type` buffer inspection; rejects fake extensions and macro-enabled documents (`.docm`, `.xlsm`, `.dotm`).
- [x] Real-time permission revocation: Per-document `grant_version` invalidates all issued download tickets immediately upon revocation.
- [x] Single-use download tickets: Replaying an already-consumed ticket returns `403 Forbidden` (`TICKET_ALREADY_USED_REPLAY_ATTEMPT`).
- [x] SQL Search Query Isolation: Search queries join the `grants` table directly to prevent existence or count leaks to ungranted users.
- [x] Metadata Update Mass-Assignment Protection: `PATCH /api/documents/:id` whitelists title and category only, preventing alteration of owner or encryption keys.

### Phase 3: Cryptographic Audit Trail & Immutability
- [x] Append-only `audit_log` table with database triggers rejecting `UPDATE`, `DELETE`, and `TRUNCATE`:
  ```sql
  CREATE TRIGGER trg_protect_audit_log
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();

  CREATE TRIGGER trg_protect_audit_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION prevent_audit_tampering();
  ```
- [x] Transactional Advisory Locking: `SELECT pg_advisory_lock(1095911253)` in `auditService.logEvent()` serializes audit row insertions and prevents chain forking under concurrency.
- [x] SHA-256 Hash Chain: Each row hashes canonical non-repudiation parameters with deterministic sorted JSON serialization.
- [x] Cryptographic verification endpoint: `GET /api/admin/audit/verify` sequentially recalculates the entire chain from Genesis block #1 to Head block.
- [x] Tamper-detection test: Artificially altering a row in tests breaks mathematical verification (`valid: false`).
- [x] Audit bundle export: `GET /api/admin/audit/export` allows downloading verifiable JSON proof.

### Phase 4: Least-Privilege RBAC & Admin Tools
- [x] Admin users cannot implicitly read/download confidential documents without an explicit grant (Least-Privilege).
- [x] Admin Security Center dashboard with real-time metrics (`totalEvents`, `deniedEvents`, `permissionChanges`, `activeActors`).
- [x] Instant User Account Lockout: Admin toggling a user to inactive terminates all active PostgreSQL sessions across all devices immediately.
- [x] Collaborative editing: Document owners can grant `edit` permissions to named users, audited via `DOCUMENT_METADATA_UPDATED`.

### Phase 5: Gemini AI Access Assistant
- [x] Context-aware recipient recommendations for document owners (`POST /api/documents/:id/ai-suggest` and `/ai-recipients`).
- [x] Upgraded to `Google Gemini 2.0 Flash` with deterministic heuristic fallback.
- [x] Prompt Injection Defense: Control characters and markdown delimiters sanitized (`aiService.sanitizeInput()`); untrusted user inputs limited to 150 chars.
- [x] Output candidate validation: Server strictly filters suggestions against active database user UUIDs.
- [x] Human-in-the-Loop decision tracking: Suggestions carry `suggestionBatchId`, and owner grant actions record `suggestionId` and `aiDecision: 'accepted'` into the audit chain.

### Phase 6: Frontend Refactor & Mobile-First Responsive Design
- [x] Cleaned up CSS (`client/src/index.css`) with standard design tokens and Tailwind v4.
- [x] Decoupled authentication into a dedicated floating modal ([AuthModal.jsx](client/src/components/AuthModal.jsx)) with 1-click persona fill buttons.
- [x] Sticky enterprise Navbar ([Navbar.jsx](client/src/components/Navbar.jsx)) with responsive horizontal tab scrolling and live database health indicator pill.
- [x] Adaptive Documents View ([DocumentsView.jsx](client/src/components/DocumentsView.jsx)): priority columns for mobile screens, hidden secondary columns, truncated filenames.
- [x] Mobile-friendly Admin Security Center ([AdminSecurityCenter.jsx](client/src/components/AdminSecurityCenter.jsx)) with stacked controls and scrollable audit trail.
- [x] Touch-friendly Grants Modal ([GrantsModal.jsx](client/src/components/GrantsModal.jsx)) with non-collapsing 12-column grid.

---

## 4. Current Test & Verification Results

All automated test suites pass with **100% green**:
```
 Test Files  5 passed (5)
      Tests  48 passed (48)
   Duration  3.74s
```
- `tests/auth.test.js`: 12 tests passing (Session, CSRF, OTP, lockout, rate limits, role escalation protection).
- `tests/documents.test.js`: 14 tests passing (Upload validation, envelope crypto, Anti-IDOR, instant revocation, single-use ticket replay).
- `tests/audit.test.js`: 8 tests passing (SHA-256 chain, advisory locking, tamper detection, export).
- `tests/authzMatrix.test.js`: 10 tests passing (Least-privilege admin, grantee edit, soft-delete isolation, SQL search isolation, mass assignment protection).
- `tests/ai.test.js`: 4 tests passing (Prompt injection neutralization, candidate filtering, human confirmation, audit logging).

**Extended Mutation Testing:**
- `node tests/mutationCheck.js` reports **100.0% Kill Rate (7/7 mutants killed)** across authorization bypass, IDOR leakage, hash alteration, DB trigger bypass, expired tickets, and route-level `authorize()` removal.

**Continuous Integration (GitHub Actions):**
- `.github/workflows/ci.yml` runs full build, test matrix, and mutation tests against a real `postgres:16-alpine` service container with schema and seed pre-loaded.

---

## 5. Seed Users & Demo Personas

All seed accounts use the master demo password: `Password@Argus2026!`

| Persona | Email | Role | Department | Purpose in Demo |
| :--- | :--- | :--- | :--- | :--- |
| **Alice Admin** | `admin@argus.local` | `admin` | Security | Admin Security Center, hash chain verification, user lockouts. |
| **Bob Owner** | `owner1@argus.local` | `owner` | Engineering | Uploads encrypted specs, manages grants, collaborative edits, requests AI suggestions. |
| **Carol Owner** | `owner2@argus.local` | `owner` | Finance | Unrelated owner (demonstrates 404 Anti-IDOR against Bob's files). |
| **Dave Viewer** | `viewer1@argus.local` | `viewer` | Compliance | Viewer with read/edit grants, generates 60s tickets, rejected on grants/deletions. |
| **Eve Viewer** | `viewer2@argus.local` | `viewer` | Contractor | External contractor with access strictly scoped to specifically granted files. |
| **Dan Disabled** | `disabled@argus.local` | `viewer` | Terminated | Inactive account (verifies immediate rejection on login). |

---

## 6. Project Directory Layout

```
d:\argus\
├── client\
│   ├── src\
│   │   ├── components\
│   │   │   ├── AdminSecurityCenter.jsx  # Admin dashboard & audit stream
│   │   │   ├── AuthModal.jsx            # Pop-up login/register/OTP dialog
│   │   │   ├── DocumentsView.jsx        # Vault file list & upload
│   │   │   ├── EditDocumentModal.jsx    # Collaborative metadata editor
│   │   │   ├── GrantsModal.jsx          # Access grants & AI suggestions
│   │   │   ├── HeroSection.jsx          # Landing page hero & judge quick-fill
│   │   │   ├── Navbar.jsx               # Sticky top header & system status
│   │   │   └── ThreatDefenseView.jsx    # Threat vectors & test citations
│   │   ├── App.jsx                      # Main app shell & state management
│   │   ├── index.css                    # Tailwind v4 clean design tokens
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server\
│   ├── src\
│   │   ├── db\pool.js                   # Hybrid PostgreSQL & InMemory client
│   │   ├── middleware\                  # auth, csrf, rateLimiter, security
│   │   ├── routes\                      # auth, documents, admin, health
│   │   ├── services\                    # authz, crypto, audit, storage, ai, email
│   │   └── app.js                       # Express app configuration
│   └── index.js                         # Server entry point
├── db\
│   ├── schema.sql                       # Full database DDL with immutability triggers
│   └── seed.sql                         # Initial test users & documents
├── tests\                               # 5 test suites (48 tests total)
│   ├── ai.test.js
│   ├── audit.test.js
│   ├── auth.test.js
│   ├── authzMatrix.test.js
│   ├── documents.test.js
│   └── mutationCheck.js                 # Extended 7-mutant test harness
├── docs\
│   ├── ai-context\
│   │   └── MASTER_PROMPT.md             # AI Master Prompt and security rules
│   ├── API.md                           # REST API specification
│   ├── ARCHITECTURE.md                  # Comprehensive architectural diagrams
│   ├── DEMO.md                          # 5-minute timed judge demonstration script
│   ├── DEPLOYMENT.md                    # Production hosting instructions
│   ├── INTERVIEW_PREP.md                # Technical interview walk-throughs
│   └── WRITEUP.md                       # Complete architecture write-up
├── THREATS.md                           # 22 verified threat vectors
├── PROMPTS.md                           # 11 dated self-critiques with commit links
├── README.md                            # Main project overview & quickstart
├── workstatus.md                        # THIS STATUS & HANDOFF FILE
├── package.json                         # Root scripts (npm test, npm start, npm run build)
└── render.yaml                          # Render infrastructure deployment blueprint
```

---

## 7. Operational Instructions

1. **Local Execution:**
   ```bash
   npm install
   npm run build
   npm start
   ```
   Open **http://localhost:5000** (or dev server at **http://localhost:3000**).

2. **Automated Verification:**
   ```bash
   npm test                      # 48/48 tests passing
   npm run test:mutation-authz   # 7/7 mutants killed (100% kill rate)
   ```

3. **Live Deployment:**
   - URL: [https://argus-security-platform.onrender.com](https://argus-security-platform.onrender.com)
   - Continuous deployment triggered automatically from `main` branch.

