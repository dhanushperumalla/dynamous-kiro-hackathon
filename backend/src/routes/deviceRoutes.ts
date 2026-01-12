import express from 'express';
import { 
  registerDeviceToken, 
  unregisterDeviceToken, 
  getDeviceTokens, 
  testPushNotification 
} from '../controllers/deviceController';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const registerDeviceTokenSchema = Joi.object({
  deviceToken: Joi.string()
    .required()
    .min(140)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .messages({
      'string.base': 'Device token must be a string',
      'string.empty': 'Device token is required',
      'string.min': 'Device token must be at least 140 characters',
      'string.pattern.base': 'Device token contains invalid characters',
      'any.required': 'Device token is required'
    }),
  platform: Joi.string()
    .valid('ios', 'android', 'web')
    .optional()
    .messages({
      'any.only': 'Platform must be one of: ios, android, web'
    })
});

const unregisterDeviceTokenSchema = Joi.object({
  deviceToken: Joi.string()
    .required()
    .min(140)
    .pattern(/^[A-Za-z0-9_-]+$/)
    .messages({
      'string.base': 'Device token must be a string',
      'string.empty': 'Device token is required',
      'string.min': 'Device token must be at least 140 characters',
      'string.pattern.base': 'Device token contains invalid characters',
      'any.required': 'Device token is required'
    })
});

const testPushNotificationSchema = Joi.object({
  title: Joi.string()
    .optional()
    .max(100)
    .messages({
      'string.max': 'Title cannot exceed 100 characters'
    }),
  body: Joi.string()
    .optional()
    .max(500)
    .messages({
      'string.max': 'Body cannot exceed 500 characters'
    })
});

/**
 * @route   POST /api/devices/register
 * @desc    Register device token for push notifications
 * @access  Private
 */
router.post(
  '/register',
  authenticateToken,
  validateBody(registerDeviceTokenSchema),
  registerDeviceToken
);

/**
 * @route   POST /api/devices/unregister
 * @desc    Unregister device token
 * @access  Private
 */
router.post(
  '/unregister',
  authenticateToken,
  validateBody(unregisterDeviceTokenSchema),
  unregisterDeviceToken
);

/**
 * @route   GET /api/devices/tokens
 * @desc    Get user's registered device tokens info
 * @access  Private
 */
router.get(
  '/tokens',
  authenticateToken,
  getDeviceTokens
);

/**
 * @route   POST /api/devices/test-notification
 * @desc    Send test push notification (development only)
 * @access  Private
 */
router.post(
  '/test-notification',
  authenticateToken,
  validateBody(testPushNotificationSchema),
  testPushNotification
);

export default router;