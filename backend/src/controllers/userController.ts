import { Response } from 'express';
import { User } from '@/models/User';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/types/auth';
import { IUpdateUser } from '@/types/user';

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
 * Get user profile controller
 */
export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    
    // Get fresh user data from database
    const user = await User.findById(req.user._id);
    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }
    
    const response = {
      success: true,
      data: {
        user: user.toJSON()
      }
    };
    
    logger.debug('User profile retrieved', {
      requestId,
      userId: user._id,
      email: user.email
    });
    
    res.status(200).json(response);
    
  } catch (error: any) {
    logger.error('Get profile controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'GET_PROFILE_ERROR',
        message: 'Failed to retrieve user profile',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Update user profile controller
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    
    const updateData: IUpdateUser = req.body;
    
    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }
    
    // Update profile fields if provided
    if (updateData.profile) {
      Object.assign(user.profile, updateData.profile);
    }
    
    // Update preferences if provided
    if (updateData.preferences) {
      Object.assign(user.preferences, updateData.preferences);
    }
    
    // Save updated user
    await user.save();
    
    const response = {
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    };
    
    logger.info('User profile updated', {
      requestId,
      userId: user._id,
      email: user.email,
      updatedFields: {
        profile: !!updateData.profile,
        preferences: !!updateData.preferences
      }
    });
    
    res.status(200).json(response);
    
  } catch (error: any) {
    logger.error('Update profile controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack,
      updateData: req.body
    });
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'UPDATE_PROFILE_ERROR',
        message: 'Failed to update user profile',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Delete user account controller
 */
export const deleteAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    
    const { password } = req.body;
    
    // Verify password before deletion
    const isPasswordValid = await req.user.comparePassword(password);
    if (!isPasswordValid) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Password verification failed',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }
    
    // Soft delete - deactivate account instead of hard delete
    req.user.isActive = false;
    req.user.email = `deleted_${Date.now()}_${req.user.email}`;
    
    // Clear sensitive data
    await req.user.clearAllRefreshTokens();
    
    await req.user.save();
    
    const response = {
      success: true,
      message: 'Account has been deactivated successfully'
    };
    
    logger.info('User account deleted', {
      requestId,
      userId: req.user._id,
      originalEmail: req.user.email
    });
    
    res.status(200).json(response);
    
  } catch (error: any) {
    logger.error('Delete account controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'DELETE_ACCOUNT_ERROR',
        message: 'Failed to delete user account',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Get user statistics controller
 */
export const getUserStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    
    // Get fresh user data
    const user = await User.findById(req.user._id);
    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }
    
    // Calculate additional statistics
    const daysSinceJoining = Math.floor(
      (Date.now() - user.stats.joinDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const averageLearningHoursPerDay = daysSinceJoining > 0 
      ? (user.stats.totalLearningHours / daysSinceJoining).toFixed(2)
      : '0.00';
    
    const response = {
      success: true,
      data: {
        stats: {
          ...user.stats,
          daysSinceJoining,
          averageLearningHoursPerDay: parseFloat(averageLearningHoursPerDay)
        }
      }
    };
    
    logger.debug('User stats retrieved', {
      requestId,
      userId: user._id,
      email: user.email
    });
    
    res.status(200).json(response);
    
  } catch (error: any) {
    logger.error('Get user stats controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'GET_STATS_ERROR',
        message: 'Failed to retrieve user statistics',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Update user preferences controller
 */
export const updatePreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    
    const preferences = req.body;
    
    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }
    
    // Update preferences
    Object.assign(user.preferences, preferences);
    await user.save();
    
    const response = {
      success: true,
      message: 'Preferences updated successfully',
      data: {
        preferences: user.preferences
      }
    };
    
    logger.info('User preferences updated', {
      requestId,
      userId: user._id,
      email: user.email,
      updatedPreferences: Object.keys(preferences)
    });
    
    res.status(200).json(response);
    
  } catch (error: any) {
    logger.error('Update preferences controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack,
      preferences: req.body
    });
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'UPDATE_PREFERENCES_ERROR',
        message: 'Failed to update user preferences',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Upload user avatar controller
 */
export const uploadAvatar = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    
    // For now, we'll just accept a URL in the request body
    // In a real implementation, you'd handle file upload to cloud storage
    const { avatarUrl } = req.body;
    
    if (!avatarUrl) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AVATAR_URL_REQUIRED',
          message: 'Avatar URL is required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }
    
    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }
    
    // Update avatar
    user.profile.avatar = avatarUrl;
    await user.save();
    
    const response = {
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatarUrl: user.profile.avatar
      }
    };
    
    logger.info('User avatar updated', {
      requestId,
      userId: user._id,
      email: user.email,
      avatarUrl
    });
    
    res.status(200).json(response);
    
  } catch (error: any) {
    logger.error('Upload avatar controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'UPLOAD_AVATAR_ERROR',
        message: 'Failed to update avatar',
        timestamp: new Date().toISOString(),
        requestId
      }
    };
    
    res.status(500).json(errorResponse);
  }
};