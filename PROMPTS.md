# AI Prompt Log & Security Self-Critique (PROMPTS.md)

> Snovasys Fresher Hiring Challenge 2026  
> **Rule:** Real dated entries documenting prompt queries, initial code generation, specific flaws identified, and the engineering corrective action taken.

---

### Entry 1: Architecture & Trust Boundaries
- **Date:** 2026-10-20
- **What was asked:** Produce full system architecture, mindmap, sequence diagrams, and threat model before writing any code.
- **What the AI produced:** Initial sequence diagrams with standard authorization checks and a separate client-side CORS flow.
- **Flaws identified in self-critique:**
  1. *CORS vulnerability surface:* Having a separate frontend port and backend port in production introduces CORS attack surface and requires `credentials: 'include'` headers with `Access-Control-Allow-Origin`.
  2. *JWT Revocation lag:* An initial suggestion to use short-lived JWTs was rejected because stateless JWTs cannot be revoked immediately without a server-side denylist, which contradicts Non-Negotiable #3.
- **Action taken:** Shifted to a single-origin architecture where Express serves the pre-built React Vite app directly (`SameSite=Strict` cookie security with zero CORS complexity). Swapped JWTs for server-side opaque DB sessions with SHA-256 token hashing.
- **File Reference:** [docs/ARCHITECTURE.md](file:///d:/argus/docs/ARCHITECTURE.md)

---

### Entry 2: In-Memory Adapter Query Collision in Session Revocation
- **Date:** 2026-10-20
- **What was asked:** Build server-side session authentication with instant revocation on logout and automated supertest coverage.
- **What the AI produced:** Initial in-memory database adapter (`server/src/db/pool.js`) with pattern-matching SQL handlers for offline test suites.
- **Flaws identified in self-critique:**
  - When testing `POST /api/auth/logout`, `Test 7` failed.
  - *Root Cause:* The query condition for selecting session rows `if (upper.includes('FROM SESSIONS') && upper.includes('TOKEN_HASH = $1'))` was evaluated before the deletion handler.
  - When the SQL statement was `DELETE FROM sessions WHERE token_hash = $1`, it matched the `upper.includes('FROM SESSIONS')` substring condition and executed the `SELECT` branch instead of `DELETE`!
  - As a result, the session was never deleted from memory, and the subsequent request erroneously authenticated.
- **Action taken:** Hardened the query condition to strictly enforce `upper.startsWith('SELECT')`. Re-ran Vitest suite, and all 8 security and session tests passed immediately.
- **File Reference:** [server/src/db/pool.js](file:///d:/argus/server/src/db/pool.js) (Line 85) & [tests/auth.test.js](file:///d:/argus/tests/auth.test.js)

---

### Entry 3: Variable Shadowing in Global Error Handler
- **Date:** 2026-10-20
- **What was asked:** Differentiate internal 500 errors from routine 4xx client rejections in the global error middleware to keep server logs clean.
- **What the AI produced:** An edit introducing an early `const status = err.status || 500` at line 2 while accidentally retaining a duplicate `const status = err.status || 500` at line 21.
- **Flaws identified in self-critique:**
  - Build failure with `SyntaxError: Identifier 'status' has already been declared`.
- **Action taken:** Cleaned up the redundant declaration in `server/src/middleware/errorHandler.js`. Verified via full test suite compilation (`8 passed`).
- **File Reference:** [server/src/middleware/errorHandler.js](file:///d:/argus/server/src/middleware/errorHandler.js)
