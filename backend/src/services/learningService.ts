import LearningPath from '@/models/LearningPath';
import { User } from '@/models/User';
import { CareerDomain } from '@/models/CareerDomain';
import {
  ILearningPath,
  ILearningPathDocument,
  ICreateLearningPath,
  IUpdateLearningPath,
  ILearningPathResponse,
  IProgressUpdate,
  ILearningPathQuery,
  PathSortBy} from '@/types/learning';
import { LearningPathGenerationService } from './learningPathGenerationService';
import { PrerequisiteDependencyService } from './prerequisiteDependencyService';
import { DurationEstimationService } from './durationEstimationService';
import { validateLearningPath } from '@/utils/learningPathValidation';
import { logger } from '@/utils/logger';

/**
 * Comprehensive service for managing learning paths
 */
export class LearningService {
  /**
   * Generate a new personalized learning path
   */
  static async generateLearningPath(request: ICreateLearningPath): Promise<ILearningPathResponse> {
    try {
      logger.info('Generating new learning path', {
        userId: request.userId,
        domainId: request.domainId
      });

      // Validate user and domain exist
      const [user, domain] = await Promise.all([
        User.findById(request.userId),
        CareerDomain.findById(request.domainId)
      ]);

      if (!user) {
        throw new Error(`User not found: ${request.userId}`);
      }

      if (!domain) {
        throw new Error(`Career domain not found: ${request.domainId}`);
      }

      // Generate the learning path using the generation service
      const generatedPath = await LearningPathGenerationService.generateLearningPath(request);

      // Validate the generated path
      const validation = validateLearningPath(generatedPath);
      if (!validation.isValid) {
        logger.warn('Generated learning path has validation issues', {
          errors: validation.errors,
          warnings: validation.warnings
        });
        
        // Log warnings but don't fail for warnings only
        if (validation.errors.length > 0) {
          throw new Error(`Generated learning path is invalid: ${validation.errors.join(', ')}`);
        }
      }

      // Validate prerequisites
      const dependencyValidation = PrerequisiteDependencyService.validatePathDependencies(generatedPath);
      if (!dependencyValidation.isValid) {
        throw new Error(`Prerequisite validation failed: ${dependencyValidation.errors.join(', ')}`);
      }

      // Create the learning path in database
      const learningPath = await LearningPath.create(generatedPath);

      logger.info('Learning path generated and saved successfully', {
        pathId: learningPath._id,
        userId: request.userId,
        domainId: request.domainId,
        moduleCount: learningPath.modules.length,
        estimatedDuration: learningPath.estimatedDuration
      });

      return {
        success: true,
        data: {
          learningPath: learningPath.toJSON() as ILearningPath
        },
        message: 'Learning path generated successfully'
      };
    } catch (error) {
      logger.error('Error generating learning path', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        domainId: request.domainId
      });
      
      return {
        success: false,
        data: {
          learningPath: {} as ILearningPath
        },
        message: error instanceof Error ? error.message : 'Failed to generate learning path'
      };
    }
  }

  /**
   * Get learning path by ID
   */
  static async getLearningPath(pathId: string): Promise<ILearningPathDocument | null> {
    try {
      const learningPath = await LearningPath.findById(pathId)
        .populate('userId', 'email profile.firstName profile.lastName')
        .populate('domainId', 'name title description');

      if (!learningPath) {
        logger.warn('Learning path not found', { pathId });
        return null;
      }

      logger.debug('Retrieved learning path', {
        pathId,
        userId: learningPath.userId,
        domainId: learningPath.domainId
      });

      return learningPath;
    } catch (error) {
      logger.error('Error retrieving learning path', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathId
      });
      throw error;
    }
  }

  /**
   * Get learning paths for a user
   */
  static async getUserLearningPaths(userId: string): Promise<ILearningPathDocument[]> {
    try {
      const learningPaths = await LearningPath.findByUser(userId);

      logger.debug('Retrieved user learning paths', {
        userId,
        pathCount: learningPaths.length
      });

      return learningPaths;
    } catch (error) {
      logger.error('Error retrieving user learning paths', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Update learning path
   */
  static async updateLearningPath(
    pathId: string,
    updates: IUpdateLearningPath
  ): Promise<ILearningPathDocument | null> {
    try {
      const learningPath = await LearningPath.findByIdAndUpdate(
        pathId,
        updates,
        { new: true, runValidators: true }
      );

      if (!learningPath) {
        logger.warn('Learning path not found for update', { pathId });
        return null;
      }

      logger.info('Learning path updated successfully', {
        pathId,
        updatedFields: Object.keys(updates)
      });

      return learningPath;
    } catch (error) {
      logger.error('Error updating learning path', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathId,
        updates
      });
      throw error;
    }
  }

  /**
   * Update learning progress
   */
  static async updateProgress(
    pathId: string,
    progressUpdate: IProgressUpdate
  ): Promise<ILearningPathDocument | null> {
    try {
      const learningPath = await LearningPath.findById(pathId);
      
      if (!learningPath) {
        logger.warn('Learning path not found for progress update', { pathId });
        return null;
      }

      // Update progress using the model's instance method
      await learningPath.updateProgress(
        progressUpdate.moduleId || '',
        progressUpdate.weeklyTargetId
      );

      // Update additional progress data
      if (progressUpdate.hoursSpent) {
        learningPath.progress.totalHoursSpent += progressUpdate.hoursSpent;
        
        // Recalculate average weekly hours
        const weeksSinceStart = Math.max(1, Math.ceil(
          (Date.now() - learningPath.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
        ));
        learningPath.progress.averageWeeklyHours = 
          learningPath.progress.totalHoursSpent / weeksSinceStart;
      }

      if (progressUpdate.skillsAcquired) {
        progressUpdate.skillsAcquired.forEach(skill => {
          if (!learningPath.progress.skillsAcquired.includes(skill)) {
            learningPath.progress.skillsAcquired.push(skill);
          }
        });
      }

      await learningPath.save();

      logger.info('Learning progress updated successfully', {
        pathId,
        moduleId: progressUpdate.moduleId,
        weeklyTargetId: progressUpdate.weeklyTargetId,
        completed: progressUpdate.completed
      });

      return learningPath;
    } catch (error) {
      logger.error('Error updating learning progress', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathId,
        progressUpdate
      });
      throw error;
    }
  }

  /**
   * Check if user can start a module
   */
  static async canStartModule(
    pathId: string,
    moduleId: string
  ): Promise<{ canStart: boolean; reason?: string }> {
    try {
      const learningPath = await LearningPath.findById(pathId);
      
      if (!learningPath) {
        return { canStart: false, reason: 'Learning path not found' };
      }

      return learningPath.canStartModule(moduleId);
    } catch (error) {
      logger.error('Error checking module start eligibility', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathId,
        moduleId
      });
      return { canStart: false, reason: 'Error checking prerequisites' };
    }
  }

  /**
   * Get next available modules for a user
   */
  static async getNextAvailableModules(pathId: string): Promise<{
    availableModules: string[];
    recommendedNext: string | null;
    reasoning: string;
  }> {
    try {
      const learningPath = await LearningPath.findById(pathId);
      
      if (!learningPath) {
        throw new Error('Learning path not found');
      }

      const availableModules = PrerequisiteDependencyService.getNextAvailableModules(
        learningPath.modules,
        learningPath.progress.completedModules
      );

      // Recommend the next module based on order and difficulty
      let recommendedNext: string | null = null;
      let reasoning = 'No modules available';

      if (availableModules.length > 0) {
        // Sort by order and pick the first non-optional module
        const sortedModules = availableModules
          .sort((a, b) => a.order - b.order);
        
        const nextRequired = sortedModules.find(m => !m.isOptional);
        recommendedNext = nextRequired?.id || sortedModules[0]?.id || null;
        
        reasoning = nextRequired 
          ? 'Next required module in sequence'
          : 'Next available module (optional)';
      }

      return {
        availableModules: availableModules.map(m => m.id),
        recommendedNext,
        reasoning
      };
    } catch (error) {
      logger.error('Error getting next available modules', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathId
      });
      throw error;
    }
  }

  /**
   * Estimate remaining duration for a learning path
   */
  static async estimateRemainingDuration(pathId: string): Promise<{
    remainingWeeks: number;
    remainingHours: number;
    adjustedEstimate: number;
    confidence: number;
  }> {
    try {
      const learningPath = await LearningPath.findById(pathId);
      
      if (!learningPath) {
        throw new Error('Learning path not found');
      }

      const remainingModules = learningPath.modules.filter(
        module => !learningPath.progress.completedModules.includes(module.id)
      );

      // Calculate base remaining duration
      const remainingHours = remainingModules.reduce(
        (total, module) => total + module.estimatedHours,
        0
      );
      const remainingWeeks = Math.ceil(
        remainingHours / learningPath.personalization.availableHoursPerWeek
      );

      // Calculate adaptive adjustment based on actual progress
      const actualProgress = {
        completedHours: learningPath.progress.totalHoursSpent,
        completedModules: learningPath.progress.completedModules.length,
        totalModules: learningPath.modules.length,
        averageWeeklyHours: learningPath.progress.averageWeeklyHours,
        completionRate: learningPath.progress.weeklyTargetsMet / 
          Math.max(1, learningPath.progress.totalWeeklyTargets)
      };

      const adaptiveResult = DurationEstimationService.calculateAdaptiveDuration(
        remainingWeeks,
        actualProgress
      );

      return {
        remainingWeeks,
        remainingHours,
        adjustedEstimate: adaptiveResult.adjustedEstimate,
        confidence: 0.8 // Base confidence, could be enhanced
      };
    } catch (error) {
      logger.error('Error estimating remaining duration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathId
      });
      throw error;
    }
  }

  /**
   * Search and filter learning paths
   */
  static async searchLearningPaths(query: ILearningPathQuery): Promise<{
    paths: ILearningPathDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const {
        userId,
        domainId,
        difficulty,
        isActive = true,
        minDuration,
        maxDuration,
        skills,
        sortBy = PathSortBy.CREATED_AT,
        sortOrder = 'desc',
        limit = 20,
        offset = 0
      } = query;

      // Build MongoDB query
      const mongoQuery: any = {};

      if (userId) mongoQuery.userId = userId;
      if (domainId) mongoQuery.domainId = domainId;
      if (difficulty) mongoQuery.difficulty = difficulty;
      if (isActive !== undefined) mongoQuery.isActive = isActive;
      
      if (minDuration || maxDuration) {
        mongoQuery.estimatedDuration = {};
        if (minDuration) mongoQuery.estimatedDuration.$gte = minDuration;
        if (maxDuration) mongoQuery.estimatedDuration.$lte = maxDuration;
      }

      if (skills && skills.length > 0) {
        mongoQuery['modules.skills'] = { $in: skills };
      }

      // Build sort criteria
      const sortCriteria: any = {};
      switch (sortBy) {
        case PathSortBy.TITLE:
          sortCriteria.title = sortOrder === 'asc' ? 1 : -1;
          break;
        case PathSortBy.PROGRESS:
          sortCriteria['progress.overallProgress'] = sortOrder === 'asc' ? 1 : -1;
          break;
        case PathSortBy.DURATION:
          sortCriteria.estimatedDuration = sortOrder === 'asc' ? 1 : -1;
          break;
        case PathSortBy.DIFFICULTY:
          sortCriteria.difficulty = sortOrder === 'asc' ? 1 : -1;
          break;
        case PathSortBy.UPDATED_AT:
          sortCriteria.updatedAt = sortOrder === 'asc' ? 1 : -1;
          break;
        case PathSortBy.CREATED_AT:
        default:
          sortCriteria.createdAt = sortOrder === 'asc' ? 1 : -1;
      }

      // Execute query with pagination
      const [paths, total] = await Promise.all([
        LearningPath.find(mongoQuery)
          .sort(sortCriteria)
          .skip(offset)
          .limit(limit)
          .populate('userId', 'email profile.firstName profile.lastName')
          .populate('domainId', 'name title description'),
        LearningPath.countDocuments(mongoQuery)
      ]);

      const page = Math.floor(offset / limit) + 1;

      logger.debug('Learning path search completed', {
        query,
        resultsCount: paths.length,
        totalCount: total,
        page,
        limit
      });

      return {
        paths,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error searching learning paths', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      throw error;
    }
  }

  /**
   * Optimize learning path dependencies
   */
  static async optimizeLearningPath(pathId: string): Promise<ILearningPathDocument | null> {
    try {
      const learningPath = await LearningPath.findById(pathId);
      
      if (!learningPath) {
        logger.warn('Learning path not found for optimization', { pathId });
        return null;
      }

      // Optimize module dependencies
      const optimizedModules = PrerequisiteDependencyService.optimizeDependencies(
        learningPath.modules
      );

      // Update the learning path with optimized modules
      learningPath.modules = optimizedModules;
      await learningPath.save();

      logger.info('Learning path optimized successfully', {
        pathId,
        moduleCount: optimizedModules.length
      });

      return learningPath;
    } catch (error) {
      logger.error('Error optimizing learning path', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathId
      });
      throw error;
    }
  }

  /**
   * Get learning path analytics
   */
  static async getLearningPathAnalytics(pathId: string): Promise<{
    overallProgress: number;
    timeSpent: number;
    averageWeeklyHours: number;
    completionRate: number;
    skillsAcquired: number;
    milestones: number;
    estimatedCompletion: Date;
    performanceMetrics: {
      onTimeCompletion: number;
      engagementScore: number;
      streakWeeks: number;
    };
  }> {
    try {
      const learningPath = await LearningPath.findById(pathId);
      
      if (!learningPath) {
        throw new Error('Learning path not found');
      }

      const progress = learningPath.progress;
      const completionRate = progress.totalWeeklyTargets > 0 
        ? (progress.weeklyTargetsMet / progress.totalWeeklyTargets) * 100
        : 0;

      // Estimate completion date
      const remainingEstimate = await this.estimateRemainingDuration(pathId);
      const estimatedCompletion = new Date();
      estimatedCompletion.setDate(
        estimatedCompletion.getDate() + (remainingEstimate.adjustedEstimate * 7)
      );

      // Calculate performance metrics
      const onTimeCompletion = completionRate; // Simplified - could be more sophisticated
      const engagementScore = Math.min(100, 
        (progress.averageWeeklyHours / learningPath.personalization.availableHoursPerWeek) * 100
      );

      return {
        overallProgress: progress.overallProgress,
        timeSpent: progress.totalHoursSpent,
        averageWeeklyHours: progress.averageWeeklyHours,
        completionRate,
        skillsAcquired: progress.skillsAcquired.length,
        milestones: progress.milestones.length,
        estimatedCompletion,
        performanceMetrics: {
          onTimeCompletion,
          engagementScore,
          streakWeeks: progress.streakWeeks
        }
      };
    } catch (error) {
      logger.error('Error getting learning path analytics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathId
      });
      throw error;
    }
  }

  /**
   * Delete learning path (soft delete)
   */
  static async deleteLearningPath(pathId: string): Promise<boolean> {
    try {
      const learningPath = await LearningPath.findByIdAndUpdate(
        pathId,
        { isActive: false },
        { new: true }
      );

      if (!learningPath) {
        logger.warn('Learning path not found for deletion', { pathId });
        return false;
      }

      logger.info('Learning path deleted (soft delete)', {
        pathId,
        title: learningPath.title
      });

      return true;
    } catch (error) {
      logger.error('Error deleting learning path', {
        error: error instanceof Error ? error.message : 'Unknown error',
        pathId
      });
      throw error;
    }
  }

  /**
   * Validate learning path structure
   */
  static validateLearningPathStructure(learningPath: Partial<ILearningPath>): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    try {
      // Validate basic structure
      const basicValidation = validateLearningPath(learningPath);
      
      // Validate prerequisites
      const dependencyValidation = PrerequisiteDependencyService.validatePathDependencies(learningPath);

      return {
        isValid: basicValidation.isValid && dependencyValidation.isValid,
        errors: [...basicValidation.errors, ...dependencyValidation.errors],
        warnings: [...basicValidation.warnings, ...dependencyValidation.warnings],
        suggestions: [...basicValidation.suggestions, ...dependencyValidation.suggestions]
      };
    } catch (error) {
      logger.error('Error validating learning path structure', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        isValid: false,
        errors: ['Validation failed due to internal error'],
        warnings: [],
        suggestions: []
      };
    }
  }
}