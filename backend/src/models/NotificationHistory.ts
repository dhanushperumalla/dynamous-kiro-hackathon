import mongoose, { Schema, Model } from 'mongoose';
import {
  INotificationHistory,
  IDeliveryResult,
  NotificationType,
  NotificationStatus,
  DeliveryChannel
} from '../types/notification';
import { logger } from '../utils/logger';

// Delivery Result Schema (reused from Notification model)
const deliveryResultSchema = new Schema<IDeliveryResult>({
  channel: {
    type: String,
    enum: {
      values: Object.values(DeliveryChannel),
      message: 'Invalid delivery channel'
    },
    required: [true, 'Delivery channel is required']
  },
  status: {
    type: String,
    enum: {
      values: Object.values(NotificationStatus),
      message: 'Invalid delivery status'
    },
    required: [true, 'Delivery status is required']
  },
  deliveredAt: Date,
  failureReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Failure reason cannot exceed 500 characters']
  },
  externalId: {
    type: String,
    trim: true,
    maxlength: [100, 'External ID cannot exceed 100 characters']
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

// Notification History Schema
const notificationHistorySchema = new Schema<INotificationHistory>({
  id: {
    type: String,
    required: [true, 'History ID is required'],
    unique: true,
    index: true
  },
  notificationId: {
    type: String,
    required: [true, 'Notification ID is required'],
    index: true
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
  },
  type: {
    type: String,
    enum: {
      values: Object.values(NotificationType),
      message: 'Invalid notification type'
    },
    required: [true, 'Notification type is required'],
    index: true
  },
  status: {
    type: String,
    enum: {
      values: Object.values(NotificationStatus),
      message: 'Invalid notification status'
    },
    required: [true, 'Notification status is required'],
    index: true
  },
  deliveryResults: {
    type: [deliveryResultSchema],
    default: []
  },
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  clickedAt: Date,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    required: [true, 'Created date is required'],
    default: Date.now,
    index: true
  }
}, {
  timestamps: false, // We manage createdAt manually
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
notificationHistorySchema.index({ userId: 1, type: 1 });
notificationHistorySchema.index({ userId: 1, createdAt: -1 });
notificationHistorySchema.index({ notificationId: 1, createdAt: -1 });
notificationHistorySchema.index({ type: 1, status: 1, createdAt: -1 });
notificationHistorySchema.index({ createdAt: -1 }); // For cleanup operations

// Virtual for delivery success rate
notificationHistorySchema.virtual('deliverySuccessRate').get(function(this: INotificationHistory) {
  if (this.deliveryResults.length === 0) return 0;
  const successful = this.deliveryResults.filter(result => 
    result.status === NotificationStatus.DELIVERED
  ).length;
  return (successful / this.deliveryResults.length) * 100;
});

// Virtual for engagement metrics
notificationHistorySchema.virtual('engagementMetrics').get(function(this: INotificationHistory) {
  return {
    wasDelivered: !!this.deliveredAt,
    wasRead: !!this.readAt,
    wasClicked: !!this.clickedAt,
    timeToRead: this.readAt && this.deliveredAt ? 
      this.readAt.getTime() - this.deliveredAt.getTime() : null,
    timeToClick: this.clickedAt && this.deliveredAt ? 
      this.clickedAt.getTime() - this.deliveredAt.getTime() : null
  };
});

// Static method to create history entry from notification
notificationHistorySchema.statics['createFromNotification'] = async function(
  notification: any
): Promise<INotificationHistory> {
  try {
    const historyEntry = new this({
      id: `hist_${notification._id}_${Date.now()}`,
      notificationId: notification._id.toString(),
      userId: notification.userId,
      type: notification.type,
      status: notification.status,
      deliveryResults: notification.deliveryResults || [],
      sentAt: notification.sentAt,
      deliveredAt: notification.deliveredAt,
      readAt: notification.readAt,
      clickedAt: notification.clickedAt,
      metadata: {
        ...notification.metadata,
        originalPriority: notification.priority,
        originalScheduledFor: notification.schedule?.scheduledFor,
        attempts: notification.attempts
      },
      createdAt: new Date()
    });

    const savedEntry = await historyEntry.save() as INotificationHistory;
    
    logger.debug('Notification history entry created', {
      historyId: savedEntry.id,
      notificationId: notification._id,
      userId: notification.userId,
      type: notification.type,
      status: notification.status
    });

    return savedEntry;
  } catch (error) {
    logger.error('Error creating notification history entry', {
      error: error instanceof Error ? error.message : 'Unknown error',
      notificationId: notification._id,
      userId: notification.userId
    });
    throw error;
  }
};

// Static method to find history by user
notificationHistorySchema.statics['findByUser'] = function(
  userId: string, 
  limit: number = 50,
  offset: number = 0
) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

// Static method to find history by notification type
notificationHistorySchema.statics['findByType'] = function(
  type: NotificationType,
  limit: number = 100,
  offset: number = 0
) {
  return this.find({ type })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset);
};

// Static method to find history by date range
notificationHistorySchema.statics['findByDateRange'] = function(
  startDate: Date,
  endDate: Date,
  userId?: string
) {
  const query: any = {
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  };

  if (userId) {
    query.userId = userId;
  }

  return this.find(query).sort({ createdAt: -1 });
};

// Static method to get engagement statistics
notificationHistorySchema.statics['getEngagementStats'] = async function(
  userId?: string,
  type?: NotificationType,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const matchStage: any = {};
    
    if (userId) matchStage.userId = new mongoose.Types.ObjectId(userId);
    if (type) matchStage.type = type;
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = startDate;
      if (endDate) matchStage.createdAt.$lte = endDate;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [{ $ne: ['$deliveredAt', null] }, 1, 0]
            }
          },
          read: {
            $sum: {
              $cond: [{ $ne: ['$readAt', null] }, 1, 0]
            }
          },
          clicked: {
            $sum: {
              $cond: [{ $ne: ['$clickedAt', null] }, 1, 0]
            }
          },
          avgTimeToRead: {
            $avg: {
              $cond: [
                { $and: [{ $ne: ['$readAt', null] }, { $ne: ['$deliveredAt', null] }] },
                { $subtract: ['$readAt', '$deliveredAt'] },
                null
              ]
            }
          },
          avgTimeToClick: {
            $avg: {
              $cond: [
                { $and: [{ $ne: ['$clickedAt', null] }, { $ne: ['$deliveredAt', null] }] },
                { $subtract: ['$clickedAt', '$deliveredAt'] },
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalNotifications: 1,
          delivered: 1,
          read: 1,
          clicked: 1,
          deliveryRate: {
            $cond: [
              { $gt: ['$totalNotifications', 0] },
              { $multiply: [{ $divide: ['$delivered', '$totalNotifications'] }, 100] },
              0
            ]
          },
          readRate: {
            $cond: [
              { $gt: ['$delivered', 0] },
              { $multiply: [{ $divide: ['$read', '$delivered'] }, 100] },
              0
            ]
          },
          clickRate: {
            $cond: [
              { $gt: ['$delivered', 0] },
              { $multiply: [{ $divide: ['$clicked', '$delivered'] }, 100] },
              0
            ]
          },
          avgTimeToReadMinutes: {
            $cond: [
              { $ne: ['$avgTimeToRead', null] },
              { $divide: ['$avgTimeToRead', 60000] }, // Convert ms to minutes
              null
            ]
          },
          avgTimeToClickMinutes: {
            $cond: [
              { $ne: ['$avgTimeToClick', null] },
              { $divide: ['$avgTimeToClick', 60000] }, // Convert ms to minutes
              null
            ]
          }
        }
      }
    ];

    const result = await this.aggregate(pipeline);
    return result[0] || {
      totalNotifications: 0,
      delivered: 0,
      read: 0,
      clicked: 0,
      deliveryRate: 0,
      readRate: 0,
      clickRate: 0,
      avgTimeToReadMinutes: null,
      avgTimeToClickMinutes: null
    };
  } catch (error) {
    logger.error('Error getting engagement statistics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      type,
      startDate,
      endDate
    });
    throw error;
  }
};

