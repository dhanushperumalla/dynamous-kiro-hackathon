import mongoose, { Schema, Model } from 'mongoose';
import {
  INotificationDocument,
  INotificationModel,
  INotificationContent,
  IDeliveryPreferences,
  INotificationSchedule,
  INotificationTrigger,
  IDeliveryResult,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  DeliveryChannel,
  NotificationFrequency,
  TriggerCondition
} from '../types/notification';
import { logger } from '../utils/logger';

// Notification Content Schema
const notificationContentSchema = new Schema<INotificationContent>({
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  body: {
    type: String,
    required: [true, 'Notification body is required'],
    trim: true,
    maxlength: [1000, 'Body cannot exceed 1000 characters']
  },
  data: {
    type: Schema.Types.Mixed,
    default: {}
  },
  actionUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(value: string) {
        if (!value) return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Action URL must be a valid URL'
    }
  },
  imageUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(value: string) {
        if (!value) return true;
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Image URL must be a valid URL'
    }
  },
  sound: {
    type: String,
    trim: true,
    maxlength: [50, 'Sound name cannot exceed 50 characters']
  },
  badge: {
    type: Number,
    min: [0, 'Badge count cannot be negative']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  customData: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

// Delivery Preferences Schema
const deliveryPreferencesSchema = new Schema<IDeliveryPreferences>({
  channels: [{
    type: String,
    enum: {
      values: Object.values(DeliveryChannel),
      message: 'Invalid delivery channel'
    },
    required: true
  }],
  frequency: {
    type: String,
    enum: {
      values: Object.values(NotificationFrequency),
      message: 'Invalid notification frequency'
    },
    required: [true, 'Notification frequency is required']
  },
  quietHours: {
    start: {
      type: String,
      validate: {
        validator: function(value: string) {
          if (!value) return true;
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'Start time must be in HH:mm format'
      }
    },
    end: {
      type: String,
      validate: {
        validator: function(value: string) {
          if (!value) return true;
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value);
        },
        message: 'End time must be in HH:mm format'
      }
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  maxDailyNotifications: {
    type: Number,
    min: [1, 'Max daily notifications must be at least 1'],
    max: [100, 'Max daily notifications cannot exceed 100'],
    default: 10
  },
  enableBatching: {
    type: Boolean,
    default: false
  },
  batchingWindow: {
    type: Number,
    min: [5, 'Batching window must be at least 5 minutes'],
    max: [1440, 'Batching window cannot exceed 24 hours'],
    default: 30
  }
}, { _id: false });

// Notification Schedule Schema
const notificationScheduleSchema = new Schema<INotificationSchedule>({
  scheduledFor: {
    type: Date,
    required: [true, 'Scheduled time is required'],
    validate: {
      validator: function(value: Date) {
        return value > new Date();
      },
      message: 'Scheduled time must be in the future'
    }
  },
  timezone: {
    type: String,
    required: [true, 'Timezone is required'],
    default: 'UTC'
  },
  recurring: {
    frequency: {
      type: String,
      enum: {
        values: Object.values(NotificationFrequency),
        message: 'Invalid recurring frequency'
      }
    },
    interval: {
      type: Number,
      min: [1, 'Interval must be at least 1'],
      max: [365, 'Interval cannot exceed 365']
    },
    endDate: Date,
    maxOccurrences: {
      type: Number,
      min: [1, 'Max occurrences must be at least 1'],
      max: [1000, 'Max occurrences cannot exceed 1000']
    }
  },
  retryPolicy: {
    maxRetries: {
      type: Number,
      min: [0, 'Max retries cannot be negative'],
      max: [10, 'Max retries cannot exceed 10'],
      default: 3
    },
    retryInterval: {
      type: Number,
      min: [1, 'Retry interval must be at least 1 minute'],
      max: [1440, 'Retry interval cannot exceed 24 hours'],
      default: 15
    },
    backoffMultiplier: {
      type: Number,
      min: [1, 'Backoff multiplier must be at least 1'],
      max: [10, 'Backoff multiplier cannot exceed 10'],
      default: 2
    }
  }
}, { _id: false });

// Notification Trigger Schema
const notificationTriggerSchema = new Schema<INotificationTrigger>({
  id: {
    type: String,
    required: [true, 'Trigger ID is required'],
    trim: true
  },
  condition: {
    type: String,
    enum: {
      values: Object.values(TriggerCondition),
      message: 'Invalid trigger condition'
    },
    required: [true, 'Trigger condition is required']
  },
  parameters: {
    type: Schema.Types.Mixed,
    required: [true, 'Trigger parameters are required'],
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastTriggered: Date,
  nextTrigger: Date
}, { _id: false });

// Delivery Result Schema
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

// Main Notification Schema
const notificationSchema = new Schema<INotificationDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
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
  priority: {
    type: String,
    enum: {
      values: Object.values(NotificationPriority),
      message: 'Invalid notification priority'
    },
    required: [true, 'Notification priority is required'],
    default: NotificationPriority.MEDIUM
  },
  status: {
    type: String,
    enum: {
      values: Object.values(NotificationStatus),
      message: 'Invalid notification status'
    },
    required: [true, 'Notification status is required'],
    default: NotificationStatus.PENDING,
    index: true
  },
  content: {
    type: notificationContentSchema,
    required: [true, 'Notification content is required']
  },
  deliveryPreferences: {
    type: deliveryPreferencesSchema,
    required: [true, 'Delivery preferences are required']
  },
  schedule: {
    type: notificationScheduleSchema,
    required: [true, 'Notification schedule is required']
  },
  trigger: notificationTriggerSchema,
  templateId: {
    type: String,
    trim: true,
    maxlength: [100, 'Template ID cannot exceed 100 characters']
  },
  templateData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  deliveryResults: {
    type: [deliveryResultSchema],
    default: []
  },
  attempts: {
    type: Number,
    required: [true, 'Attempts count is required'],
    min: [0, 'Attempts cannot be negative'],
    default: 0
  },
  maxAttempts: {
    type: Number,
    required: [true, 'Max attempts is required'],
    min: [1, 'Max attempts must be at least 1'],
    max: [10, 'Max attempts cannot exceed 10'],
    default: 3
  },
  lastAttemptAt: Date,
  sentAt: Date,
  deliveredAt: Date,
  readAt: Date,
  clickedAt: Date,
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ status: 1, 'schedule.scheduledFor': 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: 1 });
notificationSchema.index({ 'schedule.scheduledFor': 1, isActive: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for delivery rate
notificationSchema.virtual('deliveryRate').get(function(this: INotificationDocument) {
  if (this.deliveryResults.length === 0) return 0;
  const delivered = this.deliveryResults.filter(result => 
    result.status === NotificationStatus.DELIVERED
  ).length;
  return (delivered / this.deliveryResults.length) * 100;
});

// Virtual for is read
notificationSchema.virtual('isRead').get(function(this: INotificationDocument) {
  return !!this.readAt;
});

// Virtual for is clicked
notificationSchema.virtual('isClicked').get(function(this: INotificationDocument) {
  return !!this.clickedAt;
});

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  try {
    // Set expiration if not set
    if (!this.expiresAt) {
      const defaultExpirationDays = 30;
      this.expiresAt = new Date(Date.now() + defaultExpirationDays * 24 * 60 * 60 * 1000);
    }

    // Update status based on delivery results
    if (this.deliveryResults.length > 0) {
      const hasDelivered = this.deliveryResults.some(result => 
        result.status === NotificationStatus.DELIVERED
      );
      const hasFailures = this.deliveryResults.some(result => 
        result.status === NotificationStatus.FAILED
      );
      
      if (hasDelivered && !this.deliveredAt) {
        this.deliveredAt = new Date();
        if (this.status === NotificationStatus.SENT) {
          this.status = NotificationStatus.DELIVERED;
        }
      } else if (hasFailures && !hasDelivered && this.attempts >= this.maxAttempts) {
        this.status = NotificationStatus.FAILED;
      }
    }

    logger.debug('Notification pre-save processing completed', {
      notificationId: this._id,
      userId: this.userId,
      type: this.type,
      status: this.status
    });

    next();
  } catch (error) {
    logger.error('Error in notification pre-save middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      notificationId: this._id,
      userId: this.userId
    });
    next(error as Error);
  }
});

// Instance method to mark as sent
notificationSchema.methods['markAsSent'] = async function(
  this: INotificationDocument,
  deliveryResults: IDeliveryResult[]
): Promise<void> {
  try {
    this.status = NotificationStatus.SENT;
    this.sentAt = new Date();
    this.deliveryResults = deliveryResults;
    this.lastAttemptAt = new Date();
    
    await (this as any).save();
    
    logger.info('Notification marked as sent', {
      notificationId: this._id,
      userId: this.userId,
      type: this.type,
      channels: deliveryResults.map(r => r.channel)
    });
  } catch (error) {
    logger.error('Error marking notification as sent', {
      error: error instanceof Error ? error.message : 'Unknown error',
      notificationId: this._id,
      userId: this.userId
    });
    throw error;
  }
};

// Instance method to mark as delivered
notificationSchema.methods['markAsDelivered'] = async function(
  this: INotificationDocument,
  channel: DeliveryChannel,
  deliveredAt: Date = new Date()
): Promise<void> {
  try {
    // Update the specific delivery result
    const deliveryResult = this.deliveryResults.find(result => result.channel === channel);
    if (deliveryResult) {
      deliveryResult.status = NotificationStatus.DELIVERED;
      deliveryResult.deliveredAt = deliveredAt;
    }
    
    // Update overall status if any channel delivered successfully
    if (!this.deliveredAt) {
      this.deliveredAt = deliveredAt;
      this.status = NotificationStatus.DELIVERED;
    }
    
    await (this as any).save();
    
    logger.info('Notification marked as delivered', {
      notificationId: this._id,
      userId: this.userId,
      channel,
      deliveredAt
    });
  } catch (error) {
    logger.error('Error marking notification as delivered', {
      error: error instanceof Error ? error.message : 'Unknown error',
      notificationId: this._id,
      userId: this.userId,
      channel
    });
    throw error;
  }
};

// Instance method to mark as read
notificationSchema.methods['markAsRead'] = async function(
  this: INotificationDocument,
  readAt: Date = new Date()
): Promise<void> {
  try {
    this.readAt = readAt;
    await (this as any).save();
    
    logger.info('Notification marked as read', {
      notificationId: this._id,
      userId: this.userId,
      readAt
    });
  } catch (error) {
    logger.error('Error marking notification as read', {
      error: error instanceof Error ? error.message : 'Unknown error',
      notificationId: this._id,
      userId: this.userId
    });
    throw error;
  }
};

// Instance method to mark as clicked
notificationSchema.methods['markAsClicked'] = async function(
  this: INotificationDocument,
  clickedAt: Date = new Date()
): Promise<void> {
  try {
    this.clickedAt = clickedAt;
    await (this as any).save();
    
    logger.info('Notification marked as clicked', {
      notificationId: this._id,
      userId: this.userId,
      clickedAt
    });
  } catch (error) {
    logger.error('Error marking notification as clicked', {
      error: error instanceof Error ? error.message : 'Unknown error',
      notificationId: this._id,
      userId: this.userId
    });
    throw error;
  }
};

// Instance method to mark as failed
notificationSchema.methods['markAsFailed'] = async function(
  this: INotificationDocument,
  channel: DeliveryChannel,
  reason: string
): Promise<void> {
  try {
    // Update the specific delivery result
    const deliveryResult = this.deliveryResults.find(result => result.channel === channel);
    if (deliveryResult) {
      deliveryResult.status = NotificationStatus.FAILED;
      deliveryResult.failureReason = reason;
    }
    
    // Check if all channels failed
    const allFailed = this.deliveryResults.every(result => 
      result.status === NotificationStatus.FAILED
    );
    
    if (allFailed && this.attempts >= this.maxAttempts) {
      this.status = NotificationStatus.FAILED;
    }
    
    await (this as any).save();
    
    logger.warn('Notification marked as failed', {
      notificationId: this._id,
      userId: this.userId,
      channel,
      reason,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts
    });
  } catch (error) {
    logger.error('Error marking notification as failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      notificationId: this._id,
      userId: this.userId,
      channel
    });
    throw error;
  }
};

