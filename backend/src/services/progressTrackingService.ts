import Progress from '../models/Progress';
import LearningPath from '../models/LearningPath';
import {
  IProgressDocument,
  IActivityRecord,
  IMilestoneAchievement,
  IActivitySubmission,
  IUserAnalytics,
  IProgressRecommendation,
  IDashboardData,
  IPeerComparison,
  IMilestoneTrigger,
  ActivityType,
  MilestoneType,
  AnalyticsTimeframe,
  RecommendationType,
  RecommendationPriority
} from '../types/progress';
import { ILearningPathDocument } from '../types/learning';
import { logger } from '../utils/logger';

export class ProgressTrackingService {
  /**
   * Create initial progress tracking for a user's learning path
   */
  async initializeProgress(userId: string, learningPathId: string): Promise<IProgressDocument> {
    try {
      // Check if progress already exists
      const existingProgress = await Progress.findOne({ userId, learningPathId, isActive: true });
      if (existingProgress) {
        logger.warn('Progress already exists for user and learning path', {
          userId,
          learningPathId
        });
        return existingProgress;
      }

      // Verify learning path exists
      const learningPath = await LearningPath.findById(learningPathId);
      if (!learningPath) {
        throw new Error('Learning path not found');
      }

      // Create initial progress document
      const progress = new Progress({
        userId,
        learningPathId,
        activities: [],
        milestones: [],
        analytics: {
          totalHoursSpent: 0,
          averageWeeklyHours: 0,
          peakLearningHours: 0,
          activeDays: 0,
          totalActivities: 0,
          completedActivities: 0,
          skillsAcquired: 0,
          milestonesAchieved: 0,
          weeklyTargetsCompleted: 0,
          totalWeeklyTargets: learningPath.modules.reduce((total, module) => 
            total + module.weeklyTargets.length, 0
          )
        },
        performance: {
          completionRate: 0,
          learningVelocity: 0,
          timeEfficiency: 100,
          consistencyScore: 0,
          engagementLevel: 0,
          skillAcquisitionRate: 0
        },
        streaks: {
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: new Date(),
          streakStartDate: new Date(),
          weeklyTargetStreak: 0,
          dailyActivityStreak: 0
        },
        snapshots: [],
        lastUpdated: new Date(),
        isActive: true
      });

      await progress.save();

      // Record first activity milestone
      await this.checkAndTriggerMilestones(progress);

      logger.info('Progress tracking initialized', {
        userId,
        learningPathId,
        progressId: progress._id
      });

      return progress;
    } catch (error) {
      logger.error('Error initializing progress tracking', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        learningPathId
      });
      throw error;
    }
  }

  /**
   * Record a learning activity completion
   */
  async recordActivity(userId: string, activityData: IActivitySubmission): Promise<IProgressDocument> {
    try {
      const progress = await Progress.findOne({ userId, isActive: true });
      if (!progress) {
        throw new Error('Progress tracking not found for user');
      }

      // Validate activity data
      this.validateActivityData(activityData);

      // Record the activity
      await progress.recordActivity({
        ...activityData,
        skillsAcquired: activityData.skillsAcquired || []
      });

      // Check for milestone achievements
      await this.checkAndTriggerMilestones(progress);

      // Update learning path progress if applicable
      if (activityData.weeklyTargetId) {
        await this.updateLearningPathProgress(progress, activityData.weeklyTargetId);
      }

      logger.info('Activity recorded successfully', {
        userId,
        activityType: activityData.type,
        hoursSpent: activityData.hoursSpent,
        progressId: progress._id
      });

      return progress;
    } catch (error) {
      logger.error('Error recording activity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        activityData
      });
      throw error;
    }
  }

  /**
   * Calculate and update progress percentages
   */
  async calculateProgressPercentages(userId: string): Promise<{
    overallProgress: number;
    weeklyProgress: number;
    moduleProgress: Record<string, number>;
  }> {
    try {
      const progress = await Progress.findOne({ userId, isActive: true });
      if (!progress) {
        throw new Error('Progress tracking not found for user');
      }

      const learningPath = await LearningPath.findById(progress.learningPathId);
      if (!learningPath) {
        throw new Error('Learning path not found');
      }

      // Calculate overall progress based on completed modules and weekly targets
      const totalModules = learningPath.modules.length;
      const completedModules = learningPath.progress.completedModules.length;
      const overallProgress = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

      // Calculate current week progress
      const currentWeek = this.getCurrentWeek(learningPath.createdAt);
      const currentWeekActivities = this.getCurrentWeekActivities(progress.activities);
      const weeklyProgress = this.calculateWeeklyProgress(currentWeekActivities, currentWeek);

      // Calculate progress for each module
      const moduleProgress: Record<string, number> = {};
      for (const module of learningPath.modules) {
        // const moduleActivities = progress.activities.filter(activity => 
        //   activity.moduleId === module.id
        // );
        const completedTargets = module.weeklyTargets.filter(target => target.completed).length;
        const totalTargets = module.weeklyTargets.length;
        moduleProgress[module.id] = totalTargets > 0 ? (completedTargets / totalTargets) * 100 : 0;
      }

      // Create progress snapshot
      await progress.createSnapshot(
        overallProgress,
        weeklyProgress,
        learningPath.progress.currentModule || '',
        currentWeek
      );

      logger.debug('Progress percentages calculated', {
        userId,
        overallProgress,
        weeklyProgress,
        moduleCount: Object.keys(moduleProgress).length
      });

      return {
        overallProgress,
        weeklyProgress,
        moduleProgress
      };
    } catch (error) {
      logger.error('Error calculating progress percentages', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Calculate learning velocity and performance analytics
   */
  async calculateLearningVelocity(userId: string): Promise<{
    velocity: number;
    efficiency: number;
    consistency: number;
    engagement: number;
  }> {
    try {
      const progress = await Progress.findOne({ userId, isActive: true });
      if (!progress) {
        throw new Error('Progress tracking not found for user');
      }

      // Calculate learning velocity (skills per hour)
      const velocity = progress.analytics.totalHoursSpent > 0 ? 
        progress.analytics.skillsAcquired / progress.analytics.totalHoursSpent : 0;

      // Calculate time efficiency (actual vs estimated time)
      const efficiency = this.calculateTimeEfficiency(progress.activities);

      // Calculate consistency score based on activity patterns
      const consistency = this.calculateConsistencyScore(progress.activities);

      // Calculate engagement level based on quality scores and activity diversity
      const engagement = this.calculateEngagementLevel(progress.activities);

      // Update performance metrics
      progress.performance.learningVelocity = velocity;
      progress.performance.timeEfficiency = efficiency;
      progress.performance.consistencyScore = consistency;
      progress.performance.engagementLevel = engagement;

      await progress.save();

      logger.debug('Learning velocity calculated', {
        userId,
        velocity,
        efficiency,
        consistency,
        engagement
      });

      return { velocity, efficiency, consistency, engagement };
    } catch (error) {
      logger.error('Error calculating learning velocity', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Get comprehensive user analytics
   */
  async getUserAnalytics(userId: string, timeframe: AnalyticsTimeframe = AnalyticsTimeframe.ALL_TIME): Promise<IUserAnalytics | null> {
    try {
      return await Progress.getUserAnalytics(userId, timeframe);
    } catch (error) {
      logger.error('Error getting user analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        timeframe
      });
      throw error;
    }
  }

  /**
   * Generate dashboard data for user
   */
  async getDashboardData(userId: string): Promise<IDashboardData> {
    try {
      const progress = await Progress.findOne({ userId, isActive: true });
      if (!progress) {
        throw new Error('Progress tracking not found for user');
      }

      const learningPath = await LearningPath.findById(progress.learningPathId);
      if (!learningPath) {
        throw new Error('Learning path not found');
      }

      const currentWeek = this.getCurrentWeek(learningPath.createdAt);
      const progressPercentages = await this.calculateProgressPercentages(userId);
      const recentActivities = progress.activities
        .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
        .slice(0, 10);

      const weeklyStats = this.generateWeeklyStats(progress.activities, progress.snapshots);
      const performanceTrends = this.generatePerformanceTrends(progress.snapshots);
      const recommendations = await this.generateRecommendations(progress, learningPath);

      const dashboardData: IDashboardData = {
        userId,
        currentProgress: {
          overallProgress: progressPercentages.overallProgress,
          currentModule: learningPath.progress.currentModule || '',
          currentWeek,
          weeklyProgress: progressPercentages.weeklyProgress,
          hoursThisWeek: (progress as any).currentWeekProgress.hoursSpent,
          targetHoursThisWeek: learningPath.personalization.availableHoursPerWeek
        },
        recentActivities,
        upcomingMilestones: this.getUpcomingMilestones(progress, learningPath),
        streakInfo: progress.streaks,
        weeklyStats,
        performanceTrends,
        recommendations
      };

      logger.debug('Dashboard data generated', {
        userId,
        activitiesCount: recentActivities.length,
        recommendationsCount: recommendations.length
      });

      return dashboardData;
    } catch (error) {
      logger.error('Error generating dashboard data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Generate peer comparison data
   */
  async getPeerComparison(userId: string): Promise<IPeerComparison> {
    try {
      const userProgress = await Progress.findOne({ userId, isActive: true });
      if (!userProgress) {
        throw new Error('Progress tracking not found for user');
      }

      // Get all active progress records for comparison
      const allProgress = await Progress.find({ isActive: true })
        .select('analytics performance streaks')
        .lean();

      if (allProgress.length < 2) {
        throw new Error('Insufficient data for peer comparison');
      }

      // Calculate user's rank and percentiles
      const userRank = this.calculateUserRank(userProgress, allProgress);
      const percentile = ((allProgress.length - userRank) / allProgress.length) * 100;

      // Calculate average metrics
      const averages = this.calculateAverageMetrics(allProgress);

      // Find similar users
      const similarUsers = await this.findSimilarUsers(userProgress, 5);

      const peerComparison: IPeerComparison = {
        userId,
        userRank,
        totalUsers: allProgress.length,
        percentile: Math.round(percentile),
        metrics: {
          hoursSpent: {
            user: userProgress.analytics.totalHoursSpent,
            average: averages.hoursSpent,
            percentile: this.calculateMetricPercentile(
              userProgress.analytics.totalHoursSpent,
              allProgress.map(p => p.analytics.totalHoursSpent)
            )
          },
          completionRate: {
            user: userProgress.performance.completionRate,
            average: averages.completionRate,
            percentile: this.calculateMetricPercentile(
              userProgress.performance.completionRate,
              allProgress.map(p => p.performance.completionRate)
            )
          },
          streakDays: {
            user: userProgress.streaks.currentStreak,
            average: averages.streakDays,
            percentile: this.calculateMetricPercentile(
              userProgress.streaks.currentStreak,
              allProgress.map(p => p.streaks.currentStreak)
            )
          },
          skillsAcquired: {
            user: userProgress.analytics.skillsAcquired,
            average: averages.skillsAcquired,
            percentile: this.calculateMetricPercentile(
              userProgress.analytics.skillsAcquired,
              allProgress.map(p => p.analytics.skillsAcquired)
            )
          }
        },
        similarUsers
      };

      logger.debug('Peer comparison generated', {
        userId,
        userRank,
        percentile,
        totalUsers: allProgress.length
      });

      return peerComparison;
    } catch (error) {
      logger.error('Error generating peer comparison', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  // Private helper methods

  private validateActivityData(activityData: IActivitySubmission): void {
    if (!activityData.title || activityData.title.trim().length === 0) {
      throw new Error('Activity title is required');
    }
    if (activityData.hoursSpent < 0 || activityData.hoursSpent > 24) {
      throw new Error('Hours spent must be between 0 and 24');
    }
    if (activityData.qualityScore && (activityData.qualityScore < 1 || activityData.qualityScore > 10)) {
      throw new Error('Quality score must be between 1 and 10');
    }
  }

  private async checkAndTriggerMilestones(progress: IProgressDocument): Promise<void> {
    const milestones: IMilestoneTrigger[] = [
      {
        type: MilestoneType.FIRST_ACTIVITY,
        condition: (p) => p.activities.length === 1,
        title: 'First Step Taken',
        description: 'Completed your first learning activity',
        points: 10,
        badge: 'first-step',
        celebrationMessage: 'Congratulations on starting your learning journey!'
      },
      {
        type: MilestoneType.STREAK_MILESTONE,
        condition: (p) => p.streaks.currentStreak === 7,
        title: 'Week Warrior',
        description: 'Maintained a 7-day learning streak',
        points: 50,
        badge: 'week-warrior',
        celebrationMessage: 'Amazing consistency! Keep up the great work!'
      },
      {
        type: MilestoneType.HOURS_MILESTONE,
        condition: (p) => p.analytics.totalHoursSpent >= 10 && p.analytics.totalHoursSpent < 11,
        title: 'Double Digits',
        description: 'Reached 10 hours of learning',
        points: 25,
        badge: 'double-digits',
        celebrationMessage: 'You\'ve put in serious learning time!'
      },
      {
        type: MilestoneType.SKILLS_MILESTONE,
        condition: (p) => p.analytics.skillsAcquired >= 5 && p.analytics.skillsAcquired < 6,
        title: 'Skill Collector',
        description: 'Acquired 5 new skills',
        points: 30,
        badge: 'skill-collector',
        celebrationMessage: 'Your skill set is growing impressively!'
      }
    ];

    for (const milestone of milestones) {
      if (milestone.condition(progress)) {
        // Check if milestone already achieved
        const alreadyAchieved = progress.milestones.some(m => m.type === milestone.type);
        if (!alreadyAchieved) {
          const milestoneData: Omit<IMilestoneAchievement, 'id' | 'achievedAt'> = {
            type: milestone.type,
            title: milestone.title,
            description: milestone.description,
            points: milestone.points
          };
          
          if (milestone.badge) {
            (milestoneData as any).badge = milestone.badge;
          }
          
          if (milestone.celebrationMessage) {
            (milestoneData as any).celebrationMessage = milestone.celebrationMessage;
          }
          
          await progress.achieveMilestone(milestoneData);
        }
      }
    }
  }

  private async updateLearningPathProgress(progress: IProgressDocument, weeklyTargetId: string): Promise<void> {
    try {
      const learningPath = await LearningPath.findById(progress.learningPathId);
      if (!learningPath) return;

      // Find the module and weekly target
      for (const module of learningPath.modules) {
        const target = module.weeklyTargets.find(t => t.id === weeklyTargetId);
        if (target && !target.completed) {
          target.completed = true;
          target.completedAt = new Date();
          
          // Update learning path progress
          await learningPath.updateProgress(module.id, weeklyTargetId);
          break;
        }
      }
    } catch (error) {
      logger.error('Error updating learning path progress', {
        error: error instanceof Error ? error.message : 'Unknown error',
        progressId: progress._id,
        weeklyTargetId
      });
    }
  }

  private getCurrentWeek(startDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  }

  private getCurrentWeekActivities(activities: IActivityRecord[]): IActivityRecord[] {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    
    return activities.filter(activity => activity.completedAt >= weekStart);
  }

  private calculateWeeklyProgress(weekActivities: IActivityRecord[], _currentWeek: number): number {
    // Simple calculation based on activities completed this week
    // This could be enhanced with more sophisticated logic
    const targetActivitiesPerWeek = 5; // Configurable
    return Math.min((weekActivities.length / targetActivitiesPerWeek) * 100, 100);
  }

  private calculateTimeEfficiency(_activities: IActivityRecord[]): number {
    // Calculate efficiency based on actual vs estimated time
    // For now, return a baseline efficiency
    return 100; // This would be enhanced with actual vs estimated time data
  }

  private calculateConsistencyScore(activities: IActivityRecord[]): number {
    if (activities.length === 0) return 0;

    // Calculate consistency based on activity distribution over time
    const activityDates = activities.map(a => a.completedAt.toDateString());
    const uniqueDates = new Set(activityDates);
    const firstActivity = activities[0];
    if (!firstActivity) return 0;
    
    const totalDays = Math.max(1, Math.ceil(
      (Date.now() - firstActivity.completedAt.getTime()) / (1000 * 60 * 60 * 24)
    ));
    
    return Math.min((uniqueDates.size / totalDays) * 100, 100);
  }

  private calculateEngagementLevel(activities: IActivityRecord[]): number {
    if (activities.length === 0) return 0;

    // Calculate engagement based on activity diversity and quality scores
    const activityTypes = new Set(activities.map(a => a.type));
    const diversityScore = (activityTypes.size / Object.keys(ActivityType).length) * 50;
    
    const qualityScores = activities.filter(a => a.qualityScore).map(a => a.qualityScore!);
    const avgQuality = qualityScores.length > 0 ? 
      qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 5;
    const qualityScore = (avgQuality / 10) * 50;
    
    return Math.min(diversityScore + qualityScore, 100);
  }

  private generateWeeklyStats(activities: IActivityRecord[], _snapshots: any[]): any[] {
    // Generate weekly statistics from activities and snapshots
    const weeklyStats = [];
    const weeks = Math.min(12, Math.max(1, this.getCurrentWeek(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))));
    
    for (let week = 1; week <= weeks; week++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weeks - week) * 7);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const weekActivities = activities.filter(a => 
        a.completedAt >= weekStart && a.completedAt < weekEnd
      );
      
      weeklyStats.push({
        week,
        hoursSpent: weekActivities.reduce((sum, a) => sum + a.hoursSpent, 0),
        activitiesCompleted: weekActivities.length,
        skillsAcquired: [...new Set(weekActivities.flatMap(a => a.skillsAcquired))].length,
        targetsMet: weekActivities.length >= 3 // Simple target logic
      });
    }
    
    return weeklyStats;
  }

  private generatePerformanceTrends(snapshots: any[]): any {
    // Generate performance trends from snapshots
    const recentSnapshots = snapshots.slice(-12); // Last 12 snapshots
    
    return {
      completionRate: recentSnapshots.map(s => s.overallProgress || 0),
      learningVelocity: recentSnapshots.map((_, i) => i * 0.1), // Placeholder
      consistencyScore: recentSnapshots.map((_, i) => 50 + i * 2), // Placeholder
      dates: recentSnapshots.map(s => s.date)
    };
  }

  private async generateRecommendations(progress: IProgressDocument, _learningPath: ILearningPathDocument): Promise<IProgressRecommendation[]> {
    const recommendations: IProgressRecommendation[] = [];

    // Consistency recommendation
    if (progress.streaks.currentStreak < 3) {
      recommendations.push({
        type: RecommendationType.INCREASE_CONSISTENCY,
        title: 'Build Your Learning Streak',
        description: 'Try to learn something every day to build momentum',
        action: 'Set a daily 30-minute learning goal',
        priority: RecommendationPriority.HIGH,
        estimatedImpact: 8
      });
    }

    // Progress recommendation
    if (progress.performance.completionRate < 70) {
      recommendations.push({
        type: RecommendationType.FOCUS_ON_WEAK_AREAS,
        title: 'Focus on Completion',
        description: 'Your completion rate could be improved',
        action: 'Complete pending activities before starting new ones',
        priority: RecommendationPriority.MEDIUM,
        estimatedImpact: 7
      });
    }

    // Celebration recommendation
    if (progress.milestones.length > 0) {
      const latestMilestone = progress.milestones[progress.milestones.length - 1];
      if (latestMilestone) {
        const daysSinceLastMilestone = Math.floor(
          (Date.now() - latestMilestone.achievedAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastMilestone < 1) {
          recommendations.push({
            type: RecommendationType.CELEBRATE_ACHIEVEMENT,
            title: 'Celebrate Your Success!',
            description: `You recently achieved: ${latestMilestone.title}`,
            action: 'Take a moment to appreciate your progress',
            priority: RecommendationPriority.LOW,
            estimatedImpact: 5
          });
        }
      }
    }

    return recommendations;
  }

  private getUpcomingMilestones(progress: IProgressDocument, _learningPath: ILearningPathDocument): IMilestoneAchievement[] {
    // Return potential upcoming milestones based on current progress
    const upcoming: IMilestoneAchievement[] = [];
    
    // Next streak milestone
    const nextStreakTarget = Math.ceil((progress.streaks.currentStreak + 1) / 7) * 7;
    if (nextStreakTarget > progress.streaks.currentStreak) {
      upcoming.push({
        id: 'upcoming-streak',
        type: MilestoneType.STREAK_MILESTONE,
        title: `${nextStreakTarget}-Day Streak`,
        description: `Reach a ${nextStreakTarget}-day learning streak`,
        achievedAt: new Date(), // Placeholder
        points: nextStreakTarget * 5
      });
    }
    
    return upcoming.slice(0, 3); // Return top 3 upcoming milestones
  }

  private calculateUserRank(userProgress: IProgressDocument, allProgress: any[]): number {
    // Calculate rank based on overall score (combination of metrics)
    const userScore = this.calculateOverallScore(userProgress);
    const scores = allProgress.map(p => this.calculateOverallScore(p));
    scores.sort((a, b) => b - a);
    return scores.indexOf(userScore) + 1;
  }

  private calculateOverallScore(progress: any): number {
    // Weighted combination of key metrics
    return (
      progress.analytics.totalHoursSpent * 0.3 +
      progress.performance.completionRate * 0.3 +
      progress.streaks.currentStreak * 0.2 +
      progress.analytics.skillsAcquired * 0.2
    );
  }

  private calculateAverageMetrics(allProgress: any[]): any {
    const totals = allProgress.reduce((acc, p) => ({
      hoursSpent: acc.hoursSpent + p.analytics.totalHoursSpent,
      completionRate: acc.completionRate + p.performance.completionRate,
      streakDays: acc.streakDays + p.streaks.currentStreak,
      skillsAcquired: acc.skillsAcquired + p.analytics.skillsAcquired
    }), { hoursSpent: 0, completionRate: 0, streakDays: 0, skillsAcquired: 0 });

    const count = allProgress.length;
    return {
      hoursSpent: Math.round(totals.hoursSpent / count),
      completionRate: Math.round(totals.completionRate / count),
      streakDays: Math.round(totals.streakDays / count),
      skillsAcquired: Math.round(totals.skillsAcquired / count)
    };
  }

  private calculateMetricPercentile(userValue: number, allValues: number[]): number {
    const sortedValues = allValues.sort((a, b) => a - b);
    const rank = sortedValues.filter(v => v <= userValue).length;
    return Math.round((rank / sortedValues.length) * 100);
  }

  private async findSimilarUsers(userProgress: IProgressDocument, limit: number): Promise<any[]> {
    // Find users with similar progress patterns
    // This is a simplified implementation
    const allProgress = await Progress.find({ 
      isActive: true, 
      userId: { $ne: userProgress.userId } 
    })
    .populate('userId', 'profile.firstName profile.lastName')
    .limit(limit * 2) // Get more to filter
    .lean();

    // Calculate similarity scores and return top matches
    const similarities = allProgress.map(p => {
      const user = p.userId as any; // Type assertion for populated field
      return {
        userId: p.userId,
        name: `${user.profile?.firstName || 'User'} ${user.profile?.lastName || ''}`.trim(),
        hoursSpent: p.analytics.totalHoursSpent,
        completionRate: p.performance.completionRate,
        streakDays: p.streaks.currentStreak,
        similarity: this.calculateSimilarity(userProgress, p)
      };
    });

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private calculateSimilarity(user1: any, user2: any): number {
    // Simple similarity calculation based on normalized metrics
    const normalize = (value: number, max: number) => Math.min(value / max, 1);
    
    const hoursSim = 1 - Math.abs(
      normalize(user1.analytics.totalHoursSpent, 100) - 
      normalize(user2.analytics.totalHoursSpent, 100)
    );
    
    const completionSim = 1 - Math.abs(
      user1.performance.completionRate - user2.performance.completionRate
    ) / 100;
    
    const streakSim = 1 - Math.abs(
      normalize(user1.streaks.currentStreak, 30) - 
      normalize(user2.streaks.currentStreak, 30)
    );
    
    return (hoursSim + completionSim + streakSim) / 3;
  }
}

export const progressTrackingService = new ProgressTrackingService();