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
  isTest: optional('NODE_ENV', 'development') === 'test',
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
    // In production set to the shared parent domain, e.g. .mavenjobs.in, so the
    // cookie is first-party for both app.mavenjobs.in and api.mavenjobs.in.
    domain: process.env.COOKIE_DOMAIN?.trim() || undefined,
    secure: optional('COOKIE_SECURE', 'false') === 'true',
    // 'lax' for a same-site (shared-domain) deployment — the reliable default.
    // Only 'none' requires third-party cookies, which browsers increasingly block.
    sameSite: optional('COOKIE_SAMESITE', 'lax').toLowerCase() as 'lax' | 'strict' | 'none',
  },

  seed: {
    adminEmail: optional('SEED_ADMIN_EMAIL', 'admin@mavenjobs.in'),
    adminPassword: optional('SEED_ADMIN_PASSWORD', 'Maven@2026'),
    recruiterEmail: optional('SEED_RECRUITER_EMAIL', 'recruiter@mavenjobs.in'),
    recruiterPassword: optional('SEED_RECRUITER_PASSWORD', 'Maven@2026'),
  },

  aws: {
    region: optional('AWS_REGION', 'ap-south-1'),
    accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim() || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim() || '',
    s3Bucket: process.env.AWS_S3_BUCKET?.trim() || '',
    // Optional custom public base (e.g. CloudFront); defaults to the S3 URL.
    s3PublicBaseUrl: process.env.AWS_S3_PUBLIC_BASE_URL?.trim() || '',
  },
} as const;

/** True only when all S3 credentials/bucket are present. */
export function isS3Configured(): boolean {
  return Boolean(
    env.aws.accessKeyId && env.aws.secretAccessKey && env.aws.s3Bucket && env.aws.region
  );
}
