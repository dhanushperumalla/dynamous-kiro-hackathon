
import { Response } from 'express';
import { AuthenticatedRequest } from '@/types/auth';
import { jobMatchingService } from '@/services/jobMatchingService';
import { JobMatch } from '@/models/JobMatch';
import { JobApplication } from '@/models/JobApplication';
import { JobPreferences } from '@/models/JobPreferences';
import { 
  IJobApplicationRequest,
  IJobPreferencesRequest,
  ApplicationStatus,
  JobType,
  ExperienceLevel,
  RemoteWorkPreference,
  SalaryPeriod
} from '@/types/job';
import { logger } from '@/utils/logger';
import mongoose from 'mongoose';

/**
 * Helper function to ensure userId is defined and convert to ObjectId
 */
const toObjectId = (userId: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(userId);
};

/**
 * Job Controller
 * Handles job matching, application tracking, and feedback functionality
 */
export class JobController {
  
  /**
   * Get job matches for a user
   * GET /api/jobs/matches
   */
  async getJobMatches(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user._id.toString();

      const {
        minMatchScore,
        limit = 50,
        applicationStatus,
        jobType,
        location,
        refresh = false
      } = req.query;

      logger.info('Getting job matches for user', {
        userId,
        minMatchScore,
        limit,
        applicationStatus,
        refresh
      });

      // If refresh is requested, generate new matches
      if (refresh === 'true') {
        const matchingResult = await jobMatchingService.findJobMatches(userId);
        
        res.json({
          success: true,
          data: {
            matches: matchingResult.jobMatches,
            totalMatches: matchingResult.totalMatches,
            averageMatchScore: matchingResult.averageMatchScore,
            criteria: matchingResult.criteria,
            lastUpdated: new Date(),
            processingTime: matchingResult.processingTime
          },
          message: 'Job matches refreshed successfully'
        });
        return;
      }

      // Get existing matches from database
      const options: any = {};
      if (minMatchScore) options.minMatchScore = parseInt(minMatchScore as string);
      if (limit) options.limit = parseInt(limit as string);
      if (applicationStatus) options.applicationStatus = applicationStatus;

      const matches = await jobMatchingService.getUserJobMatches(userId, options);

      // Apply additional filters
      let filteredMatches = matches;
      if (jobType) {
        filteredMatches = matches.filter(match => match.jobType === jobType);
      }
      if (location) {
        filteredMatches = matches.filter(match => 
          match.location.toLowerCase().includes((location as string).toLowerCase())
        );
      }

      res.json({
        success: true,
        data: {
          matches: filteredMatches,
          totalMatches: filteredMatches.length,
          lastUpdated: new Date()
        },
        message: 'Job matches retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting job matches', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id?.toString()
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve job matches',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get specific job match details
   * GET /api/jobs/matches/:matchId
   */
  async getJobMatchDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user._id.toString();
      const { matchId } = req.params;

      if (!matchId || !mongoose.Types.ObjectId.isValid(matchId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid match ID'
        });
        return;
      }

      const jobMatch = await JobMatch.findOne({
        _id: matchId,
        userId: toObjectId(userId),
        isActive: true
      });

      if (!jobMatch) {
        res.status(404).json({
          success: false,
          message: 'Job match not found'
        });
        return;
      }

      // Get skill gaps for this match
      const skillGaps = (jobMatch as any).getSkillGaps();
      
      // Check if user can apply
      const canApplyResult = (jobMatch as any).canApply();

      res.json({
        success: true,
        data: {
          match: jobMatch,
          skillGaps,
          canApply: canApplyResult.canApply,
          canApplyReason: canApplyResult.reason,
          skillMatchPercentage: (jobMatch as any).skillMatchPercentage,
          jobAgeInDays: (jobMatch as any).jobAgeInDays,
          daysUntilExpiry: (jobMatch as any).daysUntilExpiry
        },
        message: 'Job match details retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting job match details', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id?.toString(),
        matchId: req.params['matchId']
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve job match details',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Apply to a job
   * POST /api/jobs/apply
   */
  async applyToJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user._id.toString();
      const applicationData: IJobApplicationRequest = req.body;
      const { jobMatchId, coverLetter, resume, additionalDocuments, notes } = applicationData;

      if (!jobMatchId || !mongoose.Types.ObjectId.isValid(jobMatchId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid job match ID'
        });
        return;
      }

      // Check if job match exists and belongs to user
      const jobMatch = await JobMatch.findOne({
        _id: jobMatchId,
        userId: toObjectId(userId),
        isActive: true
      });

      if (!jobMatch) {
        res.status(404).json({
          success: false,
          message: 'Job match not found'
        });
        return;
      }

      // Check if user can apply
      const canApplyResult = (jobMatch as any).canApply();
      if (!canApplyResult.canApply) {
        res.status(400).json({
          success: false,
          message: canApplyResult.reason || 'Cannot apply to this job'
        });
        return;
      }

      // Check if application already exists
      const existingApplication = await JobApplication.findOne({
        jobMatchId: toObjectId(jobMatchId),
        userId: toObjectId(userId)
      });

      if (existingApplication) {
        res.status(400).json({
          success: false,
          message: 'Application already exists for this job'
        });
        return;
      }

      // Create new application
      const application = new JobApplication({
        userId: toObjectId(userId),
        jobMatchId: toObjectId(jobMatchId),
        applicationDate: new Date(),
        status: ApplicationStatus.APPLIED,
        coverLetter,
        resume,
        additionalDocuments: additionalDocuments || [],
        notes
      });

      await application.save();

      // Update job match application status
      jobMatch.applicationStatus = ApplicationStatus.APPLIED;
      await jobMatch.save();

      logger.info('Job application created', {
        applicationId: application._id,
        userId,
        jobMatchId,
        jobTitle: jobMatch.title,
        company: jobMatch.company
      });

      // Get next steps based on job match
      const nextSteps = [
        'Monitor your application status in the dashboard',
        'Prepare for potential interviews',
        'Continue applying to other relevant positions'
      ];

      if (jobMatch.matchScore < 70) {
        nextSteps.push('Consider improving skills identified in the skill gaps analysis');
      }

      res.status(201).json({
        success: true,
        data: {
          application,
          nextSteps
        },
        message: 'Application submitted successfully'
      });

    } catch (error) {
      logger.error('Error applying to job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id?.toString(),
        jobMatchId: req.body.jobMatchId
      });

      res.status(500).json({
        success: false,
        message: 'Failed to submit application',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user's job applications
   * GET /api/jobs/applications
   */
  async getJobApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user._id.toString();

      const {
        status,
        dateFrom,
        dateTo,
        limit = 50
      } = req.query;

      const options: any = { limit: parseInt(limit as string) };
      
      if (status) {
        if (Array.isArray(status)) {
          options.status = status;
        } else {
          options.status = status;
        }
      }
      
      if (dateFrom) {
        options.dateFrom = new Date(dateFrom as string);
      }
      
      if (dateTo) {
        options.dateTo = new Date(dateTo as string);
      }

      const applications = await (JobApplication as any).findByUser(userId, options);

      // Get application statistics
      const statistics = await (JobApplication as any).getApplicationStatistics(userId);

      res.json({
        success: true,
        data: {
          applications,
          statistics,
          totalApplications: applications.length
        },
        message: 'Job applications retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting job applications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id?.toString()
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve job applications',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update job application status
   * PUT /api/jobs/applications/:applicationId/status
   */
  async updateApplicationStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user._id.toString();
      const { applicationId } = req.params;
      const { status, notes } = req.body;

      if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid application ID'
        });
        return;
      }

      if (!Object.values(ApplicationStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid application status'
        });
        return;
      }

      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: toObjectId(userId)
      });

