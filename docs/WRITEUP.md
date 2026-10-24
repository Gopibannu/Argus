# Argus System Write-Up (`WRITEUP.md`)

> **Snovasys Fresher Hiring Challenge 2026**  
> Project: **Argus (Audit, Revoke, Grant, Unified Security)**  
> Author: **Gopi Bannu**  
> Repository: [https://github.com/Gopibannu/Argus](https://github.com/Gopibannu/Argus)

---

## 1. What We Built

Argus is an enterprise-grade secure document platform built for zero-trust environments where data confidentiality and non-repudiation are absolute requirements.

### Core Architectural Pillars
1. **Single Server-Side Choke Point (`authorize()`):**
   - Every file download, metadata read, update, or grant check passes through a single invariant authorization function in `server/src/services/authzService.js`.
   - Client-side visibility flags are treated as cosmetic; authorization decisions are made strictly on the server by querying live PostgreSQL records.
2. **Anti-IDOR & Existence Enumeration Elimination:**
   - Probing an unauthorized or non-existent document ID unconditionally returns **404 Not Found** (never 403). An attacker cannot determine whether a confidential file UUID exists.
3. **Envelope Encryption At Rest (AES-256-GCM):**
   - Every uploaded document is encrypted with a unique 256-bit Data Encryption Key (DEK). The DEK is encrypted using the Master Encryption Key (MEK) and stored alongside the ciphertext. Files in private storage (Supabase / local store) are completely unreadable without runtime server decryption.
4. **Immediate Revocation Architecture (Zero Cached JWTs):**
   - Argus uses stateful PostgreSQL sessions with SHA-256 hashed session tokens stored in `HttpOnly; SameSite=Strict` cookies.
   - Per-document versioning (`grant_version`): Whenever an owner revokes a grant, the document's `grant_version` increments, instantly invalidating any pre-issued 60-second download tickets before redemption.
5. **Tamper-Evident SHA-256 Audit Trail:**
   - Every event (allowed and denied) forms a sequential cryptographic hash chain. Each row computes `SHA256(sequence_id | timestamp | actor_id | action | outcome | reason | doc_id | target_id | metadata | prev_hash)`.
   - Modifying or deleting any historical record breaks the chain from that row forward.
   - Enforced by PostgreSQL trigger `trg_protect_audit_log` which raises an uncatchable exception on `UPDATE`, `DELETE`, or `TRUNCATE`.
6. **Gemini 3.5 Flash-Lite AI Multi-Agent Ecosystem:**
   - Integrates Google Gemini 3.5 Flash-Lite across three specialized security agents: (1) Autonomous Security Audit Threat Inspector for real-time reconnaissance scanning detection; (2) Zero-Trust Security Copilot agent for technical policy inquiries; and (3) Human-in-the-Loop Recipient Grant Assistant.
   - Defended against prompt injection (`THR-16`) via strict metadata sanitization and server-side candidate allowlist validation.
   - The machine is strictly advisory; a human owner must confirm every grant, and both suggestion and decision are committed to the audit chain.

---

## 2. What We Deliberately Left Out (And Why)

In security engineering, deciding what **not** to build is as vital as the features implemented. We deliberately rejected:

1. **Stateless JWTs for Authorization:**
   - *Why rejected:* A standard 15-minute JWT cannot be revoked immediately without maintaining a distributed revocation blocklist (which converts it back into stateful sessions with added complexity). Stateful database sessions guarantee instant account deactivation and zero stale privilege windows.
2. **Folder Inheritance & Wildcard Grants:**
   - *Why rejected:* Folder-level cascading permissions are the primary source of enterprise data leaks ("User needed access to 1 file in a folder and inadvertently received access to 40 files"). Argus enforces explicit, named grants per document (`read`, `edit`).
3. **Public Unauthenticated Document Links:**
   - *Why rejected:* Permanent public URLs bypass non-repudiation. Instead, Argus provides single-use, 60-second expiring download tickets that tie access to a live `grant_version`.
4. **Autonomous AI Permission Granting:**
   - *Why rejected:* Handing write access to an LLM creates prompt injection vulnerabilities. The human owner retains exclusive control over grants.

---

## 3. The Permission Model in Plain English

Argus implements a 3-tier Role-Based Access Control (RBAC) model combined with explicit Discretionary Access Control (DAC) per document:

| Role | Responsibilities & Rights | Boundaries & Restrictions |
| :--- | :--- | :--- |
| **Administrator (Alice)** | Security operations, audit hash chain verification, platform metrics, and instant user lockout. | **Least Privilege Admin:** Cannot view or download document contents without an explicit grant from the owner. |
| **Document Owner (Bob, Carol)** | Upload documents, view metadata, download decrypted contents, edit metadata, issue named grants (`read` or `edit`), revoke grants immediately, and soft-delete. | Cannot view or modify documents owned by other users unless explicitly granted access. |
| **Viewer (Dave, Eve)** | View authorized documents, download contents, generate 60s tickets. If granted `edit`, can update metadata. | Cannot grant permissions to others, cannot revoke grants, and cannot delete documents. |

---

## 4. How We Used AI and Where It Was Wrong

Throughout the hackathon, AI was utilized as a pair programmer. However, several AI-generated security flaws were caught and corrected:

1. **Authentication Timing Flaw (`THR-01` / PROMPTS.md Entry 1):**
   - The AI initially returned early 401 errors when an email did not exist, allowing timing attacks. We forced a constant-time comparison using a dummy bcrypt hash.
2. **Stateless JWT Default (`THR-05` / PROMPTS.md Entry 2):**
   - The AI proposed 15-minute JWTs. We rejected this to ensure immediate revocation, implementing server-side opaque sessions in PostgreSQL.
3. **Global Choke Point Query Collision (PROMPTS.md Entry 5):**
   - The in-memory SQL mock loosely matched `ID = $1`, causing document search queries to collide. We tightened the single-document check to explicit `WHERE ID = $1`.
4. **Audit Hash Chain Discrepancy (PROMPTS.md Entry 6):**
   - The AI omitted `reason` from row candidate hashing and `verifyChain()` SELECT queries. Modifying historical reasons failed to trip the hash verification. We canonicalized all 10 non-repudiation fields to ensure tamper detection.
5. **Anti-IDOR Authorization Precedence (`THR-11` / PROMPTS.md Entry 7):**
   - The AI checked owner-only actions (`delete`, `grant`) before verifying if an ungranted user even possessed a grant, returning 403 instead of 404. We reordered the choke point so ungranted users always receive 404.
6. **Autonomous AI Widening (`THR-16` / PROMPTS.md Entry 8):**
   - The AI proposed automatic grant population. We enforced a Human-in-the-Loop constraint with prompt sanitization and output UUID validation.

---

## 5. Unfinished Work & Known Limitations

1. **External Hash Anchoring (Accepted Risk `THR-17`):**
   - Currently, the audit chain is verified internally against the Genesis block in PostgreSQL. In production, the HEAD row hash should be committed daily to an external public blockchain or public Git repository to defend against a compromised cloud database superuser.
2. **Multi-Region Envelope Key Rotation:**
   - Master key rotation is supported by re-encrypting DEKs, but an automated key rotation schedule (e.g., via AWS KMS or HashiCorp Vault) would be the next operational enhancement.
