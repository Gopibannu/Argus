# ARGUS — Work Status & Project Handoff

> **Project Name:** Argus (Snovasys Fresher Hiring Challenge 2026)  
> **Repository:** `https://github.com/Gopibannu/Argus.git` (Branch: `main`)  
> **Core Mission:** Secure Document Sharing with a Real Cryptographic Audit Trail.  
> **Last Updated:** October 20, 2026

---

## 1. Executive Summary

Argus guarantees two fundamental enterprise security invariants:
1. **The wrong person can NEVER read a file** — strictly enforced by a single server-side choke point (`authorize()`) with uniform `404 Not Found` returns on unauthorized requests to eliminate IDOR and existence leakage.
2. **You can MATHEMATICALLY PROVE who did** — through an append-only, tamper-evident SHA-256 hash chain anchored in PostgreSQL with database-level triggers that abort any `UPDATE` or `DELETE` statements.

---

## 2. Architecture & Tech Stack

| Layer | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Database** | Live Supabase PostgreSQL | Tables: `users`, `sessions`, `documents`, `grants`, `audit_log`, `download_tickets`, `pending_registrations`. DB triggers on `audit_log`. |
| **Object Storage** | Private Supabase Storage | `documents` bucket. Raw files never stored in plaintext; only client-encrypted ciphertext stored. |
| **Backend API** | Node.js / Express (ES Modules) | Stateful PostgreSQL sessions (`sessions` table), CSRF protection (`csurf`), Helmet headers, Rate limiting, Magic bytes validation (`file-type`). |
| **Cryptography** | Node.js `crypto` | Envelope encryption with AES-256-GCM (unique per-file Data Encryption Key DEK), Master Key KEK derived via PBKDF2/SHA-256, Hash chain via SHA-256 with deterministic canonical JSON key sorting. |
| **AI Assistant** | Google Gemini 1.5 Flash | Context-aware document recipient suggestions with strict prompt compartmentalization, control delimiter stripping, and human-in-the-loop authorization. |
| **Frontend** | React 19 + Vite 6 + TailwindCSS v4 | Modular component architecture, sticky enterprise Navbar, interactive pop-up authentication modal with OTP support, live database connectivity pill. |
| **Email Service** | Nodemailer | Real SMTP dispatch with automatic console fallback for offline/demo operation. |

---

## 3. What Has Been Completed So Far

### Phase 1: Core Foundation & Authentication
- [x] Connected to live Supabase PostgreSQL pool (`server/src/db/pool.js`).
- [x] Stateful session architecture backed by the `sessions` table (HttpOnly, SameSite=Strict cookies; zero stale JWT tokens).
- [x] Two-step registration with 6-digit Email OTP:
  - `POST /api/auth/initiate-register`: Generates 6-digit numeric OTP with 10-minute expiry into `pending_registrations`, sends via email/console.
  - `POST /api/auth/verify-register`: Validates OTP code, creates active user in PostgreSQL, and establishes secure session.
- [x] Emergency multi-device session revocation: `POST /api/auth/logout-all`.

### Phase 2: Document Security & Single Choke Point
- [x] Single authorization choke point: `server/src/services/authzService.js` (`authorize()`).
- [x] Anti-IDOR enforcement: Any ungranted document access returns generic `404 Not Found` (never reveals `403` or file existence).
- [x] Envelope encryption: Every uploaded file gets a random 256-bit AES-256-GCM DEK, encrypted by Master Key (KEK).
- [x] Magic bytes file upload validation: Enforced via `file-type` buffer inspection; rejects fake extensions and macro-enabled documents (`.docm`, `.xlsm`, `.dotm`).
- [x] Real-time permission revocation: Per-document `grant_version` invalidates all issued download tickets immediately upon revocation.

### Phase 3: Cryptographic Audit Trail & Immutability
- [x] Append-only `audit_log` table with database triggers rejecting `UPDATE` or `DELETE`:
  ```sql
  CREATE TRIGGER trg_protect_audit_log
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION fn_protect_audit_log();
  ```
- [x] SHA-256 Hash Chain: Each row hashes `(previous_hash, sequence_id, timestamp, actor_id, action, document_id, outcome, reason)` with sorted deterministic JSON serialization.
- [x] Cryptographic verification endpoint: `GET /api/admin/audit/verify` sequentially recalculates the entire chain from Genesis block #1 to Head block.
- [x] Tamper-detection test: Artificially altering a row in tests breaks mathematical verification (`valid: false`).
- [x] Audit bundle export: `GET /api/admin/audit/export` allows downloading verifiable JSON proof.

### Phase 4: Least-Privilege RBAC & Admin Tools
- [x] Admin users cannot implicitly read/download confidential documents without an explicit grant (Least-Privilege).
- [x] Admin Security Center dashboard with real-time metrics (`totalEvents`, `deniedEvents`, `permissionChanges`, `activeActors`).
- [x] Instant User Account Lockout: Admin toggling a user to inactive terminates all active PostgreSQL sessions across all devices immediately.

