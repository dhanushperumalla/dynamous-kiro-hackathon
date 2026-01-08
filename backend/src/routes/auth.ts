import { Router } from 'express';
import * as authController from '@/controllers/authController';
import { validateBody } from '@/middleware/validation';
import { authenticateToken, optionalAuth } from '@/middleware/auth';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  emailVerificationSchema,
  resendVerificationSchema,
  tokenRefreshSchema
} from '@/utils/validators';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  validateBody(registerSchema),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  validateBody(loginSchema),
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
  '/refresh',
  validateBody(tokenRefreshSchema),
  authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Private
 */
router.post(
  '/logout',
  authenticateToken({ required: true }),
  authController.logout
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  validateBody(passwordResetRequestSchema),
  authController.requestPasswordReset
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  validateBody(passwordResetConfirmSchema),
  authController.resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post(
  '/verify-email',
  validateBody(emailVerificationSchema),
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 */
router.post(
  '/resend-verification',
  validateBody(resendVerificationSchema),
  authController.resendEmailVerification
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  '/change-password',
  authenticateToken({ required: true }),
  validateBody(changePasswordSchema),
  authController.changePassword
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get(
  '/me',
  authenticateToken({ required: true }),
  authController.getCurrentUser
);

/**
 * @route   GET /api/auth/status
 * @desc    Check authentication status
 * @access  Public (but returns different data based on auth)
 */
router.get(
  '/status',
  optionalAuth,
  authController.checkAuthStatus
);

export default router;