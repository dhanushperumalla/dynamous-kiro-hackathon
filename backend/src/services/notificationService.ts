import Notification from '../models/Notification';
import NotificationHistory from '../models/NotificationHistory';
import { User } from '../models/User';
import {
  INotificationDocument,
  ICreateNotification,
  INotificationAnalytics,
  IDeliveryResult,
  IUserNotificationSettings,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  DeliveryChannel,
  NotificationFrequency
} from '../types/notification';
import { IUser } from '../types/user';
import { logger } from '../utils/logger';
import { emailService } from './emailService';
import { smsService } from './smsService';
import { pushNotificationService } from './pushNotificationService';

export class NotificationService {
  private schedulingQueue: Map<string, NodeJS.Timeout> = new Map();
  private notificationHistory: Map<string, INotificationDocument[]> = new Map();

  /**
   * Create a new notification
   */
  async createNotification(notificationData: ICreateNotification): Promise<INotificationDocument> {
    try {
      // Validate user exists
      const user = await User.findById(notificationData.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check user notification preferences
      const userPreferences = await this.getUserNotificationPreferences(user);
      if (!this.shouldSendNotification(notificationData.type, userPreferences)) {
        logger.info('Notification skipped due to user preferences', {
          userId: notificationData.userId,
          type: notificationData.type
        });
        throw new Error('User has disabled this type of notification');
      }

      // Apply user preferences to delivery preferences
      const deliveryPreferences = {
        channels: this.getPreferredChannels(notificationData.type, userPreferences),
        frequency: userPreferences.globalPreferences?.frequency || NotificationFrequency.IMMEDIATE,
        quietHours: userPreferences.globalPreferences?.quietHours,
        maxDailyNotifications: userPreferences.globalPreferences?.maxDailyNotifications || 10,
        enableBatching: userPreferences.globalPreferences?.enableBatching || false,
        batchingWindow: userPreferences.globalPreferences?.batchingWindow || 30,
        ...notificationData.deliveryPreferences
      };

      // Create notification
      const notification = new Notification({
        userId: notificationData.userId,
        type: notificationData.type,
        priority: notificationData.priority || NotificationPriority.MEDIUM,
        content: notificationData.content,
        deliveryPreferences,
        schedule: {
          scheduledFor: notificationData.schedule?.scheduledFor || new Date(),
          timezone: notificationData.schedule?.timezone || user.preferences?.timeZone || 'UTC',
          recurring: notificationData.schedule?.recurring,
          retryPolicy: {
            maxRetries: 3,
            retryInterval: 15,
            backoffMultiplier: 2,
            ...notificationData.schedule?.retryPolicy
          }
        },
        templateId: notificationData.templateId,
        templateData: notificationData.templateData,
        expiresAt: notificationData.expiresAt,
        metadata: notificationData.metadata
      });

      const savedNotification = await notification.save();

      // Schedule the notification
      await this.scheduleNotification(savedNotification);

      // Add to history tracking
      await this.addToHistory(savedNotification);

      logger.info('Notification created and scheduled', {
        notificationId: savedNotification._id,
        userId: savedNotification.userId,
        type: savedNotification.type,
        scheduledFor: savedNotification.schedule.scheduledFor
      });

      return savedNotification;
    } catch (error) {
      logger.error('Error creating notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: notificationData.userId,
        type: notificationData.type
      });
      throw error;
    }
  }

