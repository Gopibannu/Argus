# Argus — Unified Security & Audit Platform

> **Audit • Revoke • Grant • Unified Security**  
> *Snovasys Fresher Hiring Challenge 2026*  
> Zero-trust document vault where the wrong person can never read a file, every access attempt is cryptographically hash-chained and tamper-evident, and permission changes take effect in 0ms.

---

## 🛡️ Core Security Invariants & Non-Negotiables

1. **Single Choke Point (`authorize`)**: Every document request is mediated by a single server-side gate (`server/src/services/authzService.js`). No client-side bypasses or hidden button security.
2. **Anti-IDOR Protection (Uniform 404)**: Access attempts to unauthorized or ungranted documents return a uniform `404 Not Found`—never `403 Forbidden`—preventing existence enumeration attacks.
3. **Cryptographic Tamper-Evident Audit Trail**: Every access attempt (allowed or denied) is linked in an append-only SHA-256 hash chain with PostgreSQL database triggers prohibiting any `UPDATE` or `DELETE` operations.
4. **Instant Revocation**: Zero cached stateless JWTs. Stateful sessions re-query database permissions on every request; revoking a grant invalidates active 60s ephemeral tickets immediately via per-document `grant_version` increments.
5. **Envelope Encryption (AES-256-GCM)**: Each uploaded file is encrypted with a unique per-file Data Encryption Key (DEK), which is wrapped by a Master Key (KEK). Cloud storage never stores plaintext files.

---

## 🔑 Demo Accounts & Pre-seeded Personas

All pre-seeded demo accounts share the password: **`Password@Argus2026!`**  
*(Available via 1-click auto-fill buttons in the web interface).*

| Role | Email | Name | Capabilities & Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@argus.local` | Alice Admin | Manages user accounts, deactivates compromised sessions, verifies SHA-256 audit hash chain. *Least privilege: Admin has no blanket document read permissions.* |
| **Document Owner 1** | `owner1@argus.local` | Bob Owner (Eng) | Uploads files, issues named grants (`read`, `edit`), modifies metadata, deletes owned documents. |
| **Document Owner 2** | `owner2@argus.local` | Carol Owner (Fin) | Uploads and manages finance documents, grants and revokes permissions. |
| **Viewer 1** | `viewer1@argus.local` | Dave Viewer (Audit) | Reads and downloads documents explicitly granted to him. Cannot see or access ungranted documents. |
| **Viewer 2** | `viewer2@argus.local` | Eve Viewer (Contractor) | External contractor with access strictly scoped to specifically granted files. |
| **Disabled Account** | `disabled@argus.local` | Dan Disabled | Deactivated user account. Used to verify immediate session lockout and authentication rejection. |

---

## 📱 Mobile-First Responsive Design

Argus is designed with rich aesthetics and responsive layouts for desktop, tablet, and mobile screens:
- **Responsive Header & Navigation**: Dynamic sliding tabs with compact badges on mobile viewports.
- **Adaptive Data Tables**: Essential information prioritized on mobile (Title, Access Level, Actions) with collapsible metadata (Category, Owner, Size) preventing horizontal blowout.
- **Touch-Friendly Modals**: Modal dialogues (Authentication, Grants Management, Edit Document) adapt cleanly to 375px screens with 1-click persona pills and accessible form controls.

---

## 🤖 AI Access Assistant (Google Gemini Flash-Lite)

- **Human-in-the-Loop Recommendations**: Suggests appropriate role and department recipients based on document metadata (e.g., category, department sensitivity).
- **Security Protections**: Strict prompt compartmentalization, control delimiter stripping, and server-side candidate filtering against known users.
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
# Run all automated security test suites (45 / 45 passing)
npm test

# Run Mutation Testing Engine (100% kill rate: 5/5 mutants killed)
node tests/mutationCheck.js
```

### Test Coverage Highlights:
- **`tests/auth.test.js`**: Registration with 6-digit OTP, session validation, brute-force rate limits, and multi-device logout.
- **`tests/documents.test.js`**: Upload magic bytes validation, AES-256-GCM envelope encryption, 60s ticket expiration, and instant grant revocation.
- **`tests/authzMatrix.test.js`**: Exhaustive matrix verifying ungranted document requests return `404 Not Found` (Anti-IDOR).
- **`tests/audit.test.js`**: Cryptographic SHA-256 hash chain verification and PostgreSQL trigger tamper detection.
- **`tests/ai.test.js`**: Prompt injection defense, control delimiter neutralization, and AI suggestion validation.

---

## ☁️ Deployment Instructions (Render + PostgreSQL)

Argus is production-ready for deployment on Render, Railway, or standard Node.js hosting:

1. **Repository**: Connect `https://github.com/Gopibannu/Argus.git` to Render as a **Web Service**.
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `node server/src/index.js`
4. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MASTER_ENCRYPTION_KEY`: `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`
   - `SESSION_SECRET`: `your-random-session-secret`
   - `DATABASE_URL`: `your_postgresql_connection_string` *(optional: resilient in-memory fallback included)*
   - `GEMINI_API_KEY`: `your_gemini_api_key` *(optional)*

---

## 📚 Deliverables & Documentation Index

- [docs/WRITEUP.md](file:///d:/argus/docs/WRITEUP.md): Full system architecture write-up, trade-offs, and design rationale.
- [docs/API.md](file:///d:/argus/docs/API.md): Complete REST API specification with permission requirements.
- [docs/DEMO.md](file:///d:/argus/docs/DEMO.md): 5-minute timed judge demonstration script.
- [docs/INTERVIEW_PREP.md](file:///d:/argus/docs/INTERVIEW_PREP.md): Technical interview preparation and deep-dive code walk-throughs.
- [docs/ARCHITECTURE.md](file:///d:/argus/docs/ARCHITECTURE.md): Architectural diagrams (Sequence, ER, Hash chain, Threat boundaries).
- [THREATS.md](file:///d:/argus/THREATS.md): Threat modeling matrix with 17 analyzed threat vectors and automated test proofs.
- [PROMPTS.md](file:///d:/argus/PROMPTS.md): AI interaction history and 8 self-critiques documenting security bug discoveries.
- [db/schema.sql](file:///d:/argus/db/schema.sql): PostgreSQL database schema with immutability triggers.
- [db/seed.sql](file:///d:/argus/db/seed.sql): Role seed records and Genesis audit block.

