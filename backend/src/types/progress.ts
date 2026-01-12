import { Document, Types, Model } from 'mongoose';

// Activity types for progress tracking
export enum ActivityType {
  TASK_COMPLETED = 'task_completed',
  MODULE_STARTED = 'module_started',
  MODULE_COMPLETED = 'module_completed',
  WEEKLY_TARGET_COMPLETED = 'weekly_target_completed',
  RESOURCE_ACCESSED = 'resource_accessed',
  RESOURCE_COMPLETED = 'resource_completed',
  ASSESSMENT_TAKEN = 'assessment_taken',
  ASSESSMENT_PASSED = 'assessment_passed',
  SKILL_PRACTICED = 'skill_practiced',
  PROJECT_SUBMITTED = 'project_submitted',
  DISCUSSION_PARTICIPATED = 'discussion_participated',
  REFLECTION_COMPLETED = 'reflection_completed',
  IN_PROGRESS = 'in_progress'
}

// Milestone types for achievements
export enum MilestoneType {
  FIRST_ACTIVITY = 'first_activity',
  FIRST_WEEK_COMPLETED = 'first_week_completed',
  FIRST_MODULE_COMPLETED = 'first_module_completed',
  STREAK_MILESTONE = 'streak_milestone',
  HOURS_MILESTONE = 'hours_milestone',
  SKILLS_MILESTONE = 'skills_milestone',
  HALFWAY_POINT = 'halfway_point',
  ASSESSMENT_EXCELLENCE = 'assessment_excellence',
  CONSISTENCY_AWARD = 'consistency_award',
  SPEED_LEARNER = 'speed_learner',
  THOROUGH_LEARNER = 'thorough_learner',
  PATH_COMPLETED = 'path_completed'
}

// Analytics timeframe options
export enum AnalyticsTimeframe {
  LAST_WEEK = 'last_week',
  LAST_MONTH = 'last_month',
  LAST_3_MONTHS = 'last_3_months',
  LAST_6_MONTHS = 'last_6_months',
  LAST_YEAR = 'last_year',
  ALL_TIME = 'all_time'
}

// Individual activity record
export interface IActivityRecord {
  id: string;
  type: ActivityType;
  moduleId?: string;
  weeklyTargetId?: string;
  taskId?: string;
  resourceId?: string;
  title: string;
  description?: string;
  hoursSpent: number;
  completedAt: Date;
  skillsAcquired: string[];
  notes?: string;
  qualityScore?: number; // 1-10 scale for self-assessment
}

// Milestone achievement record
export interface IMilestoneAchievement {
  id: string;
  type: MilestoneType;
  title: string;
  description: string;
  achievedAt: Date;
  moduleId?: string;
  weekNumber?: number;
  points: number;
  badge?: string;
  celebrationMessage?: string;
}

// Streak tracking data
export interface IStreakData {
  currentStreak: number; // Current consecutive days with activity
  longestStreak: number; // Longest streak ever achieved
  lastActivityDate: Date;
  streakStartDate: Date;
  weeklyTargetStreak: number; // Consecutive weeks with targets met
  dailyActivityStreak: number; // Current daily activity streak
}

// Performance metrics
export interface IPerformanceMetrics {
  completionRate: number; // Percentage of started activities completed
  averageQualityScore?: number; // Average self-assessment score
  learningVelocity: number; // Skills acquired per hour
  timeEfficiency: number; // Actual vs estimated time percentage
  consistencyScore: number; // Regularity of learning activities
  engagementLevel: number; // Based on activity patterns and quality
  skillAcquisitionRate: number; // Skills acquired per week
}

// Learning analytics data
export interface ILearningAnalytics {
  totalHoursSpent: number;
  averageWeeklyHours: number;
  peakLearningHours: number; // Highest hours in a single week
  activeDays: number; // Total days with learning activity
  totalActivities: number;
  completedActivities: number;
  skillsAcquired: number; // Total unique skills acquired
  milestonesAchieved: number;
  weeklyTargetsCompleted: number;
  totalWeeklyTargets: number;
}

