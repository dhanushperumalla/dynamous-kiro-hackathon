import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '@/utils/logger';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  tokenType: 'access' | 'refresh' | 'email_verification' | 'password_reset';
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

class JwtManager {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly emailVerificationSecret: string;
  private readonly passwordResetSecret: string;
  
  // Token expiration times
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';
  private readonly emailVerificationExpiry = '24h';
  private readonly passwordResetExpiry = '1h';

  constructor() {
    this.accessTokenSecret = process.env['JWT_ACCESS_SECRET'] || this.generateSecret();
    this.refreshTokenSecret = process.env['JWT_REFRESH_SECRET'] || this.generateSecret();
    this.emailVerificationSecret = process.env['JWT_EMAIL_SECRET'] || this.generateSecret();
    this.passwordResetSecret = process.env['JWT_PASSWORD_RESET_SECRET'] || this.generateSecret();

    if (!process.env['JWT_ACCESS_SECRET']) {
      logger.warn('JWT_ACCESS_SECRET not found in environment variables. Using generated secret.');
    }
  }

  /**
   * Generate a secure random secret for JWT signing
   */
  private generateSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Generate access and refresh token pair
   */
  public generateTokenPair(userId: string, email: string, role: string = 'user'): TokenPair {
    const accessTokenPayload: JwtPayload = {
      userId,
      email,
      role,
      tokenType: 'access'
    };

    const refreshTokenPayload: JwtPayload = {
      userId,
      email,
      role,
      tokenType: 'refresh'
    };

    const accessToken = jwt.sign(accessTokenPayload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'ai-sikshak',
      audience: 'ai-sikshak-users'
    });

    const refreshToken = jwt.sign(refreshTokenPayload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'ai-sikshak',
      audience: 'ai-sikshak-users'
    });

    logger.debug('Generated token pair', {
      userId,
      email,
      accessTokenExpiry: this.accessTokenExpiry,
      refreshTokenExpiry: this.refreshTokenExpiry
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate email verification token
   */
  public generateEmailVerificationToken(userId: string, email: string): string {
    const payload: JwtPayload = {
      userId,
      email,
      role: 'user',
      tokenType: 'email_verification'
    };

    return jwt.sign(payload, this.emailVerificationSecret, {
      expiresIn: this.emailVerificationExpiry,
      issuer: 'ai-sikshak',
      audience: 'ai-sikshak-users'
    });
  }

  /**
   * Generate password reset token
   */
  public generatePasswordResetToken(userId: string, email: string): string {
    const payload: JwtPayload = {
      userId,
      email,
      role: 'user',
      tokenType: 'password_reset'
    };

    return jwt.sign(payload, this.passwordResetSecret, {
      expiresIn: this.passwordResetExpiry,
      issuer: 'ai-sikshak',
      audience: 'ai-sikshak-users'
    });
  }

  /**
   * Verify access token
   */
  public verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        issuer: 'ai-sikshak',
        audience: 'ai-sikshak-users'
      }) as JwtPayload;

      if (decoded.tokenType !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.debug('Access token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Verify refresh token
   */
  public verifyRefreshToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'ai-sikshak',
        audience: 'ai-sikshak-users'
      }) as JwtPayload;

      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.debug('Refresh token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Verify email verification token
   */
  public verifyEmailVerificationToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.emailVerificationSecret, {
        issuer: 'ai-sikshak',
        audience: 'ai-sikshak-users'
      }) as JwtPayload;

      if (decoded.tokenType !== 'email_verification') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.debug('Email verification token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Invalid or expired email verification token');
    }
  }

  /**
   * Verify password reset token
   */
  public verifyPasswordResetToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.passwordResetSecret, {
        issuer: 'ai-sikshak',
        audience: 'ai-sikshak-users'
      }) as JwtPayload;

      if (decoded.tokenType !== 'password_reset') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      logger.debug('Password reset token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Invalid or expired password reset token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  public extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1] || null;
  }

  /**
   * Get token expiration time in seconds
   */
  public getTokenExpirationTime(tokenType: 'access' | 'refresh' | 'email_verification' | 'password_reset'): number {
    const expiryMap = {
      access: 15 * 60, // 15 minutes
      refresh: 7 * 24 * 60 * 60, // 7 days
      email_verification: 24 * 60 * 60, // 24 hours
      password_reset: 60 * 60 // 1 hour
    };

    return expiryMap[tokenType];
  }
}

// Create and export singleton instance
export const jwtManager = new JwtManager();