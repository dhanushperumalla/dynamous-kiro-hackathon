import * as fc from 'fast-check';
import { jobController } from '../../src/controllers/jobController';
import { JobMatch } from '../../src/models/JobMatch';
import { JobApplication } from '../../src/models/JobApplication';
import {
  JobType,
  ExperienceLevel,
  ApplicationStatus,
  JobSource,
  SalaryPeriod,
  DocumentType,
  TimelineSource,
  ISkillAlignment,
  ISalaryRange
} from '../../src/types/job';
import { IUser } from '../../src/types/user';
import { connectDatabase } from '../../src/config/database';
import mongoose from 'mongoose';

/**
 * Property-Based Test for Job Content Integration
 * **Feature: ai-sikshak-platform, Property 14: Job Content Integration**
 * **Validates: Requirements 6.4, 6.5**
 * 
 * Property: For any job opportunity display, the system should include skill alignment 
 * indicators, readiness scores, and application tracking capabilities.
 */

// Generators for property-based testing
const jobTypeArb = fc.constantFrom(...Object.values(JobType));
const experienceLevelArb = fc.constantFrom(...Object.values(ExperienceLevel));
const jobSourceArb = fc.constantFrom(...Object.values(JobSource));
const applicationStatusArb = fc.constantFrom(...Object.values(ApplicationStatus));

// Generator for valid MongoDB ObjectIds
const objectIdArb = fc.string({ minLength: 24, maxLength: 24 })
  .filter(s => /^[a-f0-9]{24}$/.test(s))
  .map(s => new mongoose.Types.ObjectId(s));

// Generator for skill alignment data
const skillAlignmentArb = fc.dictionary(
  fc.string({ minLength: 3, maxLength: 20 }), // skill name
  fc.record({
    required: fc.boolean(),
    userLevel: fc.integer({ min: 0, max: 10 }),
    requiredLevel: fc.integer({ min: 0, max: 10 }),
    gap: fc.integer({ min: 0, max: 10 }),
    weight: fc.float({ min: 0, max: 1 })
  }),
  { minKeys: 3, maxKeys: 10 }
).map(skillDict => {
  // Ensure gap is calculated correctly
  const correctedSkills: Record<string, any> = {};
  Object.entries(skillDict).forEach(([skill, alignment]) => {
    correctedSkills[skill] = {
      ...alignment,
      gap: Math.max(0, alignment.requiredLevel - alignment.userLevel)
    };
  });
  return correctedSkills as ISkillAlignment;
});

// Generator for salary range
const salaryRangeArb = fc.record({
  currency: fc.constant('USD'),
  min: fc.integer({ min: 40000, max: 80000 }),
  max: fc.integer({ min: 80000, max: 150000 }),
  median: fc.integer({ min: 50000, max: 120000 }),
  period: fc.constant(SalaryPeriod.YEARLY),
  location: fc.string({ minLength: 5, maxLength: 50 }),
  negotiable: fc.boolean()
}) as fc.Arbitrary<ISalaryRange>;

// Generator for job matches with complete content
const jobMatchArb = fc.record({
  _id: objectIdArb,
  userId: objectIdArb,
  jobId: fc.string({ minLength: 5, maxLength: 20 }),
  title: fc.string({ minLength: 10, maxLength: 100 }),
  company: fc.string({ minLength: 3, maxLength: 50 }),
  location: fc.string({ minLength: 5, maxLength: 50 }),
  description: fc.string({ minLength: 100, maxLength: 1000 }),
  requirements: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 3, maxLength: 8 }),
  matchScore: fc.integer({ min: 30, max: 100 }), // Above minimum threshold
  skillAlignment: skillAlignmentArb,
  source: jobSourceArb,
  applicationStatus: applicationStatusArb,
  salaryRange: fc.option(salaryRangeArb),
  jobType: jobTypeArb,
  experienceLevel: experienceLevelArb,
  postedDate: fc.date({ min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }),
  expiryDate: fc.option(fc.date({ min: new Date() })),
  isActive: fc.constant(true),
  createdAt: fc.date(),
  updatedAt: fc.date()
});

