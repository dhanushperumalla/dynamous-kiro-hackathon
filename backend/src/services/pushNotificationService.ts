import admin from 'firebase-admin';
import { logger } from '../utils/logger';

// Push notification interfaces
interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  actionUrl?: string;
  sound?: string;
  badge?: number;
  category?: string;
}

interface PushNotificationOptions {
  token?: string;
  tokens?: string[];
  topic?: string;
  condition?: string;
  payload: PushNotificationPayload;
  priority?: 'normal' | 'high';
  timeToLive?: number;
  collapseKey?: string;
}

interface PushNotificationResult {
  success: boolean;
  messageId?: string;
  failureCount?: number;
  successCount?: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

class PushNotificationService {
  private app: admin.app.App | null = null;
  private readonly isEnabled: boolean;

  constructor() {
    const isDevelopment = process.env['NODE_ENV'] === 'development';
    const serviceAccountPath = process.env['FIREBASE_SERVICE_ACCOUNT_PATH'];
    const serviceAccountKey = process.env['FIREBASE_SERVICE_ACCOUNT_KEY'];
    const projectId = process.env['FIREBASE_PROJECT_ID'];
    
    // Check if we're using dummy credentials
    const isDummyCredentials = projectId?.startsWith('dummy-') || 
                              serviceAccountPath?.startsWith('dummy-') ||
                              serviceAccountKey?.startsWith('dummy-');
    
    if (isDevelopment && (isDummyCredentials || (!serviceAccountPath && !serviceAccountKey))) {
      this.isEnabled = false; // Disable actual sending in development
      logger.info('Push notification service running in development mode - notifications will be logged instead of sent');
    } else if ((serviceAccountPath || serviceAccountKey) && projectId && !isDummyCredentials) {
      this.isEnabled = true;
      this.initializeFirebase();
      logger.info('Firebase push notification service initialized');
    } else {
      this.isEnabled = false;
      if (isDevelopment) {
        logger.info('Firebase credentials not configured. Push notification service disabled for development.');
      } else {
        logger.warn('Firebase credentials not found. Push notification service disabled.');
      }
    }
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initializeFirebase(): void {
    try {
      const serviceAccountPath = process.env['FIREBASE_SERVICE_ACCOUNT_PATH'];
      const serviceAccountKey = process.env['FIREBASE_SERVICE_ACCOUNT_KEY'];
      const projectId = process.env['FIREBASE_PROJECT_ID'];

      let credential;
      
      if (serviceAccountPath) {
        // Use service account file
        credential = admin.credential.cert(serviceAccountPath);
      } else if (serviceAccountKey) {
        // Use service account key as JSON string
        const serviceAccount = JSON.parse(serviceAccountKey);
        credential = admin.credential.cert(serviceAccount);
      } else {
        throw new Error('No Firebase service account configuration found');
      }

      this.app = admin.initializeApp({
        credential,
        projectId: projectId!
      }, 'ai-sikshak-push-notifications');

      logger.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Send weekly progress reminder push notification
   */
  async sendWeeklyProgressReminder(
    deviceToken: string, 
    firstName: string, 
    progressData: {
      completedTargets: number;
      totalTargets: number;
      currentWeek: number;
    }
  ): Promise<string> {
    const { completedTargets, totalTargets, currentWeek } = progressData;
    const completionRate = Math.round((completedTargets / totalTargets) * 100);
    
    const payload: PushNotificationPayload = {
      title: `Week ${currentWeek} Progress Update`,
      body: `Hi ${firstName}! You're ${completionRate}% complete this week. Keep up the great work! 📊`,
      data: {
        type: 'weekly_progress',
        week: currentWeek.toString(),
        completionRate: completionRate.toString(),
        completedTargets: completedTargets.toString(),
        totalTargets: totalTargets.toString()
      },
      actionUrl: '/dashboard',
      sound: 'default',
      badge: 1,
      category: 'progress'
    };

    const result = await this.sendPushNotification({
      token: deviceToken,
      payload,
      priority: 'normal'
    });

    logger.info('Weekly progress reminder push notification sent', {
      deviceToken: this.maskToken(deviceToken),
      firstName,
      progressData,
      success: result.success
    });

    return result.messageId || 'unknown';
  }

  /**
   * Send milestone achievement push notification
   */
  async sendMilestoneAchievementPush(
    deviceToken: string, 
    firstName: string, 
    milestone: {
      title: string;
      description: string;
      badge?: string;
    }
  ): Promise<string> {
    const payload: PushNotificationPayload = {
      title: '🏆 Milestone Achieved!',
      body: `Congratulations ${firstName}! You've achieved: ${milestone.title}`,
      data: {
        type: 'milestone_achievement',
        milestoneTitle: milestone.title,
        milestoneDescription: milestone.description,
        badge: milestone.badge || ''
      },
      actionUrl: '/achievements',
      sound: 'achievement',
      badge: 1,
      category: 'achievement'
    };

    const result = await this.sendPushNotification({
      token: deviceToken,
      payload,
      priority: 'high'
    });

    logger.info('Milestone achievement push notification sent', {
      deviceToken: this.maskToken(deviceToken),
      firstName,
      milestone: milestone.title,
      success: result.success
    });

    return result.messageId || 'unknown';
  }

  /**
   * Send inactivity reminder push notification
   */
  async sendInactivityReminderPush(
    deviceToken: string, 
    firstName: string, 
    daysInactive: number
  ): Promise<string> {
    const payload: PushNotificationPayload = {
      title: 'We miss you! 😊',
      body: `Hi ${firstName}, it's been ${daysInactive} days since your last session. Your career goals are waiting!`,
      data: {
        type: 'inactivity_reminder',
        daysInactive: daysInactive.toString()
      },
      actionUrl: '/dashboard',
      sound: 'gentle',
      badge: 1,
      category: 'reminder'
    };

    const result = await this.sendPushNotification({
      token: deviceToken,
      payload,
      priority: 'normal'
    });

    logger.info('Inactivity reminder push notification sent', {
      deviceToken: this.maskToken(deviceToken),
      firstName,
      daysInactive,
      success: result.success
    });

    return result.messageId || 'unknown';
  }

  /**
   * Send job recommendation push notification
   */
  async sendJobRecommendationPush(
    deviceToken: string, 
    firstName: string, 
    jobCount: number
  ): Promise<string> {
    const payload: PushNotificationPayload = {
      title: '🚀 New Job Opportunities!',
      body: `Great news ${firstName}! We found ${jobCount} new job${jobCount > 1 ? 's' : ''} that match your skills.`,
      data: {
        type: 'job_recommendation',
        jobCount: jobCount.toString()
      },
      actionUrl: '/jobs',
      sound: 'opportunity',
      badge: jobCount,
      category: 'job'
    };

    const result = await this.sendPushNotification({
      token: deviceToken,
      payload,
      priority: 'high'
    });

    logger.info('Job recommendation push notification sent', {
      deviceToken: this.maskToken(deviceToken),
      firstName,
      jobCount,
      success: result.success
    });

    return result.messageId || 'unknown';
  }

  /**
   * Send learning reminder push notification
   */
  async sendLearningReminderPush(
    deviceToken: string, 
    firstName: string, 
    targetTitle: string
  ): Promise<string> {
    const payload: PushNotificationPayload = {
      title: '📚 Learning Reminder',
      body: `Hi ${firstName}! Don't forget about your target: ${targetTitle}`,
      data: {
        type: 'learning_reminder',
        targetTitle
      },
      actionUrl: '/dashboard',
      sound: 'reminder',
      badge: 1,
      category: 'reminder'
    };

    const result = await this.sendPushNotification({
      token: deviceToken,
      payload,
      priority: 'normal'
    });

    logger.info('Learning reminder push notification sent', {
      deviceToken: this.maskToken(deviceToken),
      firstName,
      targetTitle,
      success: result.success
    });

    return result.messageId || 'unknown';
  }

  /**
   * Send push notification to multiple devices
   */
  async sendMulticastPushNotification(
    deviceTokens: string[],
    payload: PushNotificationPayload,
    priority: 'normal' | 'high' = 'normal'
  ): Promise<PushNotificationResult> {
    if (!this.isEnabled) {
      const isDevelopment = process.env['NODE_ENV'] === 'development';
      if (isDevelopment) {
        logger.info('📱 PUSH NOTIFICATION (Development Mode - Not Actually Sent)', {
          deviceCount: deviceTokens.length,
          title: payload.title,
          body: payload.body.substring(0, 100) + (payload.body.length > 100 ? '...' : ''),
          data: payload.data
        });
        return {
          success: true,
          successCount: deviceTokens.length,
          failureCount: 0
        };
      } else {
        logger.warn('Push notification service disabled. Notification not sent.', {
          deviceCount: deviceTokens.length
        });
        return {
          success: false,
          successCount: 0,
          failureCount: deviceTokens.length
        };
      }
    }

    if (!this.app) {
      throw new Error('Push notification service not properly initialized');
    }

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl })
        },
        data: payload.data || {},
        android: {
          priority: priority as 'normal' | 'high',
          notification: {
            sound: payload.sound || 'default',
            ...(payload.actionUrl && { clickAction: payload.actionUrl }),
            ...(payload.category && { tag: payload.category })
          }
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound || 'default',
              ...(payload.badge && { badge: payload.badge }),
              ...(payload.category && { category: payload.category })
            }
          },
          ...(payload.imageUrl && {
            fcmOptions: {
              imageUrl: payload.imageUrl
            }
          })
        },
        tokens: deviceTokens
      };

      const response = await admin.messaging(this.app).sendMulticast(message);

      const errors: Array<{ index: number; error: string }> = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          errors.push({
            index: idx,
            error: resp.error?.message || 'Unknown error'
          });
        }
      });

      logger.debug('Multicast push notification sent', {
        deviceCount: deviceTokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        title: payload.title
      });

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        ...(errors.length > 0 && { errors })
      };

    } catch (error) {
      logger.error('Failed to send multicast push notification', {
        deviceCount: deviceTokens.length,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw new Error(`Failed to send push notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send push notification to a topic
   */
  async sendTopicPushNotification(
    topic: string,
    payload: PushNotificationPayload,
    priority: 'normal' | 'high' = 'normal'
  ): Promise<string> {
    if (!this.isEnabled) {
      const isDevelopment = process.env['NODE_ENV'] === 'development';
      if (isDevelopment) {
        logger.info('📱 TOPIC PUSH NOTIFICATION (Development Mode - Not Actually Sent)', {
          topic,
          title: payload.title,
          body: payload.body.substring(0, 100) + (payload.body.length > 100 ? '...' : ''),
          data: payload.data
        });
        return `dev_push_${Date.now()}`;
      } else {
        logger.warn('Push notification service disabled. Notification not sent.', {
          topic
        });
        return `disabled_push_${Date.now()}`;
      }
    }

    if (!this.app) {
      throw new Error('Push notification service not properly initialized');
    }

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
          ...(payload.imageUrl && { imageUrl: payload.imageUrl })
        },
        data: payload.data || {},
        android: {
          priority: priority as 'normal' | 'high',
          notification: {
            sound: payload.sound || 'default',
            ...(payload.actionUrl && { clickAction: payload.actionUrl }),
            ...(payload.category && { tag: payload.category })
          }
        },
        apns: {
          payload: {
            aps: {
              sound: payload.sound || 'default',
              ...(payload.badge && { badge: payload.badge }),
              ...(payload.category && { category: payload.category })
            }
          },
          ...(payload.imageUrl && {
            fcmOptions: {
              imageUrl: payload.imageUrl
            }
          })
        },
        topic
      };

      const messageId = await admin.messaging(this.app).send(message);

      logger.debug('Topic push notification sent', {
        topic,
        messageId,
        title: payload.title
      });

      return messageId;

    } catch (error) {
      logger.error('Failed to send topic push notification', {
        topic,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      throw new Error(`Failed to send push notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send generic push notification
   */
  private async sendPushNotification(options: PushNotificationOptions): Promise<PushNotificationResult> {
    if (options.tokens && options.tokens.length > 1) {
      return await this.sendMulticastPushNotification(options.tokens, options.payload, options.priority);
    } else if (options.topic) {
      const messageId = await this.sendTopicPushNotification(options.topic, options.payload, options.priority);
      return { success: true, messageId };
    } else if (options.token) {
      const result = await this.sendMulticastPushNotification([options.token], options.payload, options.priority);
      return {
        success: result.success,
        ...(result.messageId && { messageId: result.messageId }),
        ...(result.successCount !== undefined && { successCount: result.successCount }),
        ...(result.failureCount !== undefined && { failureCount: result.failureCount }),
        ...(result.errors && { errors: result.errors })
      };
    } else {
      throw new Error('No target specified for push notification (token, tokens, or topic required)');
    }
  }

  /**
   * Subscribe device token to topic
   */
  async subscribeToTopic(deviceTokens: string | string[], topic: string): Promise<void> {
    if (!this.isEnabled || !this.app) {
      logger.info('Push notification service disabled. Topic subscription skipped.', {
        topic,
        tokenCount: Array.isArray(deviceTokens) ? deviceTokens.length : 1
      });
      return;
    }

    try {
      const tokens = Array.isArray(deviceTokens) ? deviceTokens : [deviceTokens];
      await admin.messaging(this.app).subscribeToTopic(tokens, topic);
      
      logger.info('Devices subscribed to topic', {
        topic,
        tokenCount: tokens.length
      });
    } catch (error) {
      logger.error('Failed to subscribe devices to topic', {
        topic,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Unsubscribe device token from topic
   */
  async unsubscribeFromTopic(deviceTokens: string | string[], topic: string): Promise<void> {
    if (!this.isEnabled || !this.app) {
      logger.info('Push notification service disabled. Topic unsubscription skipped.', {
        topic,
        tokenCount: Array.isArray(deviceTokens) ? deviceTokens.length : 1
      });
      return;
    }

    try {
      const tokens = Array.isArray(deviceTokens) ? deviceTokens : [deviceTokens];
      await admin.messaging(this.app).unsubscribeFromTopic(tokens, topic);
      
      logger.info('Devices unsubscribed from topic', {
        topic,
        tokenCount: tokens.length
      });
    } catch (error) {
      logger.error('Failed to unsubscribe devices from topic', {
        topic,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Validate device token
   */
  async validateDeviceToken(token: string): Promise<boolean> {
    if (!this.isEnabled || !this.app) {
      return false;
    }

    try {
      // Try to send a test message to validate the token
      const testMessage = {
        data: { test: 'validation' },
        token,
        dryRun: true // Don't actually send the message
      };

      await admin.messaging(this.app).send(testMessage);
      return true;
    } catch (error) {
      logger.debug('Device token validation failed', {
        token: this.maskToken(token),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Mask device token for logging (privacy)
   */
  private maskToken(token: string): string {
    if (token.length <= 8) return token;
    const visibleChars = 4;
    const maskedPart = '*'.repeat(token.length - visibleChars * 2);
    return token.substring(0, visibleChars) + maskedPart + token.substring(token.length - visibleChars);
  }

  /**
   * Get FCM registration token info
   */
  async getTokenInfo(token: string): Promise<{
    applicationVersion?: string;
    connectDate?: string;
    attestStatus?: string;
    platform?: string;
  }> {
    if (!this.isEnabled || !this.app) {
      return {};
    }

    try {
      // Note: This is a placeholder as Firebase Admin SDK doesn't provide direct token info
      // In a real implementation, you might use Firebase Instance ID API
      logger.debug('Token info requested', {
        token: this.maskToken(token)
      });
      
      return {
        platform: 'unknown'
      };
    } catch (error) {
      logger.error('Failed to get token info', {
        token: this.maskToken(token),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {};
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();