# Argus Production Deployment Guide (Free Tier)

This guide provides step-by-step instructions for deploying Argus to **Render** (Node.js Web Service) and **Supabase** (Free Hosted PostgreSQL & Object Storage) at $0 cost.

---

## 1. Prerequisites (Free Tier Accounts)

1. **GitHub Account**: Hosting the codebase ([https://github.com/Gopibannu/Argus](https://github.com/Gopibannu/Argus)).
2. **Supabase Account**: [https://supabase.com](https://supabase.com) (Free 500MB PostgreSQL database + 1GB Storage bucket).
3. **Render Account**: [https://render.com](https://render.com) (Free web service hosting).
4. **Google AI Studio Account (Optional)**: [https://aistudio.google.com](https://aistudio.google.com) (Free Gemini 1.5 Flash API Key).

---

## 2. Step 1: Set Up Supabase Database & Storage

### A. Database Provisioning
1. Sign in to [Supabase](https://supabase.com) and create a **New Project** (e.g. `argus-prod`).
2. Go to **Project Settings** -> **Database** -> **Connection string** (URI mode).
3. Copy the URI:
   ```
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   *(Or direct port 5432 connection)*.
4. Go to **SQL Editor** in Supabase and run the initialization schema:
   - Copy contents of [db/schema.sql](file:///d:/argus/db/schema.sql) and execute.
   - Copy contents of [db/seed.sql](file:///d:/argus/db/seed.sql) and execute.

### B. Storage Provisioning (Optional for Remote Storage)
1. Go to **Storage** -> **Create a new bucket**.
2. Name the bucket: `documents`.
3. Set **Public Bucket** to **OFF** (Private).
4. From **Project Settings** -> **API**, grab:
   - `Project URL` (`SUPABASE_URL`)
   - `service_role secret` (`SUPABASE_SERVICE_ROLE_KEY`)

---

## 3. Step 2: Deploy to Render

### A. Create Web Service
1. Log into [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `Gopibannu/Argus`.
4. Configure service parameters:
   - **Name**: `argus-security` (or preferred name)
   - **Region**: Oregon (US West) or Frankfurt (EU)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank / default)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node server/src/index.js`
   - **Instance Type**: `Free`

### B. Configure Environment Variables
In the **Environment** tab on Render, add the following key-value pairs:

| Variable Name | Value Description | Example / Generator |
|---|---|---|
| `NODE_ENV` | `production` | `production` |
| `PORT` | `10000` | `10000` |
| `DATABASE_URL` | Supabase Postgres URI | `postgresql://postgres:...@...supabase.co:5432/postgres` |
| `SESSION_SECRET` | 64-char random hex string | Run in node: `crypto.randomBytes(32).toString('hex')` |
| `MASTER_ENCRYPTION_KEY` | 64-char hex string (32 bytes) | Run in node: `crypto.randomBytes(32).toString('hex')` |
| `SUPABASE_URL` | Supabase Project URL | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbGciOi...` |
| `SUPABASE_STORAGE_BUCKET` | Bucket Name | `documents` |
| `GEMINI_API_KEY` | Free Gemini API Key | `AIzaSy...` (Optional, system falls back to heuristic engine) |

> [!NOTE]
> Generate cryptographic keys locally anytime via:
> ```bash
> node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex')); console.log('MASTER_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 4. Step 3: Verify Live Deployment

Once Render deploys, test the live URL (e.g., `https://argus-security.onrender.com`):

1. **System Health**:
   ```bash
   curl -i https://argus-security.onrender.com/api/health
   ```
   *Expected response: `200 OK` with status `healthy`, database `connected`, and hash chain valid.*

2. **Login Verification**:
   - Navigate to `https://argus-security.onrender.com` in your browser.
   - Log in as **Alice Admin** (`alice@argus.local` / `AdminPass123!`).
   - Check the **Audit Trail** and click **Verify Hash Chain Integrity** -> verifies `VALID`.
   - Log out.
   - Log in as **Bob Owner** (`bob@argus.local` / `OwnerPass123!`).
   - Upload a test file (e.g. `test.pdf`), grant read access to **Dave Viewer** (`dave@argus.local`).
   - Log in as **Dave Viewer** (`dave@argus.local` / `ViewerPass123!`) and verify document is readable.
   - Attempt to access an ungranted file directly by ID -> returns **404 Not Found** (Anti-IDOR).

---

## 5. Hackathon Submission Checklist

- [x] Live application URL deployed on Render
- [x] Code pushed to public GitHub repo `Gopibannu/Argus`
- [x] Verified test suite passing: `43/43` passed
- [x] Mutation tests passing: `100% kill rate` (5/5 mutants killed)
- [x] `README.md` includes credentials for all 6 personas
- [x] `THREATS.md` addresses all 17 security threats
- [x] `PROMPTS.md` contains dated records and AI mistake corrections
- [x] Full architectural documentation in `docs/ARCHITECTURE.md`
- [x] Interview prep guide ready in `docs/INTERVIEW_PREP.md`
