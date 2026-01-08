import { Router } from 'express';
import * as userController from '@/controllers/userController';
import { validateBody } from '@/middleware/validation';
import { authenticateToken } from '@/middleware/auth';
import { updateProfileSchema } from '@/utils/validators';
import Joi from 'joi';

const router = Router();

// All user routes require authentication
router.use(authenticateToken({ required: true }));

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get(
  '/profile',
  userController.getProfile
);

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/profile',
  validateBody(updateProfileSchema),
  userController.updateProfile
);

/**
 * @route   GET /api/user/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get(
  '/stats',
  userController.getUserStats
);

/**
 * @route   PUT /api/user/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  '/preferences',
  validateBody(Joi.object({
    notificationFrequency: Joi.string()
      .valid('daily', 'weekly', 'minimal', 'none')
      .optional(),
    learningPace: Joi.string()
      .valid('slow', 'moderate', 'fast')
      .optional(),
    careerGoals: Joi.array()
      .items(Joi.string().max(100).trim())
      .max(10)
      .optional(),
    preferredLearningStyle: Joi.string()
      .valid('visual', 'auditory', 'kinesthetic', 'reading', 'mixed')
      .optional(),
    timeZone: Joi.string().optional(),
    language: Joi.string()
      .pattern(/^[a-z]{2}(-[A-Z]{2})?$/)
      .optional(),
    emailNotifications: Joi.object({
      weeklyProgress: Joi.boolean().optional(),
      milestoneAchievements: Joi.boolean().optional(),
      jobRecommendations: Joi.boolean().optional(),
      learningReminders: Joi.boolean().optional(),
      systemUpdates: Joi.boolean().optional()
    }).optional(),
    pushNotifications: Joi.object({
      dailyReminders: Joi.boolean().optional(),
      weeklyTargets: Joi.boolean().optional(),
      achievements: Joi.boolean().optional(),
      jobMatches: Joi.boolean().optional()
    }).optional()
  })),
  userController.updatePreferences
);

/**
 * @route   POST /api/user/avatar
 * @desc    Upload/update user avatar
 * @access  Private
 */
router.post(
  '/avatar',
  validateBody(Joi.object({
    avatarUrl: Joi.string()
      .uri()
      .required()
      .messages({
        'string.uri': 'Avatar must be a valid URL',
        'any.required': 'Avatar URL is required'
      })
  })),
  userController.uploadAvatar
);

/**
 * @route   DELETE /api/user/account
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete(
  '/account',
  validateBody(Joi.object({
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required for account deletion'
      })
  })),
  userController.deleteAccount
);

export default router;