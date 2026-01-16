import { Router } from 'express';
import { jobController } from '@/controllers/jobController';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { body, param, query } from 'express-validator';
import { 
  ApplicationStatus, 
  JobType, 
  ExperienceLevel, 
  RemoteWorkPreference,
  SalaryPeriod,
  ScheduleFlexibility,
  CommuteFlexibility,
  TransportMethod,
  CompanySize
} from '@/types/job';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Job Matching Routes
 */

// Get job matches for user
router.get('/matches', [
  query('minMatchScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Minimum match score must be between 0 and 100'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('applicationStatus')
    .optional()
    .isIn(Object.values(ApplicationStatus))
    .withMessage('Invalid application status'),
  query('jobType')
    .optional()
    .isIn(Object.values(JobType))
    .withMessage('Invalid job type'),
  query('location')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Location must be between 1 and 100 characters'),
  query('refresh')
    .optional()
    .isBoolean()
    .withMessage('Refresh must be a boolean'),
  validateRequest
], jobController.getJobMatches.bind(jobController));

// Get specific job match details
router.get('/matches/:matchId', [
  param('matchId')
    .isMongoId()
    .withMessage('Invalid match ID'),
  validateRequest
], jobController.getJobMatchDetails.bind(jobController));

// Refresh job matches
router.post('/matches/refresh', [
  body('criteria')
    .optional()
    .isObject()
    .withMessage('Criteria must be an object'),
  body('criteria.minimumMatchScore')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Minimum match score must be between 0 and 100'),
  body('criteria.maxResults')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max results must be between 1 and 100'),
  validateRequest
], jobController.refreshJobMatches.bind(jobController));

/**
 * Job Application Routes
 */

// Apply to a job
router.post('/apply', [
  body('jobMatchId')
    .isMongoId()
    .withMessage('Invalid job match ID'),
  body('coverLetter')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Cover letter cannot exceed 5000 characters'),
  body('resume')
    .optional()
    .isURL()
    .withMessage('Resume must be a valid URL'),
  body('additionalDocuments')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Cannot have more than 10 additional documents'),
  body('additionalDocuments.*.name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Document name must be between 1 and 200 characters'),
  body('additionalDocuments.*.url')
    .optional()
    .isURL()
    .withMessage('Document URL must be valid'),
  body('additionalDocuments.*.size')
    .optional()
    .isInt({ min: 0, max: 50 * 1024 * 1024 })
    .withMessage('Document size cannot exceed 50MB'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes cannot exceed 2000 characters'),
  validateRequest
], jobController.applyToJob.bind(jobController));

// Get user's job applications
router.get('/applications', [
  query('status')
    .optional()
    .custom((value: string | string[]) => {
      if (Array.isArray(value)) {
        return value.every(status => Object.values(ApplicationStatus).includes(status as ApplicationStatus));
      }
      return Object.values(ApplicationStatus).includes(value as ApplicationStatus);
    })
    .withMessage('Invalid application status'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateFrom'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateTo'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validateRequest
], jobController.getJobApplications.bind(jobController));

// Update job application status
router.put('/applications/:applicationId/status', [
  param('applicationId')
    .isMongoId()
    .withMessage('Invalid application ID'),
  body('status')
    .isIn(Object.values(ApplicationStatus))
    .withMessage('Invalid application status'),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  validateRequest
], jobController.updateApplicationStatus.bind(jobController));

// Submit job application feedback
router.post('/applications/:applicationId/feedback', [
  param('applicationId')
    .isMongoId()
    .withMessage('Invalid application ID'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  body('comments')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Comments cannot exceed 2000 characters'),
  body('interviewExperience')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Interview experience cannot exceed 2000 characters'),
  body('companyRating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Company rating must be an integer between 1 and 5'),
  body('wouldRecommend')
    .isBoolean()
    .withMessage('Would recommend must be a boolean'),
  validateRequest
], jobController.submitApplicationFeedback.bind(jobController));

/**
 * Job Preferences Routes
 */

// Get job preferences
router.get('/preferences', jobController.getJobPreferences.bind(jobController));

// Update job preferences
router.put('/preferences', [
  body('locations')
    .optional()
    .isArray()
    .withMessage('Locations must be an array'),
  body('locations.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Location must be between 1 and 100 characters'),
  body('remoteWork')
    .optional()
    .isIn(Object.values(RemoteWorkPreference))
    .withMessage('Invalid remote work preference'),
  body('jobTypes')
    .optional()
    .isArray()
    .withMessage('Job types must be an array'),
  body('jobTypes.*')
    .optional()
    .isIn(Object.values(JobType))
    .withMessage('Invalid job type'),
  body('experienceLevels')
    .optional()
    .isArray()
    .withMessage('Experience levels must be an array'),
  body('experienceLevels.*')
    .optional()
    .isIn(Object.values(ExperienceLevel))
    .withMessage('Invalid experience level'),
  body('salaryExpectations')
    .optional()
    .isObject()
    .withMessage('Salary expectations must be an object'),
  body('salaryExpectations.currency')
    .optional()
    .matches(/^[A-Z]{3}$/)
    .withMessage('Currency must be a valid 3-letter ISO code'),
  body('salaryExpectations.min')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum salary cannot be negative'),
  body('salaryExpectations.max')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum salary cannot be negative'),
  body('salaryExpectations.period')
    .optional()
    .isIn(Object.values(SalaryPeriod))
    .withMessage('Invalid salary period'),
  body('salaryExpectations.negotiable')
    .optional()
    .isBoolean()
    .withMessage('Negotiable must be a boolean'),
  body('industries')
    .optional()
    .isArray()
    .withMessage('Industries must be an array'),
  body('industries.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Industry must be between 1 and 100 characters'),
  body('companySize')
    .optional()
    .isArray()
    .withMessage('Company size must be an array'),
  body('companySize.*')
    .optional()
    .isIn(Object.values(CompanySize))
    .withMessage('Invalid company size'),
  body('benefits')
    .optional()
    .isArray()
    .withMessage('Benefits must be an array'),
  body('benefits.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Benefit must be between 1 and 100 characters'),
  body('workCulture')
    .optional()
    .isArray()
    .withMessage('Work culture must be an array'),
  body('workCulture.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Work culture preference must be between 1 and 100 characters'),
  body('commute')
    .optional()
    .isObject()
    .withMessage('Commute must be an object'),
  body('commute.maxDistance')
    .optional()
    .isInt({ min: 0, max: 500 })
    .withMessage('Max distance must be between 0 and 500 km'),
  body('commute.maxDuration')
    .optional()
    .isInt({ min: 0, max: 300 })
    .withMessage('Max duration must be between 0 and 300 minutes'),
  body('commute.transportMethods')
    .optional()
    .isArray()
    .withMessage('Transport methods must be an array'),
  body('commute.transportMethods.*')
    .optional()
    .isIn(Object.values(TransportMethod))
    .withMessage('Invalid transport method'),
  body('commute.flexibility')
    .optional()
    .isIn(Object.values(CommuteFlexibility))
    .withMessage('Invalid commute flexibility'),
  body('availability')
    .optional()
    .isObject()
    .withMessage('Availability must be an object'),
  body('availability.startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('availability.noticePeriod')
    .optional()
    .isInt({ min: 0, max: 365 })
    .withMessage('Notice period must be between 0 and 365 days'),
  body('availability.workingHours')
    .optional()
    .isObject()
    .withMessage('Working hours must be an object'),
  body('availability.workingHours.preferredStart')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format for preferred start (HH:MM)'),
  body('availability.workingHours.preferredEnd')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Invalid time format for preferred end (HH:MM)'),
  body('availability.workingHours.flexibleHours')
    .optional()
    .isBoolean()
    .withMessage('Flexible hours must be a boolean'),
  body('availability.workingHours.weekends')
    .optional()
    .isBoolean()
    .withMessage('Weekends must be a boolean'),
  body('availability.workingHours.overtime')
    .optional()
    .isBoolean()
    .withMessage('Overtime must be a boolean'),
  body('availability.timeZone')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Time zone must be between 1 and 50 characters'),
  body('availability.flexibility')
    .optional()
    .isIn(Object.values(ScheduleFlexibility))
    .withMessage('Invalid schedule flexibility'),
  validateRequest
], jobController.updateJobPreferences.bind(jobController));

/**
 * Analytics Routes
 */

// Get job analytics
router.get('/analytics', jobController.getJobAnalytics.bind(jobController));

/**
 * Health check route
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Job service is healthy',
    timestamp: new Date()
  });
});

export default router;