# Argus Technical Interview Preparation Guide (`INTERVIEW_PREP.md`)

> **Snovasys Fresher Hiring Challenge 2026**  
> System: **Argus (Audit, Revoke, Grant, Unified Security)**  
> Purpose: **Comprehensive Q&A and Code Defense Guide for Final Round Interviews**

---

## 1. The Mandatory Core Question

> **Judge:** *"Where is the authorization decision made when someone downloads a file, and what would happen if that line were removed?"*

### Your Answer:
1. **The Exact File & Line:**
   - In [`server/src/routes/documents.js`](file:///d:/argus/server/src/routes/documents.js), inside `GET /:id/download`:
     ```javascript
     const { document } = await authorize(req.user, req.params.id, 'download', getReqContext(req));
     ```
   - This invokes our centralized choke point function in [`server/src/services/authzService.js`](file:///d:/argus/server/src/services/authzService.js).
2. **What happens if that line is removed:**
   - *Behavioral impact:* An unauthenticated attacker or unauthorized user could craft an HTTP request to `GET /api/documents/<uuid>/download` and immediately receive the decrypted plaintext stream, completely bypassing all access control.
   - *How our test suite catches it:* If you comment out or remove that line, our **Mutation Testing Harness** (`npm run test:mutation-authz`) and automated test suite (`tests/documents.test.js` and `tests/authzMatrix.test.js`) will immediately fail on **Tests 5, 6, and 7** with `AssertionError: expected 404 to be 200`. Our mutation kill rate drops from 100% to failure.

---

## 2. In-Depth Architectural Questions

### Q2: Why did you return 404 Not Found instead of 403 Forbidden for unauthorized documents?
> *"Returning 403 Forbidden leaks the existence of confidential resources (Insecure Direct Object Reference / Existence Enumeration - THR-11). In a multi-tenant corporate environment, an attacker probing UUIDs would immediately discover confidential merger documents or salary letters simply because the server responded with 403 rather than 404. In Argus, unauthorized documents and non-existent documents are treated identically with a uniform 404 Not Found."*

### Q3: Why not use JSON Web Tokens (JWT) for authentication?
> *"Because Non-Negotiable #3 of the challenge requires that taking access away works immediately. With stateless JWTs, when an administrator deactivates an account or an owner revokes a grant, the user's signed token remains valid until expiration (typically 15 minutes). To revoke it immediately, you must maintain a centralized token blocklist in Redis or PostgreSQL, which negates the stateless benefit of JWTs while introducing complexity. Argus uses opaque, 32-byte cryptographically random session tokens stored in PostgreSQL with SHA-256 token hashing. Every request validates live database state in sub-millisecond query time."*

### Q4: How does Argus guarantee immediate revocation for pre-issued download tickets?
> *"We use a monotonic per-document version counter called `grant_version`. When a 60-second download ticket is generated, the ticket record captures `grant_version_at_issue = document.grant_version`. The moment an owner clicks 'Revoke Now', the database executes `UPDATE documents SET grant_version = grant_version + 1`. When the grantee attempts to redeem the ticket URL, the server verifies `ticket.grant_version_at_issue === document.live_grant_version`. If they do not match, the ticket is instantly invalidated and rejected with a 403 error."*

### Q5: How do you prevent a database administrator or compromised superuser from altering historical audit records?
> *"We use a two-tier defense: First, database-level immutability enforced by a PostgreSQL trigger (`trg_protect_audit_log` calling `prevent_audit_tampering()`) which unconditionally raises an exception (`ERRCODE 42501`) on any `UPDATE`, `DELETE`, or `TRUNCATE` query. Second, an append-only SHA-256 cryptographic hash chain where every row incorporates the previous row's hash (`prev_hash`). If anyone alters historical records directly on disk, the sequential hash verification in `verifyChain()` fails at that sequence ID."*

### Q6: How do you protect against malicious file uploads and MIME spoofing?
> *"We never trust the client-supplied filename or Content-Type header (`THR-13`). In `server/src/services/uploadValidator.js`, we inspect the file's raw binary magic bytes: PDFs must start with `%PDF-`, PNGs with `89 50 4E 47`, etc. Furthermore, for ZIP/Office documents, we parse the archive headers and actively reject any file containing `vbaProject.bin` (VBA macros). Finally, files are stored on disk or private cloud storage with randomized UUID keys, never their original filename, preventing path traversal attacks."*

### Q7: Where does Gemini AI fit, and how do you protect against prompt injection?
> *"Gemini 1.5 Flash is strictly confined to advisory recipient recommendations (`server/src/services/aiService.js`). It never touches raw document contents—only sanitized metadata (title and category). To prevent prompt injection (`THR-16`), titles are stripped of script tags and control characters. The output is programmatically filtered against an allowlist of active database user UUIDs. Most importantly, the machine cannot grant permissions autonomously; an authenticated human owner must confirm every grant."*

---

## 3. Live Coding / Modification Scenarios

If the interviewers ask you to make a live change:

### Scenario A: "Add a new role: Auditor"
1. In `db/schema.sql`, add `'auditor'` to the role enum check: `CHECK (role IN ('admin', 'owner', 'viewer', 'auditor'))`.
2. In `server/src/middleware/session.js`, add `'auditor'` to `requireRole()`.
3. In `server/src/services/authzService.js`, permit auditors read-only access to audit logs.

### Scenario B: "Add expiration dates to document grants"
1. Notice that `grants.expires_at` is already built into our PostgreSQL schema!
2. In `server/src/routes/documents.js`, accept `expiresInHours` in `POST /api/documents/:id/grants`.
3. Set `expires_at = new Date(Date.now() + hours * 3600000)`.
4. Our query in `authzService.js` line 128 already includes `AND (expires_at IS NULL OR expires_at > NOW())`!

### Scenario C: "Change the single-use download ticket lifetime to 30 seconds"
1. Open `server/src/routes/documents.js`.
2. Locate `POST /:id/ticket` (line 230).
3. Change `30 * 1000` and `expiresInSeconds: 30`.
