import { 
  IAssessmentValidation, 
  IQuestionResponse, 
  IQuestion, 
  QuestionType,
  IAssessmentResponse 
} from '@/types/assessment';
import { Questionnaire } from '@/models/Questionnaire';
import { logger } from '@/utils/logger';

export class AssessmentValidationService {
  /**
   * Validate a complete assessment response
   */
  static async validateAssessment(
    assessmentResponse: IAssessmentResponse,
    questionnaire?: any
  ): Promise<IAssessmentValidation> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const missingRequired: string[] = [];

      // Get questionnaire if not provided
      if (!questionnaire) {
        questionnaire = await Questionnaire.findOne({ version: assessmentResponse.version });
        if (!questionnaire) {
          return {
            isValid: false,
            errors: [`Questionnaire version ${assessmentResponse.version} not found`],
            warnings: [],
            completeness: 0,
            missingRequired: []
          };
        }
      }

      // Validate individual responses
      const responseValidation = this.validateResponses(
        assessmentResponse.responses, 
        questionnaire.questions
      );
      
      errors.push(...responseValidation.errors);
      warnings.push(...responseValidation.warnings);

      // Check for required questions
      const requiredQuestions = questionnaire.questions.filter((q: IQuestion) => q.required);
      const answeredQuestionIds = new Set(assessmentResponse.responses.map(r => r.questionId));
      
      for (const question of requiredQuestions) {
        if (!answeredQuestionIds.has(question.id)) {
          missingRequired.push(question.id);
          errors.push(`Required question '${question.id}' is missing`);
        }
      }

      // Calculate completeness
      const totalQuestions = questionnaire.questions.length;
      const answeredQuestions = assessmentResponse.responses.length;
      const completeness = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

      // Validate completion consistency
      if (assessmentResponse.isComplete && completeness < 100) {
        errors.push('Assessment marked as complete but not all questions are answered');
      }

      if (assessmentResponse.isComplete && !assessmentResponse.completedAt) {
        errors.push('Assessment marked as complete but completion time is missing');
      }

      // Validate timing consistency
      if (assessmentResponse.completedAt && assessmentResponse.startedAt) {
        const totalTime = assessmentResponse.completedAt.getTime() - assessmentResponse.startedAt.getTime();
        if (totalTime < 0) {
          errors.push('Completion time cannot be before start time');
        }
        
        // Check for suspiciously fast completion
        const minExpectedTime = questionnaire.questions.length * 5000; // 5 seconds per question minimum
        if (totalTime < minExpectedTime) {
          warnings.push('Assessment completed unusually quickly');
        }
      }

