import { Router } from 'express';
import * as activityLogController from '../controllers/activityLog.controller';
import { validate } from '../middlewares/validate';
import { requireAuth } from '../middlewares/auth.middleware';
import { listActivityLogsSchema } from '../validators/activityLog.validators';

const router = Router();

// Auth only — both roles allowed. Admins see everything (optionally filtered);
// recruiters are force-scoped to their own rows inside the service.
router.use(requireAuth);

router.get('/', validate(listActivityLogsSchema), activityLogController.list);

export default router;
