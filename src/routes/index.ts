import { Router } from 'express';
import authRoutes from './auth.routes';
import recruiterRoutes from './recruiter.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', service: 'maven-recruitment-api' });
});

router.use('/auth', authRoutes);
router.use('/recruiters', recruiterRoutes);

export default router;
