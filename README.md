# Argus — Unified Security & Audit Platform

> **Audit • Revoke • Grant • Unified Security**  
> *Snovasys Fresher Hiring Challenge 2026*  
> Document platform where the wrong person can never read a file, and every access—allowed or denied—is provably auditable and tamper-evident.

---

## 🛡️ Core Security Floor & Non-Negotiables

1. **Single Choke Point (`authorize`)**: A document is reachable only by someone explicitly granted access through ANY route. The server decides every time—no client-side logic or hidden button security.
2. **Tamper-Evident Audit Trail**: Every access attempt (including refused/denied attempts) is cryptographically hash-chained (`prev_hash`, `row_hash`) with PostgreSQL triggers preventing deletion or modification.
3. **Instant Revocation**: Zero cached authorization and zero long-lived stateless JWTs. Revoking a grant or disabling a user takes effect immediately on the very next request.

---

## 🔑 Demo Accounts & Credentials

Password for all accounts: **`Password@Argus2026!`**

| Role | Email | Name | Capabilities & Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@argus.local` | Alice Admin | Manages users, inspects system activity, verifies cryptographic audit hash chain. **Least privilege: Admin does NOT have blanket document read access.** |
| **Document Owner 1** | `owner1@argus.local` | Bob Owner (Engineering) | Uploads files, grants/revokes named permissions (`read`, `edit`), deletes owned documents. |
| **Document Owner 2** | `owner2@argus.local` | Carol Owner (Finance) | Uploads files, manages finance documents, grants/revokes access. |
| **Viewer 1** | `viewer1@argus.local` | Dave Viewer (Auditor) | Reads documents explicitly granted to him. Cannot see or access ungranted documents. |
| **Viewer 2** | `viewer2@argus.local` | Eve Viewer (Contractor) | Reads external documents granted to her. |
| **Disabled Account** | `disabled@argus.local` | Dan Disabled | Deactivated user account. Immediate session rejection test case. |

---

## 🚀 Quick Start (Local Setup from Clean Clone)

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
*(Optional: If connecting to Supabase PostgreSQL, set `DATABASE_URL` in `.env`. By default, Argus runs an offline in-memory secure database with preloaded seed data for zero-config evaluation).*

### 3. Build & Run
```bash
# Build React static assets
npm run build

# Start the secure Express server
npm start
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser.  
Check health status at **[http://localhost:5000/api/health](http://localhost:5000/api/health)**.

### 4. Run Automated Security Test Matrix
```bash
npm test
```

---

## ☁️ Deployment Instructions (Render + Supabase Free Tier)

1. **Database & Storage (Supabase)**:
   - Create a project on [supabase.com](https://supabase.com).
   - In Supabase SQL Editor, run `db/schema.sql` and `db/seed.sql` (or run `npm run db:init` locally with `DATABASE_URL`).
   - Create a **Private** storage bucket named `documents` (disable Public bucket toggle).
2. **Web Service (Render)**:
   - Connect your GitHub repo to [render.com](https://render.com).
   - Create a **Web Service** with:
     - Runtime: `Node`
     - Build Command: `npm install && npm run build`
     - Start Command: `node server/src/index.js`
   - Set Environment Variables:
     - `NODE_ENV`: `production`
     - `PORT`: `10000`
     - `DATABASE_URL`: `your_supabase_postgres_uri`
     - `MASTER_ENCRYPTION_KEY`: `64-character-hex-key`
     - `SESSION_SECRET`: `random-secret-string`
     - `SUPABASE_URL`: `https://your-project.supabase.co`
     - `SUPABASE_SERVICE_ROLE_KEY`: `your-supabase-service-role-key`

> ⚠️ **Free Tier Caveat (Cold Starts):** Render free tier web services spin down after 15 minutes of inactivity. Initial page requests may take 30–50 seconds while the container initializes.

---

## 📚 Deliverables & Documentation Index

- [docs/ARCHITECTURE.md](file:///d:/argus/docs/ARCHITECTURE.md): Complete Mermaid diagrams (Mindmap, Sequence, ER, Hash chain, Deployment, Roadmap) + Plain-English Walkthroughs.
- [THREATS.md](file:///d:/argus/THREATS.md): Real-world threat modeling matrix and verified mitigations.
- [PROMPTS.md](file:///d:/argus/PROMPTS.md): AI interaction history and self-critique log.
- [db/schema.sql](file:///d:/argus/db/schema.sql): PostgreSQL schema with immutability triggers and constraints.
- [db/seed.sql](file:///d:/argus/db/seed.sql): Role seed records and genesis audit block.
