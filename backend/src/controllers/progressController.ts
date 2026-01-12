import { Response } from 'express';
import { progressTrackingService } from '@/services/progressTrackingService';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/types/auth';
import { 
  IActivitySubmission, 
  AnalyticsTimeframe
} from '@/types/progress';

// Standard error response interface
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

/**
 * Get progress dashboard data for authenticated user
 * @route GET /api/progress/dashboard
 */
export const getDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const userId = req.user._id.toString();
    const dashboardData = await progressTrackingService.getDashboardData(userId);

    const response = {
      success: true,
      data: {
        dashboard: dashboardData
      }
    };

    logger.info('Dashboard data retrieved successfully', {
      requestId,
      userId,
      activitiesCount: dashboardData.recentActivities.length,
      recommendationsCount: dashboardData.recommendations.length
    });

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get dashboard controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Failed to retrieve dashboard data',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(500).json(errorResponse);
  }
};

/**
 * Get detailed analytics for authenticated user
 * @route GET /api/progress/analytics
 */
export const getAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const userId = req.user._id.toString();
    const timeframe = (req.query['timeframe'] as AnalyticsTimeframe) || AnalyticsTimeframe.ALL_TIME;

    // Validate timeframe
    if (!Object.values(AnalyticsTimeframe).includes(timeframe)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'INVALID_TIMEFRAME',
          message: 'Invalid timeframe parameter',
          details: `Valid timeframes: ${Object.values(AnalyticsTimeframe).join(', ')}`,
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    const analytics = await progressTrackingService.getUserAnalytics(userId, timeframe);

    if (!analytics) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'ANALYTICS_NOT_FOUND',
          message: 'No analytics data found for user',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    // Calculate additional insights
    const learningVelocity = await progressTrackingService.calculateLearningVelocity(userId);
    const progressPercentages = await progressTrackingService.calculateProgressPercentages(userId);

    const response = {
      success: true,
      data: {
        analytics,
        insights: {
          learningVelocity,
          progressPercentages
        },
        timeframe,
        generatedAt: new Date().toISOString()
      }
    };

    logger.info('Analytics data retrieved successfully', {
      requestId,
      userId,
      timeframe,
      totalHours: analytics.analytics.totalHoursSpent,
      skillsAcquired: analytics.analytics.skillsAcquired
    });

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get analytics controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to retrieve analytics data',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(500).json(errorResponse);
  }
};

/**
 * Get peer comparison and benchmarking data
 * @route GET /api/progress/peer-comparison
 */
export const getPeerComparison = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const userId = req.user._id.toString();
    const peerComparison = await progressTrackingService.getPeerComparison(userId);

    const response = {
      success: true,
      data: {
        peerComparison,
        generatedAt: new Date().toISOString()
      }
    };

    logger.info('Peer comparison data retrieved successfully', {
      requestId,
      userId,
      userRank: peerComparison.userRank,
      percentile: peerComparison.percentile,
      totalUsers: peerComparison.totalUsers
    });

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get peer comparison controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'PEER_COMPARISON_ERROR',
        message: 'Failed to retrieve peer comparison data',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(500).json(errorResponse);
  }
};

/**
 * Record a learning activity
 * @route POST /api/progress/activity
 */
export const recordActivity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const userId = req.user._id.toString();
    const activityData: IActivitySubmission = req.body;

    const updatedProgress = await progressTrackingService.recordActivity(userId, activityData);

    const response = {
      success: true,
      message: 'Activity recorded successfully',
      data: {
        progress: updatedProgress,
        activityId: updatedProgress.activities[updatedProgress.activities.length - 1]?.id
      }
    };

    logger.info('Activity recorded successfully', {
      requestId,
      userId,
      activityType: activityData.type,
      hoursSpent: activityData.hoursSpent,
      skillsAcquired: activityData.skillsAcquired?.length || 0
    });

    res.status(201).json(response);

  } catch (error: any) {
    logger.error('Record activity controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack,
      activityData: req.body
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'RECORD_ACTIVITY_ERROR',
        message: 'Failed to record activity',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(500).json(errorResponse);
  }
};

/**
 * Get progress summary for authenticated user
 * @route GET /api/progress/summary
 */
export const getProgressSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const userId = req.user._id.toString();
    
    // Get progress percentages and analytics
    const progressPercentages = await progressTrackingService.calculateProgressPercentages(userId);
    const analytics = await progressTrackingService.getUserAnalytics(userId, AnalyticsTimeframe.ALL_TIME);

    if (!analytics) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'PROGRESS_NOT_FOUND',
          message: 'No progress data found for user',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    const response = {
      success: true,
      data: {
        summary: {
          overallProgress: progressPercentages.overallProgress,
          weeklyProgress: progressPercentages.weeklyProgress,
          moduleProgress: progressPercentages.moduleProgress,
          totalHoursSpent: analytics.analytics.totalHoursSpent,
          activitiesCompleted: analytics.analytics.completedActivities,
          skillsAcquired: analytics.analytics.skillsAcquired,
          milestonesAchieved: analytics.analytics.milestonesAchieved,
          currentStreak: analytics.streaks.currentStreak,
          completionRate: analytics.performance.completionRate,
          learningVelocity: analytics.performance.learningVelocity,
          consistencyScore: analytics.performance.consistencyScore
        },
        lastUpdated: new Date().toISOString()
      }
    };

    logger.debug('Progress summary retrieved successfully', {
      requestId,
      userId,
      overallProgress: progressPercentages.overallProgress,
      totalHours: analytics.analytics.totalHoursSpent
    });

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get progress summary controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'PROGRESS_SUMMARY_ERROR',
        message: 'Failed to retrieve progress summary',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(500).json(errorResponse);
  }
};

/**
 * Initialize progress tracking for a user's learning path
 * @route POST /api/progress/initialize
 */
export const initializeProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const userId = req.user._id.toString();
    const { learningPathId } = req.body;

    if (!learningPathId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'LEARNING_PATH_ID_REQUIRED',
          message: 'Learning path ID is required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    const progress = await progressTrackingService.initializeProgress(userId, learningPathId);

    const response = {
      success: true,
      message: 'Progress tracking initialized successfully',
      data: {
        progress
      }
    };

    logger.info('Progress tracking initialized', {
      requestId,
      userId,
      learningPathId,
      progressId: progress._id
    });

    res.status(201).json(response);

  } catch (error: any) {
    logger.error('Initialize progress controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      stack: error.stack,
      learningPathId: req.body.learningPathId
    });

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: 'INITIALIZE_PROGRESS_ERROR',
        message: 'Failed to initialize progress tracking',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(500).json(errorResponse);
  }
};