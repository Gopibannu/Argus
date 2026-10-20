# Argus API Specification (`API.md`)

> **Snovasys Fresher Hiring Challenge 2026**  
> System: **Argus (Audit, Revoke, Grant, Unified Security)**  
> Base URL: `https://<deployed-host>/api` or `http://localhost:5000/api`

---

## Security Invariants on all Endpoints

1. **Stateful Session Authentication:** Evaluated against PostgreSQL sessions table on every request via `HttpOnly; SameSite=Strict; Secure` cookie (`argus_session`).
2. **Double-Submit CSRF Defense:** Required header `X-CSRF-Token` for all state-modifying requests (`POST`, `PATCH`, `DELETE`).
3. **Single Choke Point `authorize()`:** Centralized authorization matrix with **Default Deny**.
4. **Anti-IDOR Protection:** Non-owned, ungranted documents return uniform **404 Not Found** (never 403) to eliminate existence enumeration.
5. **Least Privilege Admin:** Administrators have zero implicit document content access without a named grant.
6. **Cryptographic Audit Hash Chain:** Every evaluation (both `allowed` and `denied`) is hashed into the SHA-256 tamper-evident log chain.

---

## Endpoint Catalog

### 1. System & Health

#### `GET /api/health`
- **Description:** System health check and database connectivity probe.
- **Allowed Callers:** Public (No authentication required).
- **Responses:**
  - `200 OK`: `{"status": "healthy", "uptime": 124.5, "database": "connected", "timestamp": "2026-10-20T16:00:00Z"}`

---

### 2. Authentication & Sessions

#### `POST /api/auth/register`
- **Description:** Self-provision a new user account as Document Owner or Viewer.
- **Allowed Callers:** Public / Unauthenticated. Rate-limited to 15 requests / 15 mins.
- **Request Body:**
  ```json
  {
    "email": "jane@company.com",
    "password": "Min8CharPassword!",
    "fullName": "Dr. Jane Smith",
    "role": "owner",
    "department": "Engineering"
  }
  ```
- **Responses:**
  - `201 Created`: Sets `argus_session` cookie; returns user profile and `csrfToken`.
  - `400 Bad Request`: Validation failure (short password, bad email).
  - `409 Conflict`: Email already registered.

#### `POST /api/auth/login`
- **Description:** Authenticate user credentials and create a stateful server-side session.
- **Allowed Callers:** Public. Rate-limited (15 attempts / 15 mins).
- **Mitigation:** Constant-time dummy hash comparison to prevent timing enumeration (`THR-01`).
- **Request Body:**
  ```json
  {
    "email": "owner1@argus.local",
    "password": "Password@Argus2026!"
  }
  ```
- **Responses:**
  - `200 OK`: Sets `argus_session` cookie; returns user object and `csrfToken`.
  - `401 Unauthorized`: Generic error message (`Invalid email or password.` or `Account deactivated.`).

#### `GET /api/auth/me`
- **Description:** Retrieve currently authenticated user context and CSRF token.
- **Allowed Callers:** Any authenticated user with valid session.
- **Responses:**
  - `200 OK`: `{"authenticated": true, "user": {...}, "csrfToken": "..."}`
  - `200 OK` (when no cookie): `{"authenticated": false}`

#### `POST /api/auth/logout`
- **Description:** Invalidate current session and clear session cookie.
- **Allowed Callers:** Authenticated user (`requireAuth`). Requires `X-CSRF-Token`.
- **Responses:**
  - `200 OK`: Deletes session from DB; clears cookie.

#### `POST /api/auth/logout-all`
- **Description:** Immediately terminate all active sessions across all devices for current user.
- **Allowed Callers:** Authenticated user (`requireAuth`). Requires `X-CSRF-Token`.
- **Responses:**
  - `200 OK`: `{"message": "Logged out from all devices."}`

---

### 3. Documents & Envelope Encryption

#### `POST /api/documents/upload`
- **Description:** Upload file with envelope encryption (AES-256-GCM).
- **Allowed Callers:** Document Owners (`role === 'owner'`). Requires `X-CSRF-Token`.
- **Validations:** Magic-byte inspection, max 10MB, macro rejection (`vbaProject.bin`).
- **Content-Type:** `multipart/form-data`
  - `file`: binary attachment
  - `title`: string (optional)
  - `category`: string (`Engineering`, `Finance`, `Legal`, `Compliance`, `General`)
- **Responses:**
  - `201 Created`: `{"message": "Document uploaded successfully.", "document": {...}}`
  - `400 Bad Request`: Spoofed magic bytes, macros detected, or file exceeds 10MB.
  - `403 Forbidden`: Viewers attempting to upload.

#### `GET /api/documents`
- **Description:** SQL-filtered document search. Returns ONLY files the user owns or has active grants for.
- **Allowed Callers:** Any authenticated user (`requireAuth`).
- **Query Parameters:**
  - `q`: search substring against title and filename
  - `category`: filter by category (`Engineering`, `Finance`, etc.)
  - `owner`: search by owner full name or email
  - `startDate`, `endDate`: ISO timestamp date bounds
- **Responses:**
  - `200 OK`: `{"documents": [...]}`

#### `GET /api/documents/:id`
- **Description:** Fetch document metadata.
- **Allowed Callers:** Document owner or active grantee.
- **Responses:**
  - `200 OK`: Document metadata (filename, category, size, sha256 checksum).
  - `404 Not Found`: If document does not exist OR caller is not authorized (Anti-IDOR).

