import mongoose, { Schema } from 'mongoose';
import { 
  IProgressDocument,
  IProgressModel,
  IActivityRecord,
  IProgressSnapshot,
  IMilestoneAchievement,
  ILearningAnalytics,
  IPerformanceMetrics,
  IStreakData,
  ActivityType,
  MilestoneType,
  AnalyticsTimeframe
} from '../types/progress';
import { logger } from '../utils/logger';

// Activity Record Schema
const activityRecordSchema = new Schema<IActivityRecord>({
  id: {
    type: String,
    required: [true, 'Activity ID is required'],
    trim: true
  },
  type: {
    type: String,
    enum: {
      values: Object.values(ActivityType),
      message: 'Invalid activity type'
    },
    required: [true, 'Activity type is required']
  },
  moduleId: {
    type: String,
    trim: true
  },
  weeklyTargetId: {
    type: String,
    trim: true
  },
  taskId: {
    type: String,
    trim: true
  },
  resourceId: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Activity title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  hoursSpent: {
    type: Number,
    required: [true, 'Hours spent is required'],
    min: [0, 'Hours spent cannot be negative'],
    max: [24, 'Hours spent cannot exceed 24 hours per activity']
  },
  completedAt: {
    type: Date,
    required: [true, 'Completion date is required'],
    default: Date.now
  },
  skillsAcquired: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  qualityScore: {
    type: Number,
    min: [1, 'Quality score must be at least 1'],
    max: [10, 'Quality score cannot exceed 10']
  }
}, { _id: false });

