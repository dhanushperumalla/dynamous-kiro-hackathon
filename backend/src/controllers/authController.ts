import { Request, Response } from 'express';
import { authService } from '@/services/authService';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/types/auth';

// Standard error response interface
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

/**
 * User registration controller
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const result = await authService.register(req.body);
    
    logger.info('User registration successful', {
      requestId,
      email: req.body.email,
      firstName: req.body.firstName,
      currentStatus: req.body.currentStatus
    });
    
    res.status(201).json(result);
    
  } catch (error: any) {
    logger.error('Registration controller error', {
      requestId,
      email: req.body.email,
      error: error.message,
      type: error.type,
      stack: error.stack
    });
    
    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'REGISTRATION_ERROR',
        message: error.message || 'Registration failed',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(statusCode).json(errorResponse);
  }
};

/**
 * User login controller
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const result = await authService.login(req.body);
    
    logger.info('User login successful', {
      requestId,
      email: req.body.email,
      rememberMe: req.body.rememberMe
    });
    
    res.status(200).json(result);
    
  } catch (error: any) {
    logger.warn('Login controller error', {
      requestId,
      email: req.body.email,
      error: error.message,
      type: error.type,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'LOGIN_ERROR',
        message: error.message || 'Login failed',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Token refresh controller
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    
    logger.debug('Token refresh successful', {
      requestId
    });
    
    res.status(200).json(result);
    
  } catch (error: any) {
    logger.warn('Token refresh controller error', {
      requestId,
      error: error.message,
      type: error.type,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'TOKEN_REFRESH_ERROR',
        message: error.message || 'Token refresh failed',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(statusCode).json(errorResponse);
  }
};

/**
 * User logout controller
 */
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for logout',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }
    
    const { refreshToken, logoutFromAllDevices } = req.body;
    const result = await authService.logout(
      req.user._id.toString(),
      logoutFromAllDevices ? undefined : refreshToken
    );
    
    logger.info('User logout successful', {
      requestId,
      userId: req.user._id,
      email: req.user.email,
      logoutType: logoutFromAllDevices ? 'all_devices' : 'single_device'
    });
    
    res.status(200).json(result);
    
  } catch (error: any) {
    logger.error('Logout controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      type: error.type
    });
    
    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'LOGOUT_ERROR',
        message: error.message || 'Logout failed',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Password reset request controller
 */
export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const { email } = req.body;
    const result = await authService.requestPasswordReset(email);
    
    logger.info('Password reset requested', {
      requestId,
      email,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json(result);
    
  } catch (error: any) {
    logger.error('Password reset request controller error', {
      requestId,
      email: req.body.email,
      error: error.message,
      type: error.type
    });
    
    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'PASSWORD_RESET_REQUEST_ERROR',
        message: error.message || 'Password reset request failed',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Password reset confirmation controller
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const result = await authService.resetPassword(req.body);
    
    logger.info('Password reset successful', {
      requestId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json(result);
    
  } catch (error: any) {
    logger.warn('Password reset controller error', {
      requestId,
      error: error.message,
      type: error.type,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'PASSWORD_RESET_ERROR',
        message: error.message || 'Password reset failed',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Email verification controller
 */
export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const { token } = req.body;
    const result = await authService.verifyEmail(token);
    
    logger.info('Email verification successful', {
      requestId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json(result);
    
  } catch (error: any) {
    logger.warn('Email verification controller error', {
      requestId,
      error: error.message,
      type: error.type,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'EMAIL_VERIFICATION_ERROR',
        message: error.message || 'Email verification failed',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Resend email verification controller
 */
export const resendEmailVerification = async (req: Request, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const { email } = req.body;
    const result = await authService.resendEmailVerification(email);
    
    logger.info('Email verification resent', {
      requestId,
      email,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.status(200).json(result);
    
  } catch (error: any) {
    logger.error('Resend email verification controller error', {
      requestId,
      email: req.body.email,
      error: error.message,
      type: error.type
    });
    
    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'RESEND_VERIFICATION_ERROR',
        message: error.message || 'Resend verification failed',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Change password controller
 */
export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for password change',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }
    
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user._id.toString(),
      currentPassword,
      newPassword
    );
    
    logger.info('Password change successful', {
      requestId,
      userId: req.user._id,
      email: req.user.email
    });
    
    res.status(200).json(result);
    
  } catch (error: any) {
    logger.warn('Change password controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      type: error.type
    });
    
    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'CHANGE_PASSWORD_ERROR',
        message: error.message || 'Password change failed',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Get current user profile controller
 */
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }
    
    // Return user data (password and sensitive info already filtered by toJSON)
    const userData = {
      success: true,
      data: {
        user: req.user.toJSON()
      }
    };
    
    logger.debug('Current user retrieved', {
      requestId,
      userId: req.user._id,
      email: req.user.email
    });
    
    res.status(200).json(userData);
    
  } catch (error: any) {
    logger.error('Get current user controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message
    });
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'GET_USER_ERROR',
        message: 'Failed to retrieve user information',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Check authentication status controller
 */
export const checkAuthStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const isAuthenticated = !!req.user;
    
    const response = {
      success: true,
      data: {
        authenticated: isAuthenticated,
        user: isAuthenticated ? {
          id: req.user!._id.toString(),
          email: req.user!.email,
          role: req.user!.role,
          emailVerified: req.user!.security.emailVerified
        } : null
      }
    };
    
    logger.debug('Auth status checked', {
      requestId,
      authenticated: isAuthenticated,
      userId: req.user?._id
    });
    
    res.status(200).json(response);
    
  } catch (error: any) {
    logger.error('Check auth status controller error', {
      requestId,
      error: error.message
    });
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'AUTH_STATUS_ERROR',
        message: 'Failed to check authentication status',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(500).json(errorResponse);
  }
};