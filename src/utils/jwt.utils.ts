import jwt from 'jsonwebtoken';
import { secretManager } from '../config/secrets';
import { config } from '../config/environment';

const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'lumina-fm-super-secret-refresh-key-change-in-prod';
const JWT_EXPIRES_IN = config.security.jwtExpiresIn || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export interface JwtTokenPayload {
  userId: string;
  email: string;
  organizationId: string;
  isPlatformAdmin?: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface RefreshTokenPayload {
  tokenId: string;
  userId: string;
  organizationId: string;
  tokenType: 'refresh';
}

/**
 * Signs an access token using SecretManager
 */
export function signAccessToken(payload: JwtTokenPayload): string {
  return secretManager.signToken(payload as any, JWT_EXPIRES_IN);
}

/**
 * Signs a refresh token (defaults to 7d expiration).
 */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifies an access token using SecretManager with key rotation support
 */
export function verifyAccessToken(token: string): JwtTokenPayload {
  return secretManager.verifyToken<JwtTokenPayload>(token);
}

/**
 * Verifies a refresh token.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload;
  if (decoded.tokenType !== 'refresh') {
    throw new Error('Invalid token type. Expected refresh token.');
  }
  return decoded;
}

// Backwards-compatible aliases for existing callers
export function signToken(payload: JwtTokenPayload): string {
  return signAccessToken(payload);
}

export function verifyToken(token: string): JwtTokenPayload {
  return verifyAccessToken(token);
}