// Progress snapshot for historical tracking
export interface IProgressSnapshot {
  date: Date;
  overallProgress: number; // 0-100 percentage
  weeklyProgress: number; // 0-100 percentage for current week
  hoursThisWeek: number;
  activitiesCompleted: number;
  currentModule: string;
  currentWeek: number;
}

// Main progress document interface
export interface IProgress {
  id: string;
  userId: string;
  learningPathId: string;
  activities: IActivityRecord[];
  milestones: IMilestoneAchievement[];
  analytics: ILearningAnalytics;
  performance: IPerformanceMetrics;
  streaks: IStreakData;
  snapshots: IProgressSnapshot[];
  lastUpdated: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Current week progress data interface
export interface ICurrentWeekProgress {
  activitiesCompleted: number;
  hoursSpent: number;
  skillsAcquired: number;
}

// MongoDB document interface
export interface IProgressDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  learningPathId: Types.ObjectId;
  activities: IActivityRecord[];
  milestones: IMilestoneAchievement[];
  analytics: ILearningAnalytics;
  performance: IPerformanceMetrics;
  streaks: IStreakData;
  snapshots: IProgressSnapshot[];
  lastUpdated: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  currentWeekProgress: ICurrentWeekProgress;
  learningVelocityRate: number;

  // Instance methods
  recordActivity(activity: Omit<IActivityRecord, 'id' | 'completedAt'>): Promise<void>;
  achieveMilestone(milestone: Omit<IMilestoneAchievement, 'id' | 'achievedAt'>): Promise<void>;
  createSnapshot(overallProgress: number, weeklyProgress: number, currentModule: string, currentWeek: number): Promise<void>;
}

// Model interface for static methods
export interface IProgressModel extends Model<IProgressDocument> {
  findByUser(userId: string): Promise<IProgressDocument[]>;
  findByLearningPath(learningPathId: string): Promise<IProgressDocument[]>;
  getUserAnalytics(userId: string, timeframe?: AnalyticsTimeframe): Promise<IUserAnalytics | null>;
}

// API interfaces
export interface ICreateProgress {
  userId: string;
  learningPathId: string;
}

export interface IUpdateProgress {
  activities?: IActivityRecord[];
  milestones?: IMilestoneAchievement[];
  isActive?: boolean;
}

export interface IProgressResponse {
  success: boolean;
  data: {
    progress: IProgress;
    analytics?: IUserAnalytics;
    recommendations?: IProgressRecommendation[];
  };
  message?: string;
}

// User analytics interface
export interface IUserAnalytics {
  analytics: ILearningAnalytics;
  performance: IPerformanceMetrics;
  streaks: IStreakData;
  timeframeData: {
    activities: number;
    hoursSpent: number;
    milestones: number;
    skillsAcquired: number;
  };
}

// Progress recommendation interface
export interface IProgressRecommendation {
  type: RecommendationType;
  title: string;
  description: string;
  action: string;
  priority: RecommendationPriority;
  moduleId?: string;
  resourceId?: string;
  estimatedImpact: number; // 1-10 scale
}

export enum RecommendationType {
  INCREASE_CONSISTENCY = 'increase_consistency',
  FOCUS_ON_WEAK_AREAS = 'focus_on_weak_areas',
  CELEBRATE_ACHIEVEMENT = 'celebrate_achievement',
  ADJUST_PACE = 'adjust_pace',
  REVIEW_PREVIOUS_CONTENT = 'review_previous_content',
  TAKE_BREAK = 'take_break',
  SET_DAILY_GOAL = 'set_daily_goal',
  JOIN_STUDY_GROUP = 'join_study_group',
  PRACTICE_MORE = 'practice_more',
  SEEK_HELP = 'seek_help'
}

