import request from 'supertest';
import express from 'express';
import { jobController } from '../../src/controllers/jobController';
import { jobMatchingService } from '../../src/services/jobMatchingService';
import { JobMatch } from '../../src/models/JobMatch';
import { JobApplication } from '../../src/models/JobApplication';
import { JobPreferences } from '../../src/models/JobPreferences';
import { authenticateToken } from '../../src/middleware/auth';
import { validateRequest } from '../../src/middleware/validation';
import jobRoutes from '../../src/routes/jobRoutes';
import {
  ApplicationStatus,
  JobType,
  ExperienceLevel,
  JobSource,
  RemoteWorkPreference,
  SalaryPeriod,
  ScheduleFlexibility
} from '../../src/types/job';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('../../src/services/jobMatchingService');
jest.mock('../../src/models/JobMatch');
jest.mock('../../src/models/JobApplication');
jest.mock('../../src/models/JobPreferences');
jest.mock('../../src/middleware/auth');
jest.mock('../../src/middleware/validation');

const mockJobMatchingService = jobMatchingService as jest.Mocked<typeof jobMatchingService>;
const mockJobMatch = JobMatch as jest.Mocked<typeof JobMatch>;
const mockJobApplication = JobApplication as jest.Mocked<typeof JobApplication>;
const mockJobPreferences = JobPreferences as jest.Mocked<typeof JobPreferences>;
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const mockValidateRequest = validateRequest as jest.MockedFunction<typeof validateRequest>;

