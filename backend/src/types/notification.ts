import { Document, Types } from 'mongoose';

// Notification Types
export enum NotificationType {
  WEEKLY_TARGET_REMINDER = 'weekly_target_reminder',
  INACTIVITY_ALERT = 'inactivity_alert',
  MILESTONE_ACHIEVEMENT = 'milestone_achievement',
  WEEKLY_PROGRESS_SUMMARY = 'weekly_progress_summary',
  LEARNING_REMINDER = 'learning_reminder',
  JOB_RECOMMENDATION = 'job_recommendation',
  SYSTEM_UPDATE = 'system_update',
  MOTIVATIONAL_MESSAGE = 'motivational_message',
  STREAK_CELEBRATION = 'streak_celebration',
  COURSE_COMPLETION = 'course_completion'
}

// Notification Priority
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Notification Status
export enum NotificationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Delivery Channel
export enum DeliveryChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

// Notification Frequency
export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom'
}

// Trigger Condition
export enum TriggerCondition {
  TIME_BASED = 'time_based',
  EVENT_BASED = 'event_based',
  PROGRESS_BASED = 'progress_based',
  INACTIVITY_BASED = 'inactivity_based'
}

// Notification Template Data
export interface INotificationTemplate {
  id: string;
  type: NotificationType;
  title: string;
  bodyTemplate: string;
  emailTemplate?: string;
  smsTemplate?: string;
  pushTemplate?: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Delivery Preferences
export interface IDeliveryPreferences {
  channels: DeliveryChannel[];
  frequency: NotificationFrequency;
  quietHours?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
  };
  maxDailyNotifications?: number;
  enableBatching?: boolean;
  batchingWindow?: number; // minutes
}

// Notification Trigger
export interface INotificationTrigger {
  id: string;
  condition: TriggerCondition;
  parameters: Record<string, any>;
  isActive: boolean;
  lastTriggered?: Date;
  nextTrigger?: Date;
}

// Notification Scheduling
export interface INotificationSchedule {
  scheduledFor: Date;
  timezone: string;
  recurring?: {
    frequency: NotificationFrequency;
    interval: number;
    endDate?: Date;
    maxOccurrences?: number;
  };
  retryPolicy?: {
    maxRetries: number;
    retryInterval: number; // minutes
    backoffMultiplier: number;
  };
}

// Notification Content
export interface INotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
  actionUrl?: string;
  imageUrl?: string;
  sound?: string;
  badge?: number;
  category?: string;
  customData?: Record<string, any>;
}

// Notification Delivery Result
export interface IDeliveryResult {
  channel: DeliveryChannel;
  status: NotificationStatus;
  deliveredAt?: Date;
  failureReason?: string;
  externalId?: string;
  metadata?: Record<string, any>;
}

// Notification History Entry
export interface INotificationHistory {
  id: string;
  notificationId: string;
  userId: string;
  type: NotificationType;
  status: NotificationStatus;
  deliveryResults: IDeliveryResult[];
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  clickedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Main Notification Document
export interface INotificationDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  content: INotificationContent;
  deliveryPreferences: IDeliveryPreferences;
  schedule: INotificationSchedule;
  trigger?: INotificationTrigger;
  templateId?: string;
  templateData?: Record<string, any>;
  deliveryResults: IDeliveryResult[];
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  clickedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  markAsSent(deliveryResults: IDeliveryResult[]): Promise<void>;
  markAsDelivered(channel: DeliveryChannel, deliveredAt?: Date): Promise<void>;
  markAsRead(readAt?: Date): Promise<void>;
  markAsClicked(clickedAt?: Date): Promise<void>;
  markAsFailed(channel: DeliveryChannel, reason: string): Promise<void>;
  canRetry(): boolean;
  incrementAttempts(): Promise<void>;
  isExpired(): boolean;
  shouldSendNow(): boolean;
}

// Notification Model Interface
export interface INotificationModel {
  findPendingNotifications(): Promise<INotificationDocument[]>;
  findScheduledNotifications(date: Date): Promise<INotificationDocument[]>;
  findByUser(userId: string, limit?: number): Promise<INotificationDocument[]>;
  findByType(type: NotificationType, limit?: number): Promise<INotificationDocument[]>;
  createFromTemplate(templateId: string, userId: string, data: Record<string, any>): Promise<INotificationDocument>;
  markExpiredNotifications(): Promise<number>;
  cleanupOldNotifications(olderThanDays: number): Promise<number>;
}

