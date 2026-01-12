import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { connectDatabase } from '../../src/config/database';
import Progress from '../../src/models/Progress';
import LearningPath from '../../src/models/LearningPath';
import { User } from '../../src/models/User';
import { progressTrackingService } from '../../src/services/progressTrackingService';
import {
  IActivitySubmission,
  ActivityType,
  AnalyticsTimeframe
} from '../../src/types/progress';
import {
  DifficultyLevel,
  LearningPace,
  LearningStyle,
  SkillLevel,
  WeekDay,
  TimeSlot,
  ReminderFrequency,
  NotificationChannel
} from '../../src/types/learning';

/**
 * Property-Based Test for Analytics Generation
 * **Feature: ai-sikshak-platform, Property 17: Analytics Generation**
 * **Validates: Requirements 9.1, 9.3, 9.4**
 * 
 * Property: For any user with learning activity, the system should generate detailed analytics 
 * dashboards with learning velocity, completion rates, peer comparisons, and knowledge gap identification.
 */

// Mock MongoDB connection for testing
beforeAll(async () => {
  // Connect to test database
  await connectDatabase();
});

afterAll(async () => {
  // Close database connections
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Progress.deleteMany({});
  await LearningPath.deleteMany({});
  await User.deleteMany({});
});

// Generators for property-based testing
const activityTypeArb = fc.constantFrom(...Object.values(ActivityType));
const difficultyLevelArb = fc.constantFrom(...Object.values(DifficultyLevel));
const analyticsTimeframeArb = fc.constantFrom(...Object.values(AnalyticsTimeframe));

// Generator for valid activity submissions with skills
const activitySubmissionArb = fc.record({
  type: activityTypeArb,
  title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length >= 1),
  hoursSpent: fc.float({ min: Math.fround(0.1), max: Math.fround(8.0) }),
  skillsAcquired: fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length >= 1), { minLength: 1, maxLength: 5 }),
  qualityScore: fc.integer({ min: 1, max: 10 })
}).chain(base => 
  fc.record({
    moduleId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    weeklyTargetId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    description: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 1000 }))
  }).map(optional => {
    const result: IActivitySubmission = { ...base };
    if (optional.moduleId !== null) result.moduleId = optional.moduleId;
    if (optional.weeklyTargetId !== null) result.weeklyTargetId = optional.weeklyTargetId;
    if (optional.description !== null) result.description = optional.description;
    if (optional.notes !== null) result.notes = optional.notes;
    return result;
  })
);

// Generator for test users
const testUserArb = fc.record({
  email: fc.emailAddress(),
  firstName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  lastName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  currentStatus: fc.constantFrom('student', 'graduate', 'employed', 'unemployed', 'career_changer')
});

// Generator for learning paths
const learningPathArb = fc.record({
  title: fc.string({ minLength: 5, maxLength: 200 }).filter(s => s.trim().length >= 5),
  description: fc.string({ minLength: 10, maxLength: 1000 }).filter(s => s.trim().length >= 10),
  estimatedDuration: fc.integer({ min: 1, max: 52 }),
  difficulty: difficultyLevelArb
});