// Static method to cleanup old history entries
notificationHistorySchema.statics['cleanupOldEntries'] = async function(
  olderThanDays: number
): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    const result = await this.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    logger.info('Old notification history entries cleaned up', {
      count: result.deletedCount,
      olderThanDays,
      cutoffDate
    });

    return result.deletedCount;
  } catch (error) {
    logger.error('Error cleaning up old notification history entries', {
      error: error instanceof Error ? error.message : 'Unknown error',
      olderThanDays
    });
    throw error;
  }
};

// Static method to get notification trends
notificationHistorySchema.statics['getNotificationTrends'] = async function(
  days: number = 30,
  userId?: string
) {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const matchStage: any = {
      createdAt: { $gte: startDate }
    };
    
    if (userId) {
      matchStage.userId = new mongoose.Types.ObjectId(userId);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type'
          },
          count: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [{ $ne: ['$deliveredAt', null] }, 1, 0]
            }
          },
          read: {
            $sum: {
              $cond: [{ $ne: ['$readAt', null] }, 1, 0]
            }
          },
          clicked: {
            $sum: {
              $cond: [{ $ne: ['$clickedAt', null] }, 1, 0]
            }
          }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          types: {
            $push: {
              type: '$_id.type',
              count: '$count',
              delivered: '$delivered',
              read: '$read',
              clicked: '$clicked'
            }
          },
          totalCount: { $sum: '$count' },
          totalDelivered: { $sum: '$delivered' },
          totalRead: { $sum: '$read' },
          totalClicked: { $sum: '$clicked' }
        }
      },
      { $sort: { _id: 1 as 1 } }
    ];

    const trends = await this.aggregate(pipeline);
    
    return trends.map((trend: any) => ({
      date: trend._id,
      total: trend.totalCount,
      delivered: trend.totalDelivered,
      read: trend.totalRead,
      clicked: trend.totalClicked,
      deliveryRate: trend.totalCount > 0 ? (trend.totalDelivered / trend.totalCount) * 100 : 0,
      readRate: trend.totalDelivered > 0 ? (trend.totalRead / trend.totalDelivered) * 100 : 0,
      clickRate: trend.totalDelivered > 0 ? (trend.totalClicked / trend.totalDelivered) * 100 : 0,
      byType: trend.types
    }));
  } catch (error) {
    logger.error('Error getting notification trends', {
      error: error instanceof Error ? error.message : 'Unknown error',
      days,
      userId
    });
    throw error;
  }
};

// Create and export the model with proper static methods interface
interface INotificationHistoryModel extends Model<INotificationHistory> {
  createFromNotification(notification: any): Promise<INotificationHistory>;
  findByUser(userId: string, limit?: number, offset?: number): Promise<INotificationHistory[]>;
  findByType(type: NotificationType, limit?: number, offset?: number): Promise<INotificationHistory[]>;
  findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<INotificationHistory[]>;
  getEngagementStats(userId?: string, type?: NotificationType, startDate?: Date, endDate?: Date): Promise<any>;
  cleanupOldEntries(olderThanDays: number): Promise<number>;
  getNotificationTrends(days?: number, userId?: string): Promise<any[]>;
}

const NotificationHistory: INotificationHistoryModel = 
  mongoose.model<INotificationHistory, INotificationHistoryModel>('NotificationHistory', notificationHistorySchema);

export default NotificationHistory;