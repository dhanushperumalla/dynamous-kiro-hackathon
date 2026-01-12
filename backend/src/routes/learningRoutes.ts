import { Router } from 'express';
import * as learningController from '@/controllers/learningController';
import { authenticateToken } from '@/middleware/auth';
import { validateBody, validateQuery, validateParams } from '@/middleware/validation';
import { learningValidationSchemas } from '@/utils/validators';

const router = Router();

/**
 * Learning Path Routes
 * All routes for learning path management and weekly target tracking
 */

/**
 * @route   POST /api/learning/paths/generate
 * @desc    Generate a personalized learning path for authenticated user
 * @access  Private (requires authentication)
 */
router.post(
  '/paths/generate',
  authenticateToken({ required: true }),
  validateBody(learningValidationSchemas.generateLearningPath),
  learningController.generateLearningPath
);

/**
 * @route   GET /api/learning/paths
 * @desc    Get user's learning paths with filtering and pagination
 * @access  Private (requires authentication)
 */
router.get(
  '/paths',
  authenticateToken({ required: true }),
  validateQuery(learningValidationSchemas.getLearningPaths),
  learningController.getLearningPaths
);

/**
 * @route   GET /api/learning/paths/:pathId
 * @desc    Get specific learning path by ID with optional module/progress data
 * @access  Private (requires authentication)
 */
router.get(
  '/paths/:pathId',
  authenticateToken({ required: true }),
  validateParams(learningValidationSchemas.pathIdParam),
  validateQuery(learningValidationSchemas.getLearningPath),
  learningController.getLearningPath
);

/**
 * @route   PUT /api/learning/paths/:pathId
 * @desc    Update learning path settings and personalization
 * @access  Private (requires authentication)
 */
router.put(
  '/paths/:pathId',
  authenticateToken({ required: true }),
  validateParams(learningValidationSchemas.pathIdParam),
  validateBody(learningValidationSchemas.updateLearningPath),
  learningController.updateLearningPath
);

/**
 * @route   DELETE /api/learning/paths/:pathId
 * @desc    Delete learning path
 * @access  Private (requires authentication)
 */
router.delete(
  '/paths/:pathId',
  authenticateToken({ required: true }),
  validateParams(learningValidationSchemas.pathIdParam),
  learningController.deleteLearningPath
);

/**
 * Module Content Routes
 */

/**
 * @route   GET /api/learning/paths/:pathId/modules/:moduleId
 * @desc    Get module content and details
 * @access  Private (requires authentication)
 */
router.get(
  '/paths/:pathId/modules/:moduleId',
  authenticateToken({ required: true }),
  validateParams(learningValidationSchemas.moduleParams),
  validateQuery(learningValidationSchemas.getModuleContent),
  learningController.getModuleContent
);

/**
 * Weekly Target Management Routes
 */

/**
 * @route   GET /api/learning/paths/:pathId/modules/:moduleId/targets
 * @desc    Get weekly targets for a module
 * @access  Private (requires authentication)
 */
router.get(
  '/paths/:pathId/modules/:moduleId/targets',
  authenticateToken({ required: true }),
  validateParams(learningValidationSchemas.moduleParams),
  validateQuery(learningValidationSchemas.getWeeklyTargets),
  learningController.getWeeklyTargets
);

/**
 * @route   PUT /api/learning/paths/:pathId/modules/:moduleId/targets/:targetId
 * @desc    Update weekly target completion status and progress
 * @access  Private (requires authentication)
 */
router.put(
  '/paths/:pathId/modules/:moduleId/targets/:targetId',
  authenticateToken({ required: true }),
  validateParams(learningValidationSchemas.targetParams),
  validateBody(learningValidationSchemas.updateWeeklyTarget),
  learningController.updateWeeklyTarget
);

export default router;