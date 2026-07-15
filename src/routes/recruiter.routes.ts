import { Router } from 'express';
import * as recruiterController from '../controllers/recruiter.controller';
import { validate } from '../middlewares/validate';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import {
  listRecruitersSchema,
  createRecruiterSchema,
  updateRecruiterSchema,
  setStatusSchema,
  recruiterIdSchema,
  recruiterSummarySchema,
} from '../validators/recruiter.validators';

const router = Router();

// Every recruiter-management route is ADMIN-only.
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validate(listRecruitersSchema), recruiterController.list);
router.post('/', validate(createRecruiterSchema), recruiterController.create);
// Must come before /:id — otherwise Express matches "summary" as an :id param.
router.get('/summary', validate(recruiterSummarySchema), recruiterController.summary);
router.get('/:id', validate(recruiterIdSchema), recruiterController.getOne);
router.patch('/:id', validate(updateRecruiterSchema), recruiterController.update);
router.patch('/:id/status', validate(setStatusSchema), recruiterController.setStatus);
router.delete('/:id', validate(recruiterIdSchema), recruiterController.remove);

export default router;
