import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { validate } from '../middlewares/validate';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { analyticsBreakdownSchema, analyticsSummarySchema } from '../validators/analytics.validators';

const router = Router();

// Admin-only, matching the existing Analytics permission (product doc §3.5).
router.use(requireAuth, requireRole('ADMIN'));

router.get('/summary', validate(analyticsSummarySchema), analyticsController.summary);
router.get('/breakdown', validate(analyticsBreakdownSchema), analyticsController.breakdown);

export default router;
