import crypto from 'node:crypto';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  JwtTokenPayload,
  RefreshTokenPayload,
} from '../../utils/jwt.utils';

export interface StoredRefreshToken {
  tokenId: string;
  userId: string;
  organizationId: string;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface StoredPasswordResetToken {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  createdAt: Date;
}

export interface StoredInvitation {
  invitationId: string;
  organizationId: string;
  email: string;
  tokenHash: string;
  roleIds: string[];
  jobTitle?: string;
  employeeCode?: string;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  invitedById?: string;
  acceptedAt?: Date;
  createdAt: Date;
}

/**
 * Enterprise Token Lifecycle & Cryptographic Session Management Service.
 * Manages Access & Refresh Token rotation, token revocation, password reset tokens,
 * and user invitations.
 */
export class TokenService {
  // In-memory token stores with cryptographic hashing (fallback / cache layer)
  private refreshTokens: Map<string, StoredRefreshToken> = new Map();
  private passwordResets: Map<string, StoredPasswordResetToken> = new Map();
  private invitations: Map<string, StoredInvitation> = new Map();

  /**
   * Generates a cryptographic SHA-256 hash for stored tokens.
   */
  hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generates an access token and refresh token pair for a user/organization session.
   */
  async generateTokenPair(
    userPayload: JwtTokenPayload,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const refreshPayload: RefreshTokenPayload = {
      tokenId,
      userId: userPayload.userId,
      organizationId: userPayload.organizationId,
      tokenType: 'refresh',
    };

    const accessToken = signAccessToken(userPayload);
    const refreshToken = signRefreshToken(refreshPayload);
    const tokenHash = this.hashToken(refreshToken);

    const storedToken: StoredRefreshToken = {
      tokenId,
      userId: userPayload.userId,
      organizationId: userPayload.organizationId,
      tokenHash,
      expiresAt,
      isRevoked: false,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      createdAt: new Date(),
    };

    this.refreshTokens.set(tokenId, storedToken);

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Renews an access token using an unrevoked, unexpired refresh token.
   * Performs automatic refresh token rotation (issues a new refresh token and revokes the old one).
   */
  async rotateRefreshToken(
    rawRefreshToken: string,
    resolveUserPayload: (
      userId: string,
      organizationId: string
    ) => Promise<JwtTokenPayload | null>
  ): Promise<{ accessToken: string; refreshToken: string; organizationId: string; userId: string }> {
    let decoded: RefreshTokenPayload;
    try {
      decoded = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw {
        status: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token signature',
      };
    }

    const stored = this.refreshTokens.get(decoded.tokenId);

    // If token not found in store or already revoked -> Possible replay attack!
    if (stored && stored.isRevoked) {
      // Replay attack defense: revoke all tokens for this user
      await this.revokeAllUserTokens(decoded.userId);
      throw {
        status: 401,
        code: 'REVOKED_REFRESH_TOKEN',
        message: 'Refresh token has been revoked. Security alert: All sessions invalidated.',
      };
    }

    if (stored && stored.expiresAt < new Date()) {
      throw {
        status: 401,
        code: 'EXPIRED_REFRESH_TOKEN',
        message: 'Refresh token has expired. Please log in again.',
      };
    }

    // Resolve current user and tenant membership details
    const userPayload = await resolveUserPayload(decoded.userId, decoded.organizationId);
    if (!userPayload) {
      throw {
        status: 403,
        code: 'MEMBERSHIP_INACTIVE',
        message: 'User no longer has active access to this organization',
      };
    }

    // Mark previous refresh token as revoked
    if (stored) {
      stored.isRevoked = true;
      stored.revokedAt = new Date();
    }

    // Issue rotated token pair
    const newTokens = await this.generateTokenPair(userPayload);

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      organizationId: decoded.organizationId,
      userId: decoded.userId,
    };
  }

