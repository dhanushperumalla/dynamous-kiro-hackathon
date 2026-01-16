import * as fc from 'fast-check';
import { jobMatchingService } from '../../src/services/jobMatchingService';
import { User } from '../../src/models/User';
import { JobPreferences } from '../../src/models/JobPreferences';
import { JobMatch } from '../../src/models/JobMatch';
import { jobAggregationService } from '../../src/services/jobAggregationService';
import {
  JobType,
  ExperienceLevel,
  ApplicationStatus,
  RemoteWorkPreference,
  SalaryPeriod,
  JobSource,
  IExternalJobData,
  ISalaryRange
} from '../../src/types/job';
import { IUser } from '../../src/types/user';
import { connectDatabase } from '../../src/config/database';
import mongoose from 'mongoose';

/**
 * Property-Based Test for Job Matching Threshold
 * **Feature: ai-sikshak-platform, Property 13: Job Matching Threshold**
 * **Validates: Requirements 6.1, 6.3**
 * 
 * Property: For any user reaching 80% learning path completion, the Job Matcher should present 
 * relevant job opportunities based on learned skills, location preferences, and experience level.
 */

// Generators for property-based testing
const jobTypeArb = fc.constantFrom(...Object.values(JobType));
const experienceLevelArb = fc.constantFrom(...Object.values(ExperienceLevel));
const jobSourceArb = fc.constantFrom(...Object.values(JobSource));
const remoteWorkPrefArb = fc.constantFrom(...Object.values(RemoteWorkPreference));

// Generator for valid MongoDB ObjectIds
const objectIdArb = fc.string({ minLength: 24, maxLength: 24 })
  .filter(s => /^[a-f0-9]{24}$/.test(s));

// Generator for user profiles with learning progress
const userProfileArb = fc.record({
  firstName: fc.string({ minLength: 2, maxLength: 50 }),
  lastName: fc.string({ minLength: 2, maxLength: 50 }),
  location: fc.string({ minLength: 3, maxLength: 100 }),
  educationLevel: fc.constantFrom('high_school', 'bachelor', 'master', 'phd'),
  currentStatus: fc.constantFrom('student', 'graduate', 'employed', 'unemployed', 'career_changer')
});

// Generator for user stats with learning progress
const userStatsArb = fc.record({
  totalLearningHours: fc.integer({ min: 50, max: 500 }), // Significant learning hours
  completedModules: fc.integer({ min: 8, max: 20 }), // 80%+ completion (assuming 10 total modules)
  achievementsEarned: fc.integer({ min: 5, max: 25 }),
  streakDays: fc.integer({ min: 30, max: 365 }),
  lastActiveDate: fc.date({ min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }), // Active within last week
  joinDate: fc.date({ min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }),
  assessmentCompleted: fc.constant(true),
  skillsAcquired: fc.array(
    fc.constantFrom(
      'javascript', 'python', 'react', 'node.js', 'sql', 'aws', 'docker',
      'communication', 'teamwork', 'problem solving', 'project management',
      'data analysis', 'machine learning', 'web development', 'mobile development'
    ),
    { minLength: 5, maxLength: 15 }
  ),
  currentLearningPath: objectIdArb
});

// Generator for users with 80%+ learning completion
const qualifiedUserArb = fc.record({
  _id: objectIdArb,
  email: fc.emailAddress(),
  role: fc.constant('student'),
  profile: userProfileArb,
  stats: userStatsArb,
  isActive: fc.constant(true)
}).map((userData) => ({
  ...userData,
  _id: new mongoose.Types.ObjectId(userData._id),
  stats: {
    ...userData.stats,
    currentLearningPath: new mongoose.Types.ObjectId(userData.stats.currentLearningPath)
  },
  createdAt: new Date(),
  updatedAt: new Date()
} as unknown as IUser));

