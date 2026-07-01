import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * bcryptjs is a pure-JS, API-compatible drop-in for `bcrypt`.
 * It avoids native build failures (node-gyp) on Windows while
 * producing identical, standard bcrypt hashes.
 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