// Notification Creation Interface
export interface ICreateNotification {
  userId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  content: INotificationContent;
  deliveryPreferences?: Partial<IDeliveryPreferences>;
  schedule?: Partial<INotificationSchedule>;
  templateId?: string;
  templateData?: Record<string, any>;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

// Notification Update Interface
export interface IUpdateNotification {
  content?: Partial<INotificationContent>;
  deliveryPreferences?: Partial<IDeliveryPreferences>;
  schedule?: Partial<INotificationSchedule>;
  priority?: NotificationPriority;
  status?: NotificationStatus;
  metadata?: Record<string, any>;
}

// Notification Filter Interface
export interface INotificationFilter {
  userId?: string;
  type?: NotificationType;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  createdAfter?: Date;
  createdBefore?: Date;
  scheduledAfter?: Date;
  scheduledBefore?: Date;
  isActive?: boolean;
}

// Notification Analytics Interface
export interface INotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalClicked: number;
  totalFailed: number;
  deliveryRate: number;
  readRate: number;
  clickRate: number;
  failureRate: number;
  averageDeliveryTime: number;
  channelBreakdown: Record<DeliveryChannel, {
    sent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
  }>;
  typeBreakdown: Record<NotificationType, {
    sent: number;
    delivered: number;
    read: number;
    clicked: number;
  }>;
}

// Notification Batch Interface
export interface INotificationBatch {
  id: string;
  userId: string;
  notifications: INotificationDocument[];
  batchedAt: Date;
  sentAt?: Date;
  status: NotificationStatus;
  deliveryChannel: DeliveryChannel;
  metadata?: Record<string, any>;
}

// Notification Queue Interface
export interface INotificationQueue {
  id: string;
  notification: INotificationDocument;
  priority: number;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  createdAt: Date;
  processedAt?: Date;
  failureReason?: string;
}

// Notification Service Configuration
export interface INotificationServiceConfig {
  email: {
    provider: 'sendgrid' | 'ses' | 'mailgun';
    apiKey: string;
    fromEmail: string;
    fromName: string;
    templates?: Record<string, string>;
  };
  sms: {
    provider: 'twilio' | 'sns';
    apiKey: string;
    fromNumber: string;
  };
  push: {
    fcm?: {
      serverKey: string;
      projectId: string;
    };
    apns?: {
      keyId: string;
      teamId: string;
      bundleId: string;
      privateKey: string;
    };
  };
  queue: {
    provider: 'redis' | 'memory';
    connectionString?: string;
    maxConcurrency: number;
    retryDelay: number;
  };
  rateLimiting: {
    maxNotificationsPerUser: number;
    timeWindow: number; // minutes
    maxGlobalNotifications: number;
  };
}

// Notification Event Interface
export interface INotificationEvent {
  type: 'sent' | 'delivered' | 'read' | 'clicked' | 'failed' | 'bounced' | 'unsubscribed';
  notificationId: string;
  userId: string;
  channel: DeliveryChannel;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// User Notification Settings Interface
export interface IUserNotificationSettings {
  userId: string;
  globalPreferences: IDeliveryPreferences;
  typePreferences: Partial<Record<NotificationType, IDeliveryPreferences>>;
  unsubscribedTypes: NotificationType[];
  isGloballyUnsubscribed: boolean;
  lastUpdated: Date;
}

// Notification Template Variables
export interface ITemplateVariables {
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  progress?: {
    overallProgress: number;
    currentModule: string;
    hoursThisWeek: number;
    streakDays: number;
  };
  milestone?: {
    title: string;
    description: string;
    points: number;
    badge?: string;
  };
  weeklyTarget?: {
    title: string;
    description: string;
    dueDate: Date;
    progress: number;
  };
  job?: {
    title: string;
    company: string;
    location: string;
    matchScore: number;
  };
  system?: {
    updateTitle: string;
    updateDescription: string;
    actionRequired: boolean;
  };
}