// Generator for job applications with tracking data
const jobApplicationArb = fc.record({
  _id: objectIdArb,
  userId: objectIdArb,
  jobMatchId: objectIdArb,
  applicationDate: fc.date({ min: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }),
  status: applicationStatusArb,
  coverLetter: fc.option(fc.string({ minLength: 100, maxLength: 2000 })),
  resume: fc.option(fc.webUrl()),
  additionalDocuments: fc.array(fc.record({
    id: fc.string({ minLength: 10, maxLength: 20 }),
    name: fc.string({ minLength: 5, maxLength: 50 }),
    type: fc.constantFrom(...Object.values(DocumentType)),
    url: fc.webUrl(),
    size: fc.integer({ min: 1000, max: 5000000 }),
    uploadedAt: fc.date()
  }), { minLength: 0, maxLength: 5 }),
  notes: fc.option(fc.string({ minLength: 10, maxLength: 500 })),
  timeline: fc.array(fc.record({
    id: fc.string({ minLength: 10, maxLength: 20 }),
    status: applicationStatusArb,
    date: fc.date(),
    notes: fc.option(fc.string({ minLength: 5, maxLength: 200 })),
    source: fc.constantFrom(...Object.values(TimelineSource)),
    details: fc.record({})
  }), { minLength: 1, maxLength: 8 }),
  feedback: fc.option(fc.record({
    rating: fc.integer({ min: 1, max: 5 }),
    comments: fc.option(fc.string({ minLength: 10, maxLength: 500 })),
    interviewExperience: fc.option(fc.string({ minLength: 10, maxLength: 500 })),
    companyRating: fc.option(fc.integer({ min: 1, max: 5 })),
    wouldRecommend: fc.boolean(),
    submittedAt: fc.date()
  })),
  isActive: fc.constant(true),
  createdAt: fc.date(),
  updatedAt: fc.date()
});

// Generator for users
const userArb = fc.record({
  _id: objectIdArb,
  email: fc.emailAddress(),
  role: fc.constant('student'),
  profile: fc.record({
    firstName: fc.string({ minLength: 2, maxLength: 30 }),
    lastName: fc.string({ minLength: 2, maxLength: 30 }),
    location: fc.string({ minLength: 5, maxLength: 50 }),
    educationLevel: fc.constantFrom('high_school', 'bachelor', 'master', 'phd'),
    currentStatus: fc.constantFrom('student', 'graduate', 'employed', 'unemployed')
  }),
  stats: fc.record({
    totalLearningHours: fc.integer({ min: 50, max: 500 }),
    completedModules: fc.integer({ min: 8, max: 20 }),
    skillsAcquired: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 5, maxLength: 15 })
  }),
  isActive: fc.constant(true),
  createdAt: fc.date(),
  updatedAt: fc.date()
}) as fc.Arbitrary<IUser>;

