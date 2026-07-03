import { Router } from 'express';
import * as usageController from '../controllers/usage.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/me', usageController.myUsage);
router.get('/summary', requireRole('ADMIN'), usageController.globalUsage);

export default router;