      if (!application) {
        res.status(404).json({
          success: false,
          message: 'Application not found'
        });
        return;
      }

      // Update application status
      await (application as any).updateStatus(status, notes);

      logger.info('Application status updated', {
        applicationId,
        userId,
        oldStatus: application.status,
        newStatus: status
      });

      res.json({
        success: true,
        data: {
          application
        },
        message: 'Application status updated successfully'
      });

    } catch (error) {
      logger.error('Error updating application status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id?.toString(),
        applicationId: req.params['applicationId']
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update application status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Submit job application feedback
   * POST /api/jobs/applications/:applicationId/feedback
   */
  async submitApplicationFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user._id.toString();
      const { applicationId } = req.params;
      const { rating, comments, interviewExperience, companyRating, wouldRecommend } = req.body;

      if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid application ID'
        });
        return;
      }

      // Validate feedback data
      if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        res.status(400).json({
          success: false,
          message: 'Rating must be an integer between 1 and 5'
        });
        return;
      }

      if (wouldRecommend === undefined || typeof wouldRecommend !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'Would recommend flag is required'
        });
        return;
      }

      const application = await JobApplication.findOne({
        _id: applicationId,
        userId: toObjectId(userId)
      });

      if (!application) {
        res.status(404).json({
          success: false,
          message: 'Application not found'
        });
        return;
      }

      // Update application with feedback
      application.feedback = {
        rating,
        comments,
        interviewExperience,
        companyRating,
        wouldRecommend,
        submittedAt: new Date()
      };

      await application.save();

      logger.info('Application feedback submitted', {
        applicationId,
        userId,
        rating,
        wouldRecommend
      });

      res.json({
        success: true,
        data: {
          feedback: application.feedback
        },
        message: 'Feedback submitted successfully'
      });

    } catch (error) {
      logger.error('Error submitting application feedback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id?.toString(),
        applicationId: req.params['applicationId']
      });

      res.status(500).json({
        success: false,
        message: 'Failed to submit feedback',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get or create job preferences
   * GET /api/jobs/preferences
   */
  async getJobPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user._id.toString();

      let preferences = await (JobPreferences as any).findByUser(userId);

      // Create default preferences if none exist
      if (!preferences) {
        preferences = await (JobPreferences as any).createDefault(userId);
        logger.info('Default job preferences created', { userId });
      }

      res.json({
        success: true,
        data: {
          preferences
        },
        message: 'Job preferences retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting job preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id?.toString()
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve job preferences',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update job preferences
   * PUT /api/jobs/preferences
   */
  async updateJobPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user._id.toString();
      const updates: IJobPreferencesRequest = req.body;

      // Validate enum values
      if (updates.remoteWork && !Object.values(RemoteWorkPreference).includes(updates.remoteWork)) {
        res.status(400).json({
          success: false,
          message: 'Invalid remote work preference'
        });
        return;
      }

      if (updates.jobTypes) {
        const invalidJobTypes = updates.jobTypes.filter(type => !Object.values(JobType).includes(type));
        if (invalidJobTypes.length > 0) {
          res.status(400).json({
            success: false,
            message: `Invalid job types: ${invalidJobTypes.join(', ')}`
          });
          return;
        }
      }

      if (updates.experienceLevels) {
        const invalidLevels = updates.experienceLevels.filter(level => !Object.values(ExperienceLevel).includes(level));
        if (invalidLevels.length > 0) {
          res.status(400).json({
            success: false,
            message: `Invalid experience levels: ${invalidLevels.join(', ')}`
          });
          return;
        }
      }

      // Validate salary expectations
      if (updates.salaryExpectations) {
        const { min, max, period } = updates.salaryExpectations;
        if (min && max && min > max) {
          res.status(400).json({
            success: false,
            message: 'Minimum salary cannot be greater than maximum salary'
          });
          return;
        }

        if (period && !Object.values(SalaryPeriod).includes(period)) {
          res.status(400).json({
            success: false,
            message: 'Invalid salary period'
          });
          return;
        }
      }

      let preferences = await (JobPreferences as any).findByUser(userId);

      if (!preferences) {
        // Create new preferences
        preferences = new JobPreferences({
          userId: toObjectId(userId),
          ...updates
        });
        await preferences.save();
      } else {
        // Update existing preferences
        await (preferences as any).updatePreferences(updates);
      }

      // Get recommended jobs based on updated preferences
      const recommendedJobs = await jobMatchingService.getUserJobMatches(userId, { limit: 10 });

      logger.info('Job preferences updated', {
        userId,
        updatedFields: Object.keys(updates)
      });

      res.json({
        success: true,
        data: {
          preferences,
          recommendedJobs
        },
        message: 'Job preferences updated successfully'
      });

    } catch (error) {
      logger.error('Error updating job preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id?.toString()
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update job preferences',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get job analytics for user
   * GET /api/jobs/analytics
   */
  async getJobAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user._id.toString();

      // Get match statistics
      const matchStats = await (JobMatch as any).getMatchStatistics(userId);
      
      // Get application statistics
      const applicationStats = await (JobApplication as any).getApplicationStatistics(userId);

      // Get preferences statistics
      const preferences = await (JobPreferences as any).findByUser(userId);
      const preferencesComplete = preferences ? (preferences as any).isComplete() : false;
      const missingPreferences = preferences ? (preferences as any).getMissingPreferences() : [];

      const analytics = {
        matchStatistics: matchStats,
        applicationStatistics: applicationStats,
        preferences: {
          isComplete: preferencesComplete,
          missing: missingPreferences
        },
        recommendations: {
          updateMatchScores: matchStats.totalMatches > 0 && matchStats.averageMatchScore < 50,
          improveProfile: missingPreferences.length > 0,
          applyToMoreJobs: applicationStats.totalApplications < 5 && matchStats.highQualityMatchRate > 20
        },
        lastUpdated: new Date()
      };

      res.json({
        success: true,
        data: analytics,
        message: 'Job analytics retrieved successfully'
      });

    } catch (error) {
      logger.error('Error getting job analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id?.toString()
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve job analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Refresh job matches for user
   * POST /api/jobs/matches/refresh
   */
  async refreshJobMatches(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user?._id) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.user._id.toString();
      const { criteria } = req.body;

      logger.info('Refreshing job matches for user', { userId });

      const matchingResult = await jobMatchingService.findJobMatches(userId, criteria);

      res.json({
        success: true,
        data: {
          matches: matchingResult.jobMatches,
          totalMatches: matchingResult.totalMatches,
          averageMatchScore: matchingResult.averageMatchScore,
          criteria: matchingResult.criteria,
          processingTime: matchingResult.processingTime,
          lastUpdated: new Date()
        },
        message: 'Job matches refreshed successfully'
      });

    } catch (error) {
      logger.error('Error refreshing job matches', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id?.toString()
      });

      res.status(500).json({
        success: false,
        message: 'Failed to refresh job matches',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const jobController = new JobController();