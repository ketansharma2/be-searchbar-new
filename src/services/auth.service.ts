import { type IUser } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { ApiError } from '../utils/ApiError';
import { userRepository } from '../repositories/user.repository';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  ttlToDate,
} from '../utils/jwt';
import { env } from '../config/env';
import type { LoginInput } from '../validators/auth.validators';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: IUser['role'];
}

function toPublicUser(user: IUser): PublicUser {
  return { id: user.id, name: user.name ?? '', email: user.email, role: user.role };
}

async function issueTokens(user: IUser): Promise<AuthTokens> {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name ?? '',
  });
  const refreshToken = signRefreshToken(user.id);

  // Persist only the hash of the refresh token.
  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: ttlToDate(env.jwt.refreshTtl),
  });

  return { accessToken, refreshToken };
}

/**
 * Validate credentials and issue a fresh token pair.
 */
export async function login(
  input: LoginInput
): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  // Password is `select: false`, so explicitly include it.
  const user = await userRepository.findByEmail(input.email, true);
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const passwordMatches = await user.comparePassword(input.password);
  if (!passwordMatches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Business rule: only active accounts can log in.
  if (user.active === false) {
    throw ApiError.forbidden('Your account has been deactivated. Contact an administrator.');
  }

  // Optional: enforce that the selected role matches the account role.
  if (input.role && input.role !== user.role) {
    throw ApiError.unauthorized(
      `This account is not registered as ${input.role.toLowerCase()}`
    );
  }

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), tokens };
}

/**
 * Verify + rotate a refresh token. The old token is invalidated and a new
 * pair is issued (refresh-token rotation).
 */
export async function rotateRefreshToken(
  presentedToken: string | undefined
): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  if (!presentedToken) {
    throw ApiError.unauthorized('Refresh token missing');
  }

  let payload;
  try {
    payload = verifyRefreshToken(presentedToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(presentedToken);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored) {
    // Token is validly signed but not in the store: it was already used
    // (rotated) or revoked. Treat as reuse — revoke everything for this user.
    await RefreshToken.deleteMany({ user: payload.sub });
    throw ApiError.unauthorized('Refresh token reuse detected. Please log in again.');
  }

  const user = await userRepository.findById(payload.sub);
  if (!user) {
    await RefreshToken.deleteMany({ user: payload.sub });
    throw ApiError.unauthorized('User no longer exists');
  }

  // A deactivated account cannot refresh its session.
  if (user.active === false) {
    await RefreshToken.deleteMany({ user: payload.sub });
    throw ApiError.forbidden('Your account has been deactivated.');
  }

  // Rotate: issue a brand new pair first, then delete old token after a delay.
  // This grace period prevents race condition errors when multiple requests
  // arrive simultaneously (e.g., page refresh triggering multiple API calls).
  const tokens = await issueTokens(user);
  
  // Delete old token after 2 seconds to allow concurrent requests to complete
  setTimeout(() => {
    stored.deleteOne().catch(() => {
      // Ignore errors if token was already deleted
    });
  }, 2000);
  
  return { user: toPublicUser(user), tokens };
}

/**
 * Invalidate a single refresh token (logout).
 */
export async function logout(presentedToken: string | undefined): Promise<void> {
  if (!presentedToken) return;
  await RefreshToken.deleteOne({ tokenHash: hashToken(presentedToken) });
}

export async function getUserById(id: string): Promise<PublicUser> {
  const user = await userRepository.findById(id);
  if (!user) {
    throw ApiError.unauthorized('User no longer exists');
  }
  return toPublicUser(user);
}