describe('Job Controller Unit Tests', () => {
  let app: express.Application;
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockJobMatchId = new mongoose.Types.ObjectId().toString();
  const mockApplicationId = new mongoose.Types.ObjectId().toString();

  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    // Mock authentication middleware to add user to request
    mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: mockUserId };
      next();
    });

    // Mock validation middleware to pass through
    mockValidateRequest.mockImplementation((req: any, res: any, next: any) => {
      next();
    });

    app.use('/api/jobs', jobRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/jobs/matches', () => {
    it('should return job matches for authenticated user', async () => {
      const mockMatches = [
        {
          _id: mockJobMatchId,
          userId: new mongoose.Types.ObjectId(mockUserId),
          jobId: 'job123',
          title: 'Software Developer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          description: 'Great opportunity for a software developer',
          requirements: ['JavaScript', 'React', 'Node.js'],
          matchScore: 85,
          skillAlignment: new Map([
            ['javascript', { required: true, userLevel: 8, requiredLevel: 7, gap: 0, weight: 0.8 }]
          ]),
          source: JobSource.INDEED,
          applicationStatus: ApplicationStatus.NOT_APPLIED,
          jobType: JobType.FULL_TIME,
          experienceLevel: ExperienceLevel.JUNIOR,
          postedDate: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockJobMatchingService.getUserJobMatches.mockResolvedValue(mockMatches as any);

      const response = await request(app)
        .get('/api/jobs/matches')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.matches).toHaveLength(1);
      expect(response.body.data.matches[0].title).toBe('Software Developer');
      expect(response.body.message).toBe('Job matches retrieved successfully');
    });

    it('should refresh job matches when refresh=true', async () => {
      const mockMatchingResult = {
        jobMatches: [],
        totalMatches: 0,
        averageMatchScore: 0,
        processingTime: 1500,
        criteria: {
          userId: mockUserId,
          minimumMatchScore: 30,
          maxResults: 50
        }
      };

      mockJobMatchingService.findJobMatches.mockResolvedValue(mockMatchingResult as any);

      const response = await request(app)
        .get('/api/jobs/matches?refresh=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processingTime).toBe(1500);
      expect(response.body.message).toBe('Job matches refreshed successfully');
      expect(mockJobMatchingService.findJobMatches).toHaveBeenCalledWith(mockUserId);
    });

    it('should filter matches by parameters', async () => {
      const mockMatches = [
        {
          _id: mockJobMatchId,
          userId: new mongoose.Types.ObjectId(mockUserId),
          jobId: 'job123',
          title: 'Software Developer',
          company: 'Tech Corp',
          location: 'San Francisco, CA',
          jobType: JobType.FULL_TIME,
          matchScore: 85,
          applicationStatus: ApplicationStatus.NOT_APPLIED,
          isActive: true
        }
      ];

      mockJobMatchingService.getUserJobMatches.mockResolvedValue(mockMatches as any);

      const response = await request(app)
        .get('/api/jobs/matches?minMatchScore=80&jobType=full_time&location=San Francisco')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockJobMatchingService.getUserJobMatches).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          minMatchScore: 80
        })
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockAuthenticateToken.mockImplementationOnce((req: any, res: any, next: any) => {
        res.status(401).json({ success: false, message: 'Authentication required' });
      });

      await request(app)
        .get('/api/jobs/matches')
        .expect(401);
    });
  });

  describe('GET /api/jobs/matches/:matchId', () => {
    it('should return job match details', async () => {
      const mockJobMatch = {
        _id: new mongoose.Types.ObjectId(mockJobMatchId),
        userId: new mongoose.Types.ObjectId(mockUserId),
        title: 'Software Developer',
        company: 'Tech Corp',
        matchScore: 85,
        isActive: true,
        getSkillGaps: jest.fn().mockReturnValue([
          { skill: 'React', gap: 1, priority: 'medium' }
        ]),
        canApply: jest.fn().mockReturnValue({ canApply: true }),
        skillMatchPercentage: 80,
        jobAgeInDays: 5,
        daysUntilExpiry: 25
      };

      (mockJobMatch as any).getSkillGaps = jest.fn().mockReturnValue([
        { skill: 'React', gap: 1, priority: 'medium' }
      ]);
      (mockJobMatch as any).canApply = jest.fn().mockReturnValue({ canApply: true });

      mockJobMatch.findOne = jest.fn().mockResolvedValue(mockJobMatch);
      (JobMatch.findOne as jest.Mock).mockResolvedValue(mockJobMatch);

      const response = await request(app)
        .get(`/api/jobs/matches/${mockJobMatchId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.match.title).toBe('Software Developer');
      expect(response.body.data.canApply).toBe(true);
      expect(response.body.data.skillGaps).toHaveLength(1);
    });

    it('should return 404 for non-existent match', async () => {
      (JobMatch.findOne as jest.Mock).mockResolvedValue(null);

      await request(app)
        .get(`/api/jobs/matches/${mockJobMatchId}`)
        .expect(404);
    });

    it('should return 400 for invalid match ID', async () => {
      await request(app)
        .get('/api/jobs/matches/invalid-id')
        .expect(400);
    });
  });

  describe('POST /api/jobs/apply', () => {
    it('should create job application successfully', async () => {
      const mockJobMatch = {
        _id: new mongoose.Types.ObjectId(mockJobMatchId),
        userId: new mongoose.Types.ObjectId(mockUserId),
        title: 'Software Developer',
        company: 'Tech Corp',
        matchScore: 85,
        isActive: true,
        applicationStatus: ApplicationStatus.NOT_APPLIED,
        canApply: jest.fn().mockReturnValue({ canApply: true }),
        save: jest.fn().mockResolvedValue(true)
      };

      const mockApplication = {
        _id: new mongoose.Types.ObjectId(mockApplicationId),
        userId: new mongoose.Types.ObjectId(mockUserId),
        jobMatchId: new mongoose.Types.ObjectId(mockJobMatchId),
        status: ApplicationStatus.APPLIED,
        applicationDate: new Date(),
        save: jest.fn().mockResolvedValue(true)
      };

      (JobMatch.findOne as jest.Mock).mockResolvedValue(mockJobMatch);
      (JobApplication.findOne as jest.Mock).mockResolvedValue(null); // No existing application
      (JobApplication as any).mockImplementation(() => mockApplication);
      mockApplication.save = jest.fn().mockResolvedValue(mockApplication);

      const applicationData = {
        jobMatchId: mockJobMatchId,
        coverLetter: 'I am interested in this position...',
        notes: 'Looking forward to hearing from you'
      };

      const response = await request(app)
        .post('/api/jobs/apply')
        .send(applicationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.application).toBeDefined();
      expect(response.body.data.nextSteps).toBeDefined();
      expect(response.body.message).toBe('Application submitted successfully');
    });

    it('should return 400 if user cannot apply to job', async () => {
      const mockJobMatch = {
        _id: new mongoose.Types.ObjectId(mockJobMatchId),
        userId: new mongoose.Types.ObjectId(mockUserId),
        isActive: true,
        canApply: jest.fn().mockReturnValue({ 
          canApply: false, 
          reason: 'Job posting has expired' 
        })
      };

      (JobMatch.findOne as jest.Mock).mockResolvedValue(mockJobMatch);

      const applicationData = {
        jobMatchId: mockJobMatchId,
        coverLetter: 'I am interested in this position...'
      };

      const response = await request(app)
        .post('/api/jobs/apply')
        .send(applicationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Job posting has expired');
    });

    it('should return 400 if application already exists', async () => {
      const mockJobMatch = {
        _id: new mongoose.Types.ObjectId(mockJobMatchId),
        userId: new mongoose.Types.ObjectId(mockUserId),
        isActive: true,
        canApply: jest.fn().mockReturnValue({ canApply: true })
      };

      const existingApplication = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        jobMatchId: new mongoose.Types.ObjectId(mockJobMatchId)
      };

      (JobMatch.findOne as jest.Mock).mockResolvedValue(mockJobMatch);
      (JobApplication.findOne as jest.Mock).mockResolvedValue(existingApplication);

      const applicationData = {
        jobMatchId: mockJobMatchId,
        coverLetter: 'I am interested in this position...'
      };

      const response = await request(app)
        .post('/api/jobs/apply')
        .send(applicationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Application already exists for this job');
    });
  });

  describe('GET /api/jobs/applications', () => {
    it('should return user job applications', async () => {
      const mockApplications = [
        {
          _id: mockApplicationId,
          userId: new mongoose.Types.ObjectId(mockUserId),
          jobMatchId: new mongoose.Types.ObjectId(mockJobMatchId),
          status: ApplicationStatus.APPLIED,
          applicationDate: new Date()
        }
      ];

      const mockStatistics = {
        totalApplications: 1,
        statusDistribution: { applied: 1 },
        responseRate: 0,
        interviewRate: 0,
        offerRate: 0
      };

      (JobApplication as any).findByUser = jest.fn().mockResolvedValue(mockApplications);
      (JobApplication as any).getApplicationStatistics = jest.fn().mockResolvedValue(mockStatistics);

      const response = await request(app)
        .get('/api/jobs/applications')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.applications).toHaveLength(1);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.totalApplications).toBe(1);
    });

    it('should filter applications by status', async () => {
      const mockApplications = [
        {
          _id: mockApplicationId,
          status: ApplicationStatus.INTERVIEWING
        }
      ];

      (JobApplication as any).findByUser = jest.fn().mockResolvedValue(mockApplications);
      (JobApplication as any).getApplicationStatistics = jest.fn().mockResolvedValue({});

      const response = await request(app)
        .get('/api/jobs/applications?status=interviewing')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect((JobApplication as any).findByUser).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          status: 'interviewing'
        })
      );
    });
  });

  describe('PUT /api/jobs/applications/:applicationId/status', () => {
    it('should update application status', async () => {
      const mockApplication = {
        _id: new mongoose.Types.ObjectId(mockApplicationId),
        userId: new mongoose.Types.ObjectId(mockUserId),
        status: ApplicationStatus.APPLIED,
        updateStatus: jest.fn().mockResolvedValue(true)
      };

      (JobApplication.findOne as jest.Mock).mockResolvedValue(mockApplication);

      const updateData = {
        status: ApplicationStatus.INTERVIEWING,
        notes: 'Interview scheduled for next week'
      };

      const response = await request(app)
        .put(`/api/jobs/applications/${mockApplicationId}/status`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockApplication.updateStatus).toHaveBeenCalledWith(
        ApplicationStatus.INTERVIEWING,
        'Interview scheduled for next week'
      );
    });

    it('should return 404 for non-existent application', async () => {
      (JobApplication.findOne as jest.Mock).mockResolvedValue(null);

      const updateData = {
        status: ApplicationStatus.INTERVIEWING
      };

      await request(app)
        .put(`/api/jobs/applications/${mockApplicationId}/status`)
        .send(updateData)
        .expect(404);
    });

    it('should return 400 for invalid status', async () => {
      const updateData = {
        status: 'invalid_status'
      };

      await request(app)
        .put(`/api/jobs/applications/${mockApplicationId}/status`)
        .send(updateData)
        .expect(400);
    });
  });

  describe('POST /api/jobs/applications/:applicationId/feedback', () => {
    it('should submit application feedback', async () => {
      const mockApplication = {
        _id: new mongoose.Types.ObjectId(mockApplicationId),
        userId: new mongoose.Types.ObjectId(mockUserId),
        feedback: undefined,
        save: jest.fn().mockResolvedValue(true)
      };

      (JobApplication.findOne as jest.Mock).mockResolvedValue(mockApplication);

      const feedbackData = {
        rating: 4,
        comments: 'Great interview experience',
        companyRating: 5,
        wouldRecommend: true
      };

      const response = await request(app)
        .post(`/api/jobs/applications/${mockApplicationId}/feedback`)
        .send(feedbackData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.feedback).toBeDefined();
      expect(mockApplication.save).toHaveBeenCalled();
      expect(mockApplication.feedback.rating).toBe(4);
      expect(mockApplication.feedback.wouldRecommend).toBe(true);
    });

    it('should return 400 for invalid rating', async () => {
      const feedbackData = {
        rating: 6, // Invalid rating (should be 1-5)
        wouldRecommend: true
      };

      await request(app)
        .post(`/api/jobs/applications/${mockApplicationId}/feedback`)
        .send(feedbackData)
        .expect(400);
    });

    it('should return 400 for missing wouldRecommend field', async () => {
      const feedbackData = {
        rating: 4,
        comments: 'Great experience'
        // Missing wouldRecommend
      };

      await request(app)
        .post(`/api/jobs/applications/${mockApplicationId}/feedback`)
        .send(feedbackData)
        .expect(400);
    });
  });

  describe('GET /api/jobs/preferences', () => {
    it('should return user job preferences', async () => {
      const mockPreferences = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        locations: ['San Francisco, CA'],
        remoteWork: RemoteWorkPreference.HYBRID,
        jobTypes: [JobType.FULL_TIME],
        experienceLevels: [ExperienceLevel.JUNIOR],
        salaryExpectations: {
          currency: 'USD',
          min: 80000,
          max: 120000,
          period: SalaryPeriod.YEARLY,
          negotiable: true
        }
      };

      (JobPreferences as any).findByUser = jest.fn().mockResolvedValue(mockPreferences);

      const response = await request(app)
        .get('/api/jobs/preferences')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences).toBeDefined();
      expect(response.body.data.preferences.locations).toContain('San Francisco, CA');
    });

    it('should create default preferences if none exist', async () => {
      const mockDefaultPreferences = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        locations: [],
        remoteWork: RemoteWorkPreference.FLEXIBLE,
        jobTypes: [JobType.FULL_TIME]
      };

      (JobPreferences as any).findByUser = jest.fn().mockResolvedValue(null);
      (JobPreferences as any).createDefault = jest.fn().mockResolvedValue(mockDefaultPreferences);

      const response = await request(app)
        .get('/api/jobs/preferences')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect((JobPreferences as any).createDefault).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('PUT /api/jobs/preferences', () => {
    it('should update job preferences', async () => {
      const mockPreferences = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(mockUserId),
        updatePreferences: jest.fn().mockResolvedValue(true)
      };

      const mockRecommendedJobs = [
        { _id: mockJobMatchId, title: 'Software Developer', matchScore: 85 }
      ];

      (JobPreferences as any).findByUser = jest.fn().mockResolvedValue(mockPreferences);
      mockJobMatchingService.getUserJobMatches.mockResolvedValue(mockRecommendedJobs as any);

      const updateData = {
        locations: ['New York, NY'],
        remoteWork: RemoteWorkPreference.REMOTE_ONLY,
        salaryExpectations: {
          currency: 'USD',
          min: 90000,
          max: 130000,
          period: SalaryPeriod.YEARLY,
          negotiable: true
        }
      };

      const response = await request(app)
        .put('/api/jobs/preferences')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.preferences).toBeDefined();
      expect(response.body.data.recommendedJobs).toHaveLength(1);
      expect(mockPreferences.updatePreferences).toHaveBeenCalledWith(updateData);
    });

    it('should return 400 for invalid salary expectations', async () => {
      const updateData = {
        salaryExpectations: {
          min: 100000,
          max: 80000, // Max less than min
          currency: 'USD',
          period: SalaryPeriod.YEARLY
        }
      };

      await request(app)
        .put('/api/jobs/preferences')
        .send(updateData)
        .expect(400);
    });

    it('should return 400 for invalid enum values', async () => {
      const updateData = {
        remoteWork: 'invalid_preference',
        jobTypes: ['invalid_job_type']
      };

      await request(app)
        .put('/api/jobs/preferences')
        .send(updateData)
        .expect(400);
    });
  });

  describe('GET /api/jobs/analytics', () => {
    it('should return job analytics for user', async () => {
      const mockMatchStats = {
        totalMatches: 15,
        averageMatchScore: 72,
        applicationRate: 20,
        highQualityMatchRate: 60
      };

      const mockApplicationStats = {
        totalApplications: 3,
        responseRate: 67,
        interviewRate: 33,
        offerRate: 0
      };

      const mockPreferences = {
        isComplete: jest.fn().mockReturnValue(true),
        getMissingPreferences: jest.fn().mockReturnValue([])
      };

      (JobMatch as any).getMatchStatistics = jest.fn().mockResolvedValue(mockMatchStats);
      (JobApplication as any).getApplicationStatistics = jest.fn().mockResolvedValue(mockApplicationStats);
      (JobPreferences as any).findByUser = jest.fn().mockResolvedValue(mockPreferences);

      const response = await request(app)
        .get('/api/jobs/analytics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.matchStatistics).toBeDefined();
      expect(response.body.data.applicationStatistics).toBeDefined();
      expect(response.body.data.preferences.isComplete).toBe(true);
      expect(response.body.data.recommendations).toBeDefined();
    });
  });

  describe('POST /api/jobs/matches/refresh', () => {
    it('should refresh job matches with custom criteria', async () => {
      const mockMatchingResult = {
        jobMatches: [],
        totalMatches: 0,
        averageMatchScore: 0,
        processingTime: 2000,
        criteria: {
          userId: mockUserId,
          minimumMatchScore: 40,
          maxResults: 30
        }
      };

      mockJobMatchingService.findJobMatches.mockResolvedValue(mockMatchingResult as any);

      const customCriteria = {
        minimumMatchScore: 40,
        maxResults: 30
      };

      const response = await request(app)
        .post('/api/jobs/matches/refresh')
        .send({ criteria: customCriteria })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.processingTime).toBe(2000);
      expect(response.body.message).toBe('Job matches refreshed successfully');
      expect(mockJobMatchingService.findJobMatches).toHaveBeenCalledWith(mockUserId, customCriteria);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockJobMatchingService.getUserJobMatches.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/jobs/matches')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve job matches');
      expect(response.body.error).toBe('Service unavailable');
    });

    it('should handle database connection errors', async () => {
      (JobMatch.findOne as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/jobs/matches/${mockJobMatchId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to retrieve job match details');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/jobs/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Job service is healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});