// Generator for job preferences
const jobPreferencesArb = fc.record({
  locations: fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 1, maxLength: 3 }),
  remoteWork: remoteWorkPrefArb,
  jobTypes: fc.array(jobTypeArb, { minLength: 1, maxLength: 3 }),
  experienceLevels: fc.array(experienceLevelArb, { minLength: 1, maxLength: 3 }),
  salaryExpectations: fc.record({
    currency: fc.constant('USD'),
    min: fc.integer({ min: 40000, max: 80000 }),
    max: fc.integer({ min: 80000, max: 150000 }),
    period: fc.constant(SalaryPeriod.YEARLY),
    negotiable: fc.boolean(),
    benefits: fc.array(fc.record({
      benefit: fc.string({ minLength: 5, maxLength: 30 }),
      importance: fc.constantFrom('not_important', 'somewhat_important', 'important', 'very_important', 'critical')
    }), { minLength: 0, maxLength: 5 })
  }),
  industries: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
  companySize: fc.array(fc.constantFrom('startup', 'small', 'medium', 'large', 'enterprise'), { minLength: 0, maxLength: 3 }),
  benefits: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { minLength: 0, maxLength: 8 }),
  workCulture: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { minLength: 0, maxLength: 5 })
});

// Generator for external job data
const externalJobArb = fc.record({
  externalId: fc.string({ minLength: 5, maxLength: 20 }),
  source: jobSourceArb,
  title: fc.string({ minLength: 10, maxLength: 100 }),
  company: fc.string({ minLength: 3, maxLength: 50 }),
  location: fc.string({ minLength: 5, maxLength: 50 }),
  description: fc.string({ minLength: 100, maxLength: 1000 }),
  requirements: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 3, maxLength: 10 }),
  jobType: jobTypeArb,
  experienceLevel: experienceLevelArb,
  postedDate: fc.date({ min: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }), // Posted within last 30 days
  applicationUrl: fc.webUrl(),
  salaryRange: fc.option(fc.record({
    currency: fc.constant('USD'),
    min: fc.integer({ min: 35000, max: 70000 }),
    max: fc.integer({ min: 70000, max: 200000 }),
    period: fc.constant(SalaryPeriod.YEARLY),
    location: fc.string({ minLength: 5, maxLength: 50 }),
    negotiable: fc.boolean()
  }) as fc.Arbitrary<ISalaryRange>),
  benefits: fc.option(fc.array(fc.string({ minLength: 5, maxLength: 30 }), { minLength: 0, maxLength: 8 })),
  rawData: fc.record({})
}) as fc.Arbitrary<IExternalJobData>;

