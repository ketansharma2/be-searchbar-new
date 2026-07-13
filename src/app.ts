import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import routes from './routes';
import { globalLimiter } from './middlewares/rateLimiter';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware';
import { getCachedAllowedOrigins } from './services/config.service';

export function createApp(): Application {
  const app = express();

  // Behind a proxy/load balancer in production (needed for `secure` cookies + rate limit IPs).
  if (env.isProd) app.set('trust proxy', 1);

  // Security headers.
  // app.use(helmet());

  // CORS — reflect only allowlisted origins (DB-configured, falling back to
  // CLIENT_ORIGIN) and allow credentials so HttpOnly auth cookies are sent.
  app.use(cors({
    origin: async (origin, callback) => {
      // No Origin header (e.g. curl, server-to-server) — allow.
      if (!origin) return callback(null, true);
      const allowed = await getCachedAllowedOrigins();
      if (allowed.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));

  // Body + cookie parsing.
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rate limiting for all API routes.
  // app.use('/api', globalLimiter);

  // Routes.
  app.use('/api', routes);

  // 404 + centralized error handling.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
