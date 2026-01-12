import * as cron from 'node-cron';
import NotificationService from './notificationService';
import {
  INotificationDocument,
  NotificationType,
  NotificationPriority,
  DeliveryChannel,
  NotificationFrequency
} from '../types/notification';
import { logger } from '../utils/logger';

export class NotificationScheduler {
  private isRunning: boolean = false;
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start the notification scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Notification scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.setupCronJobs();
    
    logger.info('Notification scheduler started');
  }

  /**
   * Stop the notification scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Notification scheduler is not running');
      return;
    }

    // Stop all scheduled jobs
    this.scheduledJobs.forEach((job) => {
      job.stop();
      job.destroy();
    });
    this.scheduledJobs.clear();

    this.isRunning = false;
    logger.info('Notification scheduler stopped');
  }

  /**
   * Setup cron jobs for different notification processing tasks
   */
  private setupCronJobs(): void {
    // Process pending notifications every minute
    const processPendingJob = cron.schedule('* * * * *', async () => {
      try {
        await NotificationService.processPendingNotifications();
      } catch (error) {
        logger.error('Error in process pending notifications job', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Cleanup expired notifications every hour
    const cleanupExpiredJob = cron.schedule('0 * * * *', async () => {
      try {
        await NotificationService.cleanupExpiredNotifications();
      } catch (error) {
        logger.error('Error in cleanup expired notifications job', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Process weekly target reminders every day at 9 AM
    const weeklyTargetRemindersJob = cron.schedule('0 9 * * *', async () => {
      try {
        await this.processWeeklyTargetReminders();
      } catch (error) {
        logger.error('Error in weekly target reminders job', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Process inactivity alerts every day at 6 PM
    const inactivityAlertsJob = cron.schedule('0 18 * * *', async () => {
      try {
        await this.processInactivityAlerts();
      } catch (error) {
        logger.error('Error in inactivity alerts job', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Process weekly progress summaries every Sunday at 8 PM
    const weeklyProgressSummariesJob = cron.schedule('0 20 * * 0', async () => {
      try {
        await this.processWeeklyProgressSummaries();
      } catch (error) {
        logger.error('Error in weekly progress summaries job', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Process milestone achievements every 30 minutes
    const milestoneAchievementsJob = cron.schedule('*/30 * * * *', async () => {
      try {
        await this.processMilestoneAchievements();
      } catch (error) {
        logger.error('Error in milestone achievements job', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Start all jobs
    processPendingJob.start();
    cleanupExpiredJob.start();
    weeklyTargetRemindersJob.start();
    inactivityAlertsJob.start();
    weeklyProgressSummariesJob.start();
    milestoneAchievementsJob.start();

    // Store job references
    this.scheduledJobs.set('processPending', processPendingJob);
    this.scheduledJobs.set('cleanupExpired', cleanupExpiredJob);
    this.scheduledJobs.set('weeklyTargetReminders', weeklyTargetRemindersJob);
    this.scheduledJobs.set('inactivityAlerts', inactivityAlertsJob);
    this.scheduledJobs.set('weeklyProgressSummaries', weeklyProgressSummariesJob);
    this.scheduledJobs.set('milestoneAchievements', milestoneAchievementsJob);

    logger.info('Notification scheduler cron jobs setup completed', {
      jobCount: this.scheduledJobs.size
    });
  }

  /**
   * Process weekly target reminders
   */
  private async processWeeklyTargetReminders(): Promise<void> {
    try {
      logger.info('Processing weekly target reminders');
      
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 3 = Wednesday
      
      // Send reminders on Wednesday (mid-week) for incomplete weekly targets
      if (dayOfWeek === 3) {
        await this.sendMidWeekReminders();
      }
      
      // Send reminders on Sunday evening for upcoming week targets
      if (dayOfWeek === 0) { // Sunday
        await this.sendWeeklyPlanningReminders();
      }
    } catch (error) {
      logger.error('Error processing weekly target reminders', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Send mid-week reminders for incomplete weekly targets
   */
  private async sendMidWeekReminders(): Promise<void> {
    try {
      // Import models dynamically to avoid circular dependencies
      const { User } = await import('../models/User');
      const LearningPath = (await import('../models/LearningPath')).default;
      
      // Get current week boundaries
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      // Find active learning paths with incomplete weekly targets
      const activePaths = await LearningPath.find({
        isActive: true,
        'progress.overallProgress': { $lt: 100 }
      }).populate('userId');
      
      logger.info('Found active learning paths for weekly reminders', {
        count: activePaths.length
      });
      
      for (const path of activePaths) {
        try {
          const user = path.userId as any;
          if (!user || !user.isActive) continue;
          
          // Check user notification preferences
          if (!user.preferences?.emailNotifications?.learningReminders) {
            continue;
          }
          
          // Find current week's incomplete targets
          const currentWeek = Math.ceil(
            (Date.now() - path.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
          );
          
          const incompleteTargets = [];
          for (const module of path.modules) {
            for (const target of module.weeklyTargets) {
              if (target.week === currentWeek && !target.completed) {
                incompleteTargets.push({
                  targetId: target.id,
                  targetTitle: target.title,
                  moduleTitle: module.title,
                  dueDate: target.dueDate,
                  estimatedHours: target.estimatedHours
                });
              }
            }
          }
          
          if (incompleteTargets.length > 0) {
            // Create notification for each incomplete target
            for (const target of incompleteTargets) {
              await this.createNotificationFromTemplate(
                user._id.toString(),
                NotificationType.WEEKLY_TARGET_REMINDER,
                {
                  firstName: user.profile.firstName,
                  targetTitle: target.targetTitle,
                  moduleTitle: target.moduleTitle,
                  targetId: target.targetId,
                  dueDate: target.dueDate,
                  estimatedHours: target.estimatedHours,
                  learningPathUrl: `/learning-path/${path._id}`,
                  dashboardUrl: `/dashboard`
                }
              );
            }
            
            logger.debug('Mid-week reminders sent', {
              userId: user._id,
              incompleteTargets: incompleteTargets.length
            });
          }
        } catch (error) {
          logger.error('Error processing individual path for weekly reminders', {
            error: error instanceof Error ? error.message : 'Unknown error',
            pathId: path._id
          });
        }
      }
    } catch (error) {
      logger.error('Error sending mid-week reminders', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Send weekly planning reminders for upcoming week
   */
  private async sendWeeklyPlanningReminders(): Promise<void> {
    try {
      // Import models dynamically to avoid circular dependencies
      const { User } = await import('../models/User');
      const LearningPath = (await import('../models/LearningPath')).default;
      
      // Find active learning paths
      const activePaths = await LearningPath.find({
        isActive: true,
        'progress.overallProgress': { $lt: 100 }
      }).populate('userId');
      
      logger.info('Found active learning paths for weekly planning reminders', {
        count: activePaths.length
      });
      
      for (const path of activePaths) {
        try {
          const user = path.userId as any;
          if (!user || !user.isActive) continue;
          
          // Check user notification preferences
          if (!user.preferences?.emailNotifications?.weeklyProgress) {
            continue;
          }
          
          // Find next week's targets
          const nextWeek = Math.ceil(
            (Date.now() - path.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
          ) + 1;
          
          const upcomingTargets = [];
          for (const module of path.modules) {
            for (const target of module.weeklyTargets) {
              if (target.week === nextWeek) {
                upcomingTargets.push({
                  targetId: target.id,
                  targetTitle: target.title,
                  moduleTitle: module.title,
                  estimatedHours: target.estimatedHours,
                  skills: target.skills
                });
              }
            }
          }
          
          if (upcomingTargets.length > 0) {
            const totalHours = upcomingTargets.reduce((sum, target) => sum + target.estimatedHours, 0);
            
            await this.createNotificationFromTemplate(
              user._id.toString(),
              NotificationType.WEEKLY_PROGRESS_SUMMARY,
              {
                firstName: user.profile.firstName,
                upcomingTargets,
                totalHours,
                weekNumber: nextWeek,
                progressUrl: `/progress`,
                learningPathUrl: `/learning-path/${path._id}`
              }
            );
            
            logger.debug('Weekly planning reminder sent', {
              userId: user._id,
              upcomingTargets: upcomingTargets.length,
              totalHours
            });
          }
        } catch (error) {
          logger.error('Error processing individual path for weekly planning', {
            error: error instanceof Error ? error.message : 'Unknown error',
            pathId: path._id
          });
        }
      }
    } catch (error) {
      logger.error('Error sending weekly planning reminders', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Process inactivity alerts
   */
  private async processInactivityAlerts(): Promise<void> {
    try {
      logger.info('Processing inactivity alerts');
      
      // Import models dynamically to avoid circular dependencies
      const { User } = await import('../models/User');
      const Progress = (await import('../models/Progress')).default;
      
      // Find users who haven't been active for 3+ days
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      // Find users with recent activity but not in the last 3 days
      const inactiveUsers = await User.find({
        isActive: true,
        'stats.lastActiveDate': {
          $lt: threeDaysAgo,
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // But active within last 30 days
        }
      });
      
      logger.info('Found inactive users for re-engagement', {
        count: inactiveUsers.length
      });
      
      for (const user of inactiveUsers) {
        try {
          // Check user notification preferences
          if (!user.preferences?.emailNotifications?.learningReminders) {
            continue;
          }
          
          // Get user's progress to personalize the message
          const userProgress = await Progress.findOne({
            userId: user._id,
            isActive: true
          });
          
          if (!userProgress) continue;
          
          // Calculate days since last activity
          const daysSinceLastActivity = Math.floor(
            (Date.now() - user.stats.lastActiveDate.getTime()) / (24 * 60 * 60 * 1000)
          );
          
          // Determine re-engagement strategy based on inactivity duration
          let notificationType = NotificationType.INACTIVITY_ALERT;
          let templateData: any = {
            firstName: user.profile.firstName,
            daysSinceLastActivity,
            lastActivityDate: user.stats.lastActiveDate,
            dashboardUrl: `/dashboard`,
            learningPathUrl: `/learning-path/${userProgress.learningPathId}`
          };
          
          // Add progress-specific data for motivation
          if (userProgress.analytics.totalHoursSpent > 0) {
            templateData = {
              ...templateData,
              totalHoursSpent: userProgress.analytics.totalHoursSpent,
              completionRate: userProgress.performance.completionRate,
              currentStreak: userProgress.streaks.currentStreak,
              longestStreak: userProgress.streaks.longestStreak
            };
          }
          
          // Send different messages based on inactivity duration
          if (daysSinceLastActivity >= 7) {
            // Week+ inactive - motivational message with achievements
            notificationType = NotificationType.MOTIVATIONAL_MESSAGE;
            templateData.message = `Hi ${user.profile.firstName}! You've been away for ${daysSinceLastActivity} days. Remember your ${userProgress.analytics.totalHoursSpent} hours of learning progress? Let's continue your journey!`;
          } else if (daysSinceLastActivity >= 5) {
            // 5-6 days inactive - gentle nudge with streak info
            templateData.message = `Hi ${user.profile.firstName}! Your learning streak was ${userProgress.streaks.longestStreak} days. Ready to start a new one?`;
          }
          
          await this.createNotificationFromTemplate(
            user._id.toString(),
            notificationType,
            templateData
          );
          
          logger.debug('Inactivity alert sent', {
            userId: user._id,
            daysSinceLastActivity,
            notificationType
          });
          
        } catch (error) {
          logger.error('Error processing individual user for inactivity alert', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: user._id
          });
        }
      }
      
      // Also check for users who haven't completed weekly targets in current week
      await this.processWeeklyTargetInactivity();
      
    } catch (error) {
      logger.error('Error processing inactivity alerts', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Process users who haven't worked on weekly targets this week
   */
  private async processWeeklyTargetInactivity(): Promise<void> {
    try {
      // Import models dynamically to avoid circular dependencies
      const { User } = await import('../models/User');
      const LearningPath = (await import('../models/LearningPath')).default;
      const Progress = (await import('../models/Progress')).default;
      
      // Get current week boundaries
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      
      // Find active learning paths
      const activePaths = await LearningPath.find({
        isActive: true,
        'progress.overallProgress': { $lt: 100 }
      }).populate('userId');
      
      for (const path of activePaths) {
        try {
          const user = path.userId as any;
          if (!user || !user.isActive) continue;
          
          // Check if user has any activity this week
          const userProgress = await Progress.findOne({
            userId: user._id,
            learningPathId: path._id,
            isActive: true
          });
          
          if (!userProgress) continue;
          
          // Check if user has any activities recorded this week
          const weekActivities = userProgress.activities.filter(activity => 
            activity.completedAt >= weekStart
          );
          
          if (weekActivities.length === 0) {
            // User hasn't done any learning activities this week
            const currentWeek = Math.ceil(
              (Date.now() - path.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
            );
            
            // Find current week's targets
            const currentTargets = [];
            for (const module of path.modules) {
              for (const target of module.weeklyTargets) {
                if (target.week === currentWeek && !target.completed) {
                  currentTargets.push({
                    targetTitle: target.title,
                    moduleTitle: module.title,
                    estimatedHours: target.estimatedHours
                  });
                }
              }
            }
            
            if (currentTargets.length > 0) {
              const firstTarget = currentTargets[0];
              if (firstTarget) {
                await this.createNotificationFromTemplate(
                  user._id.toString(),
                  NotificationType.WEEKLY_TARGET_REMINDER,
                  {
                    firstName: user.profile.firstName,
                    targetTitle: firstTarget.targetTitle,
                    moduleTitle: firstTarget.moduleTitle,
                    estimatedHours: firstTarget.estimatedHours,
                    weekNumber: currentWeek,
                    totalTargets: currentTargets.length,
                    learningPathUrl: `/learning-path/${path._id}`,
                    dashboardUrl: `/dashboard`
                  }
                );
                
                logger.debug('Weekly target inactivity reminder sent', {
                  userId: user._id,
                  currentTargets: currentTargets.length
                });
              }
            }
          }
        } catch (error) {
          logger.error('Error processing path for weekly target inactivity', {
            error: error instanceof Error ? error.message : 'Unknown error',
            pathId: path._id
          });
        }
      }
    } catch (error) {
      logger.error('Error processing weekly target inactivity', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Process weekly progress summaries
   */
  private async processWeeklyProgressSummaries(): Promise<void> {
    try {
      logger.info('Processing weekly progress summaries');
      
      // This would integrate with the progress service to generate weekly summaries
      // For now, we'll log the intent
      logger.info('Would send weekly progress summaries to all active users');
    } catch (error) {
      logger.error('Error processing weekly progress summaries', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Process milestone achievements
   */
  private async processMilestoneAchievements(): Promise<void> {
    try {
      logger.info('Processing milestone achievements');
      
      // Import models dynamically to avoid circular dependencies
      const { User } = await import('../models/User');
      const Progress = (await import('../models/Progress')).default;
      const LearningPath = (await import('../models/LearningPath')).default;
      
      // Find recent milestone achievements (last 30 minutes)
      const recentCutoff = new Date(Date.now() - 30 * 60 * 1000);
      
      // Get all active progress records
      const activeProgress = await Progress.find({
        isActive: true,
        'milestones.achievedAt': { $gte: recentCutoff }
      }).populate('userId').populate('learningPathId');
      
      logger.info('Found progress records with recent milestones', {
        count: activeProgress.length
      });
      
      for (const progress of activeProgress) {
        try {
          const user = progress.userId as any;
          const learningPath = progress.learningPathId as any;
          
          if (!user || !user.isActive || !learningPath) continue;
          
          // Check user notification preferences
          if (!user.preferences?.emailNotifications?.milestoneAchievements) {
            continue;
          }
          
          // Find recent milestones for this user
          const recentMilestones = progress.milestones.filter(milestone => 
            milestone.achievedAt >= recentCutoff
          );
          
          for (const milestone of recentMilestones) {
            // Check if we've already sent a notification for this milestone
            const existingNotification = await this.checkExistingMilestoneNotification(
              user._id.toString(),
              milestone.id
            );
            
            if (existingNotification) {
              continue; // Skip if already notified
            }
            
            // Determine celebration level based on milestone type and user progress
            const celebrationData = this.generateCelebrationData(milestone, progress, learningPath);
            
            await this.createNotificationFromTemplate(
              user._id.toString(),
              NotificationType.MILESTONE_ACHIEVEMENT,
              {
                firstName: user.profile.firstName,
                milestoneTitle: milestone.title,
                milestoneDescription: milestone.description,
                milestoneId: milestone.id,
                points: milestone.points,
                badge: milestone.badge,
                celebrationMessage: celebrationData.message,
                achievementUrl: `/achievements/${milestone.id}`,
                progressUrl: `/progress`,
                shareUrl: `/share/milestone/${milestone.id}`,
                ...celebrationData.extraData
              }
            );
            
            logger.debug('Milestone achievement notification sent', {
              userId: user._id,
              milestoneId: milestone.id,
              milestoneType: milestone.type,
              points: milestone.points
            });
          }
          
          // Check for streak milestones
          await this.checkStreakMilestones(user, progress);
          
          // Check for completion milestones
          await this.checkCompletionMilestones(user, progress, learningPath);
          
        } catch (error) {
          logger.error('Error processing individual progress for milestones', {
            error: error instanceof Error ? error.message : 'Unknown error',
            progressId: progress._id
          });
        }
      }
    } catch (error) {
      logger.error('Error processing milestone achievements', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check if milestone notification already exists
   */
  private async checkExistingMilestoneNotification(userId: string, milestoneId: string): Promise<boolean> {
    try {
      const Notification = (await import('../models/Notification')).default;
      
      const existing = await Notification.findOne({
        userId,
        type: NotificationType.MILESTONE_ACHIEVEMENT,
        'templateData.milestoneId': milestoneId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });
      
      return !!existing;
    } catch (error) {
      logger.error('Error checking existing milestone notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        milestoneId
      });
      return false;
    }
  }

  /**
   * Generate celebration data based on milestone importance
   */
  private generateCelebrationData(milestone: any, progress: any, learningPath: any): {
    message: string;
    extraData: Record<string, any>;
  } {
    const { MilestoneType } = require('../types/progress');
    
    let message = '';
    let extraData: Record<string, any> = {};
    
    switch (milestone.type) {
      case MilestoneType.MODULE_COMPLETION:
        message = `🎉 Fantastic! You've completed the ${milestone.title} module. You're making excellent progress!`;
        extraData = {
          completionRate: progress.performance.completionRate,
          totalModules: learningPath.modules.length,
          completedModules: progress.analytics.completedActivities
        };
        break;
        
      case MilestoneType.WEEKLY_TARGET_COMPLETION:
        message = `✅ Great job! You've completed this week's learning target. Keep up the momentum!`;
        extraData = {
          weeklyTargetsCompleted: progress.analytics.weeklyTargetsCompleted,
          currentStreak: progress.streaks.weeklyTargetStreak
        };
        break;
        
      case MilestoneType.SKILL_MASTERY:
        message = `🏆 Congratulations! You've mastered ${milestone.title}. This is a significant achievement!`;
        extraData = {
          skillsAcquired: progress.analytics.skillsAcquired,
          totalHours: progress.analytics.totalHoursSpent
        };
        break;
        
      case MilestoneType.STREAK_ACHIEVEMENT:
        message = `🔥 Amazing streak! You've maintained consistent learning for ${milestone.title}. You're unstoppable!`;
        extraData = {
          currentStreak: progress.streaks.currentStreak,
          longestStreak: progress.streaks.longestStreak
        };
        break;
        
      case MilestoneType.HOURS_MILESTONE:
        message = `⏰ Incredible dedication! You've invested ${milestone.title} in your learning journey!`;
        extraData = {
          totalHours: progress.analytics.totalHoursSpent,
          averageWeeklyHours: progress.analytics.averageWeeklyHours
        };
        break;
        
      default:
        message = `🎊 Congratulations on achieving ${milestone.title}! Every step forward counts!`;
        extraData = {
          overallProgress: progress.performance.completionRate
        };
    }
    
    return { message, extraData };
  }

  /**
   * Check for streak milestones
   */
  private async checkStreakMilestones(user: any, progress: any): Promise<void> {
    try {
      const { MilestoneType } = require('../types/progress');
      
      const streakMilestones = [7, 14, 30, 60, 100]; // Days
      const currentStreak = progress.streaks.currentStreak;
      
      // Check if current streak hits a milestone
      if (streakMilestones.includes(currentStreak)) {
        // Check if we've already celebrated this streak milestone
        const existingMilestone = progress.milestones.find((m: any) => 
          m.type === MilestoneType.STREAK_ACHIEVEMENT && 
          m.title.includes(`${currentStreak} days`)
        );
        
        if (!existingMilestone) {
          await this.createNotificationFromTemplate(
            user._id.toString(),
            NotificationType.STREAK_CELEBRATION,
            {
              firstName: user.profile.firstName,
              streakDays: currentStreak,
              milestoneTitle: `${currentStreak} Day Learning Streak`,
              celebrationMessage: `🔥 Incredible! You've maintained a ${currentStreak}-day learning streak!`,
              badge: this.getStreakBadge(currentStreak),
              points: currentStreak * 10,
              shareUrl: `/share/streak/${currentStreak}`,
              progressUrl: `/progress`
            }
          );
          
          logger.debug('Streak milestone notification sent', {
            userId: user._id,
            streakDays: currentStreak
          });
        }
      }
    } catch (error) {
      logger.error('Error checking streak milestones', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user._id
      });
    }
  }

  /**
   * Check for completion milestones
   */
  private async checkCompletionMilestones(user: any, progress: any, learningPath: any): Promise<void> {
    try {
      const completionRate = progress.performance.completionRate;
      const milestoneThresholds = [25, 50, 75, 90, 100]; // Percentage
      
      for (const threshold of milestoneThresholds) {
        if (completionRate >= threshold) {
          // Check if we've already celebrated this completion milestone
          const existingMilestone = progress.milestones.find((m: any) => 
            m.type === 'COMPLETION_MILESTONE' && 
            m.title.includes(`${threshold}%`)
          );
          
          if (!existingMilestone) {
            let celebrationMessage = '';
            let badge = '';
            
            switch (threshold) {
              case 25:
                celebrationMessage = '🌟 You\'re off to a great start! 25% complete!';
                badge = 'quarter-complete';
                break;
              case 50:
                celebrationMessage = '🎯 Halfway there! You\'re doing amazing!';
                badge = 'half-complete';
                break;
              case 75:
                celebrationMessage = '🚀 Three-quarters done! The finish line is in sight!';
                badge = 'three-quarters-complete';
                break;
              case 90:
                celebrationMessage = '🏁 Almost there! Just 10% to go!';
                badge = 'nearly-complete';
                break;
              case 100:
                celebrationMessage = '🎉 CONGRATULATIONS! You\'ve completed your learning path!';
                badge = 'path-complete';
                break;
            }
            
            await this.createNotificationFromTemplate(
              user._id.toString(),
              threshold === 100 ? NotificationType.COURSE_COMPLETION : NotificationType.MILESTONE_ACHIEVEMENT,
              {
                firstName: user.profile.firstName,
                completionRate: threshold,
                milestoneTitle: `${threshold}% Learning Path Complete`,
                celebrationMessage,
                badge,
                points: threshold * 5,
                learningPathTitle: learningPath.title,
                totalHours: progress.analytics.totalHoursSpent,
                skillsAcquired: progress.analytics.skillsAcquired,
                achievementUrl: `/achievements/completion/${threshold}`,
                shareUrl: `/share/completion/${threshold}`,
                progressUrl: `/progress`
              }
            );
            
            logger.debug('Completion milestone notification sent', {
              userId: user._id,
              completionRate: threshold
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error checking completion milestones', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user._id
      });
    }
  }

  /**
   * Get appropriate badge for streak milestone
   */
  private getStreakBadge(streakDays: number): string {
    if (streakDays >= 100) return 'streak-centurion';
    if (streakDays >= 60) return 'streak-champion';
    if (streakDays >= 30) return 'streak-master';
    if (streakDays >= 14) return 'streak-warrior';
    if (streakDays >= 7) return 'streak-starter';
    return 'streak-badge';
  }

  /**
   * Schedule a custom notification trigger
   */
  async scheduleCustomTrigger(
    triggerId: string,
    cronExpression: string,
    triggerFunction: () => Promise<void>
  ): Promise<void> {
    try {
      // Stop existing job if it exists
      const existingJob = this.scheduledJobs.get(triggerId);
      if (existingJob) {
        existingJob.stop();
        existingJob.destroy();
      }

      // Create new scheduled job
      const job = cron.schedule(cronExpression, async () => {
        try {
          await triggerFunction();
        } catch (error) {
          logger.error(`Error in custom trigger ${triggerId}`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            triggerId
          });
        }
      });

      // Start the job
      job.start();

      // Store job reference
      this.scheduledJobs.set(triggerId, job);

      logger.info('Custom notification trigger scheduled', {
        triggerId,
        cronExpression
      });
    } catch (error) {
      logger.error('Error scheduling custom trigger', {
        error: error instanceof Error ? error.message : 'Unknown error',
        triggerId,
        cronExpression
      });
      throw error;
    }
  }

  /**
   * Remove a custom notification trigger
   */
  removeCustomTrigger(triggerId: string): void {
    try {
      const job = this.scheduledJobs.get(triggerId);
      if (job) {
        job.stop();
        job.destroy();
        this.scheduledJobs.delete(triggerId);

        logger.info('Custom notification trigger removed', {
          triggerId
        });
      } else {
        logger.warn('Custom trigger not found', {
          triggerId
        });
      }
    } catch (error) {
      logger.error('Error removing custom trigger', {
        error: error instanceof Error ? error.message : 'Unknown error',
        triggerId
      });
      throw error;
    }
  }

  /**
   * Get status of all scheduled jobs
   */
  getSchedulerStatus(): {
    isRunning: boolean;
    jobCount: number;
    jobs: Array<{
      id: string;
      isRunning: boolean;
    }>;
  } {
    const jobs = Array.from(this.scheduledJobs.entries()).map(([id, job]) => ({
      id,
      isRunning: job.getStatus() === 'scheduled'
    }));

    return {
      isRunning: this.isRunning,
      jobCount: this.scheduledJobs.size,
      jobs
    };
  }

  /**
   * Create notification template for different types
   */
  async createNotificationFromTemplate(
    userId: string,
    type: NotificationType,
    templateData: Record<string, any>
  ): Promise<INotificationDocument> {
    try {
      let content;
      let priority = NotificationPriority.MEDIUM;
      let channels = [DeliveryChannel.EMAIL, DeliveryChannel.IN_APP];

      switch (type) {
        case NotificationType.WEEKLY_TARGET_REMINDER:
          content = {
            title: templateData['weekNumber'] ? 
              `Week ${templateData['weekNumber']} Learning Target` : 
              'Weekly Target Reminder',
            body: templateData['totalTargets'] > 1 ? 
              `Hi ${templateData['firstName']}, you have ${templateData['totalTargets']} learning targets this week. Start with: ${templateData['targetTitle']} (${templateData['estimatedHours']} hours estimated)` :
              `Hi ${templateData['firstName']}, don't forget to complete your weekly learning target: ${templateData['targetTitle']} (${templateData['estimatedHours']} hours estimated)`,
            actionUrl: templateData['learningPathUrl'],
            data: {
              targetId: templateData['targetId'],
              moduleTitle: templateData['moduleTitle'],
              dueDate: templateData['dueDate'],
              estimatedHours: templateData['estimatedHours'],
              weekNumber: templateData['weekNumber'],
              totalTargets: templateData['totalTargets']
            }
          };
          priority = NotificationPriority.MEDIUM;
          channels = [DeliveryChannel.EMAIL, DeliveryChannel.PUSH];
          break;

        case NotificationType.INACTIVITY_ALERT:
          const daysSince = templateData['daysSinceLastActivity'] || 3;
          const hasProgress = templateData['totalHoursSpent'] > 0;
          
          content = {
            title: daysSince >= 7 ? 'We miss you!' : 'Ready to continue learning?',
            body: hasProgress ? 
              `Hi ${templateData['firstName']}, you haven't been active for ${daysSince} days. You've already invested ${templateData['totalHoursSpent']} hours in learning - let's keep that momentum going!` :
              `Hi ${templateData['firstName']}, you haven't been active for ${daysSince} days. Continue your learning journey and build your skills!`,
            actionUrl: templateData['dashboardUrl'],
            data: {
              lastActivityDate: templateData['lastActivityDate'],
              daysSinceLastActivity: daysSince,
              totalHoursSpent: templateData['totalHoursSpent'],
              completionRate: templateData['completionRate'],
              currentStreak: templateData['currentStreak'],
              longestStreak: templateData['longestStreak']
            }
          };
          priority = daysSince >= 7 ? NotificationPriority.HIGH : NotificationPriority.LOW;
          channels = daysSince >= 7 ? [DeliveryChannel.EMAIL, DeliveryChannel.PUSH] : [DeliveryChannel.EMAIL];
          break;

        case NotificationType.MILESTONE_ACHIEVEMENT:
          const imageUrl = templateData['badge'] ? `/badges/${templateData['badge']}.png` : undefined;
          content = {
            title: templateData['milestoneTitle'] ? 
              `🎉 ${templateData['milestoneTitle']} Achieved!` : 
              'Congratulations! 🎉',
            body: templateData['celebrationMessage'] || 
              `Amazing work ${templateData['firstName']}! You've achieved: ${templateData['milestoneTitle']}`,
            actionUrl: templateData['achievementUrl'],
            ...(imageUrl && { imageUrl }),
            data: {
              milestoneId: templateData['milestoneId'],
              milestoneDescription: templateData['milestoneDescription'],
              points: templateData['points'],
              badge: templateData['badge'],
              shareUrl: templateData['shareUrl'],
              ...templateData['extraData']
            }
          };
          priority = NotificationPriority.HIGH;
          channels = [DeliveryChannel.EMAIL, DeliveryChannel.PUSH, DeliveryChannel.IN_APP];
          break;

        case NotificationType.WEEKLY_PROGRESS_SUMMARY:
          const isPlanning = templateData['upcomingTargets'];
          content = {
            title: isPlanning ? 
              `Week ${templateData['weekNumber']} Learning Plan` : 
              'Your Weekly Progress Summary',
            body: isPlanning ? 
              `Hi ${templateData['firstName']}, here's your plan for week ${templateData['weekNumber']}: ${templateData['totalHours']} hours of learning across ${templateData['upcomingTargets'].length} targets!` :
              `Hi ${templateData['firstName']}, here's your learning progress for this week: ${templateData['hoursLearned']} hours completed!`,
            actionUrl: templateData['progressUrl'],
            data: isPlanning ? {
              upcomingTargets: templateData['upcomingTargets'],
              totalHours: templateData['totalHours'],
              weekNumber: templateData['weekNumber']
            } : {
              hoursLearned: templateData['hoursLearned'],
              modulesCompleted: templateData['modulesCompleted'],
              streakDays: templateData['streakDays']
            }
          };
          priority = NotificationPriority.MEDIUM;
          channels = [DeliveryChannel.EMAIL];
          break;

        case NotificationType.MOTIVATIONAL_MESSAGE:
          content = {
            title: 'Keep Going! 💪',
            body: templateData['message'] || 'You\'re doing great! Keep up the excellent work on your learning journey.',
            actionUrl: templateData['actionUrl'] || templateData['dashboardUrl'],
            data: templateData['data'] || {
              totalHoursSpent: templateData['totalHoursSpent'],
              completionRate: templateData['completionRate'],
              currentStreak: templateData['currentStreak'],
              longestStreak: templateData['longestStreak']
            }
          };
          priority = NotificationPriority.LOW;
          channels = [DeliveryChannel.IN_APP, DeliveryChannel.PUSH];
          break;

        case NotificationType.STREAK_CELEBRATION:
          const streakImageUrl = templateData['badge'] ? `/badges/${templateData['badge']}.png` : undefined;
          content = {
            title: `🔥 ${templateData['streakDays']} Day Streak!`,
            body: templateData['celebrationMessage'] || 
              `Incredible! You've maintained a ${templateData['streakDays']}-day learning streak, ${templateData['firstName']}!`,
            actionUrl: templateData['shareUrl'],
            ...(streakImageUrl && { imageUrl: streakImageUrl }),
            data: {
              streakDays: templateData['streakDays'],
              milestoneTitle: templateData['milestoneTitle'],
              badge: templateData['badge'],
              points: templateData['points'],
              shareUrl: templateData['shareUrl']
            }
          };
          priority = NotificationPriority.HIGH;
          channels = [DeliveryChannel.EMAIL, DeliveryChannel.PUSH, DeliveryChannel.IN_APP];
          break;

        case NotificationType.COURSE_COMPLETION:
          content = {
            title: '🎓 Course Completed!',
            body: `Congratulations ${templateData['firstName']}! You've successfully completed ${templateData['learningPathTitle']}! You invested ${templateData['totalHours']} hours and acquired ${templateData['skillsAcquired']} new skills.`,
            actionUrl: templateData['achievementUrl'],
            data: {
              learningPathTitle: templateData['learningPathTitle'],
              totalHours: templateData['totalHours'],
              skillsAcquired: templateData['skillsAcquired'],
              completionRate: templateData['completionRate'],
              badge: templateData['badge'],
              points: templateData['points'],
              shareUrl: templateData['shareUrl']
            }
          };
          priority = NotificationPriority.URGENT;
          channels = [DeliveryChannel.EMAIL, DeliveryChannel.PUSH, DeliveryChannel.IN_APP];
          break;

        default:
          throw new Error(`Unsupported notification type: ${type}`);
      }

      return await NotificationService.createNotification({
        userId,
        type,
        priority,
        content,
        deliveryPreferences: {
          channels,
          frequency: NotificationFrequency.IMMEDIATE
        },
        templateData
      });
    } catch (error) {
      logger.error('Error creating notification from template', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        type,
        templateData
      });
      throw error;
    }
  }
}

export default new NotificationScheduler();