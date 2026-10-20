import { Router } from 'express';
import { db } from '../db/pool.js';
import { config } from '../config/env.js';

const router = Router();

router.get('/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
        const result = await db.query('SELECT 1 AS ok');
        if (result.rows.length > 0) {
            dbStatus = 'connected';
        }
    } catch (err) {
        dbStatus = `error: ${err.message}`;
    }

    res.json({
        status: dbStatus === 'connected' ? 'healthy' : 'degraded',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: config.nodeEnv,
        database: dbStatus
    });
});

export default router;
