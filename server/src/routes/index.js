import { Router } from 'express';
import { dbState } from '../config/db.js';
import { oauthMockMode } from '../config/env.js';
import authRouter from './auth.js';
import profileRouter from './profiles.js';
import campaignRouter from './campaigns.js';
import chatRouter from './chat.js';
import dashboardRouter from './dashboard.js';
import adminRouter from './admin.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'ez-ads-api',
    db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState()] || 'unknown',
    oauthMode: oauthMockMode ? 'mock (no real Meta credentials configured)' : 'live',
    time: new Date().toISOString()
  });
});

router.use('/auth', authRouter);
router.use(profileRouter);
router.use(campaignRouter);
router.use(chatRouter);
router.use(dashboardRouter);
router.use('/admin', adminRouter);

export default router;