// Instance method to check if can retry
notificationSchema.methods['canRetry'] = function(this: INotificationDocument): boolean {
  return this.attempts < this.maxAttempts && 
         this.status !== NotificationStatus.DELIVERED &&
         this.status !== NotificationStatus.CANCELLED &&
         !this.isExpired();
};

// Instance method to increment attempts
notificationSchema.methods['incrementAttempts'] = async function(this: INotificationDocument): Promise<void> {
  try {
    this.attempts += 1;
    this.lastAttemptAt = new Date();
    await (this as any).save();
    
    logger.debug('Notification attempts incremented', {
      notificationId: this._id,
      userId: this.userId,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts
    });
  } catch (error) {
    logger.error('Error incrementing notification attempts', {
      error: error instanceof Error ? error.message : 'Unknown error',
      notificationId: this._id,
      userId: this.userId
    });
    throw error;
  }
};

// Instance method to check if expired
notificationSchema.methods['isExpired'] = function(this: INotificationDocument): boolean {
  return !!(this.expiresAt && this.expiresAt < new Date());
};

// Instance method to check if should send now
notificationSchema.methods['shouldSendNow'] = function(this: INotificationDocument): boolean {
  const now = new Date();
  return this.schedule.scheduledFor <= now && 
         this.status === NotificationStatus.PENDING &&
         this.isActive &&
         !this.isExpired();
};