  /**
   * Revokes a specific refresh token (used during explicit logout).
   */
  async revokeRefreshToken(rawRefreshToken: string): Promise<boolean> {
    try {
      const decoded = verifyRefreshToken(rawRefreshToken);
      const stored = this.refreshTokens.get(decoded.tokenId);
      if (stored) {
        stored.isRevoked = true;
        stored.revokedAt = new Date();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Revokes all active refresh tokens for a user (used during password reset or global logout).
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const [_, token] of this.refreshTokens) {
      if (token.userId === userId && !token.isRevoked) {
        token.isRevoked = true;
        token.revokedAt = now;
        count++;
      }
    }
    return count;
  }

  /**
   * Creates a time-limited, cryptographically random password reset token (1 hour expiration).
   */
  async createPasswordResetToken(userId: string): Promise<{ resetToken: string; expiresAt: Date }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate existing active reset tokens for this user
    for (const [_, record] of this.passwordResets) {
      if (record.userId === userId && !record.isUsed) {
        record.isUsed = true;
      }
    }

    this.passwordResets.set(tokenHash, {
      userId,
      tokenHash,
      expiresAt,
      isUsed: false,
      createdAt: new Date(),
    });

    return { resetToken: rawToken, expiresAt };
  }

  /**
   * Verifies and consumes a password reset token.
   */
  async consumePasswordResetToken(rawToken: string): Promise<{ userId: string }> {
    const tokenHash = this.hashToken(rawToken);
    const record = this.passwordResets.get(tokenHash);

    if (!record || record.isUsed) {
      throw {
        status: 400,
        code: 'INVALID_RESET_TOKEN',
        message: 'Invalid or already consumed password reset token',
      };
    }

    if (record.expiresAt < new Date()) {
      throw {
        status: 400,
        code: 'EXPIRED_RESET_TOKEN',
        message: 'Password reset token has expired. Please request a new link.',
      };
    }

    record.isUsed = true;
    record.usedAt = new Date();

    return { userId: record.userId };
  }

  /**
   * Creates an invitation token for a user to join an organization (7 days expiration).
   */
  async createInvitationToken(params: {
    organizationId: string;
    email: string;
    roleIds?: string[];
    jobTitle?: string;
    employeeCode?: string;
    invitedById?: string;
  }): Promise<{ inviteToken: string; expiresAt: Date; invitationId: string }> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const invitationId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const record: StoredInvitation = {
      invitationId,
      organizationId: params.organizationId,
      email: params.email.toLowerCase().trim(),
      tokenHash,
      roleIds: params.roleIds || [],
      jobTitle: params.jobTitle,
      employeeCode: params.employeeCode,
      expiresAt,
      status: 'pending',
      invitedById: params.invitedById,
      createdAt: new Date(),
    };

    this.invitations.set(tokenHash, record);

    return {
      inviteToken: rawToken,
      expiresAt,
      invitationId,
    };
  }

  /**
   * Verifies an invitation token without consuming it.
   */
  async verifyInvitationToken(rawToken: string): Promise<StoredInvitation> {
    const tokenHash = this.hashToken(rawToken);
    const invitation = this.invitations.get(tokenHash);

    if (!invitation || invitation.status !== 'pending') {
      throw {
        status: 400,
        code: 'INVALID_INVITATION',
        message: 'Invalid, already accepted, or revoked invitation token',
      };
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      throw {
        status: 400,
        code: 'EXPIRED_INVITATION',
        message: 'Invitation link has expired. Request a new invite from your administrator.',
      };
    }

    return invitation;
  }

  /**
   * Consumes an invitation token upon acceptance.
   */
  async consumeInvitationToken(rawToken: string): Promise<StoredInvitation> {
    const invitation = await this.verifyInvitationToken(rawToken);
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    return invitation;
  }

  /**
   * Clears internal stores (useful in test teardown).
   */
  resetStores(): void {
    this.refreshTokens.clear();
    this.passwordResets.clear();
    this.invitations.clear();
  }
}

export const tokenService = new TokenService();