describe('Analytics Generation Property Tests', () => {
  /**
   * Property 17: Analytics Generation
   * For any user with learning activity, the system should generate detailed analytics 
   * dashboards with learning velocity, completion rates, peer comparisons, and knowledge gap identification.
   */
  
  describe('Detailed Analytics Dashboard Generation (Requirement 9.1)', () => {
    it('should generate comprehensive analytics dashboards with learning velocity, completion rates, and time spent for any user activity pattern', async () => {
      await fc.assert(
        fc.asyncProperty(
          testUserArb,
          learningPathArb,
          fc.array(activitySubmissionArb, { minLength: 3, maxLength: 10 }),
          analyticsTimeframeArb,
          async (userData, pathData, activitiesData, timeframe) => {
            // Create test user
            const user = new User({
              email: userData.email,
              profile: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                currentStatus: userData.currentStatus
              },
              security: {
                passwordHash: 'hashedpassword',
                emailVerified: true,
                lastPasswordChange: new Date(),
                loginAttempts: 0,
                twoFactorEnabled: false,
                refreshTokens: []
              },
              oauth: {
                providers: ['local']
              }
            });
            await user.save();

            // Create test learning path
            const learningPath = new LearningPath({
              userId: user._id,
              domainId: new mongoose.Types.ObjectId(),
              title: pathData.title,
              description: pathData.description,
              estimatedDuration: pathData.estimatedDuration,
              difficulty: pathData.difficulty,
              modules: [{
                id: 'module-1',
                title: 'Test Module',
                description: 'Test module description',
                order: 1,
                prerequisites: [],
                estimatedHours: 10,
                difficulty: DifficultyLevel.BEGINNER,
                weeklyTargets: [],
                resources: [],
                skills: [],
                assessments: [],
                isOptional: false,
                completionCriteria: {
                  requiredTasks: 1,
                  requiredHours: 1,
                  requiredAssessments: [],
                  requiredSkillLevel: 1
                }
              }],
              progress: {
                completedModules: [],
                currentModule: 'module-1',
                overallProgress: 0,
                weeklyTargetsMet: 0,
                totalWeeklyTargets: 0,
                totalHoursSpent: 0,
                averageWeeklyHours: 0,
                streakWeeks: 0,
                lastActivityDate: new Date(),
                milestones: [],
                skillsAcquired: [],
                certificationsEarned: []
              },
              personalization: {
                learningPace: LearningPace.MODERATE,
                preferredLearningStyle: LearningStyle.MIXED,
                availableHoursPerWeek: 10,
                preferredSchedule: {
                  preferredDays: [WeekDay.MONDAY, WeekDay.WEDNESDAY, WeekDay.FRIDAY],
                  preferredTimeSlots: [TimeSlot.EVENING],
                  timezone: 'UTC',
                  flexibleSchedule: true,
                  reminderSettings: {
                    enabled: true,
                    frequency: ReminderFrequency.WEEKLY,
                    preferredTime: '18:00',
                    channels: [NotificationChannel.EMAIL]
                  }
                },
                skillLevel: SkillLevel.BEGINNER,
                focusAreas: [],
                excludedTopics: [],
                adaptiveSettings: {
                  enabled: true,
                  difficultyAdjustment: true,
                  paceAdjustment: true,
                  contentRecommendation: true,
                  pathOptimization: true
                }
              }
            });
            await learningPath.save();

            // Initialize progress tracking
            await progressTrackingService.initializeProgress(
              user._id.toString(),
              learningPath._id.toString()
            );

            // Record activities
            for (const activity of activitiesData) {
              await progressTrackingService.recordActivity(
                user._id.toString(),
                activity
              );
            }

            // Generate analytics dashboard
            const analytics = await progressTrackingService.getUserAnalytics(
              user._id.toString(),
              timeframe
            );

            const dashboardData = await progressTrackingService.getDashboardData(
              user._id.toString()
            );

            const velocityData = await progressTrackingService.calculateLearningVelocity(
              user._id.toString()
            );

            // Property: Analytics should be generated and contain all required dashboard components
            expect(analytics).toBeTruthy();
            expect(dashboardData).toBeTruthy();
            expect(velocityData).toBeTruthy();

            // Property: Analytics should contain learning velocity metrics (Requirement 9.1)
            expect(analytics!.performance).toHaveProperty('learningVelocity');
            expect(typeof analytics!.performance.learningVelocity).toBe('number');
            expect(analytics!.performance.learningVelocity).toBeGreaterThanOrEqual(0);
            expect(isFinite(analytics!.performance.learningVelocity)).toBe(true);

            // Property: Analytics should contain completion rates (Requirement 9.1)
            expect(analytics!.performance).toHaveProperty('completionRate');
            expect(typeof analytics!.performance.completionRate).toBe('number');
            expect(analytics!.performance.completionRate).toBeGreaterThanOrEqual(0);
            expect(analytics!.performance.completionRate).toBeLessThanOrEqual(100);

            // Property: Analytics should contain time spent metrics (Requirement 9.1)
            expect(analytics!.analytics).toHaveProperty('totalHoursSpent');
            expect(typeof analytics!.analytics.totalHoursSpent).toBe('number');
            expect(analytics!.analytics.totalHoursSpent).toBeGreaterThan(0);

            expect(analytics!.analytics).toHaveProperty('averageWeeklyHours');
            expect(typeof analytics!.analytics.averageWeeklyHours).toBe('number');
            expect(analytics!.analytics.averageWeeklyHours).toBeGreaterThanOrEqual(0);

            // Property: Dashboard should contain performance trends and weekly stats
            expect(dashboardData.performanceTrends).toBeTruthy();
            expect(dashboardData.weeklyStats).toBeTruthy();
            expect(Array.isArray(dashboardData.weeklyStats)).toBe(true);

            // Property: Learning velocity should be calculated correctly
            const expectedVelocity = analytics!.analytics.totalHoursSpent > 0 ? 
              analytics!.analytics.skillsAcquired / analytics!.analytics.totalHoursSpent : 0;
            expect(Math.abs(velocityData.velocity - expectedVelocity)).toBeLessThan(0.01);

            // Property: All velocity metrics should be valid numbers
            expect(typeof velocityData.efficiency).toBe('number');
            expect(velocityData.efficiency).toBeGreaterThanOrEqual(0);
            expect(typeof velocityData.consistency).toBe('number');
            expect(velocityData.consistency).toBeGreaterThanOrEqual(0);
            expect(velocityData.consistency).toBeLessThanOrEqual(100);
            expect(typeof velocityData.engagement).toBe('number');
            expect(velocityData.engagement).toBeGreaterThanOrEqual(0);
            expect(velocityData.engagement).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Peer Comparison and Benchmarking (Requirement 9.3)', () => {
    it('should generate peer comparison data with benchmarks and platform averages for any set of users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(testUserArb, { minLength: 3, maxLength: 5 }),
          fc.array(learningPathArb, { minLength: 1, maxLength: 2 }),
          fc.array(fc.array(activitySubmissionArb, { minLength: 2, maxLength: 4 }), { minLength: 3, maxLength: 5 }),
          async (usersData, pathsData, allActivitiesData) => {
            // Ensure we have matching arrays
            const numUsers = Math.min(usersData.length, allActivitiesData.length);
            const users = usersData.slice(0, numUsers);
            const activitiesArrays = allActivitiesData.slice(0, numUsers);
            
            const createdUsers = [];
            const createdPaths = [];

            // Create multiple users with different activity patterns
            for (let i = 0; i < numUsers; i++) {
              const userData = users[i]!;
              const pathData = pathsData[i % pathsData.length]!;
              const activitiesData = activitiesArrays[i]!;

              // Create user
              const user = new User({
                email: userData.email,
                profile: {
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  currentStatus: userData.currentStatus
                },
                security: {
                  passwordHash: 'hashedpassword',
                  emailVerified: true,
                  lastPasswordChange: new Date(),
                  loginAttempts: 0,
                  twoFactorEnabled: false,
                  refreshTokens: []
                },
                oauth: {
                  providers: ['local']
                }
              });
              await user.save();
              createdUsers.push(user);

              // Create learning path
              const learningPath = new LearningPath({
                userId: user._id,
                domainId: new mongoose.Types.ObjectId(),
                title: pathData.title,
                description: pathData.description,
                estimatedDuration: pathData.estimatedDuration,
                difficulty: pathData.difficulty,
                modules: [{
                  id: 'module-1',
                  title: 'Test Module',
                  description: 'Test module description',
                  order: 1,
                  prerequisites: [],
                  estimatedHours: 10,
                  difficulty: DifficultyLevel.BEGINNER,
                  weeklyTargets: [],
                  resources: [],
                  skills: [],
                  assessments: [],
                  isOptional: false,
                  completionCriteria: {
                    requiredTasks: 1,
                    requiredHours: 1,
                    requiredAssessments: [],
                    requiredSkillLevel: 1
                  }
                }],
                progress: {
                  completedModules: [],
                  currentModule: 'module-1',
                  overallProgress: 0,
                  weeklyTargetsMet: 0,
                  totalWeeklyTargets: 0,
                  totalHoursSpent: 0,
                  averageWeeklyHours: 0,
                  streakWeeks: 0,
                  lastActivityDate: new Date(),
                  milestones: [],
                  skillsAcquired: [],
                  certificationsEarned: []
                },
                personalization: {
                  learningPace: LearningPace.MODERATE,
                  preferredLearningStyle: LearningStyle.MIXED,
                  availableHoursPerWeek: 10,
                  preferredSchedule: {
                    preferredDays: [WeekDay.MONDAY],
                    preferredTimeSlots: [TimeSlot.EVENING],
                    timezone: 'UTC',
                    flexibleSchedule: true,
                    reminderSettings: {
                      enabled: true,
                      frequency: ReminderFrequency.WEEKLY,
                      preferredTime: '18:00',
                      channels: [NotificationChannel.EMAIL]
                    }
                  },
                  skillLevel: SkillLevel.BEGINNER,
                  focusAreas: [],
                  excludedTopics: [],
                  adaptiveSettings: {
                    enabled: true,
                    difficultyAdjustment: true,
                    paceAdjustment: true,
                    contentRecommendation: true,
                    pathOptimization: true
                  }
                }
              });
              await learningPath.save();
              createdPaths.push(learningPath);

              // Initialize progress and record activities
              await progressTrackingService.initializeProgress(
                user._id.toString(),
                learningPath._id.toString()
              );

              for (const activity of activitiesData) {
                await progressTrackingService.recordActivity(
                  user._id.toString(),
                  activity
                );
              }
            }

            // Generate peer comparison for the first user
            const targetUser = createdUsers[0]!;
            const peerComparison = await progressTrackingService.getPeerComparison(
              targetUser._id.toString()
            );

            // Property: Peer comparison should be generated successfully
            expect(peerComparison).toBeTruthy();

            // Property: Peer comparison should contain user rank and percentile (Requirement 9.3)
            expect(typeof peerComparison.userRank).toBe('number');
            expect(peerComparison.userRank).toBeGreaterThan(0);
            expect(peerComparison.userRank).toBeLessThanOrEqual(numUsers);

            expect(typeof peerComparison.percentile).toBe('number');
            expect(peerComparison.percentile).toBeGreaterThanOrEqual(0);
            expect(peerComparison.percentile).toBeLessThanOrEqual(100);

            // Property: Total users should match the number of users created
            expect(peerComparison.totalUsers).toBe(numUsers);

            // Property: Metrics should contain platform averages (Requirement 9.3)
            expect(peerComparison.metrics).toHaveProperty('hoursSpent');
            expect(peerComparison.metrics.hoursSpent).toHaveProperty('user');
            expect(peerComparison.metrics.hoursSpent).toHaveProperty('average');
            expect(peerComparison.metrics.hoursSpent).toHaveProperty('percentile');

            expect(peerComparison.metrics).toHaveProperty('completionRate');
            expect(peerComparison.metrics.completionRate).toHaveProperty('user');
            expect(peerComparison.metrics.completionRate).toHaveProperty('average');
            expect(peerComparison.metrics.completionRate).toHaveProperty('percentile');

            expect(peerComparison.metrics).toHaveProperty('streakDays');
            expect(peerComparison.metrics.streakDays).toHaveProperty('user');
            expect(peerComparison.metrics.streakDays).toHaveProperty('average');
            expect(peerComparison.metrics.streakDays).toHaveProperty('percentile');

            expect(peerComparison.metrics).toHaveProperty('skillsAcquired');
            expect(peerComparison.metrics.skillsAcquired).toHaveProperty('user');
            expect(peerComparison.metrics.skillsAcquired).toHaveProperty('average');
            expect(peerComparison.metrics.skillsAcquired).toHaveProperty('percentile');

            // Property: All percentiles should be valid
            Object.values(peerComparison.metrics).forEach(metric => {
              expect(typeof metric.percentile).toBe('number');
              expect(metric.percentile).toBeGreaterThanOrEqual(0);
              expect(metric.percentile).toBeLessThanOrEqual(100);
            });

            // Property: Similar users should be provided
            expect(Array.isArray(peerComparison.similarUsers)).toBe(true);
            expect(peerComparison.similarUsers.length).toBeGreaterThanOrEqual(0);
            expect(peerComparison.similarUsers.length).toBeLessThanOrEqual(Math.min(5, numUsers - 1));

            // Property: Similar users should have valid data structure
            peerComparison.similarUsers.forEach(similarUser => {
              expect(similarUser).toHaveProperty('userId');
              expect(similarUser).toHaveProperty('name');
              expect(similarUser).toHaveProperty('hoursSpent');
              expect(similarUser).toHaveProperty('completionRate');
              expect(similarUser).toHaveProperty('streakDays');
              
              expect(typeof similarUser.userId).toBe('string');
              expect(typeof similarUser.name).toBe('string');
              expect(typeof similarUser.hoursSpent).toBe('number');
              expect(typeof similarUser.completionRate).toBe('number');
              expect(typeof similarUser.streakDays).toBe('number');
              
              expect(similarUser.hoursSpent).toBeGreaterThanOrEqual(0);
              expect(similarUser.completionRate).toBeGreaterThanOrEqual(0);
              expect(similarUser.completionRate).toBeLessThanOrEqual(100);
              expect(similarUser.streakDays).toBeGreaterThanOrEqual(0);
            });
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Knowledge Gap Identification and Recommendations (Requirement 9.4)', () => {
    it('should identify knowledge gaps and generate recommendations for any user learning pattern', async () => {
      await fc.assert(
        fc.asyncProperty(
          testUserArb,
          learningPathArb,
          fc.array(activitySubmissionArb, { minLength: 2, maxLength: 8 }),
          async (userData, pathData, activitiesData) => {
            // Create test user
            const user = new User({
              email: userData.email,
              profile: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                currentStatus: userData.currentStatus
              },
              security: {
                passwordHash: 'hashedpassword',
                emailVerified: true,
                lastPasswordChange: new Date(),
                loginAttempts: 0,
                twoFactorEnabled: false,
                refreshTokens: []
              },
              oauth: {
                providers: ['local']
              }
            });
            await user.save();

            // Create test learning path
            const learningPath = new LearningPath({
              userId: user._id,
              domainId: new mongoose.Types.ObjectId(),
              title: pathData.title,
              description: pathData.description,
              estimatedDuration: pathData.estimatedDuration,
              difficulty: pathData.difficulty,
              modules: [{
                id: 'module-1',
                title: 'Test Module',
                description: 'Test module description',
                order: 1,
                prerequisites: [],
                estimatedHours: 10,
                difficulty: DifficultyLevel.BEGINNER,
                weeklyTargets: [],
                resources: [],
                skills: [],
                assessments: [],
                isOptional: false,
                completionCriteria: {
                  requiredTasks: 1,
                  requiredHours: 1,
                  requiredAssessments: [],
                  requiredSkillLevel: 1
                }
              }],
              progress: {
                completedModules: [],
                currentModule: 'module-1',
                overallProgress: 0,
                weeklyTargetsMet: 0,
                totalWeeklyTargets: 0,
                totalHoursSpent: 0,
                averageWeeklyHours: 0,
                streakWeeks: 0,
                lastActivityDate: new Date(),
                milestones: [],
                skillsAcquired: [],
                certificationsEarned: []
              },
              personalization: {
                learningPace: LearningPace.MODERATE,
                preferredLearningStyle: LearningStyle.MIXED,
                availableHoursPerWeek: 10,
                preferredSchedule: {
                  preferredDays: [WeekDay.MONDAY, WeekDay.WEDNESDAY, WeekDay.FRIDAY],
                  preferredTimeSlots: [TimeSlot.EVENING],
                  timezone: 'UTC',
                  flexibleSchedule: true,
                  reminderSettings: {
                    enabled: true,
                    frequency: ReminderFrequency.WEEKLY,
                    preferredTime: '18:00',
                    channels: [NotificationChannel.EMAIL]
                  }
                },
                skillLevel: SkillLevel.BEGINNER,
                focusAreas: [],
                excludedTopics: [],
                adaptiveSettings: {
                  enabled: true,
                  difficultyAdjustment: true,
                  paceAdjustment: true,
                  contentRecommendation: true,
                  pathOptimization: true
                }
              }
            });
            await learningPath.save();

            // Initialize progress tracking
            await progressTrackingService.initializeProgress(
              user._id.toString(),
              learningPath._id.toString()
            );

            // Record activities
            for (const activity of activitiesData) {
              await progressTrackingService.recordActivity(
                user._id.toString(),
                activity
              );
            }

            // Generate dashboard data which includes recommendations
            const dashboardData = await progressTrackingService.getDashboardData(
              user._id.toString()
            );

            // Property: Dashboard should contain recommendations (Requirement 9.4)
            expect(dashboardData.recommendations).toBeTruthy();
            expect(Array.isArray(dashboardData.recommendations)).toBe(true);

            // Property: Each recommendation should have required fields for knowledge gap identification
            dashboardData.recommendations.forEach(recommendation => {
              expect(recommendation).toHaveProperty('type');
              expect(recommendation).toHaveProperty('title');
              expect(recommendation).toHaveProperty('description');
              expect(recommendation).toHaveProperty('action');
              expect(recommendation).toHaveProperty('priority');
              expect(recommendation).toHaveProperty('estimatedImpact');

              // Property: Recommendation fields should be valid
              expect(typeof recommendation.title).toBe('string');
              expect(recommendation.title.length).toBeGreaterThan(0);
              expect(typeof recommendation.description).toBe('string');
              expect(recommendation.description.length).toBeGreaterThan(0);
              expect(typeof recommendation.action).toBe('string');
              expect(recommendation.action.length).toBeGreaterThan(0);
              
              expect(typeof recommendation.estimatedImpact).toBe('number');
              expect(recommendation.estimatedImpact).toBeGreaterThanOrEqual(1);
              expect(recommendation.estimatedImpact).toBeLessThanOrEqual(10);
            });

            // Property: Analytics should provide insights for knowledge gap identification
            const analytics = await progressTrackingService.getUserAnalytics(
              user._id.toString(),
              AnalyticsTimeframe.ALL_TIME
            );

            expect(analytics).toBeTruthy();
            
            // Property: Analytics should contain performance metrics that help identify gaps
            expect(analytics!.performance).toHaveProperty('completionRate');
            expect(analytics!.performance).toHaveProperty('consistencyScore');
            expect(analytics!.performance).toHaveProperty('engagementLevel');
            expect(analytics!.performance).toHaveProperty('skillAcquisitionRate');

            // Property: Performance metrics should be valid for gap analysis
            expect(typeof analytics!.performance.completionRate).toBe('number');
            expect(analytics!.performance.completionRate).toBeGreaterThanOrEqual(0);
            expect(analytics!.performance.completionRate).toBeLessThanOrEqual(100);

            expect(typeof analytics!.performance.consistencyScore).toBe('number');
            expect(analytics!.performance.consistencyScore).toBeGreaterThanOrEqual(0);
            expect(analytics!.performance.consistencyScore).toBeLessThanOrEqual(100);

            expect(typeof analytics!.performance.engagementLevel).toBe('number');
            expect(analytics!.performance.engagementLevel).toBeGreaterThanOrEqual(0);
            expect(analytics!.performance.engagementLevel).toBeLessThanOrEqual(100);

            // Property: Skills acquired should be tracked for gap identification
            expect(analytics!.analytics).toHaveProperty('skillsAcquired');
            expect(typeof analytics!.analytics.skillsAcquired).toBe('number');
            expect(analytics!.analytics.skillsAcquired).toBeGreaterThanOrEqual(0);

            // Property: Activity patterns should be available for analysis
            expect(analytics!.analytics).toHaveProperty('totalActivities');
            expect(analytics!.analytics).toHaveProperty('completedActivities');
            expect(typeof analytics!.analytics.totalActivities).toBe('number');
            expect(typeof analytics!.analytics.completedActivities).toBe('number');
            expect(analytics!.analytics.completedActivities).toBeLessThanOrEqual(analytics!.analytics.totalActivities);
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});