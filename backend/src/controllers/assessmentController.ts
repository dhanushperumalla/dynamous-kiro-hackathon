import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/types/auth';
import { 
  IAssessmentSubmission, 
  IAssessmentRetake
} from '@/types/assessment';
import { AssessmentResponse } from '@/models/Assessment';
import { Questionnaire } from '@/models/Questionnaire';
import { User } from '@/models/User';
import { InterestAnalysisService } from '@/services/interestAnalysisService';
import { AssessmentValidationService } from '@/services/assessmentValidationService';
import { logger } from '@/utils/logger';

/**
 * Assessment Controller
 * Handles assessment questionnaire retrieval, response submission, and processing
 */
export class AssessmentController {
  
  /**
   * Get the active assessment questionnaire
   * GET /api/assessment/questionnaire
   */
  static async getQuestionnaire(_req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching active questionnaire');
      
      // Get the active questionnaire
      const questionnaire = await Questionnaire.findOne({ isActive: true });
      
      if (!questionnaire) {
        res.status(404).json({
          success: false,
          message: 'No active questionnaire found',
          error: {
            code: 'QUESTIONNAIRE_NOT_FOUND',
            message: 'No active assessment questionnaire is currently available'
          }
        });
        return;
      }
      
      // Return questionnaire without internal fields
      const response = {
        success: true,
        message: 'Questionnaire retrieved successfully',
        data: {
          questionnaire: {
            id: questionnaire._id,
            version: questionnaire.version,
            title: questionnaire.title,
            description: questionnaire.description,
            estimatedDuration: questionnaire.estimatedDuration,
            questions: questionnaire.questions,
            categories: questionnaire.categories,
            totalQuestions: questionnaire.totalQuestions
          }
        }
      };
      
      logger.info('Questionnaire retrieved successfully', {
        version: questionnaire.version,
        questionCount: questionnaire.totalQuestions
      });
      
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching questionnaire', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch questionnaire',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching the questionnaire'
        }
      });
    }
  }
  
  /**
   * Start a new assessment for the authenticated user
   * POST /api/assessment/start
   */
  static async startAssessment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated to start assessment'
          }
        });
        return;
      }
      
      logger.info('Starting new assessment', { userId });
      
      // Get active questionnaire
      const questionnaire = await Questionnaire.findOne({ isActive: true });
      if (!questionnaire) {
        res.status(404).json({
          success: false,
          message: 'No active questionnaire found',
          error: {
            code: 'QUESTIONNAIRE_NOT_FOUND',
            message: 'No active assessment questionnaire is currently available'
          }
        });
        return;
      }
      
      // Check if user already has ANY assessment (complete or incomplete)
      const existingAssessment = await AssessmentResponse.findOne({
        userId
      }).sort({ createdAt: -1 });
      
      if (existingAssessment) {
        // If assessment is complete, user should retake instead of starting new
        if (existingAssessment.isComplete) {
          res.status(400).json({
            success: false,
            message: 'Assessment already completed',
            error: {
              code: 'ASSESSMENT_ALREADY_COMPLETED',
              message: 'You have already completed an assessment. Use retake to start a new one.'
            },
            data: {
              existingAssessment: {
                id: existingAssessment._id,
                completedAt: existingAssessment.completedAt,
                isComplete: existingAssessment.isComplete
              }
            }
          });
          return;
        }
        
        // If assessment is incomplete, return the existing one
        logger.info('Returning existing incomplete assessment', {
          userId,
          assessmentId: existingAssessment._id
        });
        
        const completionPercentage = existingAssessment.totalQuestions > 0 ? 
          Math.round((existingAssessment.answeredQuestions / existingAssessment.totalQuestions) * 100) : 0;
        
        res.status(200).json({
          success: true,
          message: 'Existing incomplete assessment found',
          data: {
            assessment: {
              id: existingAssessment._id,
              version: existingAssessment.version,
              startedAt: existingAssessment.startedAt,
              progress: {
                totalQuestions: existingAssessment.totalQuestions,
                answeredQuestions: existingAssessment.answeredQuestions,
                completionPercentage: completionPercentage,
                isComplete: existingAssessment.isComplete,
                averageResponseTime: existingAssessment.averageResponseTime
              },
              responses: existingAssessment.responses
            }
          }
        });
        return;
      }
      
      // Create new assessment
      const newAssessment = new AssessmentResponse({
        userId,
        version: questionnaire.version,
        totalQuestions: questionnaire.totalQuestions,
        responses: [],
        startedAt: new Date(),
        isComplete: false
      });
      
      await newAssessment.save();
      
      logger.info('New assessment created', {
        userId,
        assessmentId: newAssessment._id,
        version: questionnaire.version
      });
      
      const newCompletionPercentage = newAssessment.totalQuestions > 0 ? 
        Math.round((newAssessment.answeredQuestions / newAssessment.totalQuestions) * 100) : 0;
      
      res.status(201).json({
        success: true,
        message: 'Assessment started successfully',
        data: {
          assessment: {
            id: newAssessment._id,
            version: newAssessment.version,
            startedAt: newAssessment.startedAt,
            progress: {
              totalQuestions: newAssessment.totalQuestions,
              answeredQuestions: newAssessment.answeredQuestions,
              completionPercentage: newCompletionPercentage,
              isComplete: newAssessment.isComplete,
              averageResponseTime: newAssessment.averageResponseTime
            },
            responses: []
          }
        }
      });
      
    } catch (error) {
      logger.error('Error starting assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to start assessment',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while starting the assessment'
        }
      });
    }
  }
  
  /**
   * Submit assessment responses (partial or complete)
   * POST /api/assessment/submit
   */
  static async submitResponses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated to submit responses'
          }
        });
        return;
      }
      
      const submission: IAssessmentSubmission = req.body;
      
      if (!submission.responses || !Array.isArray(submission.responses)) {
        res.status(400).json({
          success: false,
          message: 'Invalid submission format',
          error: {
            code: 'INVALID_REQUEST',
            message: 'Responses array is required'
          }
        });
        return;
      }
      
      logger.info('Processing assessment submission', {
        userId,
        responseCount: submission.responses.length,
        isPartial: submission.isPartial
      });
      
      // Get active questionnaire
      const questionnaire = await Questionnaire.findOne({ isActive: true });
      if (!questionnaire) {
        res.status(404).json({
          success: false,
          message: 'No active questionnaire found',
          error: {
            code: 'QUESTIONNAIRE_NOT_FOUND',
            message: 'No active assessment questionnaire is currently available'
          }
        });
        return;
      }
      
      // Find or create assessment
      let assessment = await AssessmentResponse.findOne({
        userId,
        version: questionnaire.version,
        isComplete: false
      });
      
      if (!assessment) {
        // Create new assessment if none exists
        assessment = new AssessmentResponse({
          userId,
          version: questionnaire.version,
          totalQuestions: questionnaire.totalQuestions,
          responses: [],
          startedAt: new Date(),
          isComplete: false
        });
      }
      
      // Add new responses manually (since addResponse method has type issues)
      for (const response of submission.responses) {
        // Remove existing response for the same question if it exists
        assessment.responses = assessment.responses.filter(r => r.questionId !== response.questionId);
        // Add new response
        assessment.responses.push(response);
      }
      
      // Save to trigger pre-save middleware
      await assessment.save();
      
      // Debug logging after save
      logger.info('Assessment saved after adding responses', {
        userId,
        assessmentId: assessment._id,
        answeredQuestions: assessment.answeredQuestions,
        totalQuestions: assessment.totalQuestions,
        isComplete: assessment.isComplete,
        responsesCount: assessment.responses.length
      });
      
      // Validate responses
      const validation = await AssessmentValidationService.validateAssessment(assessment, questionnaire);
      
      logger.info('Assessment validation completed', {
        userId,
        assessmentId: assessment._id,
        isValid: validation.isValid,
        completeness: validation.completeness,
        isPartial: submission.isPartial
      });
      
      if (!validation.isValid && !submission.isPartial) {
        res.status(400).json({
          success: false,
          message: 'Assessment validation failed',
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Assessment responses contain errors',
            details: validation.errors
          },
          data: {
            validation: {
              errors: validation.errors,
              warnings: validation.warnings,
              completeness: validation.completeness,
              missingRequired: validation.missingRequired
            }
          }
        });
        return;
      }
      
      // Check if assessment should be marked as complete
      const isNowComplete = assessment.answeredQuestions >= assessment.totalQuestions;
      
      logger.info('Checking assessment completion status', {
        userId,
        assessmentId: assessment._id,
        answeredQuestions: assessment.answeredQuestions,
        totalQuestions: assessment.totalQuestions,
        isNowComplete,
        wasAlreadyComplete: assessment.isComplete,
        isPartial: submission.isPartial
      });
      
      // Generate interest profile if assessment is complete
      let interestProfile = assessment.interestProfile; // Keep existing profile if any
      
      if (isNowComplete && !submission.isPartial) {
        try {
          logger.info('Generating interest profile for completed assessment', {
            userId,
            assessmentId: assessment._id,
            responseCount: assessment.responses.length
          });
          
          interestProfile = await InterestAnalysisService.analyzeResponses(
            assessment.responses,
            questionnaire.questions
          );
          
          assessment.interestProfile = interestProfile;
          assessment.isComplete = true;
          assessment.completedAt = new Date();
          
          logger.info('Interest profile generated and assessment marked complete', {
            userId,
            assessmentId: assessment._id,
            confidence: interestProfile.confidence,
            topDimensions: interestProfile.topDimensions.slice(0, 3)
          });
          
          // Update user stats
          await User.findByIdAndUpdate(userId, {
            'stats.assessmentCompleted': true
          });
          
        } catch (analysisError) {
          logger.error('Error analyzing assessment responses', {
            error: analysisError instanceof Error ? analysisError.message : 'Unknown error',
            userId,
            assessmentId: assessment._id
          });
          
          // Mark as complete even if analysis fails - can be processed later
          assessment.isComplete = true;
          assessment.completedAt = new Date();
          
          logger.info('Assessment marked complete despite analysis error', {
            userId,
            assessmentId: assessment._id
          });
        }
      }
      
      await assessment.save();
      
      // Final logging after save
      logger.info('Assessment saved with final state', {
        userId,
        assessmentId: assessment._id,
        isComplete: assessment.isComplete,
        hasInterestProfile: !!assessment.interestProfile,
        answeredQuestions: assessment.answeredQuestions,
        totalQuestions: assessment.totalQuestions
      });
      
      const completionPercentage = assessment.totalQuestions > 0 ? 
        Math.round((assessment.answeredQuestions / assessment.totalQuestions) * 100) : 0;
      
      const responseData = {
        success: true,
        message: assessment.isComplete ? 'Assessment completed successfully' : 'Responses saved successfully',
        data: {
          assessment: {
            id: assessment._id,
            version: assessment.version,
            startedAt: assessment.startedAt,
            completedAt: assessment.completedAt,
            isComplete: assessment.isComplete,
            progress: {
              totalQuestions: assessment.totalQuestions,
              answeredQuestions: assessment.answeredQuestions,
              completionPercentage: completionPercentage,
              isComplete: assessment.isComplete,
              averageResponseTime: assessment.averageResponseTime
            },
            interestProfile: interestProfile
          },
          validation: {
            isValid: validation.isValid,
            warnings: validation.warnings,
            completeness: validation.completeness
          }
        }
      };
      
      res.status(200).json(responseData);
      
    } catch (error) {
      logger.error('Error submitting assessment responses', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to submit responses',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while processing the assessment submission'
        }
      });
    }
  }
  
  /**
   * Get user's assessment results
   * GET /api/assessment/results
   */
  static async getResults(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated to view results'
          }
        });
        return;
      }
      
      logger.info('Fetching assessment results', { userId });
      
      // Get the latest completed assessment
      const assessment = await AssessmentResponse.findOne({
        userId,
        isComplete: true
      }).sort({ completedAt: -1 });
      
      if (!assessment) {
        res.status(404).json({
          success: false,
          message: 'No completed assessment found',
          error: {
            code: 'ASSESSMENT_NOT_FOUND',
            message: 'No completed assessment found for this user'
          }
        });
        return;
      }
      
      const completionPercentage = assessment.totalQuestions > 0 ? 
        Math.round((assessment.answeredQuestions / assessment.totalQuestions) * 100) : 0;
      
      // Calculate total completion time
      const totalCompletionTime = assessment.completedAt && assessment.startedAt ? 
        assessment.completedAt.getTime() - assessment.startedAt.getTime() : null;
      
      // Debug logging
      logger.info('Assessment results data', {
        userId,
        assessmentId: assessment._id,
        isComplete: assessment.isComplete,
        hasInterestProfile: !!assessment.interestProfile,
        interestProfileKeys: assessment.interestProfile ? Object.keys(assessment.interestProfile) : null
      });
      
      res.status(200).json({
        success: true,
        message: 'Assessment results retrieved successfully',
        data: {
          assessment: {
            id: assessment._id,
            version: assessment.version,
            startedAt: assessment.startedAt,
            completedAt: assessment.completedAt,
            isComplete: assessment.isComplete,
            progress: {
              totalQuestions: assessment.totalQuestions,
              answeredQuestions: assessment.answeredQuestions,
              completionPercentage: completionPercentage,
              isComplete: assessment.isComplete,
              averageResponseTime: assessment.averageResponseTime
            },
            interestProfile: assessment.interestProfile,
            totalCompletionTime: totalCompletionTime
          }
        }
      });
      
    } catch (error) {
      logger.error('Error fetching assessment results', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch results',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching assessment results'
        }
      });
    }
  }
  
  /**
   * Retake assessment (start a new assessment)
   * POST /api/assessment/retake
   */
  static async retakeAssessment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated to retake assessment'
          }
        });
        return;
      }
      
      const retakeData: IAssessmentRetake = req.body;
      
      logger.info('Processing assessment retake', {
        userId,
        reason: retakeData.reason,
        keepPreviousData: retakeData.keepPreviousData
      });
      
      // Get active questionnaire
      const questionnaire = await Questionnaire.findOne({ isActive: true });
      if (!questionnaire) {
        res.status(404).json({
          success: false,
          message: 'No active questionnaire found',
          error: {
            code: 'QUESTIONNAIRE_NOT_FOUND',
            message: 'No active assessment questionnaire is currently available'
          }
        });
        return;
      }
      
      // Get previous assessment if exists
      const previousAssessment = await AssessmentResponse.findOne({
        userId,
        isComplete: true
      }).sort({ completedAt: -1 });
      
      // Delete ALL previous assessments for this user (both complete and incomplete)
      // This ensures only one assessment exists per user at any time
      await AssessmentResponse.deleteMany({
        userId
      });
      
      logger.info('Previous assessments deleted for retake', {
        userId,
        previousAssessmentId: previousAssessment?._id
      });
      
      // Create new assessment
      const newAssessment = new AssessmentResponse({
        userId,
        version: questionnaire.version,
        totalQuestions: questionnaire.totalQuestions,
        responses: [],
        startedAt: new Date(),
        isComplete: false
      });
      
      await newAssessment.save();
      
      logger.info('Assessment retake started', {
        userId,
        newAssessmentId: newAssessment._id,
        previousAssessmentId: previousAssessment?._id
      });
      
      const completionPercentage = newAssessment.totalQuestions > 0 ? 
        Math.round((newAssessment.answeredQuestions / newAssessment.totalQuestions) * 100) : 0;
      
      res.status(201).json({
        success: true,
        message: 'Assessment retake started successfully',
        data: {
          assessment: {
            id: newAssessment._id,
            version: newAssessment.version,
            startedAt: newAssessment.startedAt,
            progress: {
              totalQuestions: newAssessment.totalQuestions,
              answeredQuestions: newAssessment.answeredQuestions,
              completionPercentage: completionPercentage,
              isComplete: newAssessment.isComplete,
              averageResponseTime: newAssessment.averageResponseTime
            },
            responses: []
          },
          previousAssessment: previousAssessment ? {
            id: previousAssessment._id,
            completedAt: previousAssessment.completedAt,
            interestProfile: previousAssessment.interestProfile
          } : null
        }
      });
      
    } catch (error) {
      logger.error('Error processing assessment retake', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to start assessment retake',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while starting the assessment retake'
        }
      });
    }
  }
  
  /**
   * Get assessment progress for the current user
   * GET /api/assessment/progress
   */
  static async getProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?._id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: {
            code: 'UNAUTHORIZED',
            message: 'User must be authenticated to view progress'
          }
        });
        return;
      }
      
      logger.info('Fetching assessment progress', { userId });
      
      // Get active questionnaire
      const questionnaire = await Questionnaire.findOne({ isActive: true });
      if (!questionnaire) {
        res.status(404).json({
          success: false,
          message: 'No active questionnaire found',
          error: {
            code: 'QUESTIONNAIRE_NOT_FOUND',
            message: 'No active assessment questionnaire is currently available'
          }
        });
        return;
      }
      
      // Get current assessment (prioritize completed assessments)
      let assessment = await AssessmentResponse.findOne({
        userId,
        isComplete: true
      }).sort({ completedAt: -1 });
      
      // If no completed assessment, get the latest incomplete one
      if (!assessment) {
        assessment = await AssessmentResponse.findOne({
          userId,
          isComplete: false
        }).sort({ createdAt: -1 });
      }
      
      // If still no assessment, get any assessment for this user
      if (!assessment) {
        assessment = await AssessmentResponse.findOne({
          userId
        }).sort({ createdAt: -1 });
      }
      
      if (!assessment) {
        res.status(404).json({
          success: false,
          message: 'No assessment found',
          error: {
            code: 'ASSESSMENT_NOT_FOUND',
            message: 'No assessment found for this user'
          }
        });
        return;
      }
      
      const completionPercentage = assessment.totalQuestions > 0 ? 
        Math.round((assessment.answeredQuestions / assessment.totalQuestions) * 100) : 0;
      
      // Debug logging
      logger.info('Assessment progress data', {
        userId,
        assessmentId: assessment._id,
        isComplete: assessment.isComplete,
        hasInterestProfile: !!assessment.interestProfile,
        completionPercentage
      });
      
      res.status(200).json({
        success: true,
        message: 'Assessment progress retrieved successfully',
        data: {
          progress: {
            totalQuestions: assessment.totalQuestions,
            answeredQuestions: assessment.answeredQuestions,
            completionPercentage: completionPercentage,
            isComplete: assessment.isComplete,
            averageResponseTime: assessment.averageResponseTime
          },
          assessment: {
            id: assessment._id,
            version: assessment.version,
            startedAt: assessment.startedAt,
            completedAt: assessment.completedAt,
            isComplete: assessment.isComplete
          }
        }
      });
      
    } catch (error) {
      logger.error('Error fetching assessment progress', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?._id
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch progress',
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred while fetching assessment progress'
        }
      });
    }
  }
}