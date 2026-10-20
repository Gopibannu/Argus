import helmet from 'helmet';
import express from 'express';

export function setupSecurityMiddleware(app) {
    // 1. Remove X-Powered-By
    app.disable('x-powered-by');

    // 2. Trust first proxy hop (Render / Reverse Proxy)
    app.set('trust proxy', 1);

    // 3. Strict Helmet Configuration
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:'],
                fontSrc: ["'self'"],
                connectSrc: ["'self'"],
                frameAncestors: ["'none'"], // Anti-clickjacking
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"]
            }
        },
        crossOriginEmbedderPolicy: false, // Allows streaming previews
        crossOriginResourcePolicy: { policy: 'same-origin' },
        referrerPolicy: { policy: 'no-referrer' },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        noSniff: true
    }));

    // 4. Strict JSON Body Size Limit (Anti-DoS / Payload exhaustion)
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: false, limit: '1mb' }));
}
