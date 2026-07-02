import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import type { Role } from '../models/User';

export interface AccessTokenPayload {
  sub: string; // user id
  role: Role;
  email: string;
  name: string;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  // Unique per-token id so each rotation produces a distinct token/hash.
  jti: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  } as SignOptions);
}

export function signRefreshToken(userId: string): string {
  const payload: RefreshTokenPayload = { sub: userId, jti: crypto.randomUUID() };
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
}

/** Deterministic hash used to store/lookup refresh tokens in the DB. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Convert a "7d"/"15m"/"3600" style TTL into a future Date. */
export function ttlToDate(ttl: string): Date {
  const match = /^(\d+)([smhd])?$/.exec(ttl.trim());
  if (!match) {
    // Fallback: treat as seconds if it's a bare number, else 7 days.
    const asNum = Number(ttl);
    const seconds = Number.isFinite(asNum) ? asNum : 7 * 24 * 60 * 60;
    return new Date(Date.now() + seconds * 1000);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2] ?? 's';
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() + value * multipliers[unit]);
}
