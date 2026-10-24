# ARGUS — Production Safe & Secure Deployment Guide

> **Project:** Argus (Audit, Revoke, Grant, Unified Security)  
> **Repository:** `https://github.com/Gopibannu/Argus.git`  
> **Architecture:** Single-Origin Deployment (Express serves pre-compiled Vite React app with HttpOnly SameSite=Strict cookies; zero CORS attack surface).

---

## 1. Security Invariants for Production

When deploying to production, ensure these three non-negotiables are configured:

1. **Envelope Master Key (`MASTER_ENCRYPTION_KEY`):**
   - Must be a cryptographically random **32-byte hex string (64 hex characters)**.
   - Generate with:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Store **only** in your hosting provider's secure secret manager (never commit to git).

2. **Session Secret (`SESSION_SECRET`):**
   - High-entropy random string (at least 32 characters) used to salt token derivations.

3. **Supabase Private Storage & Database:**
   - `DATABASE_URL`: Your Supabase or PostgreSQL pool connection string (`postgresql://postgres:password@host:5432/postgres?sslmode=require`).
   - `SUPABASE_SERVICE_ROLE_KEY`: Service role secret key used **only** by the server to stream AES-256-GCM encrypted chunks. Never expose this to client bundles.

---

## 2. Deploy Option A: Render (Live Production Deployment)

- **Live Service URL:** [https://argus-security-platform-a05q.onrender.com](https://argus-security-platform-a05q.onrender.com)
- Continuous deployment triggers automatically from the `main` branch.

### Environment Configuration in Render:
- `DATABASE_URL`: `postgresql://postgres.myealeoiysmniovkizzf:bannu%40G1234123@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres` (Using Supabase IPv4 connection pooler on port 6543 to avoid IPv6 `ENETUNREACH` errors).
- `MASTER_ENCRYPTION_KEY`: 64-character hex key for AES-256-GCM envelope encryption.
- `SESSION_SECRET`: Salt for session token hashing.
- `SUPABASE_URL`: `https://myealeoiysmniovkizzf.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase server-side service role key.
- `SUPABASE_STORAGE_BUCKET`: `documents`
- `GEMINI_API_KEY`: Google Gemini API key (powers Gemini 3.5 Flash-Lite multi-agent ecosystem).
- `NODE_ENV`: `production`
- `PORT`: `5000`

---

## 3. Deploy Option B: Docker Container (Any Cloud / VPS / Railway / Fly.io)

We provide a multi-stage production [`Dockerfile`](file:///d:/argus/Dockerfile) running under a hardened `node` non-root user.

### Build and Test Locally:
```bash
# 1. Build container image
docker build -t argus-security:latest .

# 2. Run container with environment file
docker run -d \
  -p 5000:5000 \
  --env-file .env \
  --name argus-container \
  argus-security:latest

# 3. Check health check status
curl http://localhost:5000/api/health
```

---

## 4. Deploy Option C: Railway or Fly.io

- **Railway:** Run `railway init` and connect the GitHub repo. Railway will automatically pick up [`Dockerfile`](file:///d:/argus/Dockerfile) and expose port `5000`.
- **Fly.io:** Run `fly launch` to deploy using the multi-stage Dockerfile.

---

## 5. Post-Deployment Verification Checklist

Once deployed to your production URL (e.g. `https://argus.onrender.com`):

- [ ] `GET /api/health` returns `{"status":"ok", ...}`.
- [ ] Visit the root URL `https://your-domain.com`: Ensure landing page loads over HTTPS.
- [ ] Click **Judge Demo: Bob Stone** or sign in to verify stateful session creation.
- [ ] Upload an encrypted document and verify AES-256-GCM ciphertext in storage.
- [ ] Verify Anti-IDOR: Access an unauthorized document URL to verify a uniform `404 Not Found` response.
- [ ] Verify Audit Trail: Go to **Admin Security Center** as Alice (`admin@argus.local`) and click **Verify Hash Chain** to confirm mathematical integrity.
