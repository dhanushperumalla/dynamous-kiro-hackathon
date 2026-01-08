import { Router } from 'express';
import { AssessmentController } from '@/controllers/assessmentController';
import { requireAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validation';
import { assessmentValidationSchemas } from '@/utils/validators';

const router = Router();

/**
 * Assessment Routes
 * All routes for assessment questionnaire and response handling
 */

/**
 * @route   GET /api/assessment/questionnaire
 * @desc    Get the active assessment questionnaire
 * @access  Public (no authentication required to view questionnaire)
 */
router.get('/questionnaire', AssessmentController.getQuestionnaire);

/**
 * @route   POST /api/assessment/start
 * @desc    Start a new assessment for the authenticated user
 * @access  Private (requires authentication)
 */
router.post('/start', requireAuth, AssessmentController.startAssessment);

/**
 * @route   POST /api/assessment/submit
 * @desc    Submit assessment responses (partial or complete)
 * @access  Private (requires authentication)
 */
router.post(
  '/submit',
  requireAuth,
  validateBody(assessmentValidationSchemas.submitResponses),
  AssessmentController.submitResponses
);

/**
 * @route   GET /api/assessment/results
 * @desc    Get user's latest completed assessment results
 * @access  Private (requires authentication)
 */
router.get('/results', requireAuth, AssessmentController.getResults);

/**
 * @route   POST /api/assessment/retake
 * @desc    Start a new assessment (retake)
 * @access  Private (requires authentication)
 */
router.post(
  '/retake',
  requireAuth,
  validateBody(assessmentValidationSchemas.retakeAssessment),
  AssessmentController.retakeAssessment
);

/**
 * @route   GET /api/assessment/progress
 * @desc    Get current assessment progress for the user
 * @access  Private (requires authentication)
 */
router.get('/progress', requireAuth, AssessmentController.getProgress);

export default router;