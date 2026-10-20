import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import { setupSecurityMiddleware } from './middleware/security.js';
import { sessionMiddleware } from './middleware/session.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import documentsRouter from './routes/documents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
    const app = express();

    // 1. Core security headers and body limiters
    setupSecurityMiddleware(app);

    // 2. Cookie parser for HttpOnly session cookies
    app.use(cookieParser());

    // 3. Global session resolver (queries DB for live state)
    app.use(sessionMiddleware);

    // 4. CSRF protection on state-modifying requests
    app.use(csrfProtection);

    // 5. Rate limiting on all API routes
    app.use('/api', apiLimiter);

    // 6. API Route Handlers
    app.use('/api', healthRouter);
    app.use('/api/auth', authRouter);
    app.use('/api/documents', documentsRouter);

    // 7. Serve pre-built React frontend (Same-Origin deployment)
    const clientDistPath = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDistPath));

    // Fallback for React Single Page Application routing (non-API routes)
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'Endpoint not found.' });
        }
        res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
            if (err) {
                // If client build doesn't exist yet (e.g. raw API testing), return API status
                res.status(200).send(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Argus API Server</title></head>
                    <body style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:2rem;">
                        <h2>Argus Security Core API</h2>
                        <p>Server active. Check <a href="/api/health" style="color:#38bdf8">/api/health</a>.</p>
                    </body>
                    </html>
                `);
            }
        });
    });

    // 8. Global Centralized Error Handler (Never leaks stacks)
    app.use(errorHandler);

    return app;
}
