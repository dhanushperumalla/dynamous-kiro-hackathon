import { Response } from 'express';
import { LearningPathGenerationService } from '@/services/learningPathGenerationService';
import LearningPath from '@/models/LearningPath';
import { logger } from '@/utils/logger';
import { AuthenticatedRequest } from '@/types/auth';
import { 
  ICreateLearningPath,
  IUpdateLearningPath,
  PathSortBy
} from '@/types/learning';

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
 * Generate a personalized learning path for authenticated user
 */
export const generateLearningPath = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to generate learning path',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const {
      domainId,
      personalization,
      customizations
    } = req.body;

    // Validate required fields
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

    // Check if user already has an active learning path for this domain
    const existingPath = await LearningPath.findOne({
      userId: req.user._id,
      domainId,
      isActive: true
    });

    if (existingPath) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'LEARNING_PATH_EXISTS',
          message: 'An active learning path already exists for this domain',
          details: { existingPathId: existingPath._id },
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(409).json(errorResponse);
      return;
    }

    // Create learning path request
    const createRequest: ICreateLearningPath = {
      userId: req.user._id.toString(),
      domainId,
      personalization,
      customizations
    };

    // Generate learning path
    const learningPathData = await LearningPathGenerationService.generateLearningPath(createRequest);

    // Remove the empty id field before saving (Mongoose will generate it)
    const { id, ...pathDataWithoutId } = learningPathData;

    // Save to database
    const learningPath = new LearningPath(pathDataWithoutId);
    await learningPath.save();

    logger.info('Learning path generated successfully', {
      requestId,
      userId: req.user._id,
      domainId,
      pathId: learningPath._id,
      moduleCount: learningPath.modules.length,
      estimatedDuration: learningPath.estimatedDuration
    });

    const response = {
      success: true,
      data: {
        learningPath: learningPath.toJSON(),
        metadata: {
          pathId: learningPath._id,
          moduleCount: learningPath.modules.length,
          totalWeeklyTargets: learningPath.progress.totalWeeklyTargets,
          estimatedDuration: learningPath.estimatedDuration,
          difficulty: learningPath.difficulty
        }
      },
      message: 'Learning path generated successfully'
    };

    res.status(201).json(response);

  } catch (error: any) {
    logger.error('Generate learning path controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      type: error.type || 'LEARNING_PATH_GENERATION_ERROR',
      stack: error.stack
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'LEARNING_PATH_GENERATION_ERROR',
        message: error.message || 'Failed to generate learning path',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Get user's learning paths
 */
export const getLearningPaths = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to retrieve learning paths',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const { 
      includeInactive = false,
      domainId,
      difficulty,
      sortBy = PathSortBy.CREATED_AT,
      sortOrder = 'desc',
      limit = 10,
      offset = 0
    } = req.query;

    // Build query
    const query: any = { userId: req.user._id };
    
    if (!includeInactive) {
      query.isActive = true;
    }
    
    if (domainId) {
      query.domainId = domainId;
    }
    
    if (difficulty) {
      query.difficulty = difficulty;
    }

    // Build sort object
    const sortObj: any = {};
    sortObj[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Get learning paths with pagination
    const learningPaths = await LearningPath.find(query)
      .sort(sortObj)
      .limit(parseInt(limit as string))
      .skip(parseInt(offset as string))
      .populate('domainId', 'title description category difficulty')
      .exec();

    // Get total count for pagination
    const totalCount = await LearningPath.countDocuments(query);

    logger.debug('User learning paths retrieved', {
      requestId,
      userId: req.user._id,
      count: learningPaths.length,
      totalCount,
      includeInactive
    });

    const response = {
      success: true,
      data: {
        learningPaths: learningPaths.map(path => ({
          id: path._id,
          title: path.title,
          description: path.description,
          domain: path.domainId,
          difficulty: path.difficulty,
          estimatedDuration: path.estimatedDuration,
          progress: path.progress,
          isActive: path.isActive,
          createdAt: path.createdAt,
          updatedAt: path.updatedAt,
          moduleCount: path.modules.length
        })),
        metadata: {
          totalCount,
          returnedCount: learningPaths.length,
          offset: parseInt(offset as string),
          limit: parseInt(limit as string),
          hasMore: parseInt(offset as string) + learningPaths.length < totalCount
        }
      },
      message: 'Learning paths retrieved successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get learning paths controller error', {
      requestId,
      userId: req.user?._id,
      error: error.message,
      type: error.type || 'GET_LEARNING_PATHS_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'GET_LEARNING_PATHS_ERROR',
        message: error.message || 'Failed to retrieve learning paths',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Get specific learning path by ID
 */
export const getLearningPath = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to retrieve learning path',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const { pathId } = req.params;
    const { includeModules = true, includeProgress = true } = req.query;

    if (!pathId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Learning path ID is required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    // Get learning path
    const learningPath = await LearningPath.findOne({
      _id: pathId,
      userId: req.user._id
    }).populate('domainId', 'title description category difficulty requiredSkills');

    if (!learningPath) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'LEARNING_PATH_NOT_FOUND',
          message: 'Learning path not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    // Build response data
    const responseData: any = {
      id: learningPath._id,
      title: learningPath.title,
      description: learningPath.description,
      domain: learningPath.domainId,
      difficulty: learningPath.difficulty,
      estimatedDuration: learningPath.estimatedDuration,
      personalization: learningPath.personalization,
      isActive: learningPath.isActive,
      createdAt: learningPath.createdAt,
      updatedAt: learningPath.updatedAt
    };

    if (includeModules) {
      responseData.modules = learningPath.modules;
    } else {
      responseData.moduleCount = learningPath.modules.length;
    }

    if (includeProgress) {
      responseData.progress = learningPath.progress;
    }

    logger.debug('Learning path retrieved', {
      requestId,
      userId: req.user._id,
      pathId: learningPath._id,
      includeModules,
      includeProgress
    });

    const response = {
      success: true,
      data: {
        learningPath: responseData
      },
      message: 'Learning path retrieved successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get learning path controller error', {
      requestId,
      userId: req.user?._id,
      pathId: req.params['pathId'],
      error: error.message,
      type: error.type || 'GET_LEARNING_PATH_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'GET_LEARNING_PATH_ERROR',
        message: error.message || 'Failed to retrieve learning path',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Update learning path settings
 */
export const updateLearningPath = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to update learning path',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const { pathId } = req.params;
    const updateData: IUpdateLearningPath = req.body;

    if (!pathId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Learning path ID is required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    // Find and update learning path
    const learningPath = await LearningPath.findOne({
      _id: pathId,
      userId: req.user._id
    });

    if (!learningPath) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'LEARNING_PATH_NOT_FOUND',
          message: 'Learning path not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    // Update fields
    if (updateData.title !== undefined) {
      learningPath.title = updateData.title;
    }
    
    if (updateData.description !== undefined) {
      learningPath.description = updateData.description;
    }
    
    if (updateData.personalization !== undefined) {
      learningPath.personalization = {
        ...learningPath.personalization,
        ...updateData.personalization
      };
    }
    
    if (updateData.isActive !== undefined) {
      learningPath.isActive = updateData.isActive;
    }

    learningPath.updatedAt = new Date();
    await learningPath.save();

    logger.info('Learning path updated successfully', {
      requestId,
      userId: req.user._id,
      pathId: learningPath._id,
      updatedFields: Object.keys(updateData)
    });

    const response = {
      success: true,
      data: {
        learningPath: {
          id: learningPath._id,
          title: learningPath.title,
          description: learningPath.description,
          personalization: learningPath.personalization,
          isActive: learningPath.isActive,
          updatedAt: learningPath.updatedAt
        }
      },
      message: 'Learning path updated successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Update learning path controller error', {
      requestId,
      userId: req.user?._id,
      pathId: req.params['pathId'],
      error: error.message,
      type: error.type || 'UPDATE_LEARNING_PATH_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'UPDATE_LEARNING_PATH_ERROR',
        message: error.message || 'Failed to update learning path',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Get module content and details
 */
export const getModuleContent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to retrieve module content',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const { pathId, moduleId } = req.params;
    const { includeResources = true, includeWeeklyTargets = true } = req.query;

    if (!pathId || !moduleId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Learning path ID and module ID are required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    // Get learning path and find module
    const learningPath = await LearningPath.findOne({
      _id: pathId,
      userId: req.user._id
    });

    if (!learningPath) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'LEARNING_PATH_NOT_FOUND',
          message: 'Learning path not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    const module = learningPath.modules.find(m => m.id === moduleId);

    if (!module) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Module not found in learning path',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    // Check if user can access this module
    const canStart = learningPath.canStartModule(moduleId);
    
    // Build response data
    const moduleData: any = {
      id: module.id,
      title: module.title,
      description: module.description,
      order: module.order,
      prerequisites: module.prerequisites,
      estimatedHours: module.estimatedHours,
      difficulty: module.difficulty,
      skills: module.skills,
      isOptional: module.isOptional,
      completionCriteria: module.completionCriteria,
      canStart: canStart.canStart,
      canStartReason: canStart.reason,
      isCompleted: learningPath.progress.completedModules.includes(moduleId),
      isCurrent: learningPath.progress.currentModule === moduleId
    };

    if (includeWeeklyTargets) {
      moduleData.weeklyTargets = module.weeklyTargets;
    } else {
      moduleData.weeklyTargetCount = module.weeklyTargets.length;
    }

    if (includeResources) {
      moduleData.resources = module.resources;
    } else {
      moduleData.resourceCount = module.resources.length;
    }

    logger.debug('Module content retrieved', {
      requestId,
      userId: req.user._id,
      pathId,
      moduleId,
      canStart: canStart.canStart
    });

    const response = {
      success: true,
      data: {
        module: moduleData
      },
      message: 'Module content retrieved successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get module content controller error', {
      requestId,
      userId: req.user?._id,
      pathId: req.params['pathId'],
      moduleId: req.params['moduleId'],
      error: error.message,
      type: error.type || 'GET_MODULE_CONTENT_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'GET_MODULE_CONTENT_ERROR',
        message: error.message || 'Failed to retrieve module content',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Get weekly targets for a module
 */
export const getWeeklyTargets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to retrieve weekly targets',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const { pathId, moduleId } = req.params;
    const { week, includeTasks = true, includeCompleted = true } = req.query;

    if (!pathId || !moduleId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Learning path ID and module ID are required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    // Get learning path and find module
    const learningPath = await LearningPath.findOne({
      _id: pathId,
      userId: req.user._id
    });

    if (!learningPath) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'LEARNING_PATH_NOT_FOUND',
          message: 'Learning path not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    const module = learningPath.modules.find(m => m.id === moduleId);

    if (!module) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Module not found in learning path',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    // Filter weekly targets
    let weeklyTargets = module.weeklyTargets;

    if (week) {
      weeklyTargets = weeklyTargets.filter(target => target.week === parseInt(week as string));
    }

    if (!includeCompleted) {
      weeklyTargets = weeklyTargets.filter(target => !target.completed);
    }

    // Format response data
    const targetsData = weeklyTargets.map(target => ({
      id: target.id,
      moduleId: target.moduleId,
      week: target.week,
      title: target.title,
      description: target.description,
      estimatedHours: target.estimatedHours,
      dueDate: target.dueDate,
      priority: target.priority,
      skills: target.skills,
      resources: target.resources,
      completed: target.completed,
      completedAt: target.completedAt,
      completionNotes: target.completionNotes,
      actualHours: target.actualHours,
      tasks: includeTasks ? target.tasks : undefined,
      taskCount: target.tasks.length,
      completedTasks: target.tasks.filter(task => task.completed).length
    }));

    logger.debug('Weekly targets retrieved', {
      requestId,
      userId: req.user._id,
      pathId,
      moduleId,
      week,
      targetCount: targetsData.length
    });

    const response = {
      success: true,
      data: {
        weeklyTargets: targetsData,
        metadata: {
          moduleId,
          totalTargets: module.weeklyTargets.length,
          returnedTargets: targetsData.length,
          completedTargets: module.weeklyTargets.filter(t => t.completed).length
        }
      },
      message: 'Weekly targets retrieved successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Get weekly targets controller error', {
      requestId,
      userId: req.user?._id,
      pathId: req.params['pathId'],
      moduleId: req.params['moduleId'],
      error: error.message,
      type: error.type || 'GET_WEEKLY_TARGETS_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'GET_WEEKLY_TARGETS_ERROR',
        message: error.message || 'Failed to retrieve weekly targets',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Update weekly target completion status
 */
export const updateWeeklyTarget = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to update weekly target',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const { pathId, moduleId, targetId } = req.params;
    const { completed, hoursSpent, notes, taskUpdates } = req.body;

    if (!pathId || !moduleId || !targetId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Learning path ID, module ID, and target ID are required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    // Get learning path
    const learningPath = await LearningPath.findOne({
      _id: pathId,
      userId: req.user._id
    });

    if (!learningPath) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'LEARNING_PATH_NOT_FOUND',
          message: 'Learning path not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    // Find module and target
    const module = learningPath.modules.find(m => m.id === moduleId);
    if (!module) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'MODULE_NOT_FOUND',
          message: 'Module not found in learning path',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    const target = module.weeklyTargets.find(t => t.id === targetId);
    if (!target) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'WEEKLY_TARGET_NOT_FOUND',
          message: 'Weekly target not found in module',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    // Update target
    if (completed !== undefined) {
      target.completed = completed;
      if (completed) {
        target.completedAt = new Date();
      } else {
        delete target.completedAt;
      }
    }

    if (hoursSpent !== undefined) {
      target.actualHours = hoursSpent;
      learningPath.progress.totalHoursSpent += hoursSpent - (target.actualHours || 0);
    }

    if (notes !== undefined) {
      target.completionNotes = notes;
    }

    // Update individual tasks if provided
    if (taskUpdates && Array.isArray(taskUpdates)) {
      taskUpdates.forEach((taskUpdate: any) => {
        const task = target.tasks.find(t => t.id === taskUpdate.taskId);
        if (task) {
          if (taskUpdate.completed !== undefined) {
            task.completed = taskUpdate.completed;
            if (taskUpdate.completed) {
              task.completedAt = new Date();
            }
          }
          if (taskUpdate.notes !== undefined) {
            task.notes = taskUpdate.notes;
          }
        }
      });
    }

    // Update overall progress
    await learningPath.updateProgress(moduleId, targetId);

    logger.info('Weekly target updated successfully', {
      requestId,
      userId: req.user._id,
      pathId,
      moduleId,
      targetId,
      completed: target.completed,
      hoursSpent
    });

    const response = {
      success: true,
      data: {
        weeklyTarget: {
          id: target.id,
          completed: target.completed,
          completedAt: target.completedAt,
          actualHours: target.actualHours,
          completionNotes: target.completionNotes,
          tasks: target.tasks
        },
        progress: learningPath.progress
      },
      message: 'Weekly target updated successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Update weekly target controller error', {
      requestId,
      userId: req.user?._id,
      pathId: req.params['pathId'],
      moduleId: req.params['moduleId'],
      targetId: req.params['targetId'],
      error: error.message,
      type: error.type || 'UPDATE_WEEKLY_TARGET_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'UPDATE_WEEKLY_TARGET_ERROR',
        message: error.message || 'Failed to update weekly target',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};

/**
 * Delete learning path
 */
export const deleteLearningPath = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const requestId = req.headers['x-request-id'] as string || 'unknown';
  
  try {
    if (!req.user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required to delete learning path',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(401).json(errorResponse);
      return;
    }

    const { pathId } = req.params;

    if (!pathId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Learning path ID is required',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(400).json(errorResponse);
      return;
    }

    // Find and delete learning path
    const learningPath = await LearningPath.findOne({
      _id: pathId,
      userId: req.user._id
    });

    if (!learningPath) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: {
          code: 'LEARNING_PATH_NOT_FOUND',
          message: 'Learning path not found',
          timestamp: new Date().toISOString(),
          requestId
        }
      };
      
      res.status(404).json(errorResponse);
      return;
    }

    // Store info before deletion
    const deletedPathInfo = {
      id: learningPath._id,
      title: learningPath.title
    };

    // Delete the learning path
    await LearningPath.deleteOne({
      _id: pathId,
      userId: req.user._id
    });

    logger.info('Learning path deleted successfully', {
      requestId,
      userId: req.user._id,
      pathId: deletedPathInfo.id,
      title: deletedPathInfo.title
    });

    const response = {
      success: true,
      data: {
        deletedPath: deletedPathInfo
      },
      message: 'Learning path deleted successfully'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Delete learning path controller error', {
      requestId,
      userId: req.user?._id,
      pathId: req.params['pathId'],
      error: error.message,
      type: error.type || 'DELETE_LEARNING_PATH_ERROR'
    });

    const statusCode = error.statusCode || 500;
    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: error.type || 'DELETE_LEARNING_PATH_ERROR',
        message: error.message || 'Failed to delete learning path',
        timestamp: new Date().toISOString(),
        requestId
      }
    };

    res.status(statusCode).json(errorResponse);
  }
};