describe('Job Content Integration Property Tests', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  /**
   * Property 14: Job Content Integration
   * For any job opportunity display, the system should include skill alignment 
   * indicators, readiness scores, and application tracking capabilities.
   */

  describe('Job Match Details Display', () => {
    it('should include skill alignment indicators and readiness scores for any job match', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          jobMatchArb,
          async (user, jobMatch) => {
            // Ensure job match belongs to the user
            const userJobMatch = {
              ...jobMatch,
              userId: user._id
            };

            // Mock database calls
            const mockJobMatch = {
              ...userJobMatch,
              getSkillGaps: jest.fn().mockReturnValue([
                {
                  skill: 'javascript',
                  currentLevel: 5,
                  requiredLevel: 7,
                  gap: 2,
                  isRequired: true,
                  weight: 0.8,
                  priority: 'high'
                }
              ]),
              canApply: jest.fn().mockReturnValue({ canApply: true, reason: 'Eligible to apply' }),
              skillMatchPercentage: 75,
              jobAgeInDays: 5,
              daysUntilExpiry: 25
            };

            jest.spyOn(JobMatch, 'findOne').mockResolvedValue(mockJobMatch as any);

            // Create mock request and response
            const mockReq = {
              user: { _id: user._id },
              params: { matchId: userJobMatch._id.toString() }
            } as any;

            const mockRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as any;

            await jobController.getJobMatchDetails(mockReq, mockRes);

            // Property: Response should include skill alignment indicators
            expect(mockRes.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                  match: expect.any(Object),
                  skillGaps: expect.arrayContaining([
                    expect.objectContaining({
                      skill: expect.any(String),
                      currentLevel: expect.any(Number),
                      requiredLevel: expect.any(Number),
                      gap: expect.any(Number),
                      isRequired: expect.any(Boolean),
                      weight: expect.any(Number),
                      priority: expect.stringMatching(/^(critical|high|medium|low)$/)
                    })
                  ]),
                  canApply: expect.any(Boolean),
                  canApplyReason: expect.any(String),
                  skillMatchPercentage: expect.any(Number),
                  jobAgeInDays: expect.any(Number),
                  daysUntilExpiry: expect.any(Number)
                })
              })
            );

            // Property: Skill gaps should have valid structure
            const callArgs = mockRes.json.mock.calls[0][0];
            const skillGaps = callArgs.data.skillGaps;
            
            skillGaps.forEach((gap: any) => {
              expect(typeof gap.skill).toBe('string');
              expect(gap.skill.length).toBeGreaterThan(0);
              expect(typeof gap.currentLevel).toBe('number');
              expect(gap.currentLevel).toBeGreaterThanOrEqual(0);
              expect(gap.currentLevel).toBeLessThanOrEqual(10);
              expect(typeof gap.requiredLevel).toBe('number');
              expect(gap.requiredLevel).toBeGreaterThanOrEqual(0);
              expect(gap.requiredLevel).toBeLessThanOrEqual(10);
              expect(typeof gap.gap).toBe('number');
              expect(gap.gap).toBeGreaterThanOrEqual(0);
              expect(typeof gap.isRequired).toBe('boolean');
              expect(typeof gap.weight).toBe('number');
              expect(gap.weight).toBeGreaterThanOrEqual(0);
              expect(gap.weight).toBeLessThanOrEqual(1);
              expect(['critical', 'high', 'medium', 'low']).toContain(gap.priority);
            });

            // Property: Readiness scores should be valid numbers
            expect(typeof callArgs.data.skillMatchPercentage).toBe('number');
            expect(callArgs.data.skillMatchPercentage).toBeGreaterThanOrEqual(0);
            expect(callArgs.data.skillMatchPercentage).toBeLessThanOrEqual(100);

            // Property: Job timing information should be present
            expect(typeof callArgs.data.jobAgeInDays).toBe('number');
            expect(callArgs.data.jobAgeInDays).toBeGreaterThanOrEqual(0);
            
            if (callArgs.data.daysUntilExpiry !== null) {
              expect(typeof callArgs.data.daysUntilExpiry).toBe('number');
            }

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Job Matches List Display', () => {
    it('should include skill alignment and readiness indicators for all job matches in list', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          fc.array(jobMatchArb, { minLength: 3, maxLength: 10 }),
          async (user, jobMatches) => {
            // Ensure all job matches belong to the user
            const userJobMatches = jobMatches.map(match => ({
              ...match,
              userId: user._id
            }));

            // Mock database calls
            jest.spyOn(JobMatch, 'find').mockReturnValue({
              sort: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              lean: jest.fn().mockResolvedValue(userJobMatches)
            } as any);

            // Create mock request and response
            const mockReq = {
              user: { _id: user._id },
              query: {}
            } as any;

            const mockRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as any;

            await jobController.getJobMatches(mockReq, mockRes);

            // Property: Response should include matches with skill alignment data
            expect(mockRes.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                  matches: expect.arrayContaining(
                    userJobMatches.map(() => 
                      expect.objectContaining({
                        matchScore: expect.any(Number),
                        skillAlignment: expect.any(Object),
                        title: expect.any(String),
                        company: expect.any(String),
                        location: expect.any(String),
                        applicationStatus: expect.stringMatching(
                          new RegExp(`^(${Object.values(ApplicationStatus).join('|')})$`)
                        )
                      })
                    )
                  ),
                  totalMatches: expect.any(Number),
                  lastUpdated: expect.any(Date)
                })
              })
            );

            // Property: All matches should have valid match scores (readiness indicators)
            const callArgs = mockRes.json.mock.calls[0][0];
            const matches = callArgs.data.matches;
            
            matches.forEach((match: any) => {
              expect(typeof match.matchScore).toBe('number');
              expect(match.matchScore).toBeGreaterThanOrEqual(0);
              expect(match.matchScore).toBeLessThanOrEqual(100);
              
              // Property: Skill alignment should be present
              expect(match.skillAlignment).toBeDefined();
              
              // Property: Essential job information should be present
              expect(typeof match.title).toBe('string');
              expect(match.title.length).toBeGreaterThan(0);
              expect(typeof match.company).toBe('string');
              expect(match.company.length).toBeGreaterThan(0);
              expect(typeof match.location).toBe('string');
              expect(match.location.length).toBeGreaterThan(0);
              
              // Property: Application status should be valid
              expect(Object.values(ApplicationStatus)).toContain(match.applicationStatus);
            });

            // Property: Total matches should match array length
            expect(callArgs.data.totalMatches).toBe(matches.length);

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Application Tracking Capabilities', () => {
    it('should provide comprehensive application tracking and status updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          fc.array(jobApplicationArb, { minLength: 2, maxLength: 8 }),
          async (user, applications) => {
            // Ensure all applications belong to the user
            const userApplications = applications.map(app => ({
              ...app,
              userId: user._id
            }));

            // Mock database calls
            jest.spyOn(JobApplication, 'findByUser' as any).mockResolvedValue(userApplications);
            jest.spyOn(JobApplication, 'getApplicationStatistics' as any).mockResolvedValue({
              totalApplications: userApplications.length,
              statusDistribution: {
                [ApplicationStatus.APPLIED]: 3,
                [ApplicationStatus.UNDER_REVIEW]: 2,
                [ApplicationStatus.INTERVIEWING]: 1
              },
              averageTimeInStatus: 15,
              feedbackRate: 25,
              documentAttachmentRate: 60,
              responseRate: 40,
              interviewRate: 20,
              offerRate: 10
            });

            // Create mock request and response
            const mockReq = {
              user: { _id: user._id },
              query: {}
            } as any;

            const mockRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as any;

            await jobController.getJobApplications(mockReq, mockRes);

            // Property: Response should include application tracking data
            expect(mockRes.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                  applications: expect.arrayContaining(
                    userApplications.map(() => 
                      expect.objectContaining({
                        status: expect.stringMatching(
                          new RegExp(`^(${Object.values(ApplicationStatus).join('|')})$`)
                        ),
                        applicationDate: expect.any(Date),
                        timeline: expect.arrayContaining([
                          expect.objectContaining({
                            status: expect.any(String),
                            date: expect.any(Date),
                            source: expect.stringMatching(
                              new RegExp(`^(${Object.values(TimelineSource).join('|')})$`)
                            )
                          })
                        ])
                      })
                    )
                  ),
                  statistics: expect.objectContaining({
                    totalApplications: expect.any(Number),
                    statusDistribution: expect.any(Object),
                    averageTimeInStatus: expect.any(Number),
                    feedbackRate: expect.any(Number),
                    documentAttachmentRate: expect.any(Number),
                    responseRate: expect.any(Number),
                    interviewRate: expect.any(Number),
                    offerRate: expect.any(Number)
                  }),
                  totalApplications: expect.any(Number)
                })
              })
            );

            // Property: All applications should have valid tracking data
            const callArgs = mockRes.json.mock.calls[0][0];
            const apps = callArgs.data.applications;
            
            apps.forEach((app: any) => {
              // Property: Status should be valid
              expect(Object.values(ApplicationStatus)).toContain(app.status);
              
              // Property: Application date should be valid
              expect(app.applicationDate).toBeInstanceOf(Date);
              
              // Property: Timeline should have at least one entry
              expect(Array.isArray(app.timeline)).toBe(true);
              expect(app.timeline.length).toBeGreaterThan(0);
              
              // Property: Each timeline entry should be valid
              app.timeline.forEach((entry: any) => {
                expect(Object.values(ApplicationStatus)).toContain(entry.status);
                expect(entry.date).toBeInstanceOf(Date);
                expect(Object.values(TimelineSource)).toContain(entry.source);
              });
              
              // Property: Timeline should be chronologically ordered
              for (let i = 1; i < app.timeline.length; i++) {
                expect(app.timeline[i].date.getTime()).toBeGreaterThanOrEqual(
                  app.timeline[i - 1].date.getTime()
                );
              }
            });

            // Property: Statistics should have valid structure
            const stats = callArgs.data.statistics;
            expect(typeof stats.totalApplications).toBe('number');
            expect(stats.totalApplications).toBeGreaterThanOrEqual(0);
            expect(typeof stats.statusDistribution).toBe('object');
            expect(typeof stats.averageTimeInStatus).toBe('number');
            expect(stats.averageTimeInStatus).toBeGreaterThanOrEqual(0);
            expect(typeof stats.feedbackRate).toBe('number');
            expect(stats.feedbackRate).toBeGreaterThanOrEqual(0);
            expect(stats.feedbackRate).toBeLessThanOrEqual(100);
            expect(typeof stats.responseRate).toBe('number');
            expect(stats.responseRate).toBeGreaterThanOrEqual(0);
            expect(stats.responseRate).toBeLessThanOrEqual(100);

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 8 }
      );
    });
  });

  describe('Application Status Updates', () => {
    it('should provide proper status update tracking for any application', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          jobApplicationArb,
          fc.constantFrom(...Object.values(ApplicationStatus)),
          fc.option(fc.string({ minLength: 10, maxLength: 200 })),
          async (user, application, newStatus, notes) => {
            // Ensure application belongs to the user
            const userApplication = {
              ...application,
              userId: user._id,
              updateStatus: jest.fn().mockResolvedValue(undefined)
            };

            // Mock database calls
            jest.spyOn(JobApplication, 'findOne').mockResolvedValue(userApplication as any);

            // Create mock request and response
            const mockReq = {
              user: { _id: user._id },
              params: { applicationId: userApplication._id.toString() },
              body: { status: newStatus, notes }
            } as any;

            const mockRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as any;

            await jobController.updateApplicationStatus(mockReq, mockRes);

            // Property: Response should confirm status update
            expect(mockRes.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                  application: expect.any(Object)
                }),
                message: expect.stringContaining('updated successfully')
              })
            );

            // Property: updateStatus method should be called with correct parameters
            expect(userApplication.updateStatus).toHaveBeenCalledWith(newStatus, notes);

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});