// Static method to find pending notifications
notificationSchema.statics['findPendingNotifications'] = function() {
  return this.find({
    status: NotificationStatus.PENDING,
    isActive: true,
    'schedule.scheduledFor': { $lte: new Date() },
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ priority: -1, 'schedule.scheduledFor': 1 });
};

// Static method to find scheduled notifications
notificationSchema.statics['findScheduledNotifications'] = function(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    'schedule.scheduledFor': {
      $gte: startOfDay,
      $lte: endOfDay
    },
    isActive: true,
    status: { $in: [NotificationStatus.PENDING, NotificationStatus.SCHEDULED] }
  }).sort({ 'schedule.scheduledFor': 1 });
};

// Static method to find by user
notificationSchema.statics['findByUser'] = function(userId: string, limit: number = 50) {
  return this.find({ userId, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find by type
notificationSchema.statics['findByType'] = function(type: NotificationType, limit: number = 100) {
  return this.find({ type, isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to create from template
notificationSchema.statics['createFromTemplate'] = async function(
  templateId: string,
  userId: string,
  data: Record<string, any>
): Promise<INotificationDocument> {
  // This would integrate with a template service
  // For now, create a basic notification
  const notification = new this({
    userId,
    templateId,
    templateData: data,
    type: data.type || NotificationType.SYSTEM_UPDATE,
    priority: data.priority || NotificationPriority.MEDIUM,
    content: {
      title: data.title || 'Notification',
      body: data.body || 'You have a new notification'
    },
    deliveryPreferences: {
      channels: data.channels || [DeliveryChannel.EMAIL],
      frequency: NotificationFrequency.IMMEDIATE
    },
    schedule: {
      scheduledFor: data.scheduledFor || new Date(),
      timezone: data.timezone || 'UTC'
    }
  });
  
  return await notification.save();
};

// Static method to mark expired notifications
notificationSchema.statics['markExpiredNotifications'] = async function(): Promise<number> {
  const result = await this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: { $nin: [NotificationStatus.DELIVERED, NotificationStatus.CANCELLED] }
    },
    {
      $set: { 
        status: NotificationStatus.CANCELLED,
        isActive: false
      }
    }
  );
  
  logger.info('Expired notifications marked as cancelled', {
    count: result.modifiedCount
  });
  
  return result.modifiedCount;
};

// Static method to cleanup old notifications
notificationSchema.statics['cleanupOldNotifications'] = async function(olderThanDays: number): Promise<number> {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: [NotificationStatus.DELIVERED, NotificationStatus.FAILED, NotificationStatus.CANCELLED] }
  });
  
  logger.info('Old notifications cleaned up', {
    count: result.deletedCount,
    olderThanDays,
    cutoffDate
  });
  
  return result.deletedCount;
};

// Create and export the model
const Notification: Model<INotificationDocument> & INotificationModel = 
  mongoose.model<INotificationDocument, INotificationModel>('Notification', notificationSchema);

export default Notification;