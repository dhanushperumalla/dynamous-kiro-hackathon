import { Router } from 'express';
import * as recommendationController from '@/controllers/recommendationController';
import { authenticateToken, optionalAuth } from '@/middleware/auth';
import { validateBody, validateQuery } from '@/middleware/validation';
import { recommendationValidationSchemas } from '@/utils/validators';

const router = Router();

/**
 * Recommendation Routes
 * All routes for career domain recommendations and feedback
 */

/**
 * @route   POST /api/recommendations/generate
 * @desc    Generate career recommendations for authenticated user
 * @access  Private (requires authentication)
 */
router.post(
  '/generate',
  authenticateToken({ required: true }),
  validateBody(recommendationValidationSchemas.generateRecommendations),
  recommendationController.generateRecommendations
);

/**
 * @route   GET /api/recommendations
 * @desc    Get user's recommendations (all or active only)
 * @access  Private (requires authentication)
 */
router.get(
  '/',
  authenticateToken({ required: true }),
  validateQuery(recommendationValidationSchemas.getRecommendations),
  recommendationController.getRecommendations
);

/**
 * @route   GET /api/recommendations/latest
 * @desc    Get user's latest active recommendation
 * @access  Private (requires authentication)
 */
router.get(
  '/latest',
  authenticateToken({ required: true }),
  recommendationController.getLatestRecommendation
);

/**
 * @route   POST /api/recommendations/feedback
 * @desc    Submit feedback for a recommendation
 * @access  Private (requires authentication)
 */
router.post(
  '/feedback',
  authenticateToken({ required: true }),
  validateBody(recommendationValidationSchemas.submitFeedback),
  recommendationController.submitFeedback
);

/**
 * @route   POST /api/recommendations/:recommendationId/feedback
 * @desc    Submit feedback for a specific recommendation (alternative endpoint)
 * @access  Private (requires authentication)
 */
router.post(
  '/:recommendationId/feedback',
  authenticateToken({ required: true }),
  validateBody(recommendationValidationSchemas.submitFeedback),
  recommendationController.submitFeedback
);

/**
 * @route   GET /api/recommendations/statistics
 * @desc    Get recommendation statistics (for analytics/admin)
 * @access  Private (requires authentication)
 */
router.get(
  '/statistics',
  authenticateToken({ required: true }),
  recommendationController.getRecommendationStatistics
);

/**
 * Domain Information Routes
 */

/**
 * @route   GET /api/recommendations/domains
 * @desc    Get all available career domains with filtering and search
 * @access  Public (but enhanced data for authenticated users)
 */
router.get(
  '/domains',
  optionalAuth,
  validateQuery(recommendationValidationSchemas.getAllDomains),
  recommendationController.getAllDomains
);

/**
 * @route   GET /api/recommendations/domains/:domainId
 * @desc    Get detailed information about a specific domain
 * @access  Public (but enhanced data for authenticated users)
 */
router.get(
  '/domains/:domainId',
  optionalAuth,
  validateQuery(recommendationValidationSchemas.getDomainDetails),
  recommendationController.getDomainDetails
);

export default router;