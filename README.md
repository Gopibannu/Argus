# Argus — Unified Security & Audit Platform

> **Audit • Revoke • Grant • Unified Security**  
> *Snovasys Fresher Hiring Challenge 2026*  
> Zero-trust document vault where the wrong person can never read a file, every access attempt is cryptographically hash-chained and tamper-evident, and permission changes take effect in 0ms.

---

## 🌐 Live Deployment & Credentials

- **Live Application URL:** **[https://argus-security-platform.onrender.com](https://argus-security-platform.onrender.com)** *(Render Web Service)*
- **Demo Accounts Password:** **`Password@Argus2026!`** *(All pre-seeded accounts have 1-click auto-fill buttons in the web modal)*
- **Database Engine:** Hybrid Resilient PostgreSQL. Connected to live Supabase / Render PostgreSQL with automated fallback to an in-memory secure vault to ensure zero disruption during database cold starts or maintenance.

| Role | Email | Name | Capabilities & Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@argus.local` | Alice Admin | Manages user accounts, deactivates compromised sessions, verifies SHA-256 audit hash chain. *Least privilege: Admin has no blanket document read permissions.* |
| **Document Owner 1** | `owner1@argus.local` | Bob Owner (Eng) | Uploads files, issues named grants (`read`, `edit`), modifies metadata, deletes owned documents. |
| **Document Owner 2** | `owner2@argus.local` | Carol Owner (Fin) | Uploads and manages finance documents, grants and revokes permissions. |
| **Viewer 1** | `viewer1@argus.local` | Dave Viewer (Audit) | Reads and downloads documents explicitly granted to him. Cannot see or access ungranted documents. |
| **Viewer 2** | `viewer2@argus.local` | Eve Viewer (Contractor) | External contractor with access strictly scoped to specifically granted files. |
| **Disabled Account** | `disabled@argus.local` | Dan Disabled | Deactivated user account. Used to verify immediate session lockout and authentication rejection. |

---

## 🛡️ Core Security Invariants & Non-Negotiables

1. **Single Choke Point (`authorize`)**: Every document request is mediated by a single server-side gate (`server/src/services/authzService.js`). No client-side bypasses or hidden button security.
2. **Anti-IDOR Protection (Uniform 404)**: Access attempts to unauthorized or ungranted documents return a uniform `404 Not Found`—never `403 Forbidden`—preventing existence enumeration attacks.
3. **Cryptographic Tamper-Evident Audit Trail**: Every access attempt (allowed or denied) is linked in an append-only SHA-256 hash chain with PostgreSQL database triggers prohibiting any `UPDATE`, `DELETE`, or `TRUNCATE` operations.
4. **Instant Revocation**: Zero cached stateless JWTs. Stateful sessions re-query database permissions on every request; revoking a grant invalidates active 60s ephemeral tickets immediately via per-document `grant_version` increments.
5. **Envelope Encryption (AES-256-GCM)**: Each uploaded file is encrypted with a unique per-file Data Encryption Key (DEK), which is wrapped by a Master Key (KEK). Cloud storage never stores plaintext files.

---

## 📱 Mobile-First Responsive Design

Argus is designed with rich aesthetics and responsive layouts for desktop, tablet, and mobile screens:
- **Responsive Header & Navigation**: Dynamic sliding tabs with compact badges on mobile viewports.
- **Adaptive Data Tables**: Essential information prioritized on mobile (Title, Access Level, Actions) with collapsible metadata (Category, Owner, Size) preventing horizontal blowout.
- **Touch-Friendly Modals**: Modal dialogues (Authentication, Grants Management, Edit Document) adapt cleanly to 375px screens with 1-click persona pills and accessible form controls.

---

## 🤖 AI Access Assistant (Google Gemini 2.0 Flash)

- **Human-in-the-Loop Recommendations**: Suggests appropriate role and department recipients based on document metadata (e.g., category, department sensitivity).
- **Security Protections**: Strict prompt compartmentalization, control delimiter stripping, and server-side candidate filtering against known users.
- **Audit Chain Decision Tracking**: Suggestions generate unique batch IDs and are linked directly into the cryptographic audit trail upon human approval (`aiDecision: 'accepted'`).
- **Fail-Safe Fallback**: Automatic deterministic heuristic fallback when external AI APIs are offline or unconfigured.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### 1. Clone & Install
```bash
git clone https://github.com/Gopibannu/Argus.git
cd Argus
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
*(By default, Argus runs an offline in-memory secure database with preloaded seed data for instant, zero-config evaluation. To connect to PostgreSQL, set `DATABASE_URL` in `.env`).*

### 3. Build & Run
```bash
# Build React client bundle
npm run build

# Start the secure server
npm start
```
Access the application at **[http://localhost:5000](http://localhost:5000)** (or dev server at **[http://localhost:3000](http://localhost:3000)**).  
Health check endpoint: **[http://localhost:5000/api/health](http://localhost:5000/api/health)**.

---

## 🧪 Automated Testing & Mutation Analysis

Argus achieves comprehensive test coverage across unit, authorization matrix, and mutation suites:

```bash
# Run all automated security test suites (48 / 48 passing)
npm test

# Run Extended Mutation Testing Engine (100% kill rate: 7/7 mutants killed)
npm run test:mutation-authz
```

### Test Coverage Highlights:
- **`tests/auth.test.js`** (12 tests): Registration with 6-digit OTP, session validation, brute-force rate limits, multi-device logout, and role escalation blocks.
- **`tests/documents.test.js`** (14 tests): Upload magic bytes validation, AES-256-GCM envelope encryption, 60s ticket expiration, single-use replay defense, and instant grant revocation.
- **`tests/authzMatrix.test.js`** (10 tests): Exhaustive matrix verifying ungranted document requests return `404 Not Found` (Anti-IDOR), SQL search join isolation, and mass assignment protection.
- **`tests/audit.test.js`** (8 tests): Cryptographic SHA-256 hash chain verification, advisory lock serialization, and PostgreSQL trigger tamper detection.
- **`tests/ai.test.js`** (4 tests): Prompt injection defense, control delimiter neutralization, and AI suggestion validation.

---

## ☁️ Deployment Instructions (Render + PostgreSQL)

Argus is production-ready for deployment on Render, Railway, or standard Node.js hosting:

1. **Repository**: Connect `https://github.com/Gopibannu/Argus.git` to Render as a **Web Service**.
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `node server/src/index.js`
4. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MASTER_ENCRYPTION_KEY`: `generate-with-openssl-rand-hex-32` *(Set securely on host only)*
   - `SESSION_SECRET`: `your-random-session-secret`
   - `DATABASE_URL`: `your_postgresql_connection_string` *(optional: resilient in-memory fallback included)*
   - `GEMINI_API_KEY`: `your_gemini_api_key` *(optional)*

---

## 📚 Deliverables & Documentation Index

- [docs/WRITEUP.md](docs/WRITEUP.md): Full system architecture write-up, trade-offs, and design rationale.
- [docs/API.md](docs/API.md): Complete REST API specification with permission requirements.
- [docs/DEMO.md](docs/DEMO.md): 5-minute timed judge demonstration script.
- [docs/INTERVIEW_PREP.md](docs/INTERVIEW_PREP.md): Technical interview preparation and deep-dive code walk-throughs.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Architectural diagrams (Sequence, ER, Hash chain, Threat boundaries).
- [docs/ai-context/MASTER_PROMPT.md](docs/ai-context/MASTER_PROMPT.md): AI Master Prompt, security rules, and prompt injection mitigations.
- [THREATS.md](THREATS.md): Threat modeling matrix with 22 analyzed threat vectors and automated test proofs.
- [PROMPTS.md](PROMPTS.md): AI interaction history and 11 dated self-critiques documenting security bug discoveries and commit links.
- [db/schema.sql](db/schema.sql): PostgreSQL database schema with immutability triggers and restricted least-privilege role setup.
- [db/seed.sql](db/seed.sql): Role seed records and Genesis audit block.