export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Dashboard data interface
export interface IDashboardData {
  userId: string;
  currentProgress: {
    overallProgress: number;
    currentModule: string;
    currentWeek: number;
    weeklyProgress: number;
    hoursThisWeek: number;
    targetHoursThisWeek: number;
  };
  recentActivities: IActivityRecord[];
  upcomingMilestones: IMilestoneAchievement[];
  streakInfo: IStreakData;
  weeklyStats: {
    week: number;
    hoursSpent: number;
    activitiesCompleted: number;
    skillsAcquired: number;
    targetsMet: boolean;
  }[];
  performanceTrends: {
    completionRate: number[];
    learningVelocity: number[];
    consistencyScore: number[];
    dates: Date[];
  };
  recommendations: IProgressRecommendation[];
}

// Peer comparison interface
export interface IPeerComparison {
  userId: string;
  userRank: number;
  totalUsers: number;
  percentile: number;
  metrics: {
    hoursSpent: {
      user: number;
      average: number;
      percentile: number;
    };
    completionRate: {
      user: number;
      average: number;
      percentile: number;
    };
    streakDays: {
      user: number;
      average: number;
      percentile: number;
    };
    skillsAcquired: {
      user: number;
      average: number;
      percentile: number;
    };
  };
  similarUsers: {
    userId: string;
    name: string;
    hoursSpent: number;
    completionRate: number;
    streakDays: number;
  }[];
}

// Activity submission interface
export interface IActivitySubmission {
  type: ActivityType;
  moduleId?: string;
  weeklyTargetId?: string;
  taskId?: string;
  resourceId?: string;
  title: string;
  description?: string;
  hoursSpent: number;
  skillsAcquired?: string[];
  notes?: string;
  qualityScore?: number;
}

// Milestone trigger interface
export interface IMilestoneTrigger {
  type: MilestoneType;
  condition: (progress: IProgressDocument) => boolean;
  title: string;
  description: string;
  points: number;
  badge?: string;
  celebrationMessage?: string;
}

// Progress query interface
export interface IProgressQuery {
  userId?: string;
  learningPathId?: string;
  isActive?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  activityType?: ActivityType;
  milestoneType?: MilestoneType;
  minHours?: number;
  maxHours?: number;
  sortBy?: ProgressSortBy;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export enum ProgressSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  LAST_ACTIVITY = 'lastUpdated',
  TOTAL_HOURS = 'analytics.totalHoursSpent',
  COMPLETION_RATE = 'performance.completionRate',
  STREAK = 'streaks.currentStreak',
  PROGRESS = 'analytics.overallProgress'
}

// Validation interfaces
export interface IProgressValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface IActivityValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  estimatedHours?: number;
  suggestedSkills?: string[];
}

// Export interfaces
export interface IProgressExport {
  user: {
    id: string;
    email: string;
    name: string;
  };
  learningPath: {
    id: string;
    title: string;
    domain: string;
  };
  progress: IProgress;
  analytics: IUserAnalytics;
  activities: IActivityRecord[];
  milestones: IMilestoneAchievement[];
  snapshots: IProgressSnapshot[];
  exportedAt: Date;
  timeframe: AnalyticsTimeframe;
}

// Notification trigger interface
export interface INotificationTrigger {
  type: NotificationTriggerType;
  condition: (progress: IProgressDocument) => boolean;
  message: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
}

export enum NotificationTriggerType {
  STREAK_BROKEN = 'streak_broken',
  MILESTONE_ACHIEVED = 'milestone_achieved',
  WEEKLY_TARGET_MISSED = 'weekly_target_missed',
  INACTIVITY_WARNING = 'inactivity_warning',
  PROGRESS_CELEBRATION = 'progress_celebration',
  CONSISTENCY_REMINDER = 'consistency_reminder',
  SKILL_MASTERY = 'skill_mastery'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}