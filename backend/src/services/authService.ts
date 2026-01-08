import { User } from '@/models/User';
import { jwtManager } from '@/config/jwt';
import { logger } from '@/utils/logger';
import { 
  ICreateUser, 
  IUserLogin, 
  IPasswordReset,
  IUser
} from '@/types/user';
import { 
  IAuthResponse, 
  ITokenRefreshResponse,
  AuthErrorType,
  IAuthError
} from '@/types/auth';
import { emailService } from './emailService';

class AuthService {
  /**
   * Register a new user
   */
  async register(userData: ICreateUser): Promise<IAuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email.toLowerCase() });
      if (existingUser) {
        throw this.createAuthError(
          AuthErrorType.EMAIL_ALREADY_EXISTS,
          'An account with this email address already exists',
          409
        );
      }

      // Create new user
      const user = new User({
        email: userData.email.toLowerCase(),
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          currentStatus: userData.currentStatus
        },
        security: {
          passwordHash: userData.password, // Will be hashed by pre-save middleware
          emailVerified: false,
          loginAttempts: 0,
          lastPasswordChange: new Date(),
          twoFactorEnabled: false,
          refreshTokens: []
        },
        oauth: {
          providers: ['local']
        },
        preferences: {
          notificationFrequency: 'weekly',
          learningPace: 'moderate',
          careerGoals: [],
          preferredLearningStyle: 'mixed',
          timeZone: 'UTC',
          language: 'en',
          emailNotifications: {
            weeklyProgress: true,
            milestoneAchievements: true,
            jobRecommendations: true,
            learningReminders: true,
            systemUpdates: false
          },
          pushNotifications: {
            dailyReminders: true,
            weeklyTargets: true,
            achievements: true,
            jobMatches: true
          }
        },
        stats: {
          totalLearningHours: 0,
          completedModules: 0,
          achievementsEarned: 0,
          streakDays: 0,
          lastActiveDate: new Date(),
          joinDate: new Date(),
          assessmentCompleted: false,
          skillsAcquired: []
        },
        isActive: true
      });

      await user.save();

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Send verification email
      try {
        await emailService.sendVerificationEmail(user.email, verificationToken, user.profile.firstName);
      } catch (emailError) {
        logger.error('Failed to send verification email', {
          userId: user._id,
          email: user.email,
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
        // Don't fail registration if email fails
      }

      // Generate tokens
      const tokens = jwtManager.generateTokenPair(
        user._id.toString(),
        user.email,
        user.role
      );

      // Store refresh token
      await user.addRefreshToken(tokens.refreshToken);

      logger.info('User registered successfully', {
        userId: user._id,
        email: user.email,
        firstName: user.profile.firstName,
        currentStatus: user.profile.currentStatus
      });

      return {
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          user: this.formatUserResponse(user),
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: jwtManager.getTokenExpirationTime('access')
          }
        }
      };

    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error; // Re-throw auth errors
      }

      logger.error('Registration failed', {
        email: userData.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      throw this.createAuthError(
        AuthErrorType.OAUTH_ERROR,
        'Registration failed due to server error',
        500
      );
    }
  }

  /**
   * Login user with email and password
   */
  async login(loginData: IUserLogin): Promise<IAuthResponse> {
    try {
      // Find user by email
      const user = await User.findOne({ email: loginData.email.toLowerCase() });
      if (!user) {
        throw this.createAuthError(
          AuthErrorType.INVALID_CREDENTIALS,
          'Invalid email or password',
          401
        );
      }

      // Check if account is locked
      if (user.isAccountLocked()) {
        throw this.createAuthError(
          AuthErrorType.ACCOUNT_LOCKED,
          'Account is temporarily locked due to multiple failed login attempts',
          403
        );
      }

      // Check if account is active
      if (!user.isActive) {
        throw this.createAuthError(
          AuthErrorType.ACCOUNT_DISABLED,
          'Account has been disabled',
          403
        );
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(loginData.password);
      if (!isPasswordValid) {
        // Increment login attempts
        await user.incrementLoginAttempts();
        
        throw this.createAuthError(
          AuthErrorType.INVALID_CREDENTIALS,
          'Invalid email or password',
          401
        );
      }

      // Reset login attempts on successful login
      if (user.security.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Generate tokens
      const tokens = jwtManager.generateTokenPair(
        user._id.toString(),
        user.email,
        user.role
      );

      // Store refresh token
      await user.addRefreshToken(tokens.refreshToken);

      // Update last login
      await user.updateLastLogin();

      logger.info('User logged in successfully', {
        userId: user._id,
        email: user.email,
        lastLoginAt: user.lastLoginAt
      });

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: this.formatUserResponse(user),
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: jwtManager.getTokenExpirationTime('access')
          }
        }
      };

    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error; // Re-throw auth errors
      }

      logger.error('Login failed', {
        email: loginData.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw this.createAuthError(
        AuthErrorType.OAUTH_ERROR,
        'Login failed due to server error',
        500
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<ITokenRefreshResponse> {
    try {
      // Verify refresh token
      const payload = jwtManager.verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findById(payload.userId);
      if (!user) {
        throw this.createAuthError(
          AuthErrorType.USER_NOT_FOUND,
          'User not found',
          404
        );
      }

      // Check if refresh token exists in user's token list
      if (!user.security.refreshTokens.includes(refreshToken)) {
        throw this.createAuthError(
          AuthErrorType.TOKEN_INVALID,
          'Invalid refresh token',
          401
        );
      }

      // Check if account is active
      if (!user.isActive) {
        throw this.createAuthError(
          AuthErrorType.ACCOUNT_DISABLED,
          'Account has been disabled',
          403
        );
      }

      // Generate new token pair
      const tokens = jwtManager.generateTokenPair(
        user._id.toString(),
        user.email,
        user.role
      );

      // Remove old refresh token and add new one
      await user.removeRefreshToken(refreshToken);
      await user.addRefreshToken(tokens.refreshToken);

      logger.debug('Token refreshed successfully', {
        userId: user._id,
        email: user.email
      });

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: jwtManager.getTokenExpirationTime('access')
        }
      };

    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }

      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw this.createAuthError(
        AuthErrorType.TOKEN_INVALID,
        'Token refresh failed',
        401
      );
    }
  }

  /**
   * Logout user by removing refresh token
   */
  async logout(userId: string, refreshToken?: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw this.createAuthError(
          AuthErrorType.USER_NOT_FOUND,
          'User not found',
          404
        );
      }

      if (refreshToken) {
        // Remove specific refresh token
        await user.removeRefreshToken(refreshToken);
      } else {
        // Remove all refresh tokens (logout from all devices)
        await user.clearAllRefreshTokens();
      }

      logger.info('User logged out successfully', {
        userId: user._id,
        email: user.email,
        logoutType: refreshToken ? 'single_device' : 'all_devices'
      });

      return {
        success: true,
        message: 'Logout successful'
      };

    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }

      logger.error('Logout failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw this.createAuthError(
        AuthErrorType.OAUTH_ERROR,
        'Logout failed due to server error',
        500
      );
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message: 'If an account with this email exists, a password reset link has been sent.'
        };
      }

      // Generate password reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(user.email, resetToken, user.profile.firstName);
      } catch (emailError) {
        logger.error('Failed to send password reset email', {
          userId: user._id,
          email: user.email,
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
        
        throw this.createAuthError(
          AuthErrorType.OAUTH_ERROR,
          'Failed to send password reset email',
          500
        );
      }

      logger.info('Password reset requested', {
        userId: user._id,
        email: user.email
      });

      return {
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      };

    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }

      logger.error('Password reset request failed', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw this.createAuthError(
        AuthErrorType.OAUTH_ERROR,
        'Password reset request failed due to server error',
        500
      );
    }
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(resetData: IPasswordReset): Promise<{ success: boolean; message: string }> {
    try {
      // Verify reset token
      const payload = jwtManager.verifyPasswordResetToken(resetData.token);

      // Find user
      const user = await User.findById(payload.userId);
      if (!user) {
        throw this.createAuthError(
          AuthErrorType.USER_NOT_FOUND,
          'Invalid or expired reset token',
          400
        );
      }

      // Validate token against user's stored token
      if (!user.isPasswordResetTokenValid(resetData.token)) {
        throw this.createAuthError(
          AuthErrorType.TOKEN_INVALID,
          'Invalid or expired reset token',
          400
        );
      }

      // Update password
      user.security.passwordHash = resetData.newPassword; // Will be hashed by pre-save middleware
      user.security.lastPasswordChange = new Date();

      // Clear password reset token
      delete user.security.passwordResetToken;
      delete user.security.passwordResetExpires;

      // Clear all refresh tokens (logout from all devices)
      await user.clearAllRefreshTokens();

      await user.save();

      logger.info('Password reset successfully', {
        userId: user._id,
        email: user.email
      });

      return {
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.'
      };

    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }

      logger.error('Password reset failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw this.createAuthError(
        AuthErrorType.TOKEN_INVALID,
        'Password reset failed',
        400
      );
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    try {
      // Verify email verification token
      const payload = jwtManager.verifyEmailVerificationToken(token);

      // Find user
      const user = await User.findById(payload.userId);
      if (!user) {
        throw this.createAuthError(
          AuthErrorType.USER_NOT_FOUND,
          'Invalid or expired verification token',
          400
        );
      }

      // Validate token against user's stored token
      if (!user.isEmailVerificationTokenValid(token)) {
        throw this.createAuthError(
          AuthErrorType.TOKEN_INVALID,
          'Invalid or expired verification token',
          400
        );
      }

      // Mark email as verified
      user.security.emailVerified = true;
      delete user.security.emailVerificationToken;
      delete user.security.emailVerificationExpires;

      await user.save();

      logger.info('Email verified successfully', {
        userId: user._id,
        email: user.email
      });

      return {
        success: true,
        message: 'Email address has been verified successfully.'
      };

    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }

      logger.error('Email verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw this.createAuthError(
        AuthErrorType.TOKEN_INVALID,
        'Email verification failed',
        400
      );
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message: 'If an account with this email exists and is not verified, a verification email has been sent.'
        };
      }

      // Check if already verified
      if (user.security.emailVerified) {
        return {
          success: true,
          message: 'Email address is already verified.'
        };
      }

      // Generate new verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Send verification email
      try {
        await emailService.sendVerificationEmail(user.email, verificationToken, user.profile.firstName);
      } catch (emailError) {
        logger.error('Failed to resend verification email', {
          userId: user._id,
          email: user.email,
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
        
        throw this.createAuthError(
          AuthErrorType.OAUTH_ERROR,
          'Failed to send verification email',
          500
        );
      }

      logger.info('Email verification resent', {
        userId: user._id,
        email: user.email
      });

      return {
        success: true,
        message: 'If an account with this email exists and is not verified, a verification email has been sent.'
      };

    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }

      logger.error('Resend email verification failed', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw this.createAuthError(
        AuthErrorType.OAUTH_ERROR,
        'Resend verification failed due to server error',
        500
      );
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw this.createAuthError(
          AuthErrorType.USER_NOT_FOUND,
          'User not found',
          404
        );
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw this.createAuthError(
          AuthErrorType.INVALID_CREDENTIALS,
          'Current password is incorrect',
          400
        );
      }

      // Update password
      user.security.passwordHash = newPassword; // Will be hashed by pre-save middleware
      user.security.lastPasswordChange = new Date();

      // Clear all refresh tokens except current session would require additional logic
      // For now, we'll clear all tokens for security
      await user.clearAllRefreshTokens();

      await user.save();

      logger.info('Password changed successfully', {
        userId: user._id,
        email: user.email
      });

      return {
        success: true,
        message: 'Password has been changed successfully. Please log in again.'
      };

    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }

      logger.error('Password change failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw this.createAuthError(
        AuthErrorType.OAUTH_ERROR,
        'Password change failed due to server error',
        500
      );
    }
  }

  /**
   * Format user data for API response
   */
  private formatUserResponse(user: IUser): {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    emailVerified: boolean;
    profileComplete: boolean;
  } {
    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      role: user.role,
      emailVerified: user.security.emailVerified,
      profileComplete: this.isProfileComplete(user)
    };
  }

  /**
   * Check if user profile is complete
   */
  private isProfileComplete(user: IUser): boolean {
    return !!(
      user.profile.firstName &&
      user.profile.lastName &&
      user.profile.currentStatus &&
      user.security.emailVerified
    );
  }

  /**
   * Create standardized auth error
   */
  private createAuthError(type: AuthErrorType, message: string, statusCode: number): IAuthError {
    const error = Object.assign(new Error(message), {
      type,
      statusCode
    }) as IAuthError;
    return error;
  }
}

// Export singleton instance
export const authService = new AuthService();