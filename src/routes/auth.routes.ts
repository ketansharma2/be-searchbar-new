import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middlewares/validate';
import { requireAuth } from '../middlewares/auth.middleware';
import { authLimiter } from '../middlewares/rateLimiter';
import { loginSchema } from '../validators/auth.validators';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