  /**
   * Schedule a notification for delivery
   */
  async scheduleNotification(notification: INotificationDocument): Promise<void> {
    try {
      const now = new Date();
      const scheduledTime = new Date(notification.schedule.scheduledFor);
      
      // If scheduled time is in the past or immediate, process now
      if (scheduledTime <= now || notification.deliveryPreferences.frequency === NotificationFrequency.IMMEDIATE) {
        await this.processNotification(notification);
        return;
      }

      // Calculate delay in milliseconds
      const delay = scheduledTime.getTime() - now.getTime();
      
      // Schedule the notification
      const timeoutId = setTimeout(async () => {
        try {
          await this.processNotification(notification);
          this.schedulingQueue.delete(notification._id.toString());
        } catch (error) {
          logger.error('Error processing scheduled notification', {
            error: error instanceof Error ? error.message : 'Unknown error',
            notificationId: notification._id,
            userId: notification.userId
          });
        }
      }, delay);

      // Store timeout reference for potential cancellation
      this.schedulingQueue.set(notification._id.toString(), timeoutId);

      // Update notification status to scheduled
      notification.status = NotificationStatus.SCHEDULED;
      await notification.save();

      logger.info('Notification scheduled', {
        notificationId: notification._id,
        userId: notification.userId,
        scheduledFor: scheduledTime,
        delay: delay
      });
    } catch (error) {
      logger.error('Error scheduling notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notification._id,
        userId: notification.userId
      });
      throw error;
    }
  }

  /**
   * Process and send a notification
   */
  async processNotification(notification: INotificationDocument): Promise<void> {
    try {
      // Check if notification is still valid
      if (notification.isExpired() || !notification.isActive) {
        logger.info('Skipping expired or inactive notification', {
          notificationId: notification._id,
          userId: notification.userId,
          isExpired: notification.isExpired(),
          isActive: notification.isActive
        });
        return;
      }

      // Check quiet hours
      if (this.isInQuietHours(notification)) {
        await this.rescheduleForQuietHours(notification);
        return;
      }

      // Check daily notification limits
      if (await this.hasExceededDailyLimit(notification)) {
        logger.info('Daily notification limit exceeded, skipping', {
          notificationId: notification._id,
          userId: notification.userId
        });
        return;
      }

      // Increment attempts
      await notification.incrementAttempts();

      // Send notification through all channels
      const deliveryResults: IDeliveryResult[] = [];
      
      for (const channel of notification.deliveryPreferences.channels) {
        try {
          const result = await this.sendThroughChannel(notification, channel);
          deliveryResults.push(result);
        } catch (error) {
          deliveryResults.push({
            channel,
            status: NotificationStatus.FAILED,
            failureReason: error instanceof Error ? error.message : 'Unknown error',
            metadata: { error: error }
          });
        }
      }

      // Mark notification as sent
      await notification.markAsSent(deliveryResults);

      // Schedule recurring notification if applicable
      if (notification.schedule.recurring) {
        await this.scheduleRecurringNotification(notification);
      }

      logger.info('Notification processed', {
        notificationId: notification._id,
        userId: notification.userId,
        deliveryResults: deliveryResults.map(r => ({ channel: r.channel, status: r.status }))
      });
    } catch (error) {
      logger.error('Error processing notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notification._id,
        userId: notification.userId
      });

      // Mark as failed if max attempts reached
      if (notification.attempts >= notification.maxAttempts) {
        notification.status = NotificationStatus.FAILED;
        await notification.save();
      } else if (notification.canRetry()) {
        // Schedule retry
        await this.scheduleRetry(notification);
      }
    }
  }

  /**
   * Send notification through specific channel
   */
  private async sendThroughChannel(notification: INotificationDocument, channel: DeliveryChannel): Promise<IDeliveryResult> {
    const startTime = Date.now();
    
    try {
      let externalId: string | undefined;
      
      switch (channel) {
        case DeliveryChannel.EMAIL:
          externalId = await this.sendEmail(notification);
          break;
        case DeliveryChannel.SMS:
          externalId = await this.sendSMS(notification);
          break;
        case DeliveryChannel.PUSH:
          externalId = await this.sendPushNotification(notification);
          break;
        case DeliveryChannel.IN_APP:
          externalId = await this.sendInAppNotification(notification);
          break;
        default:
          throw new Error(`Unsupported delivery channel: ${channel}`);
      }

      return {
        channel,
        status: NotificationStatus.SENT,
        deliveredAt: new Date(),
        externalId,
        metadata: {
          processingTime: Date.now() - startTime
        }
      };
    } catch (error) {
      return {
        channel,
        status: NotificationStatus.FAILED,
        failureReason: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          processingTime: Date.now() - startTime,
          error: error
        }
      };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(notification: INotificationDocument): Promise<string> {
    try {
      // Get user information
      const user = await User.findById(notification.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const { title, body, actionUrl } = notification.content;
      const firstName = user.profile?.firstName || 'User';

      // Send different types of email notifications based on notification type
      switch (notification.type) {
        case NotificationType.WEEKLY_TARGET_REMINDER:
        case NotificationType.WEEKLY_PROGRESS_SUMMARY:
          if (notification.templateData?.progressData) {
            await emailService.sendWeeklyProgressReminder(
              user.email,
              firstName,
              notification.templateData.progressData
            );
          }
          break;

        case NotificationType.MILESTONE_ACHIEVEMENT:
        case NotificationType.STREAK_CELEBRATION:
        case NotificationType.COURSE_COMPLETION:
          if (notification.templateData?.milestone) {
            await emailService.sendMilestoneAchievementEmail(
              user.email,
              firstName,
              notification.templateData.milestone
            );
          }
          break;

        case NotificationType.JOB_RECOMMENDATION:
          if (notification.templateData?.jobs) {
            await emailService.sendJobRecommendationEmail(
              user.email,
              firstName,
              notification.templateData.jobs
            );
          }
          break;

        default:
          // For other notification types, send a generic email
          logger.info('Sending generic email notification', {
            notificationId: notification._id,
            userId: notification.userId,
            type: notification.type,
            title
          });
          break;
      }

      logger.info('Email notification sent successfully', {
        notificationId: notification._id,
        userId: notification.userId,
        type: notification.type,
        email: user.email
      });

      return `email_${notification._id}_${Date.now()}`;
    } catch (error) {
      logger.error('Failed to send email notification', {
        notificationId: notification._id,
        userId: notification.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMS(notification: INotificationDocument): Promise<string> {
    try {
      // Get user information
      const user = await User.findById(notification.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has a phone number
      if (!user.profile?.phoneNumber) {
        throw new Error('User phone number not available');
      }

      const firstName = user.profile?.firstName || 'User';
      const phoneNumber = user.profile.phoneNumber;

      // Validate phone number format
      if (!smsService.validatePhoneNumber(phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      // Send different types of SMS notifications based on notification type
      switch (notification.type) {
        case NotificationType.WEEKLY_TARGET_REMINDER:
        case NotificationType.WEEKLY_PROGRESS_SUMMARY:
          if (notification.templateData?.progressData) {
            await smsService.sendWeeklyProgressReminder(
              phoneNumber,
              firstName,
              notification.templateData.progressData
            );
          }
          break;

        case NotificationType.MILESTONE_ACHIEVEMENT:
        case NotificationType.STREAK_CELEBRATION:
        case NotificationType.COURSE_COMPLETION:
          if (notification.templateData?.milestone) {
            await smsService.sendMilestoneAchievementSMS(
              phoneNumber,
              firstName,
              notification.templateData.milestone
            );
          }
          break;

        case NotificationType.INACTIVITY_ALERT:
          if (notification.templateData?.daysInactive) {
            await smsService.sendInactivityReminderSMS(
              phoneNumber,
              firstName,
              notification.templateData.daysInactive
            );
          }
          break;

        case NotificationType.JOB_RECOMMENDATION:
          if (notification.templateData?.jobCount) {
            await smsService.sendJobRecommendationSMS(
              phoneNumber,
              firstName,
              notification.templateData.jobCount
            );
          }
          break;

        case NotificationType.SYSTEM_UPDATE:
          if (notification.priority === NotificationPriority.URGENT) {
            await smsService.sendUrgentNotificationSMS(
              phoneNumber,
              firstName,
              notification.content.body
            );
          }
          break;

        default:
          logger.info('SMS notification type not specifically handled, skipping', {
            notificationId: notification._id,
            userId: notification.userId,
            type: notification.type
          });
          throw new Error(`SMS not supported for notification type: ${notification.type}`);
      }

      logger.info('SMS notification sent successfully', {
        notificationId: notification._id,
        userId: notification.userId,
        type: notification.type,
        phoneNumber: phoneNumber.substring(0, 3) + '***' + phoneNumber.substring(phoneNumber.length - 3)
      });

      return `sms_${notification._id}_${Date.now()}`;
    } catch (error) {
      logger.error('Failed to send SMS notification', {
        notificationId: notification._id,
        userId: notification.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: INotificationDocument): Promise<string> {
    try {
      // Get user information
      const user = await User.findById(notification.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has device tokens for push notifications
      const deviceTokens = user.preferences?.deviceTokens || [];
      if (deviceTokens.length === 0) {
        throw new Error('No device tokens available for user');
      }

      const firstName = user.profile?.firstName || 'User';

      // Send different types of push notifications based on notification type
      let messageId: string;

      switch (notification.type) {
        case NotificationType.WEEKLY_TARGET_REMINDER:
        case NotificationType.WEEKLY_PROGRESS_SUMMARY:
          if (notification.templateData?.progressData && deviceTokens.length > 0) {
            messageId = await pushNotificationService.sendWeeklyProgressReminder(
              deviceTokens[0], // Use first device token
              firstName,
              notification.templateData.progressData
            );
          } else {
            throw new Error('Missing progress data for weekly reminder');
          }
          break;

        case NotificationType.MILESTONE_ACHIEVEMENT:
        case NotificationType.STREAK_CELEBRATION:
        case NotificationType.COURSE_COMPLETION:
          if (notification.templateData?.milestone && deviceTokens.length > 0) {
            messageId = await pushNotificationService.sendMilestoneAchievementPush(
              deviceTokens[0],
              firstName,
              notification.templateData.milestone
            );
          } else {
            throw new Error('Missing milestone data for achievement notification');
          }
          break;

        case NotificationType.INACTIVITY_ALERT:
          if (notification.templateData?.daysInactive && deviceTokens.length > 0) {
            messageId = await pushNotificationService.sendInactivityReminderPush(
              deviceTokens[0],
              firstName,
              notification.templateData.daysInactive
            );
          } else {
            throw new Error('Missing inactivity data for reminder');
          }
          break;

        case NotificationType.JOB_RECOMMENDATION:
          if (notification.templateData?.jobCount && deviceTokens.length > 0) {
            messageId = await pushNotificationService.sendJobRecommendationPush(
              deviceTokens[0],
              firstName,
              notification.templateData.jobCount
            );
          } else {
            throw new Error('Missing job count for job recommendation');
          }
          break;

        case NotificationType.LEARNING_REMINDER:
          if (notification.templateData?.targetTitle && deviceTokens.length > 0) {
            messageId = await pushNotificationService.sendLearningReminderPush(
              deviceTokens[0],
              firstName,
              notification.templateData.targetTitle
            );
          } else {
            throw new Error('Missing target title for learning reminder');
          }
          break;

        default:
          logger.info('Push notification type not specifically handled, skipping', {
            notificationId: notification._id,
            userId: notification.userId,
            type: notification.type
          });
          throw new Error(`Push notification not supported for notification type: ${notification.type}`);
      }

      logger.info('Push notification sent successfully', {
        notificationId: notification._id,
        userId: notification.userId,
        type: notification.type,
        deviceTokenCount: deviceTokens.length,
        messageId
      });

      return messageId || `push_${notification._id}_${Date.now()}`;
    } catch (error) {
      logger.error('Failed to send push notification', {
        notificationId: notification._id,
        userId: notification.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(notification: INotificationDocument): Promise<string> {
    // This would store the notification for in-app display
    logger.info('Sending in-app notification', {
      notificationId: notification._id,
      userId: notification.userId,
      title: notification.content.title
    });
    
    // Return notification ID as external ID
    return notification._id.toString();
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private isInQuietHours(notification: INotificationDocument): boolean {
    const quietHours = notification.deliveryPreferences.quietHours;
    if (!quietHours || !quietHours.start || !quietHours.end) {
      return false;
    }

    const now = new Date();
    const timezone = quietHours.timezone || notification.schedule.timezone || 'UTC';
    
    // Convert current time to user's timezone
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const currentHour = userTime.getHours();
    const currentMinute = userTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // Parse quiet hours with proper validation
    const startParts = quietHours.start.split(':');
    const endParts = quietHours.end.split(':');
    
    if (startParts.length !== 2 || endParts.length !== 2) {
      logger.warn('Invalid quiet hours time format', {
        notificationId: notification._id,
        startTime: quietHours.start,
        endTime: quietHours.end
      });
      return false; // Invalid time format
    }
    
    const startHour = parseInt(startParts[0] || '0', 10);
    const startMinute = parseInt(startParts[1] || '0', 10);
    const endHour = parseInt(endParts[0] || '0', 10);
    const endMinute = parseInt(endParts[1] || '0', 10);
    
    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
      logger.warn('Invalid quiet hours time values', {
        notificationId: notification._id,
        startTime: quietHours.start,
        endTime: quietHours.end
      });
      return false; // Invalid time values
    }
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Reschedule notification to after quiet hours
   */
  private async rescheduleForQuietHours(notification: INotificationDocument): Promise<void> {
    const quietHours = notification.deliveryPreferences.quietHours!;
    
    // Calculate next available time after quiet hours
    const now = new Date();
    const endParts = quietHours.end.split(':');
    
    if (endParts.length !== 2) {
      logger.warn('Invalid quiet hours end time format', {
        notificationId: notification._id,
        endTime: quietHours.end
      });
      return;
    }
    
    const endHour = parseInt(endParts[0] || '0', 10);
    const endMinute = parseInt(endParts[1] || '0', 10);
    
    if (isNaN(endHour) || isNaN(endMinute)) {
      logger.warn('Invalid quiet hours end time values', {
        notificationId: notification._id,
        endTime: quietHours.end
      });
      return;
    }
    
    const nextAvailableTime = new Date(now);
    nextAvailableTime.setHours(endHour, endMinute, 0, 0);
    
    // If end time is today but already passed, schedule for tomorrow
    if (nextAvailableTime <= now) {
      nextAvailableTime.setDate(nextAvailableTime.getDate() + 1);
    }

    // Update notification schedule
    notification.schedule.scheduledFor = nextAvailableTime;
    await notification.save();

    // Reschedule
    await this.scheduleNotification(notification);

    logger.info('Notification rescheduled due to quiet hours', {
      notificationId: notification._id,
      userId: notification.userId,
      newScheduledTime: nextAvailableTime
    });
  }

  /**
   * Check if user has exceeded daily notification limit
   */
  private async hasExceededDailyLimit(notification: INotificationDocument): Promise<boolean> {
    const maxDaily = notification.deliveryPreferences.maxDailyNotifications || 10;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCount = await Notification.countDocuments({
      userId: notification.userId,
      sentAt: {
        $gte: today,
        $lt: tomorrow
      },
      status: { $in: [NotificationStatus.SENT, NotificationStatus.DELIVERED] }
    });

    return todayCount >= maxDaily;
  }

  /**
   * Schedule retry for failed notification
   */
  private async scheduleRetry(notification: INotificationDocument): Promise<void> {
    const retryPolicy = notification.schedule.retryPolicy!;
    const retryDelay = retryPolicy.retryInterval * Math.pow(retryPolicy.backoffMultiplier, notification.attempts - 1);
    
    const retryTime = new Date(Date.now() + retryDelay * 60 * 1000); // Convert minutes to milliseconds
    
    notification.schedule.scheduledFor = retryTime;
    await notification.save();

    await this.scheduleNotification(notification);

    logger.info('Notification retry scheduled', {
      notificationId: notification._id,
      userId: notification.userId,
      attempt: notification.attempts,
      retryTime: retryTime,
      retryDelay: retryDelay
    });
  }

  /**
   * Schedule recurring notification
   */
  private async scheduleRecurringNotification(notification: INotificationDocument): Promise<void> {
    const recurring = notification.schedule.recurring!;
    
    // Check if we've reached max occurrences
    if (recurring.maxOccurrences && notification.attempts >= recurring.maxOccurrences) {
      logger.info('Max occurrences reached for recurring notification', {
        notificationId: notification._id,
        userId: notification.userId,
        maxOccurrences: recurring.maxOccurrences
      });
      return;
    }

    // Check if we've reached end date
    if (recurring.endDate && new Date() >= recurring.endDate) {
      logger.info('End date reached for recurring notification', {
        notificationId: notification._id,
        userId: notification.userId,
        endDate: recurring.endDate
      });
      return;
    }

    // Calculate next occurrence
    const nextOccurrence = this.calculateNextOccurrence(notification.schedule.scheduledFor, recurring);
    
    // Create new notification for next occurrence
    const nextNotification = new Notification({
      userId: notification.userId,
      type: notification.type,
      priority: notification.priority,
      content: notification.content,
      deliveryPreferences: notification.deliveryPreferences,
      schedule: {
        ...notification.schedule,
        scheduledFor: nextOccurrence
      },
      templateId: notification.templateId,
      templateData: notification.templateData,
      metadata: {
        ...notification.metadata,
        parentNotificationId: notification._id,
        recurrenceCount: (notification.metadata?.['recurrenceCount'] || 0) + 1
      }
    });

    const savedNextNotification = await nextNotification.save();
    await this.scheduleNotification(savedNextNotification);

    logger.info('Recurring notification scheduled', {
      originalNotificationId: notification._id,
      nextNotificationId: savedNextNotification._id,
      userId: notification.userId,
      nextOccurrence: nextOccurrence
    });
  }

  /**
   * Calculate next occurrence for recurring notification
   */
  private calculateNextOccurrence(currentTime: Date, recurring: any): Date {
    const next = new Date(currentTime);
    
    switch (recurring.frequency) {
      case NotificationFrequency.DAILY:
        next.setDate(next.getDate() + (recurring.interval || 1));
        break;
      case NotificationFrequency.WEEKLY:
        next.setDate(next.getDate() + (recurring.interval || 1) * 7);
        break;
      case NotificationFrequency.MONTHLY:
        next.setMonth(next.getMonth() + (recurring.interval || 1));
        break;
      default:
        throw new Error(`Unsupported recurring frequency: ${recurring.frequency}`);
    }
    
    return next;
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(user: IUser): Promise<IUserNotificationSettings> {
    // This would typically fetch from a user preferences collection
    // For now, return default preferences based on user profile
    return {
      userId: user._id.toString(),
      globalPreferences: {
        channels: [DeliveryChannel.EMAIL, DeliveryChannel.IN_APP],
        frequency: NotificationFrequency.DAILY,
        quietHours: {
          start: '22:00',
          end: '08:00',
          timezone: user.preferences?.timeZone || 'UTC'
        },
        maxDailyNotifications: 10,
        enableBatching: false,
        batchingWindow: 30
      },
      typePreferences: {},
      unsubscribedTypes: [],
      isGloballyUnsubscribed: false,
      lastUpdated: new Date()
    };
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(type: NotificationType, preferences: IUserNotificationSettings): boolean {
    if (preferences.isGloballyUnsubscribed) {
      return false;
    }

    if (preferences.unsubscribedTypes.includes(type)) {
      return false;
    }

    return true;
  }

  /**
   * Get preferred delivery channels for notification type
   */
  private getPreferredChannels(type: NotificationType, preferences: IUserNotificationSettings): DeliveryChannel[] {
    const typePreferences = preferences.typePreferences[type];
    if (typePreferences && typePreferences.channels) {
      return typePreferences.channels;
    }

    return preferences.globalPreferences.channels;
  }

  /**
   * Add notification to history tracking
   */
  private async addToHistory(notification: INotificationDocument): Promise<void> {
    try {
      // Create history entry in database
      await NotificationHistory.createFromNotification(notification);
      
      // Also add to in-memory tracking for quick access
      const userId = notification.userId.toString();
      
      if (!this.notificationHistory.has(userId)) {
        this.notificationHistory.set(userId, []);
      }

      const userHistory = this.notificationHistory.get(userId)!;
      userHistory.push(notification);

      // Keep only last 100 notifications per user in memory
      if (userHistory.length > 100) {
        userHistory.shift();
      }
    } catch (error) {
      logger.error('Error adding notification to history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: notification._id,
        userId: notification.userId
      });
      // Don't throw error as this shouldn't block notification creation
    }
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(userId: string, limit: number = 50): Promise<INotificationDocument[]> {
    try {
      return await Notification.findByUser(userId, limit);
    } catch (error) {
      logger.error('Error fetching notification history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Get detailed notification history with engagement metrics
   */
  async getDetailedNotificationHistory(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<any[]> {
    try {
      return await NotificationHistory.findByUser(userId, limit, offset);
    } catch (error) {
      logger.error('Error fetching detailed notification history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Get notification engagement statistics
   */
  async getEngagementStatistics(
    userId?: string,
    type?: any,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      return await NotificationHistory.getEngagementStats(userId, type, startDate, endDate);
    } catch (error) {
      logger.error('Error fetching engagement statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        type
      });
      throw error;
    }
  }

  /**
   * Get notification trends
   */
  async getNotificationTrends(days: number = 30, userId?: string): Promise<any[]> {
    try {
      return await NotificationHistory.getNotificationTrends(days, userId);
    } catch (error) {
      logger.error('Error fetching notification trends', {
        error: error instanceof Error ? error.message : 'Unknown error',
        days,
        userId
      });
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      // Cancel scheduled timeout if exists
      const timeoutId = this.schedulingQueue.get(notificationId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.schedulingQueue.delete(notificationId);
      }

      // Update notification status
      const notification = await Notification.findById(notificationId);
      if (notification) {
        notification.status = NotificationStatus.CANCELLED;
        notification.isActive = false;
        await notification.save();

        logger.info('Notification cancelled', {
          notificationId,
          userId: notification.userId
        });
      }
    } catch (error) {
      logger.error('Error cancelling notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId
      });
      throw error;
    }
  }

  /**
   * Process pending notifications (for batch processing)
   */
  async processPendingNotifications(): Promise<void> {
    try {
      const pendingNotifications = await Notification.findPendingNotifications();
      
      logger.info('Processing pending notifications', {
        count: pendingNotifications.length
      });

      for (const notification of pendingNotifications) {
        try {
          await this.processNotification(notification);
        } catch (error) {
          logger.error('Error processing individual notification', {
            error: error instanceof Error ? error.message : 'Unknown error',
            notificationId: notification._id,
            userId: notification.userId
          });
        }
      }
    } catch (error) {
      logger.error('Error processing pending notifications', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Cleanup expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const count = await Notification.markExpiredNotifications();
      logger.info('Expired notifications cleaned up', { count });
      return count;
    } catch (error) {
      logger.error('Error cleaning up expired notifications', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(userId?: string, startDate?: Date, endDate?: Date): Promise<INotificationAnalytics> {
    try {
      const filter: any = {};
      
      if (userId) {
        filter.userId = userId;
      }
      
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = startDate;
        if (endDate) filter.createdAt.$lte = endDate;
      }

      const notifications = await Notification.find(filter);
      
      const analytics: INotificationAnalytics = {
        totalSent: 0,
        totalDelivered: 0,
        totalRead: 0,
        totalClicked: 0,
        totalFailed: 0,
        deliveryRate: 0,
        readRate: 0,
        clickRate: 0,
        failureRate: 0,
        averageDeliveryTime: 0,
        channelBreakdown: {} as any,
        typeBreakdown: {} as any
      };

      let totalDeliveryTime = 0;
      let deliveredCount = 0;

      for (const notification of notifications) {
        // Count by status
        switch (notification.status) {
          case NotificationStatus.SENT:
          case NotificationStatus.DELIVERED:
            analytics.totalSent++;
            if (notification.status === NotificationStatus.DELIVERED) {
              analytics.totalDelivered++;
              if (notification.sentAt && notification.deliveredAt) {
                totalDeliveryTime += notification.deliveredAt.getTime() - notification.sentAt.getTime();
                deliveredCount++;
              }
            }
            break;
          case NotificationStatus.FAILED:
            analytics.totalFailed++;
            break;
        }

        // Count reads and clicks
        if (notification.readAt) analytics.totalRead++;
        if (notification.clickedAt) analytics.totalClicked++;

        // Channel breakdown
        for (const result of notification.deliveryResults) {
          if (!analytics.channelBreakdown[result.channel]) {
            analytics.channelBreakdown[result.channel] = {
              sent: 0,
              delivered: 0,
              failed: 0,
              deliveryRate: 0
            };
          }

          const channelStats = analytics.channelBreakdown[result.channel];
          channelStats.sent++;
          
          if (result.status === NotificationStatus.DELIVERED) {
            channelStats.delivered++;
          } else if (result.status === NotificationStatus.FAILED) {
            channelStats.failed++;
          }
        }

        // Type breakdown
        if (!analytics.typeBreakdown[notification.type]) {
          analytics.typeBreakdown[notification.type] = {
            sent: 0,
            delivered: 0,
            read: 0,
            clicked: 0
          };
        }

        const typeStats = analytics.typeBreakdown[notification.type];
        typeStats.sent++;
        if (notification.status === NotificationStatus.DELIVERED) typeStats.delivered++;
        if (notification.readAt) typeStats.read++;
        if (notification.clickedAt) typeStats.clicked++;
      }

      // Calculate rates
      const totalNotifications = notifications.length;
      if (totalNotifications > 0) {
        analytics.deliveryRate = (analytics.totalDelivered / analytics.totalSent) * 100;
        analytics.readRate = (analytics.totalRead / analytics.totalDelivered) * 100;
        analytics.clickRate = (analytics.totalClicked / analytics.totalDelivered) * 100;
        analytics.failureRate = (analytics.totalFailed / totalNotifications) * 100;
      }

      // Calculate average delivery time
      if (deliveredCount > 0) {
        analytics.averageDeliveryTime = totalDeliveryTime / deliveredCount;
      }

      // Calculate channel delivery rates
      for (const channel in analytics.channelBreakdown) {
        const channelStats = analytics.channelBreakdown[channel as DeliveryChannel];
        if (channelStats.sent > 0) {
          channelStats.deliveryRate = (channelStats.delivered / channelStats.sent) * 100;
        }
      }

      return analytics;
    } catch (error) {
      logger.error('Error generating notification analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        startDate,
        endDate
      });
      throw error;
    }
  }
}

export default new NotificationService();