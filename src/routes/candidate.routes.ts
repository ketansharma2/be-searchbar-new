import { Router } from 'express';
import * as candidateController from '../controllers/candidate.controller';
import { validate } from '../middlewares/validate';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { uploadResume, uploadSpreadsheet } from '../middlewares/upload';
import {
  createCandidateSchema,
  candidateIdSchema,
  searchCandidatesSchema,
  addRemarkSchema,
} from '../validators/candidate.validators';

const router = Router();

router.use(requireAuth);

// Search + filters — recruiter + admin.
router.get('/', validate(searchCandidatesSchema), candidateController.search);

// Ingestion is ADMIN-only. Multer runs before validation so multipart text
// fields are available on req.body.
router.post(
  '/',
  requireRole('ADMIN'),
  uploadResume,
  validate(createCandidateSchema),
  candidateController.createManual
);

router.post(
  '/bulk',
  requireRole('ADMIN'),
  uploadSpreadsheet,
  candidateController.bulkUpload
);
// Get unique locations for suggestions — recruiter + admin.
router.get(
  '/locations',
  candidateController.getUniqueLocations
);

// Get unique skills for suggestions — recruiter + admin.
router.get(
  '/skills',
  candidateController.getUniqueSkills
);

// Viewing a candidate is available to both roles (recruiter + admin).
router.get('/:id', validate(candidateIdSchema), candidateController.getOne);



// Resume preview (free) + download (metered) — recruiter + admin.
router.get(
  '/:id/resume/preview',
  validate(candidateIdSchema),
  candidateController.previewResume
);
router.get(
  '/:id/resume/download',
  validate(candidateIdSchema),
  candidateController.downloadResume
);

// Add a remark/feedback — recruiter + admin.
router.post('/:id/remarks', validate(addRemarkSchema), candidateController.addRemark);

export default router;
