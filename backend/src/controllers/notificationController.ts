import { Request, Response } from 'express';
import NotificationService from '../services/notificationService';
import NotificationScheduler from '../services/notificationScheduler';
import {
  NotificationType,
  NotificationPriority,
  DeliveryChannel,
  NotificationFrequency
} from '../types/notification';
import { logger } from '../utils/logger';

export class NotificationController {
  /**
   * Create a new notification
   */
  async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        type,
        priority,
        content,
        deliveryPreferences,
        schedule,
        templateData
      } = req.body;

      // Validate required fields
      if (!userId || !type || !content) {
        res.status(400).json({
          error: 'Missing required fields: userId, type, and content are required'
        });
        return;
      }

      const notification = await NotificationService.createNotification({
        userId,
        type,
        priority: priority || NotificationPriority.MEDIUM,
        content,
        deliveryPreferences: deliveryPreferences || {
          channels: [DeliveryChannel.EMAIL, DeliveryChannel.IN_APP],
          frequency: NotificationFrequency.IMMEDIATE
        },
        schedule,
        templateData
      });

      res.status(201).json({
        success: true,
        data: {
          notificationId: notification._id,
          status: notification.status,
          scheduledFor: notification.schedule.scheduledFor
        }
      });
    } catch (error) {
      logger.error('Error creating notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      res.status(500).json({
        error: 'Failed to create notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create notification from template
   */
  async createFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { userId, type, templateData } = req.body;

      if (!userId || !type) {
        res.status(400).json({
          error: 'Missing required fields: userId and type are required'
        });
        return;
      }

      const notification = await NotificationScheduler.createNotificationFromTemplate(
        userId,
        type,
        templateData || {}
      );

      res.status(201).json({
        success: true,
        data: {
          notificationId: notification._id,
          status: notification.status,
          scheduledFor: notification.schedule.scheduledFor
        }
      });
    } catch (error) {
      logger.error('Error creating notification from template', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });

      res.status(500).json({
        error: 'Failed to create notification from template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user notification history
   */
  async getNotificationHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params['userId'];
      const { limit = 50, detailed = false } = req.query;

      if (!userId) {
        res.status(400).json({
          error: 'User ID is required'
        });
        return;
      }

      let history;
      if (detailed === 'true') {
        history = await NotificationService.getDetailedNotificationHistory(
          userId,
          parseInt(limit as string, 10)
        );
      } else {
        history = await NotificationService.getNotificationHistory(
          userId,
          parseInt(limit as string, 10)
        );
      }

      res.json({
        success: true,
        data: {
          history,
          count: history.length
        }
      });
    } catch (error) {
      logger.error('Error fetching notification history', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.params['userId']
      });

      res.status(500).json({
        error: 'Failed to fetch notification history',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get notification analytics
   */
  async getNotificationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { userId, startDate, endDate } = req.query;

      const analytics = await NotificationService.getNotificationAnalytics(
        userId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error fetching notification analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query
      });

      res.status(500).json({
        error: 'Failed to fetch notification analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get engagement statistics
   */
  async getEngagementStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { userId, type, startDate, endDate } = req.query;

      const stats = await NotificationService.getEngagementStatistics(
        userId as string,
        type as NotificationType,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching engagement statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query
      });

      res.status(500).json({
        error: 'Failed to fetch engagement statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get notification trends
   */
  async getNotificationTrends(req: Request, res: Response): Promise<void> {
    try {
      const { userId, days = 30 } = req.query;

      const trends = await NotificationService.getNotificationTrends(
        parseInt(days as string, 10),
        userId as string
      );

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      logger.error('Error fetching notification trends', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: req.query
      });

      res.status(500).json({
        error: 'Failed to fetch notification trends',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cancel a notification
   */
  async cancelNotification(req: Request, res: Response): Promise<void> {
    try {
      const notificationId = req.params['notificationId'];

      if (!notificationId) {
        res.status(400).json({
          error: 'Notification ID is required'
        });
        return;
      }

      await NotificationService.cancelNotification(notificationId);

      res.json({
        success: true,
        message: 'Notification cancelled successfully'
      });
    } catch (error) {
      logger.error('Error cancelling notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        notificationId: req.params['notificationId']
      });

      res.status(500).json({
        error: 'Failed to cancel notification',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get scheduler status
   */
  async getSchedulerStatus(_req: Request, res: Response): Promise<void> {
    try {
      const status = NotificationScheduler.getSchedulerStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Error fetching scheduler status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to fetch scheduler status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process pending notifications manually
   */
  async processPendingNotifications(_req: Request, res: Response): Promise<void> {
    try {
      await NotificationService.processPendingNotifications();

      res.json({
        success: true,
        message: 'Pending notifications processed successfully'
      });
    } catch (error) {
      logger.error('Error processing pending notifications', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to process pending notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cleanup expired notifications
   */
  async cleanupExpiredNotifications(_req: Request, res: Response): Promise<void> {
    try {
      const count = await NotificationService.cleanupExpiredNotifications();

      res.json({
        success: true,
        data: {
          cleanedCount: count
        },
        message: `${count} expired notifications cleaned up`
      });
    } catch (error) {
      logger.error('Error cleaning up expired notifications', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        error: 'Failed to cleanup expired notifications',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new NotificationController();