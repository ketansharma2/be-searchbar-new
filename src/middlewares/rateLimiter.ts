import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

// Rate limiting interferes with deterministic tests; disable it there.
const skip = () => env.isTest;

/** Generic limiter applied to all API traffic. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { message: 'Too many requests, please try again later.' },
});

/** Stricter limiter for auth-sensitive endpoints (login/refresh). */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: { message: 'Too many attempts, please try again later.' },
});
