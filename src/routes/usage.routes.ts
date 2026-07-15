import { Router } from 'express';
import * as usageController from '../controllers/usage.controller';
import { validate } from '../middlewares/validate';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { usageRangeSchema } from '../validators/usage.validators';

const router = Router();

router.use(requireAuth);

router.get('/me', validate(usageRangeSchema), usageController.myUsage);
router.get('/summary', requireRole('ADMIN'), validate(usageRangeSchema), usageController.globalUsage);

export default router;
