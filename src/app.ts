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

  // Behind a proxy/load balancer in production (needed for secure cookies + rate limit IPs).
  // Enable for Render deployment (RENDER env var) or when NODE_ENV is production
  if (env.isProd || process.env.RENDER) app.set('trust proxy', 1);

  // Security headers.
  app.use(helmet());

  // DEBUG-ONLY: log the raw signals needed to diagnose cross-origin auth
  // (Origin / Cookie / Authorization headers) on every auth-related request.
  // Does not change any security behavior — remove once the issue is confirmed fixed.
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api/auth')) {
      console.log('[cors-debug]', {
        method: req.method,
        path: req.path,
        origin: req.headers.origin ?? '(none)',
        cookieHeader: req.headers.cookie ?? '(none)',
        authorizationHeader: req.headers.authorization ? 'present' : '(none)',
      });
    }
    next();
  });

  // CORS — allow origins from database and send/receive credentials (cookies).
  app.use(
    cors({
      origin: async (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          return callback(null, true);
        }

        const allowedOrigins = await getCachedAllowedOrigins();

        // Check if the origin is in the allowed list
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.error('[cors-debug] rejected origin:', origin, 'allowed:', allowedOrigins);
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  // Body + cookie parsing.
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Rate limiting for all API routes.
  app.use('/api', globalLimiter);

  // Routes.
  app.use('/api', routes);

  // 404 + centralized error handling.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
