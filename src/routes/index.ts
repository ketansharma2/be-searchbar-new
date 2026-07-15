import { Router } from 'express';
import authRoutes from './auth.routes';
import recruiterRoutes from './recruiter.routes';
import candidateRoutes from './candidate.routes';
import usageRoutes from './usage.routes';
import activityLogRoutes from './activityLog.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', service: 'maven-recruitment-api' });
});

router.use('/auth', authRoutes);
router.use('/recruiters', recruiterRoutes);
router.use('/candidates', candidateRoutes);
router.use('/usage', usageRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