#### `GET /api/documents/:id/download`
- **Description:** Stream decrypted document content on the fly.
- **Allowed Callers:** Document owner or active grantee (`read` or `edit`).
- **Responses:**
  - `200 OK`: Decrypted binary stream with sanitized attachment filename.
  - `404 Not Found`: Unauthorized access or deleted document (Anti-IDOR).

#### `POST /api/documents/:id/ticket`
- **Description:** Issue a short-lived (60s) single-use download ticket.
- **Allowed Callers:** Document owner or active grantee. Requires `X-CSRF-Token`.
- **Responses:**
  - `200 OK`: `{"ticket": "hexToken", "expiresInSeconds": 60, "expiresAt": "..."}`
  - `404 Not Found`: Unauthorized.

#### `GET /api/documents/tickets/:ticket`
- **Description:** Redeem a single-use download ticket.
- **Allowed Callers:** Public link holder (ticket bearer).
- **Security Check:** Validates single-use flag and `grant_version` invariant. If owner revoked access after ticket was created, redemption is rejected.
- **Responses:**
  - `200 OK`: Decrypted file stream.
  - `403 Forbidden`: Grant was revoked prior to ticket redemption.
  - `404 Not Found`: Ticket expired, invalid, or already used.

#### `PATCH /api/documents/:id`
- **Description:** Update document title or category.
- **Allowed Callers:** Document owner or grantee with `edit` permission. Requires `X-CSRF-Token`.
- **Responses:**
  - `200 OK`: Updated metadata.
  - `403 Forbidden`: Read-only grantee attempting to edit.
  - `404 Not Found`: Non-granted user attempting to edit.

#### `DELETE /api/documents/:id`
- **Description:** Soft-delete document and increment `grant_version`.
- **Allowed Callers:** Document owner ONLY. Requires `X-CSRF-Token`.
- **Responses:**
  - `200 OK`: `{"message": "Document soft-deleted successfully."}`
  - `403 Forbidden`: Grantees (even with `edit`) attempting to delete.
  - `404 Not Found`: Non-granted user attempting to delete.

---

### 4. Permissions & Grants

#### `GET /api/documents/:id/grants`
- **Description:** List active and revoked grants for a document.
- **Allowed Callers:** Document owner ONLY.
- **Responses:**
  - `200 OK`: `{"grants": [...]}`
  - `403 / 404`: Non-owners blocked.

#### `POST /api/documents/:id/grants`
- **Description:** Issue a named permission (`read` or `edit`) to an organizational user.
- **Allowed Callers:** Document owner ONLY. Requires `X-CSRF-Token`.
- **Request Body:** `{"granteeEmail": "viewer1@argus.local", "permission": "read"}`
- **Responses:**
  - `201 Created`: Grant registered; logged to audit trail.
  - `403 Forbidden`: Grantees attempting to re-share or grant permissions.

#### `POST /api/documents/:id/grants/:grantId/revoke`
- **Description:** Immediately revoke a grant and invalidate all outstanding download tickets.
- **Allowed Callers:** Document owner ONLY. Requires `X-CSRF-Token`.
- **Responses:**
  - `200 OK`: `{"message": "Grant revoked immediately. Access has been terminated."}`

---

### 5. Gemini AI Access Assistant

#### `POST /api/documents/:id/ai-suggest`
- **Description:** Generate advisory recipient recommendations using Google Gemini 1.5 Flash.
- **Allowed Callers:** Document owner ONLY. Requires `X-CSRF-Token`.
- **Rules:** Output is purely advisory. The machine never grants permissions. Both suggestion and owner decision are logged to audit trail.
- **Responses:**
  - `200 OK`: `{"suggestions": [...], "model": "Google Gemini 1.5 Flash", "disclaimer": "..."}`
  - `404 Not Found`: Non-owners blocked.

---

### 6. Administrator Security Center

#### `GET /api/admin/audit/verify`
- **Description:** Cryptographically verify the sequential SHA-256 hash chain from Genesis to HEAD.
- **Allowed Callers:** Administrator ONLY (`role === 'admin'`).
- **Responses:**
  - `200 OK`: `{"status": "INTEACT", "valid": true, "totalRowsVerified": 42, "headHash": "..."}`
  - `200 OK` (tampered): `{"status": "TAMPERED", "valid": false, "brokenRowIndex": 3, "error": "..."}`

#### `GET /api/admin/metrics`
- **Description:** Security counter metrics (total events, denied attempts, permission changes).
- **Allowed Callers:** Administrator ONLY (`role === 'admin'`).
- **Responses:**
  - `200 OK`: `{"totalEvents": 84, "deniedEvents": 12, "permissionChanges": 6, "activeActors": 4, "chainIntegrity": "VALID"}`

#### `GET /api/admin/audit`
- **Description:** Query and filter audit trail stream.
- **Allowed Callers:** Administrator ONLY (`role === 'admin'`).
- **Query Parameters:** `limit`, `outcome` (`allowed`/`denied`), `action`.
- **Responses:**
  - `200 OK`: `{"auditTrail": [...]}`

#### `GET /api/admin/users`
- **Description:** List all users, departments, roles, and active statuses.
- **Allowed Callers:** Administrator ONLY (`role === 'admin'`).
- **Responses:**
  - `200 OK`: `{"users": [...]}`

#### `POST /api/admin/users/:id/toggle-status`
- **Description:** Toggle user active status. Deactivating a user instantly deletes all active database sessions across all devices.
- **Allowed Callers:** Administrator ONLY (`role === 'admin'`). Requires `X-CSRF-Token`.
- **Responses:**
  - `200 OK`: `{"message": "User deactivated successfully.", "isActive": false}`