// Milestone Achievement Schema
const milestoneAchievementSchema = new Schema<IMilestoneAchievement>({
  id: {
    type: String,
    required: [true, 'Milestone ID is required'],
    trim: true
  },
  type: {
    type: String,
    enum: {
      values: Object.values(MilestoneType),
      message: 'Invalid milestone type'
    },
    required: [true, 'Milestone type is required']
  },
  title: {
    type: String,
    required: [true, 'Milestone title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Milestone description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  achievedAt: {
    type: Date,
    required: [true, 'Achievement date is required'],
    default: Date.now
  },
  moduleId: {
    type: String,
    trim: true
  },
  weekNumber: {
    type: Number,
    min: [1, 'Week number must be at least 1']
  },
  points: {
    type: Number,
    required: [true, 'Points are required'],
    min: [0, 'Points cannot be negative'],
    default: 0
  },
  badge: {
    type: String,
    trim: true
  },
  celebrationMessage: {
    type: String,
    trim: true,
    maxlength: [300, 'Celebration message cannot exceed 300 characters']
  }
}, { _id: false });

// Streak Data Schema
const streakDataSchema = new Schema<IStreakData>({
  currentStreak: {
    type: Number,
    required: [true, 'Current streak is required'],
    min: [0, 'Current streak cannot be negative'],
    default: 0
  },
  longestStreak: {
    type: Number,
    required: [true, 'Longest streak is required'],
    min: [0, 'Longest streak cannot be negative'],
    default: 0
  },
  lastActivityDate: {
    type: Date,
    required: [true, 'Last activity date is required'],
    default: Date.now
  },
  streakStartDate: {
    type: Date,
    default: Date.now
  },
  weeklyTargetStreak: {
    type: Number,
    required: [true, 'Weekly target streak is required'],
    min: [0, 'Weekly target streak cannot be negative'],
    default: 0
  },
  dailyActivityStreak: {
    type: Number,
    required: [true, 'Daily activity streak is required'],
    min: [0, 'Daily activity streak cannot be negative'],
    default: 0
  }
}, { _id: false });

// Performance Metrics Schema
const performanceMetricsSchema = new Schema<IPerformanceMetrics>({
  completionRate: {
    type: Number,
    required: [true, 'Completion rate is required'],
    min: [0, 'Completion rate cannot be negative'],
    max: [100, 'Completion rate cannot exceed 100'],
    default: 0
  },
  averageQualityScore: {
    type: Number,
    min: [1, 'Average quality score must be at least 1'],
    max: [10, 'Average quality score cannot exceed 10']
  },
  learningVelocity: {
    type: Number,
    required: [true, 'Learning velocity is required'],
    min: [0, 'Learning velocity cannot be negative'],
    default: 0
  },
  timeEfficiency: {
    type: Number,
    required: [true, 'Time efficiency is required'],
    min: [0, 'Time efficiency cannot be negative'],
    max: [200, 'Time efficiency cannot exceed 200%'],
    default: 100
  },
  consistencyScore: {
    type: Number,
    required: [true, 'Consistency score is required'],
    min: [0, 'Consistency score cannot be negative'],
    max: [100, 'Consistency score cannot exceed 100'],
    default: 0
  },
  engagementLevel: {
    type: Number,
    required: [true, 'Engagement level is required'],
    min: [0, 'Engagement level cannot be negative'],
    max: [100, 'Engagement level cannot exceed 100'],
    default: 0
  },
  skillAcquisitionRate: {
    type: Number,
    required: [true, 'Skill acquisition rate is required'],
    min: [0, 'Skill acquisition rate cannot be negative'],
    default: 0
  }
}, { _id: false });

// Learning Analytics Schema
const learningAnalyticsSchema = new Schema<ILearningAnalytics>({
  totalHoursSpent: {
    type: Number,
    required: [true, 'Total hours spent is required'],
    min: [0, 'Total hours spent cannot be negative'],
    default: 0
  },
  averageWeeklyHours: {
    type: Number,
    required: [true, 'Average weekly hours is required'],
    min: [0, 'Average weekly hours cannot be negative'],
    default: 0
  },
  peakLearningHours: {
    type: Number,
    required: [true, 'Peak learning hours is required'],
    min: [0, 'Peak learning hours cannot be negative'],
    default: 0
  },
  activeDays: {
    type: Number,
    required: [true, 'Active days is required'],
    min: [0, 'Active days cannot be negative'],
    default: 0
  },
  totalActivities: {
    type: Number,
    required: [true, 'Total activities is required'],
    min: [0, 'Total activities cannot be negative'],
    default: 0
  },
  completedActivities: {
    type: Number,
    required: [true, 'Completed activities is required'],
    min: [0, 'Completed activities cannot be negative'],
    default: 0
  },
  skillsAcquired: {
    type: Number,
    required: [true, 'Skills acquired count is required'],
    min: [0, 'Skills acquired cannot be negative'],
    default: 0
  },
  milestonesAchieved: {
    type: Number,
    required: [true, 'Milestones achieved count is required'],
    min: [0, 'Milestones achieved cannot be negative'],
    default: 0
  },
  weeklyTargetsCompleted: {
    type: Number,
    required: [true, 'Weekly targets completed is required'],
    min: [0, 'Weekly targets completed cannot be negative'],
    default: 0
  },
  totalWeeklyTargets: {
    type: Number,
    required: [true, 'Total weekly targets is required'],
    min: [0, 'Total weekly targets cannot be negative'],
    default: 0
  }
}, { _id: false });

// Progress Snapshot Schema
const progressSnapshotSchema = new Schema<IProgressSnapshot>({
  date: {
    type: Date,
    required: [true, 'Snapshot date is required'],
    default: Date.now
  },
  overallProgress: {
    type: Number,
    required: [true, 'Overall progress is required'],
    min: [0, 'Overall progress cannot be negative'],
    max: [100, 'Overall progress cannot exceed 100']
  },
  weeklyProgress: {
    type: Number,
    required: [true, 'Weekly progress is required'],
    min: [0, 'Weekly progress cannot be negative'],
    max: [100, 'Weekly progress cannot exceed 100']
  },
  hoursThisWeek: {
    type: Number,
    required: [true, 'Hours this week is required'],
    min: [0, 'Hours this week cannot be negative']
  },
  activitiesCompleted: {
    type: Number,
    required: [true, 'Activities completed is required'],
    min: [0, 'Activities completed cannot be negative']
  },
  currentModule: {
    type: String,
    trim: true
  },
  currentWeek: {
    type: Number,
    required: [true, 'Current week is required'],
    min: [1, 'Current week must be at least 1']
  }
}, { _id: false });

// Main Progress Schema
const progressSchema = new Schema<IProgressDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  learningPathId: {
    type: Schema.Types.ObjectId,
    ref: 'LearningPath',
    required: [true, 'Learning path ID is required'],
    index: true
  },
  activities: {
    type: [activityRecordSchema],
    default: []
  },
  milestones: {
    type: [milestoneAchievementSchema],
    default: []
  },
  analytics: {
    type: learningAnalyticsSchema,
    required: [true, 'Analytics are required']
  },
  performance: {
    type: performanceMetricsSchema,
    required: [true, 'Performance metrics are required']
  },
  streaks: {
    type: streakDataSchema,
    required: [true, 'Streak data is required']
  },
  snapshots: {
    type: [progressSnapshotSchema],
    default: []
  },
  lastUpdated: {
    type: Date,
    default: Date.now
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
progressSchema.index({ userId: 1, learningPathId: 1 }, { unique: true });
progressSchema.index({ userId: 1, isActive: 1 });
progressSchema.index({ learningPathId: 1, isActive: 1 });
progressSchema.index({ 'analytics.totalHoursSpent': -1 });
progressSchema.index({ 'performance.completionRate': -1 });
progressSchema.index({ 'streaks.currentStreak': -1 });
progressSchema.index({ lastUpdated: -1 });

// Virtual for current week progress
progressSchema.virtual('currentWeekProgress').get(function(this: IProgressDocument) {
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekActivities = this.activities.filter((activity: IActivityRecord) => 
    activity.completedAt >= weekStart
  );
  
  return {
    activitiesCompleted: weekActivities.length,
    hoursSpent: weekActivities.reduce((sum: number, activity: IActivityRecord) => 
      sum + activity.hoursSpent, 0
    ),
    skillsAcquired: [...new Set(weekActivities.flatMap((activity: IActivityRecord) => 
      activity.skillsAcquired
    ))].length
  };
});

// Virtual for learning velocity (skills per hour)
progressSchema.virtual('learningVelocityRate').get(function(this: IProgressDocument) {
  if (this.analytics.totalHoursSpent === 0) return 0;
  return this.analytics.skillsAcquired / this.analytics.totalHoursSpent;
});

// Pre-save middleware to update analytics
progressSchema.pre('save', function(next) {
  try {
    // Update analytics based on activities
    this.analytics.totalActivities = this.activities.length;
    this.analytics.completedActivities = this.activities.filter(
      (activity: IActivityRecord) => activity.type !== ActivityType.IN_PROGRESS
    ).length;
    
    this.analytics.totalHoursSpent = this.activities.reduce(
      (sum: number, activity: IActivityRecord) => sum + activity.hoursSpent, 0
    );
    
    this.analytics.skillsAcquired = [...new Set(
      this.activities.flatMap((activity: IActivityRecord) => activity.skillsAcquired)
    )].length;
    
    this.analytics.milestonesAchieved = this.milestones.length;
    
    // Calculate average weekly hours
    const weeksActive = Math.max(1, Math.ceil(
      (Date.now() - this.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
    ));
    this.analytics.averageWeeklyHours = this.analytics.totalHoursSpent / weeksActive;
    
    // Update performance metrics
    if (this.analytics.totalActivities > 0) {
      this.performance.completionRate = 
        (this.analytics.completedActivities / this.analytics.totalActivities) * 100;
    }
    
    // Calculate learning velocity (skills per hour)
    this.performance.learningVelocity = this.analytics.totalHoursSpent > 0 ? 
      this.analytics.skillsAcquired / this.analytics.totalHoursSpent : 0;
    
    // Update last updated timestamp
    this.lastUpdated = new Date();
    
    logger.debug('Progress analytics updated', {
      progressId: this._id,
      userId: this.userId,
      totalHours: this.analytics.totalHoursSpent,
      completionRate: this.performance.completionRate
    });
    
    next();
  } catch (error) {
    logger.error('Error in progress pre-save middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      progressId: this._id,
      userId: this.userId
    });
    next(error as Error);
  }
});

// Instance method to record activity
progressSchema.methods['recordActivity'] = async function(
  this: IProgressDocument,
  activity: Omit<IActivityRecord, 'id' | 'completedAt'>
): Promise<void> {
  try {
    const activityRecord: IActivityRecord = {
      ...activity,
      id: new mongoose.Types.ObjectId().toString(),
      completedAt: new Date()
    };
    
    this.activities.push(activityRecord);
    
    // Update streak data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastActivity = new Date(this.streaks.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);
    
    if (today.getTime() === lastActivity.getTime()) {
      // Same day, no streak change
    } else if (today.getTime() - lastActivity.getTime() === 24 * 60 * 60 * 1000) {
      // Consecutive day
      this.streaks.currentStreak += 1;
      this.streaks.dailyActivityStreak += 1;
      if (this.streaks.currentStreak > this.streaks.longestStreak) {
        this.streaks.longestStreak = this.streaks.currentStreak;
      }
    } else if (today.getTime() > lastActivity.getTime()) {
      // Streak broken
      this.streaks.currentStreak = 1;
      this.streaks.dailyActivityStreak = 1;
      this.streaks.streakStartDate = today;
    }
    
    this.streaks.lastActivityDate = new Date();
    
    await (this as any).save();
    
    logger.debug('Activity recorded', {
      progressId: this._id,
      userId: this.userId,
      activityType: activity.type,
      hoursSpent: activity.hoursSpent
    });
  } catch (error) {
    logger.error('Error recording activity', {
      error: error instanceof Error ? error.message : 'Unknown error',
      progressId: this._id,
      userId: this.userId
    });
    throw error;
  }
};

// Instance method to achieve milestone
progressSchema.methods['achieveMilestone'] = async function(
  this: IProgressDocument,
  milestone: Omit<IMilestoneAchievement, 'id' | 'achievedAt'>
): Promise<void> {
  try {
    const milestoneRecord: IMilestoneAchievement = {
      ...milestone,
      id: new mongoose.Types.ObjectId().toString(),
      achievedAt: new Date()
    };
    
    this.milestones.push(milestoneRecord);
    await (this as any).save();
    
    logger.debug('Milestone achieved', {
      progressId: this._id,
      userId: this.userId,
      milestoneType: milestone.type,
      points: milestone.points
    });
  } catch (error) {
    logger.error('Error achieving milestone', {
      error: error instanceof Error ? error.message : 'Unknown error',
      progressId: this._id,
      userId: this.userId
    });
    throw error;
  }
};

// Instance method to create progress snapshot
progressSchema.methods['createSnapshot'] = async function(
  this: IProgressDocument,
  overallProgress: number,
  weeklyProgress: number,
  currentModule: string,
  currentWeek: number
): Promise<void> {
  try {
    const currentWeekData = this.currentWeekProgress;
    
    const snapshot: IProgressSnapshot = {
      date: new Date(),
      overallProgress,
      weeklyProgress,
      hoursThisWeek: currentWeekData.hoursSpent,
      activitiesCompleted: currentWeekData.activitiesCompleted,
      currentModule,
      currentWeek
    };
    
    this.snapshots.push(snapshot);
    
    // Keep only last 52 weeks of snapshots
    if (this.snapshots.length > 52) {
      this.snapshots = this.snapshots.slice(-52);
    }
    
    await (this as any).save();
    
    logger.debug('Progress snapshot created', {
      progressId: this._id,
      userId: this.userId,
      overallProgress,
      weeklyProgress
    });
  } catch (error) {
    logger.error('Error creating progress snapshot', {
      error: error instanceof Error ? error.message : 'Unknown error',
      progressId: this._id,
      userId: this.userId
    });
    throw error;
  }
};

// Static method to find by user
progressSchema.statics['findByUser'] = function(userId: string) {
  return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

// Static method to find by learning path
progressSchema.statics['findByLearningPath'] = function(learningPathId: string) {
  return this.find({ learningPathId, isActive: true }).sort({ createdAt: -1 });
};

// Static method to get user analytics
progressSchema.statics['getUserAnalytics'] = async function(userId: string, timeframe: AnalyticsTimeframe = AnalyticsTimeframe.ALL_TIME) {
  try {
    const progress = await this.findOne({ userId, isActive: true });
    if (!progress) {
      return null;
    }
    
    let dateFilter = new Date(0); // Beginning of time
    const now = new Date();
    
    switch (timeframe) {
      case AnalyticsTimeframe.LAST_WEEK:
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsTimeframe.LAST_MONTH:
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsTimeframe.LAST_3_MONTHS:
        dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsTimeframe.LAST_6_MONTHS:
        dateFilter = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      case AnalyticsTimeframe.LAST_YEAR:
        dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
    }
    
    const filteredActivities = progress.activities.filter(
      (activity: IActivityRecord) => activity.completedAt >= dateFilter
    );
    
    const filteredMilestones = progress.milestones.filter(
      (milestone: IMilestoneAchievement) => milestone.achievedAt >= dateFilter
    );
    
    return {
      analytics: progress.analytics,
      performance: progress.performance,
      streaks: progress.streaks,
      timeframeData: {
        activities: filteredActivities.length,
        hoursSpent: filteredActivities.reduce((sum: number, activity: IActivityRecord) => 
          sum + activity.hoursSpent, 0
        ),
        milestones: filteredMilestones.length,
        skillsAcquired: [...new Set(filteredActivities.flatMap((activity: IActivityRecord) => 
          activity.skillsAcquired
        ))].length
      }
    };
  } catch (error) {
    logger.error('Error getting user analytics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      timeframe
    });
    throw error;
  }
};

// Create and export the model
const Progress: IProgressModel = mongoose.model<IProgressDocument, IProgressModel>('Progress', progressSchema);

export default Progress;