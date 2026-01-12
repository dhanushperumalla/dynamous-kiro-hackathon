import { Response } from 'express';
import { User } from '../models/User';
import { pushNotificationService } from '../services/pushNotificationService';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth';

/**
 * Register device token for push notifications
 */
export const registerDeviceToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { deviceToken, platform } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!deviceToken) {
      res.status(400).json({
        success: false,
        message: 'Device token is required'
      });
      return;
    }

    // Validate device token format
    if (typeof deviceToken !== 'string' || deviceToken.length < 140) {
      res.status(400).json({
        success: false,
        message: 'Invalid device token format'
      });
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Initialize deviceTokens array if it doesn't exist
    if (!user.preferences.deviceTokens) {
      user.preferences.deviceTokens = [];
    }

    // Check if token already exists
    if (!user.preferences.deviceTokens.includes(deviceToken)) {
      // Validate token with Firebase (if service is enabled)
      const isValidToken = await pushNotificationService.validateDeviceToken(deviceToken);
      
      if (!isValidToken && process.env['NODE_ENV'] !== 'development') {
        res.status(400).json({
          success: false,
          message: 'Invalid device token'
        });
        return;
      }

      // Add token to user preferences
      user.preferences.deviceTokens.push(deviceToken);
      
      // Limit to 5 device tokens per user
      if (user.preferences.deviceTokens.length > 5) {
        user.preferences.deviceTokens = user.preferences.deviceTokens.slice(-5);
      }

      await user.save();

      // Subscribe to general topics
      try {
        await pushNotificationService.subscribeToTopic(deviceToken, 'all-users');
        await pushNotificationService.subscribeToTopic(deviceToken, `user-${userId}`);
      } catch (error) {
        logger.warn('Failed to subscribe device to topics', {
          userId,
          deviceToken: deviceToken.substring(0, 10) + '...',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      logger.info('Device token registered successfully', {
        userId,
        platform,
        tokenCount: user.preferences.deviceTokens.length
      });
    }

    res.status(200).json({
      success: true,
      message: 'Device token registered successfully',
      data: {
        tokenCount: user.preferences.deviceTokens.length
      }
    });

  } catch (error) {
    logger.error('Error registering device token', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Unregister device token
 */
export const unregisterDeviceToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { deviceToken } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    if (!deviceToken) {
      res.status(400).json({
        success: false,
        message: 'Device token is required'
      });
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Remove token from user preferences
    if (user.preferences.deviceTokens) {
      const initialLength = user.preferences.deviceTokens.length;
      user.preferences.deviceTokens = user.preferences.deviceTokens.filter(token => token !== deviceToken);
      
      if (user.preferences.deviceTokens.length < initialLength) {
        await user.save();

        // Unsubscribe from topics
        try {
          await pushNotificationService.unsubscribeFromTopic(deviceToken, 'all-users');
          await pushNotificationService.unsubscribeFromTopic(deviceToken, `user-${userId}`);
        } catch (error) {
          logger.warn('Failed to unsubscribe device from topics', {
            userId,
            deviceToken: deviceToken.substring(0, 10) + '...',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        logger.info('Device token unregistered successfully', {
          userId,
          tokenCount: user.preferences.deviceTokens.length
        });

        res.status(200).json({
          success: true,
          message: 'Device token unregistered successfully',
          data: {
            tokenCount: user.preferences.deviceTokens.length
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Device token not found'
        });
      }
    } else {
      res.status(404).json({
        success: false,
        message: 'No device tokens found for user'
      });
    }

  } catch (error) {
    logger.error('Error unregistering device token', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get user's registered device tokens
 */
export const getDeviceTokens = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const deviceTokens = user.preferences.deviceTokens || [];

    res.status(200).json({
      success: true,
      data: {
        tokenCount: deviceTokens.length,
        // Don't return actual tokens for security reasons
        hasTokens: deviceTokens.length > 0
      }
    });

  } catch (error) {
    logger.error('Error getting device tokens', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Test push notification (development/testing only)
 */
export const testPushNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, body } = req.body;
    const userId = req.user?.id;

    // Only allow in development environment
    if (process.env['NODE_ENV'] !== 'development') {
      res.status(403).json({
        success: false,
        message: 'Test notifications only available in development environment'
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    const deviceTokens = user.preferences.deviceTokens || [];
    if (deviceTokens.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No device tokens registered for user'
      });
      return;
    }

    // Send test notification
    const result = await pushNotificationService.sendMulticastPushNotification(
      deviceTokens,
      {
        title: title || 'Test Notification',
        body: body || 'This is a test notification from AI-Sikshak',
        data: {
          type: 'test',
          timestamp: new Date().toISOString()
        },
        actionUrl: '/dashboard'
      },
      'normal'
    );

    logger.info('Test push notification sent', {
      userId,
      deviceTokenCount: deviceTokens.length,
      success: result.success,
      successCount: result.successCount,
      failureCount: result.failureCount
    });

    res.status(200).json({
      success: true,
      message: 'Test notification sent',
      data: {
        deviceTokenCount: deviceTokens.length,
        successCount: result.successCount,
        failureCount: result.failureCount
      }
    });

  } catch (error) {
    logger.error('Error sending test push notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.id,
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};