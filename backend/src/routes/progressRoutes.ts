import { Router } from 'express';
import * as progressController from '@/controllers/progressController';
import { authenticateToken } from '@/middleware/auth';
import { validateBody, validateQuery } from '@/middleware/validation';
import Joi from 'joi';
import { ActivityType, AnalyticsTimeframe } from '@/types/progress';

const router = Router();

/**
 * Progress Analytics and Dashboard Routes
 * All routes require authentication
 */

// Validation schemas
const activitySubmissionSchema = Joi.object({
  type: Joi.string().valid(...Object.values(ActivityType)).required(),
  moduleId: Joi.string().optional(),
  weeklyTargetId: Joi.string().optional(),
  taskId: Joi.string().optional(),
  resourceId: Joi.string().optional(),
  title: Joi.string().required().max(200),
  description: Joi.string().optional().max(500),
  hoursSpent: Joi.number().min(0).max(24).required(),
  skillsAcquired: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().optional().max(1000),
  qualityScore: Joi.number().min(1).max(10).optional()
});

const initializeProgressSchema = Joi.object({
  learningPathId: Joi.string().required()
});

const analyticsQuerySchema = Joi.object({
  timeframe: Joi.string().valid(...Object.values(AnalyticsTimeframe)).optional()
});

/**
 * @route   GET /api/progress/dashboard
 * @desc    Get comprehensive dashboard data for authenticated user
 * @access  Private (requires authentication)
 */
router.get(
  '/dashboard',
  authenticateToken,
  progressController.getDashboard
);

/**
 * @route   GET /api/progress/analytics
 * @desc    Get detailed analytics for authenticated user with optional timeframe
 * @access  Private (requires authentication)
 */
router.get(
  '/analytics',
  authenticateToken,
  validateQuery(analyticsQuerySchema),
  progressController.getAnalytics
);

/**
 * @route   GET /api/progress/peer-comparison
 * @desc    Get peer comparison and benchmarking data
 * @access  Private (requires authentication)
 */
router.get(
  '/peer-comparison',
  authenticateToken,
  progressController.getPeerComparison
);

/**
 * @route   GET /api/progress/summary
 * @desc    Get progress summary for authenticated user
 * @access  Private (requires authentication)
 */
router.get(
  '/summary',
  authenticateToken,
  progressController.getProgressSummary
);

/**
 * @route   POST /api/progress/activity
 * @desc    Record a learning activity completion
 * @access  Private (requires authentication)
 */
router.post(
  '/activity',
  authenticateToken,
  validateBody(activitySubmissionSchema),
  progressController.recordActivity
);

/**
 * @route   POST /api/progress/initialize
 * @desc    Initialize progress tracking for a user's learning path
 * @access  Private (requires authentication)
 */
router.post(
  '/initialize',
  authenticateToken,
  validateBody(initializeProgressSchema),
  progressController.initializeProgress
);

export default router;