      // Validate interest profile if present
      if (assessmentResponse.interestProfile) {
        const profileValidation = this.validateInterestProfile(assessmentResponse.interestProfile);
        errors.push(...profileValidation.errors);
        warnings.push(...profileValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        completeness,
        missingRequired
      };

    } catch (error) {
      logger.error('Error validating assessment', {
        error: error instanceof Error ? error.message : 'Unknown error',
        assessmentId: assessmentResponse._id,
        userId: assessmentResponse.userId
      });

      return {
        isValid: false,
        errors: ['Validation process failed'],
        warnings: [],
        completeness: 0,
        missingRequired: []
      };
    }
  }

  /**
   * Validate individual question responses
   */
  static validateResponses(
    responses: IQuestionResponse[], 
    questions: IQuestion[]
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Create question lookup map
      const questionMap = new Map(questions.map(q => [q.id, q]));

      // Check each response
      for (const response of responses) {
        const question = questionMap.get(response.questionId);
        
        if (!question) {
          errors.push(`Response for unknown question: ${response.questionId}`);
          continue;
        }

        // Validate response based on question type
        const responseValidation = this.validateSingleResponse(response, question);
        errors.push(...responseValidation.errors);
        warnings.push(...responseValidation.warnings);
      }

      // Check for duplicate responses
      const responseIds = responses.map(r => r.questionId);
      const duplicates = responseIds.filter((id, index) => responseIds.indexOf(id) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate responses found for questions: ${[...new Set(duplicates)].join(', ')}`);
      }

      // Analyze response patterns
      const patternAnalysis = this.analyzeResponsePatterns(responses);
      warnings.push(...patternAnalysis.warnings);

    } catch (error) {
      logger.error('Error validating responses', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseCount: responses.length
      });
      errors.push('Response validation failed');
    }

    return { errors, warnings };
  }

  /**
   * Validate a single question response
   */
  static validateSingleResponse(
    response: IQuestionResponse, 
    question: IQuestion
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate response time
      if (response.responseTime < 0) {
        errors.push(`Invalid response time for question ${question.id}: ${response.responseTime}`);
      } else if (response.responseTime < 500) {
        warnings.push(`Very fast response for question ${question.id}: ${response.responseTime}ms`);
      } else if (response.responseTime > 300000) { // 5 minutes
        warnings.push(`Very slow response for question ${question.id}: ${response.responseTime}ms`);
      }

      // Validate confidence score
      if (response.confidence !== undefined) {
        if (response.confidence < 1 || response.confidence > 5 || !Number.isInteger(response.confidence)) {
          errors.push(`Invalid confidence score for question ${question.id}: ${response.confidence}`);
        }
      }

      // Validate answer based on question type
      switch (question.type) {
        case QuestionType.MULTIPLE_CHOICE:
          if (typeof response.answer !== 'string') {
            errors.push(`Multiple choice answer must be a string for question ${question.id}`);
          } else if (question.options && !question.options.includes(response.answer)) {
            errors.push(`Invalid option selected for question ${question.id}: ${response.answer}`);
          }
          break;

        case QuestionType.RATING_SCALE:
          if (typeof response.answer !== 'number') {
            errors.push(`Rating scale answer must be a number for question ${question.id}`);
          } else {
            const numAnswer = response.answer as number;
            if (question.minValue !== undefined && numAnswer < question.minValue) {
              errors.push(`Answer below minimum value for question ${question.id}: ${numAnswer} < ${question.minValue}`);
            }
            if (question.maxValue !== undefined && numAnswer > question.maxValue) {
              errors.push(`Answer above maximum value for question ${question.id}: ${numAnswer} > ${question.maxValue}`);
            }
          }
          break;

        case QuestionType.TEXT_INPUT:
          if (typeof response.answer !== 'string') {
            errors.push(`Text input answer must be a string for question ${question.id}`);
          } else if ((response.answer as string).trim().length === 0) {
            errors.push(`Text input cannot be empty for question ${question.id}`);
          } else if ((response.answer as string).length > 1000) {
            warnings.push(`Very long text response for question ${question.id}: ${(response.answer as string).length} characters`);
          }
          break;

        case QuestionType.RANKING:
          if (!Array.isArray(response.answer)) {
            errors.push(`Ranking answer must be an array for question ${question.id}`);
          } else {
            const rankingAnswer = response.answer as string[];
            if (question.options) {
              // Check if all options are ranked
              const missingOptions = question.options.filter(opt => !rankingAnswer.includes(opt));
              const extraOptions = rankingAnswer.filter(opt => !question.options!.includes(opt));
              
              if (missingOptions.length > 0) {
                errors.push(`Missing options in ranking for question ${question.id}: ${missingOptions.join(', ')}`);
              }
              if (extraOptions.length > 0) {
                errors.push(`Invalid options in ranking for question ${question.id}: ${extraOptions.join(', ')}`);
              }
              
              // Check for duplicates
              if (rankingAnswer.length !== new Set(rankingAnswer).size) {
                errors.push(`Duplicate options in ranking for question ${question.id}`);
              }
            }
          }
          break;

        case QuestionType.BOOLEAN:
          if (typeof response.answer !== 'boolean') {
            errors.push(`Boolean answer must be true or false for question ${question.id}`);
          }
          break;

        default:
          errors.push(`Unknown question type for question ${question.id}: ${question.type}`);
      }

    } catch (error) {
      logger.error('Error validating single response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        questionId: question.id,
        questionType: question.type
      });
      errors.push(`Validation failed for question ${question.id}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate interest profile
   */
  static validateInterestProfile(profile: any): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate confidence score
      if (typeof profile.confidence !== 'number' || profile.confidence < 0 || profile.confidence > 100) {
        errors.push(`Invalid confidence score: ${profile.confidence}`);
      }

      // Validate completeness score
      if (typeof profile.completeness !== 'number' || profile.completeness < 0 || profile.completeness > 100) {
        errors.push(`Invalid completeness score: ${profile.completeness}`);
      }

      // Validate dimensions
      if (!profile.dimensions || typeof profile.dimensions !== 'object') {
        errors.push('Interest profile dimensions are missing or invalid');
      } else {
        for (const [dimension, score] of Object.entries(profile.dimensions)) {
          if (typeof score !== 'number' || (score as number) < 0 || (score as number) > 100) {
            errors.push(`Invalid score for dimension ${dimension}: ${score}`);
          }
        }
      }

      // Validate top dimensions
      if (profile.topDimensions && Array.isArray(profile.topDimensions)) {
        if (profile.topDimensions.length > 5) {
          warnings.push(`Too many top dimensions: ${profile.topDimensions.length} (recommended: 3-5)`);
        }
      }

      // Validate insights
      if (profile.insights && Array.isArray(profile.insights)) {
        for (const insight of profile.insights) {
          if (typeof insight !== 'string' || insight.length > 500) {
            warnings.push('Some insights are invalid or too long');
            break;
          }
        }
      }

    } catch (error) {
      logger.error('Error validating interest profile', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      errors.push('Interest profile validation failed');
    }

    return { errors, warnings };
  }

  /**
   * Analyze response patterns for anomalies
   */
  static analyzeResponsePatterns(responses: IQuestionResponse[]): { warnings: string[] } {
    const warnings: string[] = [];

    try {
      if (responses.length === 0) return { warnings };

      // Analyze response times
      const responseTimes = responses.map(r => r.responseTime);
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const fastResponses = responseTimes.filter(time => time < 1000).length;
      const slowResponses = responseTimes.filter(time => time > 60000).length;

      if (fastResponses > responses.length * 0.5) {
        warnings.push('More than 50% of responses were answered very quickly (< 1 second)');
      }

      if (slowResponses > responses.length * 0.2) {
        warnings.push('More than 20% of responses took longer than 1 minute');
      }

      // Analyze confidence patterns
      const confidenceScores = responses
        .filter(r => r.confidence !== undefined)
        .map(r => r.confidence!);
      
      if (confidenceScores.length > 0) {
        const avgConfidence = confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length;
        const lowConfidenceCount = confidenceScores.filter(conf => conf <= 2).length;
        
        if (avgConfidence < 2.5) {
          warnings.push('Overall low confidence in responses');
        }
        
        if (lowConfidenceCount > confidenceScores.length * 0.6) {
          warnings.push('More than 60% of responses have low confidence scores');
        }
      }

      // Check for response time consistency
      const timeVariance = this.calculateVariance(responseTimes);
      const timeStdDev = Math.sqrt(timeVariance);
      
      if (timeStdDev > avgResponseTime * 2) {
        warnings.push('Highly inconsistent response times detected');
      }

    } catch (error) {
      logger.error('Error analyzing response patterns', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseCount: responses.length
      });
      warnings.push('Response pattern analysis failed');
    }

    return { warnings };
  }

  /**
   * Calculate variance for a set of numbers
   */
  private static calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDifferences.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }
}