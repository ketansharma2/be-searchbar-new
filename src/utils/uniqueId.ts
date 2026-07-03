import crypto from 'node:crypto';

/**
 * Generate a URL-safe, collision-resistant system id for a candidate
 * (used when a row/record has no `unique_id`).
 */
export function generateUniqueId(): string {
  return crypto.randomBytes(18).toString('base64url'); // 24 url-safe chars
}
