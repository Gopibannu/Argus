import { Router } from 'express';
import { requireAuth } from '../middleware/session.js';
import { aiService } from '../services/aiService.js';
import { auditService } from '../services/auditService.js';

const router = Router();

/**
 * POST /api/ai/audit-analysis
 * Invokes the Autonomous Security Audit Agent on recent audit events
 */
router.post('/audit-analysis', requireAuth, async (req, res, next) => {
    try {
        const entries = await auditService.getAuditTrail({ limit: 30 });
        const analysis = await aiService.analyzeAuditThreats(entries, req.user);
        res.json(analysis);
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/ai/copilot-chat
 * Interacts with the Argus Zero-Trust Copilot Agent
 */
router.post('/copilot-chat', requireAuth, async (req, res, next) => {
    try {
        const { query } = req.body || {};
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Valid query parameter is required.' });
        }
        const result = await aiService.chatSecurityCopilot(query, req.user);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

export default router;
