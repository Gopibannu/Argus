# Argus 5-Minute Judge Demo Script (`DEMO.md`)

> **Snovasys Fresher Hiring Challenge 2026**  
> System: **Argus (Audit, Revoke, Grant, Unified Security)**  
> Target Duration: **5 Minutes (300 Seconds)**  
> Recorded Video: `artifacts/argus_demo.mp4`

---

## Demo Timing & Walkthrough Script

### [00:00 - 00:45] Act 1: The Core Problem & One-Click Persona Login
- **Visual:** Open live deployed application. Highlight the clean dark-mode UI and active PostgreSQL health check banner.
- **Narrative:**
  > *"Every company shares confidential files: contracts, salary reviews, audit letters. Two things go wrong: unauthorized people access files they shouldn't, and when leaks occur, nobody can prove who opened what. TrustVault solves this as Argus: where the wrong person can never read a file, and every access attempt is cryptographically proved."*
- **Action:**
  - Click **Judge Quick-Fill: "Owner (Bob - Eng)"**.
  - Click **Authenticate**. Bob's dashboard appears immediately.

---

### [00:45 - 01:30] Act 2: Upload, Magic-Byte Validation & Envelope Encryption
- **Narrative:**
  > *"Document Owners can upload sensitive documents. Notice our validation: if an attacker disguises an executable as a PDF or uploads a macro-enabled Word document, our server inspects the magic bytes and rejects it. When a legitimate PDF is uploaded, it is envelope-encrypted on the fly using AES-256-GCM. The file in storage is pure encrypted ciphertext."*
- **Action:**
  - Enter Title: `Project Titan Q3 Architecture`.
  - Select Category: `Engineering`.
  - Attach a test PDF file and click **Upload & Encrypt**.
  - Show success banner: `Uploaded & encrypted with AES-256-GCM`.
  - Click **Download** to demonstrate instant on-the-fly decryption.

---

### [01:30 - 02:30] Act 3: Anti-IDOR Existence Leaks & Least Privilege Admin
- **Narrative:**
  > *"Now let's switch personas to Carol, another Document Owner in Finance, and then to Dave, a Compliance Viewer. Neither of them has been granted Bob's document."*
- **Action:**
  - Click **Logout**.
  - Use Quick-Fill to log in as **Carol Owner**.
  - Search table: Bob's document does not appear (SQL search isolation).
  - Attempt direct download via URL `/api/documents/<bob-doc-id>/download`:
    - **Observe status code:** Returns **404 Not Found** (NOT 403 Forbidden).
  - Narrative:
    > *"Notice that Carol gets a 404, not a 403. Returning 403 tells an attacker the file exists. Argus eliminates existence enumeration completely."*
  - Log in as **Alice Admin**.
  - Attempt to download Bob's file: Returns **404 Not Found**.
  - Narrative:
    > *"Even the Administrator cannot view confidential file content without an explicit grant. Least Privilege is strictly enforced."*

---

### [02:30 - 03:30] Act 4: Gemini 3.5 Flash-Lite AI Multi-Agent & Instant Revocation
- **Narrative:**
  > *"Let's test our AI agents. First, we launch the Zero-Trust Copilot Agent from the navbar to verify our cryptographic parameters. Then Bob asks the Recipient Assistant for access suggestions."*
- **Action:**
  - Click **AI Copilot 3.5** in the top navigation bar:
    - Ask: *"How does Anti-IDOR prevent data leaks?"*
    - Copilot responds concisely with our uniform 404 guarantee.
  - Log in as **Bob Owner** (`owner1@argus.local`).
  - Click **Grants** on `Project Titan Q3 Architecture`.
  - Click **Suggest Recipients**:
    - Gemini 3.5 Flash-Lite evaluates metadata and recommends Dave Viewer (`Compliance`) with `read` permission.
    - Narrative: *"The machine is advisory only. It cannot widen access on its own. Bob clicks 'Fill Form' and manually confirms 'Grant Access'."*
  - Click **Grant Access**.
  - Open Admin Security Center as **Alice Admin**:
    - Click **Run Autonomous Threat Scan**:
    - The Autonomous Audit Threat Inspector Agent analyzes recent events and reports real-time threat telemetry (`LOW` risk level, 0 anomalous spikes).
  - Log in as **Dave Viewer**:
    - Bob's document is now visible in Dave's search table.
    - Dave clicks **60s Ticket** to generate a single-use download URL.
  - Switch back to Bob's browser:
    - Bob clicks **Revoke Now**.
  - Switch to Dave's window:
    - Dave clicks Download: **Fails immediately with 404 Not Found**.
    - Dave attempts to redeem the pre-issued 60s ticket: **Fails immediately with 403 (Stale Grant Version)**.
    - Narrative: *"Revocation is instantaneous. Zero cached token latency."*

---

### [03:30 - 04:30] Act 5: Tamper-Evident SHA-256 Audit Chain Verification
- **Narrative:**
  > *"Now, how do we prove what happened to auditors and judges?"*
- **Action:**
  - Log in as **Alice Admin**.
  - Click the **Admin Security Center** tab.
  - Review the **Tamper-Evident Audit Trail Stream**:
    - Point out every allowed access, denied IDOR attempt, AI suggestion, and revocation event with sequential sequence IDs and SHA-256 row hashes.
  - Click **Verify Audit Chain Now**:
    - The server walks the entire chain from the Genesis block to HEAD in O(N) time.
    - Banner displays: `Cryptographic Hash Chain Verified: All rows intact`.
  - Explain PostgreSQL trigger:
    > *"PostgreSQL trigger `trg_protect_audit_log` rejects any UPDATE or DELETE statement, even from database superusers."*
  - Demonstrate **Deactivate User (Kill Sessions)**:
    - Alice clicks **Deactivate** on Carol.
    - Switch to Carol's active window: Carol is immediately locked out across all devices.

---

### [04:30 - 05:00] Act 6: Summary & Judge Closing
- **Narrative:**
  > *"In summary: Argus enforces a single server-side authorization choke point, AES-256-GCM envelope encryption, 100% mutation test coverage proving no bypasses exist, immediate revocation, and a tamper-evident audit hash chain that cannot be altered. Everything explainable, everything free of cost."*
