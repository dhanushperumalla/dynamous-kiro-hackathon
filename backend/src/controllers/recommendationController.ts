import { Response } from 'express';
import { RecommendationService } from '@/services/recommendationService';
import { CareerDomainService } from '@/services/careerDomainService';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/types/auth';
import { 
  RecommendationAlgorithm, 
  FeedbackType,
  DomainCategory,
  DifficultyLevel 
} from '@/types/recommendation';

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
 * Generate career recommendations for authenticated user
 */
export const generateRecommendations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to generate recommendations',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const {
      algorithm = RecommendationAlgorithm.HYBRID,
      maxRecommendations = 5,
      includeMarketData = true,
      filterByCategory
    } = req.body;

    // Get user's latest assessment
    const { AssessmentResponse } = require('@/models/Assessment');
    const latestAssessment = await AssessmentResponse.findOne({
      userId: req.user._id,
      isComplete: true
    }).sort({ completedAt: -1 });

    if (!latestAssessment) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'ASSESSMENT_REQUIRED',
          message: 'Please complete an interest assessment before generating recommendations',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    // Generate recommendations
    const recommendation = await RecommendationService.generateRecommendations(
      req.user._id.toString(),
      latestAssessment.interestProfile,
      algorithm,
      maxRecommendations
    );

    // Filter by category if specified
    let filteredDomains = recommendation.domains;
    if (filterByCategory && filterByCategory.length > 0) {
      filteredDomains = recommendation.domains.filter(domain => 
        filterByCategory.includes(domain.domain.category)
      );
    }

    logger.info('Career recommendations generated successfully', {
      requestId,
      userId: req.user._id,
      recommendationId: recommendation._id,
      algorithm,
      domainCount: filteredDomains.length,
      confidence: recommendation.confidence
    });

    const response = {
      success: true,
      data: {
        recommendations: filteredDomains,
        metadata: {
          recommendationId: recommendation._id,
          algorithm: recommendation.algorithm,
          confidence: recommendation.confidence,
          generatedAt: recommendation.generatedAt,
          totalDomains: filteredDomains.length,
          reasoning: recommendation.reasoning,
          includeMarketData
        }
      },
      message: 'Career recommendations generated successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Generate recommendations controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      type: error.type || 'RECOMMENDATION_GENERATION_ERROR',
      stack: error.stack
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'RECOMMENDATION_GENERATION_ERROR',
        message: error.message || 'Failed to generate recommendations',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Get user's latest recommendations
 */
export const getRecommendations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to retrieve recommendations',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const { includeInactive = false } = req.query;

    // Get user recommendations
    const recommendations = await RecommendationService.getUserRecommendations(
      req.user._id.toString(),
      !includeInactive
    );

    logger.debug('User recommendations retrieved', {
      requestId,
      userId: req.user._id,
      count: recommendations.length,
      includeInactive
    });

    const response = {
      success: true,
      data: {
        recommendations: recommendations.map(rec => ({
          id: rec._id,
          domains: rec.domains,
          algorithm: rec.algorithm,
          confidence: rec.confidence,
          reasoning: rec.reasoning,
          generatedAt: rec.generatedAt,
          isActive: rec.isActive,
          hasFeedback: !!rec.feedback
        })),
        metadata: {
          totalCount: recommendations.length,
          includeInactive: !!includeInactive
        }
      },
      message: 'Recommendations retrieved successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get recommendations controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      type: error.type || 'GET_RECOMMENDATIONS_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'GET_RECOMMENDATIONS_ERROR',
        message: error.message || 'Failed to retrieve recommendations',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Get latest recommendation for user
 */
export const getLatestRecommendation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to retrieve latest recommendation',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    // Get latest recommendation
    const recommendation = await RecommendationService.getLatestRecommendation(
      req.user._id.toString()
    );

    if (!recommendation) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'NO_RECOMMENDATIONS_FOUND',
          message: 'No recommendations found. Please generate recommendations first.',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    logger.debug('Latest recommendation retrieved', {
      requestId,
      userId: req.user._id,
      recommendationId: recommendation._id,
      algorithm: recommendation.algorithm,
      domainCount: recommendation.domains.length
    });

    const response = {
      success: true,
      data: {
        recommendation: {
          id: recommendation._id,
          domains: recommendation.domains,
          algorithm: recommendation.algorithm,
          confidence: recommendation.confidence,
          reasoning: recommendation.reasoning,
          generatedAt: recommendation.generatedAt,
          isActive: recommendation.isActive,
          hasFeedback: !!recommendation.feedback
        }
      },
      message: 'Latest recommendation retrieved successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get latest recommendation controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      type: error.type || 'GET_LATEST_RECOMMENDATION_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'GET_LATEST_RECOMMENDATION_ERROR',
        message: error.message || 'Failed to retrieve latest recommendation',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Submit feedback for a recommendation
 */
export const submitFeedback = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to submit feedback',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const {
      recommendationId,
      domainId,
      rating,
      feedback,
      comments,
      selectedDomain,
      rejectionReason
    } = req.body;

    // Validate required fields
    if (!recommendationId || !domainId || !rating || !feedback) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: recommendationId, domainId, rating, and feedback are required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rating must be between 1 and 5',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    // Validate feedback type
    if (!Object.values(FeedbackType).includes(feedback)) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid feedback type',
          details: { validTypes: Object.values(FeedbackType) },
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    // Submit feedback
    await RecommendationService.addRecommendationFeedback(
      recommendationId,
      domainId,
      rating,
      feedback,
      comments,
      selectedDomain,
      rejectionReason
    );

    logger.info('Recommendation feedback submitted successfully', {
      requestId,
      userId: req.user._id,
      recommendationId,
      domainId,
      rating,
      feedback
    });

    const response = {
      success: true,
      data: {
        message: 'Feedback submitted successfully'
      },
      message: 'Thank you for your feedback!'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Submit feedback controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      type: error.type || 'SUBMIT_FEEDBACK_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'SUBMIT_FEEDBACK_ERROR',
        message: error.message || 'Failed to submit feedback',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Get detailed information about a specific domain
 */
export const getDomainDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const { domainId } = req.params;
    const { includeRelated = true, includeSkillGap = false } = req.query;

    if (!domainId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Domain ID is required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    // Get domain details
    const domain = await CareerDomainService.getDomainById(domainId);

    if (!domain) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'DOMAIN_NOT_FOUND',
          message: 'Domain not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    // Get related domains if requested
    let relatedDomains: any[] = [];
    if (includeRelated && domain.relatedDomains.length > 0) {
      relatedDomains = await CareerDomainService.getDomainsByIds(
        domain.relatedDomains.map(id => id.toString())
      );
    }

    // Calculate skill gap if requested and user is authenticated
    let skillGap: any[] = [];
    if (includeSkillGap && req.user) {
      // Get user's latest assessment to calculate skill gap
      const { AssessmentResponse } = require('@/models/Assessment');
      const latestAssessment = await AssessmentResponse.findOne({
        userId: req.user._id,
        isComplete: true
      }).sort({ completedAt: -1 });

      if (latestAssessment) {
        // Calculate skill gap based on user's current skills vs domain requirements
        skillGap = domain.requiredSkills.map(skill => ({
          skill: skill.name,
          currentLevel: 2, // Assume basic level for new users
          requiredLevel: Math.min(10, skill.importance),
          gap: Math.max(0, Math.min(10, skill.importance) - 2),
          priority: Math.min(10, skill.importance) - 2 >= 6 ? 'critical' : 
                   Math.min(10, skill.importance) - 2 >= 4 ? 'high' :
                   Math.min(10, skill.importance) - 2 >= 2 ? 'medium' : 'low',
          learningPath: skill.learningResources.slice(0, 3)
        }));
      }
    }

    logger.debug('Domain details retrieved', {
      requestId,
      userId: req.user?._id,
      domainId,
      includeRelated,
      includeSkillGap,
      relatedDomainsCount: relatedDomains.length
    });

    const response = {
      success: true,
      data: {
        domain: domain.toJSON(),
        relatedDomains: relatedDomains.map(d => d.toJSON()),
        skillGap: skillGap,
        metadata: {
          includeRelated: !!includeRelated,
          includeSkillGap: !!includeSkillGap,
          relatedDomainsCount: relatedDomains.length,
          skillGapCount: skillGap.length
        }
      },
      message: 'Domain details retrieved successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get domain details controller error', {
      requestId,
      userId: req.user?._id,
      domainId: req.params['domainId'],
      error: error.message,
      type: error.type || 'GET_DOMAIN_DETAILS_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'GET_DOMAIN_DETAILS_ERROR',
        message: error.message || 'Failed to retrieve domain details',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Get all available domains with filtering and search
 */
export const getAllDomains = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    const {
      category,
      difficulty,
      search,
      tags,
      minSalary,
      maxSalary,
      sortBy = 'name',
      sortOrder = 'asc',
      limit = 20,
      offset = 0
    } = req.query;

    // Build filter options
    const filterOptions: any = {};
    
    if (category) {
      if (Object.values(DomainCategory).includes(category as DomainCategory)) {
        filterOptions.category = category;
      }
    }
    
    if (difficulty) {
      if (Object.values(DifficultyLevel).includes(difficulty as DifficultyLevel)) {
        filterOptions.difficulty = difficulty;
      }
    }

    if (minSalary || maxSalary) {
      filterOptions.salaryRange = {};
      if (minSalary) filterOptions.salaryRange.min = parseInt(minSalary as string);
      if (maxSalary) filterOptions.salaryRange.max = parseInt(maxSalary as string);
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filterOptions.tags = tagArray;
    }

    // Get domains with filtering
    let domains;
    if (search) {
      const searchQuery: any = {
        query: search as string,
        category: category as any,
        difficulty: difficulty as any,
        minSalary: minSalary ? parseInt(minSalary as string) : undefined,
        maxSalary: maxSalary ? parseInt(maxSalary as string) : undefined,
        tags: Array.isArray(tags) ? tags as string[] : tags ? [tags as string] : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as 'asc' | 'desc',
        limit: parseInt(limit as string) || 20,
        offset: parseInt(offset as string) || 0
      };
      
      // Remove undefined values
      Object.keys(searchQuery).forEach(key => {
        if (searchQuery[key] === undefined) {
          delete searchQuery[key];
        }
      });
      
      const searchResult = await CareerDomainService.searchDomains(searchQuery);
      domains = searchResult.domains;
    } else {
      domains = await CareerDomainService.getAllDomains(true);
      
      // Apply filtering manually if no search query
      if (category) {
        domains = domains.filter(d => d.category === category);
      }
      if (difficulty) {
        domains = domains.filter(d => d.difficulty === difficulty);
      }
      if (minSalary) {
        const minSal = parseInt(minSalary as string);
        domains = domains.filter(d => d.marketData.averageSalaryRange.median >= minSal);
      }
      if (maxSalary) {
        const maxSal = parseInt(maxSalary as string);
        domains = domains.filter(d => d.marketData.averageSalaryRange.median <= maxSal);
      }
      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        domains = domains.filter(d => 
          tagArray.some(tag => d.tags.includes(tag as string))
        );
      }
    }

    // Apply sorting
    const sortField = sortBy as string;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    domains.sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortField) {
        case 'demandScore':
          aValue = a.marketData.demandScore;
          bValue = b.marketData.demandScore;
          break;
        case 'salary':
          aValue = a.marketData.averageSalaryRange.median;
          bValue = b.marketData.averageSalaryRange.median;
          break;
        case 'growthRate':
          aValue = a.marketData.jobGrowthRate;
          bValue = b.marketData.jobGrowthRate;
          break;
        case 'timeToMastery':
          aValue = a.timeToMastery;
          bValue = b.timeToMastery;
          break;
        case 'name':
        default:
          aValue = a.name;
          bValue = b.name;
          break;
      }
      
      if (aValue < bValue) return -1 * sortDirection;
      if (aValue > bValue) return 1 * sortDirection;
      return 0;
    });

    // Apply pagination
    const startIndex = parseInt(offset as string) || 0;
    const limitNum = parseInt(limit as string) || 20;
    const paginatedDomains = domains.slice(startIndex, startIndex + limitNum);

    logger.debug('All domains retrieved', {
      requestId,
      userId: req.user?._id,
      totalCount: domains.length,
      returnedCount: paginatedDomains.length,
      filters: filterOptions,
      search,
      sortBy,
      sortOrder
    });

    const response = {
      success: true,
      data: {
        domains: paginatedDomains.map((d: any) => d.toJSON()),
        metadata: {
          totalCount: domains.length,
          returnedCount: paginatedDomains.length,
          offset: startIndex,
          limit: limitNum,
          hasMore: startIndex + limitNum < domains.length,
          filters: {
            category,
            difficulty,
            search,
            tags,
            minSalary,
            maxSalary
          },
          sorting: {
            sortBy,
            sortOrder
          }
        }
      },
      message: 'Domains retrieved successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get all domains controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      type: error.type || 'GET_ALL_DOMAINS_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'GET_ALL_DOMAINS_ERROR',
        message: error.message || 'Failed to retrieve domains',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Get recommendation statistics (admin/analytics endpoint)
 */
export const getRecommendationStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    // Get recommendation statistics
    const stats = await RecommendationService.getRecommendationStatistics();

    logger.debug('Recommendation statistics retrieved', {
      requestId,
      userId: req.user?._id,
      totalRecommendations: stats.totalRecommendations
    });

    const response = {
      success: true,
      data: {
        statistics: stats
      },
      message: 'Recommendation statistics retrieved successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get recommendation statistics controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      type: error.type || 'GET_STATISTICS_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'GET_STATISTICS_ERROR',
        message: error.message || 'Failed to retrieve statistics',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};