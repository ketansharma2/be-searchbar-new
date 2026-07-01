import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralised, validated environment configuration.
 * Fail fast at boot if a required variable is missing.
 */
function required(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value : fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isProd: optional('NODE_ENV', 'development') === 'production',
  port: parseInt(optional('PORT', '4000'), 10),
  clientOrigin: optional('CLIENT_ORIGIN', 'http://localhost:3000'),

  mongoUri: required('MONGODB_URI'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: optional('ACCESS_TOKEN_TTL', '15m'),
    refreshTtl: optional('REFRESH_TOKEN_TTL', '7d'),
  },

  cookie: {
    // Empty string means "host-only" cookie (correct for localhost).
    domain: process.env.COOKIE_DOMAIN?.trim() || undefined,
    secure: optional('COOKIE_SECURE', 'false') === 'true',
  },

  seed: {
    adminEmail: optional('SEED_ADMIN_EMAIL', 'admin@mavenjobs.in'),
    adminPassword: optional('SEED_ADMIN_PASSWORD', 'Maven@2026'),
    recruiterEmail: optional('SEED_RECRUITER_EMAIL', 'recruiter@mavenjobs.in'),
    recruiterPassword: optional('SEED_RECRUITER_PASSWORD', 'Maven@2026'),
  },
} as const;