### Phase 5: Gemini AI Access Assistant
- [x] Context-aware recipient recommendations for document owners (`POST /api/documents/:id/ai-recipients`).
- [x] Prompt Injection Defense: Control characters and markdown delimiters sanitized; untrusted user inputs wrapped in strict XML tags; model responses filtered against existing verified corporate directory only.

### Phase 6: Frontend Refactor & Modern UI
- [x] Cleaned up CSS (`client/src/index.css`) with standard design tokens and zero clutter.
- [x] Decoupled authentication into a dedicated floating modal ([AuthModal.jsx](file:///d:/argus/client/src/components/AuthModal.jsx)).
- [x] Sticky enterprise Navbar ([Navbar.jsx](file:///d:/argus/client/src/components/Navbar.jsx)) with live database health indicator pill, responsive navigation tabs, and Sign In / Register buttons.
- [x] Spacious landing Hero ([HeroSection.jsx](file:///d:/argus/client/src/components/HeroSection.jsx)) with 4 architectural pillar cards and judge persona auto-fill pills.
- [x] Documents Vault ([DocumentsView.jsx](file:///d:/argus/client/src/components/DocumentsView.jsx)) with spacious table rows, category filters, upload card, and 60-second ticket generator.
- [x] Threat Defense Matrix view ([ThreatDefenseView.jsx](file:///d:/argus/client/src/components/ThreatDefenseView.jsx)) displaying all 10 threat vectors with direct test citations.

---

## 4. Current Test & Verification Results

All automated test suites pass with **100% green**:
```
 Test Files  5 passed (5)
      Tests  45 passed (45)
   Duration  4.14s
```
- `tests/auth.test.js`: 12 tests passing.
- `tests/documents.test.js`: 13 tests passing.
- `tests/audit.test.js`: 8 tests passing.
- `tests/authzMatrix.test.js`: 8 tests passing.
- `tests/ai.test.js`: 4 tests passing.

**Mutation Testing:**
- `node tests/mutationCheck.js` reports **100.0% Kill Rate (5/5 mutants killed)** across authorization bypass, IDOR leakage, hash alteration, DB trigger bypass, and expired tickets.

**Production Build:**
- `npm --prefix client run build` succeeds cleanly in < 3 seconds with zero lint or packaging errors.

---

## 5. Seed Users & Demo Personas

All seed accounts use the master demo password: `Password@Argus2026!`

| Persona | Email | Role | Department | Purpose in Demo |
| :--- | :--- | :--- | :--- | :--- |
| **Alice Vance** | `admin@argus.local` | `admin` | Security | Admin Security Center, hash chain verification, user lockouts. |
| **Bob Stone** | `owner1@argus.local` | `owner` | Engineering | Uploads encrypted specs, manages grants, requests AI suggestions. |
| **Carol Reed** | `owner2@argus.local` | `owner` | Finance | Unrelated owner (demonstrates 404 Anti-IDOR against Bob's files). |
| **Dave Miller** | `viewer1@argus.local` | `viewer` | Compliance | Viewer with read grants, generates 60s tickets, rejected on grants. |
| **Dan Vance** | `disabled@argus.local` | `disabled` | Operations | Inactive account (verifies immediate rejection on login). |

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
│   │   ├── controllers\                 # auth, documents, admin, health
│   │   ├── db\pool.js                   # Supabase PostgreSQL client
│   │   ├── middleware\                  # auth, csrf, rateLimiter
│   │   ├── services\                    # authz, crypto, audit, storage, ai, email
│   │   └── app.js                       # Express app configuration
│   └── index.js                         # Server entry point (port 5000)
├── db\
│   ├── schema.sql                       # Full database DDL with triggers
│   └── seed.sql                         # Initial test users & documents
├── tests\                               # 5 test suites (45 tests total)
├── docs\                                # ARCHITECTURE.md, API.md, THREATS.md
├── workstatus.md                        # THIS STATUS & HANDOFF FILE
└── package.json                         # Root scripts (npm test, npm run dev)
```

---

## 7. How to Resume in a Fresh Session

1. **Verify Services:**
   - Server runs on `http://localhost:5000` via:
     ```bash
     npm --prefix server run dev
     ```
   - Client runs on `http://localhost:3000` via:
     ```bash
     npm --prefix client run dev
     ```
   - Run tests anytime via:
     ```bash
     npm test
     ```

2. **Next Recommended Tasks for Future Sessions:**
   - **Cloud Deployment:** Deploy the backend to Render / Railway / Fly.io and the frontend to Vercel / Netlify.
   - **Documentation & Walkthrough:** Record a demo video or prepare slides showcasing the hash chain verification and Anti-IDOR proofs.
   - **Real-time Notifications:** Add WebSockets or SSE for real-time audit log streaming in the Admin dashboard.
