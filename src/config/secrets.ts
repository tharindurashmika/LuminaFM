import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './environment';

export interface TokenPayload {
  userId: string;
  organizationId: string;
  email: string;
  role?: string;
  [key: string]: unknown;
}

export class SecretManager {
  private primarySecret: string;
  private secondarySecret?: string;

  constructor(primarySecret = config.security.jwtSecret, secondarySecret = config.security.jwtSecretSecondary) {
    this.primarySecret = primarySecret;
    this.secondarySecret = secondarySecret;
  }

  /**
   * Signs a payload using the active primary secret
   */
  signToken(payload: TokenPayload, expiresIn: string | number = config.security.jwtExpiresIn): string {
    return jwt.sign(payload, this.primarySecret, {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
      algorithm: 'HS256',
    });
  }

  /**
   * Verifies a JWT token. Attempts verification with primary secret first;
   * if failed and a secondary secret is configured, attempts verification with secondary secret
   * to enable zero-downtime key rotation.
   */
  verifyToken<T = TokenPayload>(token: string): T {
    try {
      return jwt.verify(token, this.primarySecret) as T;
    } catch (primaryErr) {
      if (this.secondarySecret) {
        try {
          return jwt.verify(token, this.secondarySecret) as T;
        } catch {
          // If secondary fails as well, throw the original primary error
          throw primaryErr;
        }
      }
      throw primaryErr;
    }
  }

  /**
   * Rotates secrets: current primary becomes secondary, and a new high-entropy primary is established
   */
  rotateSecret(newPrimarySecret: string): void {
    if (!newPrimarySecret || newPrimarySecret.length < 32) {
      throw new Error('New secret must be at least 32 characters in length.');
    }
    this.secondarySecret = this.primarySecret;
    this.primarySecret = newPrimarySecret;
  }

  /**
   * Generates a cryptographically strong 256-bit random secret
   */
  static generateSecureSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Returns active secrets for auditing and validation
   */
  getActiveKeyFingerprints(): { primary: string; secondary?: string } {
    const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
    return {
      primary: hash(this.primarySecret),
      secondary: this.secondarySecret ? hash(this.secondarySecret) : undefined,
    };
  }
}

export const secretManager = new SecretManager();
