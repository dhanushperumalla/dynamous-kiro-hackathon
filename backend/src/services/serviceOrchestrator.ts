import { serviceRegistry } from '@/config/serviceRegistry';
import { logger } from '@/utils/logger';
import { User } from '@/models/User';
import { AssessmentResponse } from '@/models/Assessment';
import { Recommendation } from '@/models/Recommendation';
import LearningPath from '@/models/LearningPath';
import Progress from '@/models/Progress';
import { JobMatch } from '@/models/JobMatch';

/**
 * Service Orchestrator
 * Coordinates interactions between different microservices
 * Implements service-to-service communication patterns
 */
export class ServiceOrchestrator {
  /**
   * Complete user onboarding flow
   * Orchestrates: User -> Assessment -> Recommendations
   */
  async completeOnboarding(userId: string): Promise<{
    user: any;
    assessment: any;
    recommendations: any;
  }> {
    logger.info('Starting user onboarding orchestration', { userId });
    
    try {
      // Step 1: Get user data
      const user = await serviceRegistry.executeWithProtection(
        'user-service',
        async () => {
          const userData = await User.findById(userId);
          if (!userData) {
            throw new Error('User not found');
          }
          return userData;
        }
      );
      
      // Step 2: Get latest assessment
      const assessment = await serviceRegistry.executeWithProtection(
        'assessment-service',
        async () => {
          const assessmentData = await AssessmentResponse.findOne({ userId })
            .sort({ completedAt: -1 });
          
          if (!assessmentData) {
            throw new Error('No assessment found for user');
          }
          
          return assessmentData;
        }
      );
      
      // Step 3: Generate recommendations based on assessment
      const recommendations = await serviceRegistry.executeWithProtection(
        'recommendation-service',
        async () => {
          const recommendationData = await Recommendation.findOne({ userId })
            .sort({ createdAt: -1 });
          
          return recommendationData;
        }
      );
      
      logger.info('User onboarding orchestration completed', { 
        userId,
        hasAssessment: !!assessment,
        hasRecommendations: !!recommendations
      });
      
      return {
        user: user.toObject(),
        assessment: assessment.toObject(),
        recommendations: recommendations?.toObject()
      };
      
    } catch (error) {
      logger.error('User onboarding orchestration failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Create learning path flow
   * Orchestrates: Recommendations -> Learning Path -> Progress Tracking
   */
  async createLearningPathFlow(
    userId: string,
    domainId: string
  ): Promise<{
    learningPath: any;
    progress: any;
  }> {
    logger.info('Starting learning path creation orchestration', { 
      userId, 
      domainId 
    });
    
    try {
      // Step 1: Verify user has selected this domain
      await serviceRegistry.executeWithProtection(
        'recommendation-service',
        async () => {
          const rec = await Recommendation.findOne({ userId });
          if (!rec) {
            throw new Error('No recommendations found for user');
          }
          return rec;
        }
      );
      
      // Step 2: Create learning path
      const learningPath = await serviceRegistry.executeWithProtection(
        'learning-service',
        async () => {
          const path = await LearningPath.findOne({ userId, domainId })
            .sort({ createdAt: -1 });
          
          if (!path) {
            throw new Error('Learning path not found');
          }
          
          return path;
        }
      );
      
      // Step 3: Initialize progress tracking
      const progress = await serviceRegistry.executeWithProtection(
        'progress-service',
        async () => {
          let progressData = await Progress.findOne({ 
            userId, 
            learningPathId: learningPath._id 
          });
          
          if (!progressData) {
            // Create initial progress record with proper structure
            progressData = new Progress({
              userId,
              learningPathId: learningPath._id,
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
                totalWeeklyTargets: learningPath.modules.reduce(
                  (sum: number, m: any) => sum + (m.weeklyTargets?.length || 0), 
                  0
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
              snapshots: []
            });
            await progressData.save();
          }
          
          return progressData;
        }
      );
      
      logger.info('Learning path creation orchestration completed', {
        userId,
        domainId,
        learningPathId: learningPath._id,
        progressId: progress._id
      });
      
      return {
        learningPath: learningPath.toObject(),
        progress: progress.toObject()
      };
      
    } catch (error) {
      logger.error('Learning path creation orchestration failed', {
        userId,
        domainId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Progress update flow
   * Orchestrates: Progress -> Notifications -> Job Matching
   */
  async updateProgressFlow(
    userId: string,
    learningPathId: string,
    moduleId: string
  ): Promise<{
    progress: any;
    notifications: any[];
    jobMatches?: any[];
  }> {
    logger.info('Starting progress update orchestration', {
      userId,
      learningPathId,
      moduleId
    });
    
    try {
      // Step 1: Update progress
      const progress = await serviceRegistry.executeWithProtection(
        'progress-service',
        async () => {
          const progressData = await Progress.findOne({ 
            userId, 
            learningPathId 
          });
          
          if (!progressData) {
            throw new Error('Progress record not found');
          }
          
          // Record activity for module completion
          await progressData.recordActivity({
            type: 'MODULE_COMPLETED' as any,
            moduleId,
            title: `Completed module ${moduleId}`,
            hoursSpent: 0,
            skillsAcquired: []
          });
          
          // Calculate overall progress based on learning path
          const learningPath = await LearningPath.findById(learningPathId);
          if (learningPath) {
            const completedModules = progressData.activities.filter(
              (a: any) => a.type === 'MODULE_COMPLETED'
            ).length;
            const totalModules = learningPath.modules.length;
            const overallProgress = (completedModules / totalModules) * 100;
            
            // Create snapshot
            await progressData.createSnapshot(
              overallProgress,
              0, // weeklyProgress - would need calculation
              moduleId,
              1 // currentWeek - would need calculation
            );
          }
          
          return progressData;
        }
      );
      
      // Step 2: Trigger notifications for milestone achievements
      const notifications: any[] = [];
      
      // Check if user reached 80% completion for job matching
      let jobMatches: any[] | undefined;
      const latestSnapshot = progress.snapshots[progress.snapshots.length - 1];
      const overallProgress = latestSnapshot?.overallProgress || 0;
      
      if (overallProgress >= 80) {
        // Step 3: Trigger job matching
        jobMatches = await serviceRegistry.executeWithProtection(
          'job-service',
          async () => {
            const matches = await JobMatch.find({ userId })
              .sort({ matchScore: -1 })
              .limit(10);
            
            return matches.map(m => m.toObject());
          }
        );
        
        logger.info('Job matching triggered for user', {
          userId,
          progress: overallProgress,
          matchCount: jobMatches.length
        });
      }
      
      logger.info('Progress update orchestration completed', {
        userId,
        learningPathId,
        moduleId,
        overallProgress,
        jobMatchesTriggered: !!jobMatches
      });
      
      const result: {
        progress: any;
        notifications: any[];
        jobMatches?: any[];
      } = {
        progress: progress.toObject(),
        notifications
      };
      
      if (jobMatches) {
        result.jobMatches = jobMatches;
      }
      
      return result;
      
    } catch (error) {
      logger.error('Progress update orchestration failed', {
        userId,
        learningPathId,
        moduleId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Assessment retake flow
   * Orchestrates: Assessment -> Recommendations -> Learning Path Update
   */
  async assessmentRetakeFlow(
    userId: string,
    assessmentId: string
  ): Promise<{
    assessment: any;
    recommendations: any;
    learningPathsUpdated: number;
  }> {
    logger.info('Starting assessment retake orchestration', {
      userId,
      assessmentId
    });
    
    try {
      // Step 1: Get new assessment
      const assessment = await serviceRegistry.executeWithProtection(
        'assessment-service',
        async () => {
          const assessmentData = await AssessmentResponse.findById(assessmentId);
          if (!assessmentData) {
            throw new Error('Assessment not found');
          }
          return assessmentData;
        }
      );
      
      // Step 2: Generate new recommendations
      const recommendations = await serviceRegistry.executeWithProtection(
        'recommendation-service',
        async () => {
          const rec = await Recommendation.findOne({ userId })
            .sort({ createdAt: -1 });
          
          return rec;
        }
      );
      
      // Step 3: Check if learning paths need updating
      const learningPaths = await serviceRegistry.executeWithProtection(
        'learning-service',
        async () => {
          const paths = await LearningPath.find({ userId });
          return paths;
        }
      );
      
      logger.info('Assessment retake orchestration completed', {
        userId,
        assessmentId,
        learningPathsCount: learningPaths.length
      });
      
      return {
        assessment: assessment.toObject(),
        recommendations: recommendations?.toObject(),
        learningPathsUpdated: learningPaths.length
      };
      
    } catch (error) {
      logger.error('Assessment retake orchestration failed', {
        userId,
        assessmentId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * User dashboard data aggregation
   * Orchestrates: User -> Progress -> Recommendations -> Jobs
   */
  async getUserDashboard(userId: string): Promise<{
    user: any;
    progress: any[];
    recommendations: any;
    jobMatches: any[];
    notifications: any[];
  }> {
    logger.info('Starting dashboard data aggregation', { userId });
    
    try {
      // Execute all service calls in parallel for better performance
      const [user, progressData, recommendations, jobMatches] = await Promise.all([
        // User service
        serviceRegistry.executeWithProtection(
          'user-service',
          async () => {
            const userData = await User.findById(userId);
            if (!userData) {
              throw new Error('User not found');
            }
            return userData.toObject();
          }
        ),
        
        // Progress service
        serviceRegistry.executeWithProtection(
          'progress-service',
          async () => {
            const progress = await Progress.find({ userId });
            return progress.map((p: any) => p.toObject());
          }
        ),
        
        // Recommendation service
        serviceRegistry.executeWithProtection(
          'recommendation-service',
          async () => {
            const rec = await Recommendation.findOne({ userId })
              .sort({ createdAt: -1 });
            return rec?.toObject();
          }
        ),
        
        // Job service
        serviceRegistry.executeWithProtection(
          'job-service',
          async () => {
            const matches = await JobMatch.find({ userId })
              .sort({ matchScore: -1 })
              .limit(5);
            return matches.map(m => m.toObject());
          }
        )
      ]);
      
      logger.info('Dashboard data aggregation completed', {
        userId,
        progressCount: progressData.length,
        jobMatchCount: jobMatches.length
      });
      
      return {
        user,
        progress: progressData,
        recommendations,
        jobMatches,
        notifications: [] // Placeholder for notifications
      };
      
    } catch (error) {
      logger.error('Dashboard data aggregation failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Health check for all services
   * Returns health status of all microservices
   */
  async checkAllServicesHealth(): Promise<{
    healthy: string[];
    unhealthy: string[];
    details: Record<string, any>;
  }> {
    logger.info('Checking health of all services');
    
    const services = serviceRegistry.getAllServices();
    const healthy: string[] = [];
    const unhealthy: string[] = [];
    const details: Record<string, any> = {};
    
    for (const service of services) {
      const health = serviceRegistry.getHealth(service.name);
      
      if (health) {
        details[service.name] = {
          status: health.status,
          lastCheck: health.lastCheck,
          responseTime: health.responseTime,
          error: health.error
        };
        
        if (health.status === 'healthy') {
          healthy.push(service.name);
        } else {
          unhealthy.push(service.name);
        }
      }
    }
    
    logger.info('Service health check completed', {
      healthyCount: healthy.length,
      unhealthyCount: unhealthy.length
    });
    
    return {
      healthy,
      unhealthy,
      details
    };
  }
}

// Export singleton instance
export const serviceOrchestrator = new ServiceOrchestrator();