describe('Job Matching Threshold Property Tests', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  /**
   * Property 13: Job Matching Threshold
   * For any user reaching 80% learning path completion, the Job Matcher should present 
   * relevant job opportunities based on learned skills, location preferences, and experience level.
   */
  
  describe('80% Completion Threshold Triggering', () => {
    it('should present job opportunities for users with 80%+ learning completion', async () => {
      await fc.assert(
        fc.asyncProperty(
          qualifiedUserArb,
          jobPreferencesArb,
          fc.array(externalJobArb, { minLength: 5, maxLength: 20 }),
          async (user, preferences, availableJobs) => {
            // Ensure user has 80%+ completion
            const completedModules = Math.max(8, user.stats.completedModules); // At least 80%
            
            // Update user stats to ensure 80%+ completion
            const qualifiedUser = {
              ...user,
              stats: {
                ...user.stats,
                completedModules
              }
            };

            // Mock database calls
            jest.spyOn(User, 'findById').mockResolvedValue(qualifiedUser as any);
            jest.spyOn(JobPreferences, 'findByUser' as any).mockResolvedValue({
              userId: qualifiedUser._id,
              ...preferences,
              updatedAt: new Date()
            } as any);

            // Mock job aggregation service
            jest.spyOn(jobAggregationService, 'aggregateJobs').mockResolvedValue({
              jobs: availableJobs,
              aggregations: [],
              syncResults: []
            });

            // Mock JobMatch operations
            jest.spyOn(JobMatch, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any);
            jest.spyOn(JobMatch, 'insertMany').mockResolvedValue([]);

            const result = await jobMatchingService.findJobMatches(qualifiedUser._id.toString());

            // Property: Users with 80%+ completion should receive job matches
            expect(result).toBeDefined();
            expect(typeof result.totalMatches).toBe('number');
            expect(result.totalMatches).toBeGreaterThanOrEqual(0);

            // Property: If there are available jobs, qualified users should get matches
            if (availableJobs.length > 0) {
              expect(result.jobMatches).toBeDefined();
              expect(Array.isArray(result.jobMatches)).toBe(true);
              
              // Should have at least some matches for qualified users
              const hasRelevantJobs = availableJobs.some(job => 
                preferences.jobTypes.includes(job.jobType) ||
                preferences.experienceLevels.includes(job.experienceLevel) ||
                preferences.locations.some(loc => job.location.toLowerCase().includes(loc.toLowerCase()))
              );

              if (hasRelevantJobs) {
                expect(result.totalMatches).toBeGreaterThan(0);
              }
            }

            // Property: All returned matches should meet minimum threshold
            result.jobMatches.forEach(match => {
              expect(typeof match.matchScore).toBe('number');
              expect(match.matchScore).toBeGreaterThanOrEqual(30); // Default minimum threshold
              expect(match.matchScore).toBeLessThanOrEqual(100);
              expect(match.userId.toString()).toBe(qualifiedUser._id.toString());
              expect(match.applicationStatus).toBe(ApplicationStatus.NOT_APPLIED);
              expect(match.isActive).toBe(true);
            });

            // Property: Matches should be sorted by score (highest first)
            for (let i = 1; i < result.jobMatches.length; i++) {
              expect(result.jobMatches[i - 1].matchScore).toBeGreaterThanOrEqual(
                result.jobMatches[i].matchScore
              );
            }

            // Property: Processing time should be reasonable
            expect(typeof result.processingTime).toBe('number');
            expect(result.processingTime).toBeGreaterThan(0);
            expect(result.processingTime).toBeLessThan(30000); // Less than 30 seconds

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Skill-Based Job Matching', () => {
    it('should match jobs based on learned skills from user progress', async () => {
      await fc.assert(
        fc.asyncProperty(
          qualifiedUserArb,
          jobPreferencesArb,
          fc.array(externalJobArb, { minLength: 3, maxLength: 10 }),
          async (user, preferences, availableJobs) => {
            // Ensure jobs have skills that match user's acquired skills
            const userSkills = user.stats.skillsAcquired;
            const jobsWithMatchingSkills = availableJobs.map(job => ({
              ...job,
              description: `${job.description} ${userSkills.slice(0, 3).join(' ')}`, // Add user skills to description
              requirements: [...job.requirements, ...userSkills.slice(0, 2)] // Add user skills to requirements
            }));

            // Mock database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(JobPreferences, 'findByUser' as any).mockResolvedValue({
              userId: user._id,
              ...preferences,
              updatedAt: new Date()
            } as any);

            jest.spyOn(jobAggregationService, 'aggregateJobs').mockResolvedValue({
              jobs: jobsWithMatchingSkills,
              aggregations: [],
              syncResults: []
            });

            jest.spyOn(JobMatch, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any);
            jest.spyOn(JobMatch, 'insertMany').mockResolvedValue([]);

            const result = await jobMatchingService.findJobMatches(user._id.toString());

            // Property: Jobs matching user skills should have higher match scores
            if (result.jobMatches.length > 0) {
              result.jobMatches.forEach(match => {
                // Check if job contains user's skills
                const jobText = `${match.title} ${match.description} ${match.requirements.join(' ')}`.toLowerCase();
                const matchingSkills = userSkills.filter(skill => 
                  jobText.includes(skill.toLowerCase())
                );

                // Property: Jobs with more matching skills should have higher scores
                if (matchingSkills.length > 0) {
                  expect(match.matchScore).toBeGreaterThan(30);
                  
                  // Skill alignment should reflect the matches
                  expect(match.skillAlignment).toBeDefined();
                  
                  matchingSkills.forEach(skill => {
                    const skillKey = skill.toLowerCase();
                    const alignment = match.skillAlignment.get ? 
                      match.skillAlignment.get(skillKey) : 
                      match.skillAlignment[skillKey];
                    
                    if (alignment && typeof alignment === 'object') {
                      expect(alignment.userLevel).toBeGreaterThan(0);
                      expect(typeof alignment.requiredLevel).toBe('number');
                      expect(typeof alignment.gap).toBe('number');
                      expect(alignment.gap).toBeGreaterThanOrEqual(0);
                    }
                  });
                }
              });
            }

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Location-Based Job Matching', () => {
    it('should match jobs based on user location preferences', async () => {
      await fc.assert(
        fc.asyncProperty(
          qualifiedUserArb,
          jobPreferencesArb,
          fc.array(externalJobArb, { minLength: 3, maxLength: 10 }),
          async (user, preferences, availableJobs) => {
            // Create jobs in user's preferred locations
            const preferredLocation = preferences.locations[0];
            const jobsInPreferredLocation = availableJobs.map((job, index) => ({
              ...job,
              location: index < availableJobs.length / 2 ? 
                `${preferredLocation}, State` : 
                job.location // Half in preferred location, half elsewhere
            }));

            // Mock database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(JobPreferences, 'findByUser' as any).mockResolvedValue({
              userId: user._id,
              ...preferences,
              updatedAt: new Date()
            } as any);

            jest.spyOn(jobAggregationService, 'aggregateJobs').mockResolvedValue({
              jobs: jobsInPreferredLocation,
              aggregations: [],
              syncResults: []
            });

            jest.spyOn(JobMatch, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any);
            jest.spyOn(JobMatch, 'insertMany').mockResolvedValue([]);

            const result = await jobMatchingService.findJobMatches(user._id.toString());

            // Property: Jobs in preferred locations should have higher match scores
            if (result.jobMatches.length > 0) {
              const preferredLocation = preferences.locations[0];
              if (preferredLocation) {
                const jobsInPreferredLoc = result.jobMatches.filter(match => 
                  match.location.toLowerCase().includes(preferredLocation.toLowerCase())
                );
                const jobsElsewhere = result.jobMatches.filter(match => 
                  !match.location.toLowerCase().includes(preferredLocation.toLowerCase())
                );

                // If we have jobs in both categories, preferred location jobs should score higher
                if (jobsInPreferredLoc.length > 0 && jobsElsewhere.length > 0) {
                  const avgScorePreferred = jobsInPreferredLoc.reduce((sum, job) => sum + job.matchScore, 0) / jobsInPreferredLoc.length;
                  const avgScoreElsewhere = jobsElsewhere.reduce((sum, job) => sum + job.matchScore, 0) / jobsElsewhere.length;
                  
                  // Allow for some variance due to other factors, but preferred should generally be higher
                  expect(avgScorePreferred).toBeGreaterThanOrEqual(avgScoreElsewhere - 10);
                }

                // Property: Remote work preference should be respected
                if (preferences.remoteWork === RemoteWorkPreference.REMOTE_ONLY) {
                  result.jobMatches.forEach(match => {
                    const isRemoteJob = match.jobType === JobType.REMOTE || 
                                     match.location.toLowerCase().includes('remote');
                    if (isRemoteJob) {
                      expect(match.matchScore).toBeGreaterThan(50); // Remote jobs should score well for remote-only users
                    }
                  });
                }
              }
            }

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Experience Level Matching', () => {
    it('should match jobs based on user experience level derived from learning progress', async () => {
      await fc.assert(
        fc.asyncProperty(
          qualifiedUserArb,
          jobPreferencesArb,
          fc.array(externalJobArb, { minLength: 5, maxLength: 15 }),
          async (user, preferences, availableJobs) => {
            // Determine user's experience level based on learning progress
            const expectedExperienceLevel = user.stats.completedModules >= 15 ? 
              ExperienceLevel.MID_LEVEL : 
              user.stats.completedModules >= 10 ? 
                ExperienceLevel.JUNIOR : 
                ExperienceLevel.ENTRY_LEVEL;

            // Create jobs with various experience levels
            const jobsWithVariedLevels = availableJobs.map((job, index) => ({
              ...job,
              experienceLevel: index % 3 === 0 ? expectedExperienceLevel :
                              index % 3 === 1 ? ExperienceLevel.SENIOR :
                              ExperienceLevel.ENTRY_LEVEL
            }));

            // Mock database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(JobPreferences, 'findByUser' as any).mockResolvedValue({
              userId: user._id,
              ...preferences,
              experienceLevels: [expectedExperienceLevel, ExperienceLevel.JUNIOR], // Include user's level
              updatedAt: new Date()
            } as any);

            jest.spyOn(jobAggregationService, 'aggregateJobs').mockResolvedValue({
              jobs: jobsWithVariedLevels,
              aggregations: [],
              syncResults: []
            });

            jest.spyOn(JobMatch, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any);
            jest.spyOn(JobMatch, 'insertMany').mockResolvedValue([]);

            const result = await jobMatchingService.findJobMatches(user._id.toString());

            // Property: Jobs matching user's experience level should have higher scores
            if (result.jobMatches.length > 0) {
              const matchingLevelJobs = result.jobMatches.filter(match => 
                match.experienceLevel === expectedExperienceLevel
              );
              const nonMatchingLevelJobs = result.jobMatches.filter(match => 
                match.experienceLevel !== expectedExperienceLevel
              );

              if (matchingLevelJobs.length > 0 && nonMatchingLevelJobs.length > 0) {
                const avgScoreMatching = matchingLevelJobs.reduce((sum, job) => sum + job.matchScore, 0) / matchingLevelJobs.length;
                const avgScoreNonMatching = nonMatchingLevelJobs.reduce((sum, job) => sum + job.matchScore, 0) / nonMatchingLevelJobs.length;
                
                // Matching experience level should generally score higher
                expect(avgScoreMatching).toBeGreaterThanOrEqual(avgScoreNonMatching - 15);
              }

              // Property: All matches should have valid experience levels
              result.jobMatches.forEach(match => {
                expect(Object.values(ExperienceLevel)).toContain(match.experienceLevel);
              });
            }

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 15 }
      );
    });
  });

  describe('Match Score Validation', () => {
    it('should generate valid match scores within expected ranges', async () => {
      await fc.assert(
        fc.asyncProperty(
          qualifiedUserArb,
          jobPreferencesArb,
          fc.array(externalJobArb, { minLength: 1, maxLength: 5 }),
          async (user, preferences, availableJobs) => {
            // Mock database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(JobPreferences, 'findByUser' as any).mockResolvedValue({
              userId: user._id,
              ...preferences,
              updatedAt: new Date()
            } as any);

            jest.spyOn(jobAggregationService, 'aggregateJobs').mockResolvedValue({
              jobs: availableJobs,
              aggregations: [],
              syncResults: []
            });

            jest.spyOn(JobMatch, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any);
            jest.spyOn(JobMatch, 'insertMany').mockResolvedValue([]);

            const result = await jobMatchingService.findJobMatches(user._id.toString());

            // Property: All match scores should be valid numbers within range
            result.jobMatches.forEach(match => {
              expect(typeof match.matchScore).toBe('number');
              expect(match.matchScore).toBeGreaterThanOrEqual(0);
              expect(match.matchScore).toBeLessThanOrEqual(100);
              expect(Number.isInteger(match.matchScore)).toBe(true);
              
              // Property: Matches below threshold should not be included
              expect(match.matchScore).toBeGreaterThanOrEqual(30); // Default minimum threshold
            });

            // Property: Average match score should be reasonable
            if (result.jobMatches.length > 0) {
              expect(typeof result.averageMatchScore).toBe('number');
              expect(result.averageMatchScore).toBeGreaterThanOrEqual(0);
              expect(result.averageMatchScore).toBeLessThanOrEqual(100);
              
              // Verify average calculation
              const calculatedAverage = Math.round(
                result.jobMatches.reduce((sum, match) => sum + match.matchScore, 0) / result.jobMatches.length
              );
              expect(result.averageMatchScore).toBe(calculatedAverage);
            }

            // Property: Skill alignment should be properly structured
            result.jobMatches.forEach(match => {
              expect(match.skillAlignment).toBeDefined();
              
              // Handle both Map and Object representations
              const skillEntries = match.skillAlignment.entries ? 
                Array.from(match.skillAlignment.entries()) : 
                Object.entries(match.skillAlignment);
              
              // Each skill alignment should have proper structure
              skillEntries.forEach((entry: any) => {
                const [skill, alignment] = Array.isArray(entry) ? entry : [entry[0], entry[1]];
                expect(typeof skill).toBe('string');
                expect(skill.length).toBeGreaterThan(0);
                
                if (alignment && typeof alignment === 'object') {
                  expect(typeof alignment.required).toBe('boolean');
                  expect(typeof alignment.userLevel).toBe('number');
                  expect(alignment.userLevel).toBeGreaterThanOrEqual(0);
                  expect(alignment.userLevel).toBeLessThanOrEqual(10);
                  expect(typeof alignment.requiredLevel).toBe('number');
                  expect(alignment.requiredLevel).toBeGreaterThanOrEqual(0);
                  expect(alignment.requiredLevel).toBeLessThanOrEqual(10);
                  expect(typeof alignment.gap).toBe('number');
                  expect(alignment.gap).toBeGreaterThanOrEqual(0);
                  expect(typeof alignment.weight).toBe('number');
                  expect(alignment.weight).toBeGreaterThanOrEqual(0);
                  expect(alignment.weight).toBeLessThanOrEqual(1);
                }
              });
            });

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Completion Threshold Edge Cases', () => {
    it('should handle users at exactly 80% completion correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          qualifiedUserArb,
          jobPreferencesArb,
          fc.array(externalJobArb, { minLength: 2, maxLength: 8 }),
          async (user, preferences, availableJobs) => {
            // Set user to exactly 80% completion
            const exactlyQualifiedUser = {
              ...user,
              stats: {
                ...user.stats,
                completedModules: 8, // Exactly 80% of 10 modules
                totalLearningHours: 80 // Significant learning time
              }
            };

            // Mock database calls
            jest.spyOn(User, 'findById').mockResolvedValue(exactlyQualifiedUser as any);
            jest.spyOn(JobPreferences, 'findByUser' as any).mockResolvedValue({
              userId: exactlyQualifiedUser._id,
              ...preferences,
              updatedAt: new Date()
            } as any);

            jest.spyOn(jobAggregationService, 'aggregateJobs').mockResolvedValue({
              jobs: availableJobs,
              aggregations: [],
              syncResults: []
            });

            jest.spyOn(JobMatch, 'deleteMany').mockResolvedValue({ deletedCount: 0 } as any);
            jest.spyOn(JobMatch, 'insertMany').mockResolvedValue([]);

            const result = await jobMatchingService.findJobMatches(exactlyQualifiedUser._id.toString());

            // Property: Users at exactly 80% should be eligible for job matching
            expect(result).toBeDefined();
            expect(typeof result.totalMatches).toBe('number');
            expect(result.totalMatches).toBeGreaterThanOrEqual(0);

            // Property: Should process successfully without errors
            expect(typeof result.processingTime).toBe('number');
            expect(result.processingTime).toBeGreaterThan(0);

            // Property: Criteria should be properly set
            expect(result.criteria).toBeDefined();
            expect(result.criteria.userId).toBe(exactlyQualifiedUser._id.toString());
            expect(typeof result.criteria.minimumMatchScore).toBe('number');
            expect(result.criteria.minimumMatchScore).toBeGreaterThan(0);

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});