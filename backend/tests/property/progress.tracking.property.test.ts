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
 * Property-Based Test for Progress Tracking Accuracy
 * **Feature: ai-sikshak-platform, Property 10: Progress Tracking Accuracy**
 * **Validates: Requirements 4.1, 4.2, 4.5**
 * 
 * Property: For any completed learning activity, the Progress Tracker should record the completion, 
 * update overall progress percentages, and maintain accurate completion history with timestamps.
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

// Generator for valid activity submissions
const activitySubmissionArb = fc.record({
  type: activityTypeArb,
  title: fc.string({ minLength: 1, maxLength: 200 }),
  hoursSpent: fc.float({ min: 0.1, max: 8.0 })
}).chain(base => 
  fc.record({
    moduleId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    weeklyTargetId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    taskId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    resourceId: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    description: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
    skillsAcquired: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 })),
    notes: fc.option(fc.string({ minLength: 1, maxLength: 1000 })),
    qualityScore: fc.option(fc.integer({ min: 1, max: 10 }))
  }).map(optional => {
    const result: IActivitySubmission = { ...base };
    if (optional.moduleId !== null) result.moduleId = optional.moduleId;
    if (optional.weeklyTargetId !== null) result.weeklyTargetId = optional.weeklyTargetId;
    if (optional.taskId !== null) result.taskId = optional.taskId;
    if (optional.resourceId !== null) result.resourceId = optional.resourceId;
    if (optional.description !== null) result.description = optional.description;
    if (optional.skillsAcquired !== null) result.skillsAcquired = optional.skillsAcquired;
    if (optional.notes !== null) result.notes = optional.notes;
    if (optional.qualityScore !== null) result.qualityScore = optional.qualityScore;
    return result;
  })
);

// Generator for test users
const testUserArb = fc.record({
  email: fc.emailAddress(),
  firstName: fc.string({ minLength: 2, maxLength: 50 }),
  lastName: fc.string({ minLength: 2, maxLength: 50 }),
  currentStatus: fc.constantFrom('student', 'graduate', 'employed', 'unemployed', 'career_changer')
});

// Generator for learning paths
const learningPathArb = fc.record({
  title: fc.string({ minLength: 5, maxLength: 200 }),
  description: fc.string({ minLength: 10, maxLength: 1000 }),
  estimatedDuration: fc.integer({ min: 1, max: 52 }),
  difficulty: difficultyLevelArb
});

describe('Progress Tracking Property Tests', () => {
  /**
   * Property 10: Progress Tracking Accuracy
   * For any completed learning activity, the Progress Tracker should record the completion, 
   * update overall progress percentages, and maintain accurate completion history with timestamps.
   */
  
  describe('Activity Recording Accuracy', () => {
    it('should accurately record any valid activity with correct timestamps', async () => {
      await fc.assert(
        fc.asyncProperty(
          testUserArb,
          learningPathArb,
          activitySubmissionArb,
          async (userData, pathData, activityData) => {
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

            const beforeTimestamp = new Date();
            
            // Record activity
            const updatedProgress = await progressTrackingService.recordActivity(
              user._id.toString(),
              activityData
            );

            const afterTimestamp = new Date();

            // Property: Activity should be recorded in the activities array
            expect(updatedProgress.activities.length).toBe(1);
            
            const recordedActivity = updatedProgress.activities[0];
            
            // Property: Recorded activity should match submitted data
            expect(recordedActivity?.type).toBe(activityData.type);
            expect(recordedActivity?.title).toBe(activityData.title);
            expect(recordedActivity?.hoursSpent).toBe(activityData.hoursSpent);
            expect(recordedActivity?.skillsAcquired).toEqual(activityData.skillsAcquired || []);
            
            if (activityData.description) {
              expect(recordedActivity?.description).toBe(activityData.description);
            }
            
            if (activityData.notes) {
              expect(recordedActivity?.notes).toBe(activityData.notes);
            }
            
            if (activityData.qualityScore) {
              expect(recordedActivity?.qualityScore).toBe(activityData.qualityScore);
            }

            // Property: Completion timestamp should be accurate
            expect(recordedActivity?.completedAt).toBeInstanceOf(Date);
            expect(recordedActivity?.completedAt.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime());
            expect(recordedActivity?.completedAt.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime());

            // Property: Analytics should be updated
            expect(updatedProgress.analytics.totalActivities).toBe(1);
            expect(updatedProgress.analytics.totalHoursSpent).toBe(activityData.hoursSpent);
            expect(updatedProgress.analytics.skillsAcquired).toBe((activityData.skillsAcquired || []).length);

            // Property: Last updated timestamp should be recent
            expect(updatedProgress.lastUpdated).toBeInstanceOf(Date);
            expect(updatedProgress.lastUpdated.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime());
            expect(updatedProgress.lastUpdated.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime());
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should maintain accurate completion history for multiple activities', async () => {
      await fc.assert(
        fc.asyncProperty(
          testUserArb,
          learningPathArb,
          fc.array(activitySubmissionArb, { minLength: 2, maxLength: 10 }),
          async (userData, pathData, activitiesData) => {
            // Create test user and learning path
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

            // Initialize progress tracking
            await progressTrackingService.initializeProgress(
              user._id.toString(),
              learningPath._id.toString()
            );

            let cumulativeHours = 0;
            let cumulativeSkills = new Set<string>();
            const timestamps: Date[] = [];

            // Record multiple activities
            for (let i = 0; i < activitiesData.length; i++) {
              const activity = activitiesData[i];
              if (!activity) continue;
              
              const beforeTimestamp = new Date();
              
              const updatedProgress = await progressTrackingService.recordActivity(
                user._id.toString(),
                activity
              );

              timestamps.push(beforeTimestamp);
              cumulativeHours += activity.hoursSpent;
              (activity.skillsAcquired || []).forEach(skill => cumulativeSkills.add(skill));

              // Property: Activity count should match number of recorded activities
              expect(updatedProgress.activities.length).toBe(i + 1);

              // Property: Total hours should accumulate correctly
              expect(Math.abs(updatedProgress.analytics.totalHoursSpent - cumulativeHours)).toBeLessThan(0.01);

              // Property: Skills acquired should accumulate correctly
              expect(updatedProgress.analytics.skillsAcquired).toBe(cumulativeSkills.size);

              // Property: Activities should be in chronological order
              if (i > 0) {
                const currentActivity = updatedProgress.activities[i];
                const previousActivity = updatedProgress.activities[i - 1];
                if (currentActivity && previousActivity) {
                  expect(currentActivity.completedAt.getTime()).toBeGreaterThanOrEqual(
                    previousActivity.completedAt.getTime()
                  );
                }
              }
            }

            // Property: Final analytics should match cumulative calculations
            const finalProgress = await Progress.findOne({ userId: user._id, isActive: true });
            expect(finalProgress).toBeTruthy();
            expect(finalProgress!.analytics.totalActivities).toBe(activitiesData.length);
            expect(Math.abs(finalProgress!.analytics.totalHoursSpent - cumulativeHours)).toBeLessThan(0.01);
            expect(finalProgress!.analytics.skillsAcquired).toBe(cumulativeSkills.size);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Progress Percentage Calculation', () => {
    it('should calculate accurate progress percentages for any activity pattern', async () => {
      await fc.assert(
        fc.asyncProperty(
          testUserArb,
          learningPathArb,
          fc.array(activitySubmissionArb, { minLength: 1, maxLength: 5 }),
          async (userData, pathData, activitiesData) => {
            // Create test user and learning path
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

            // Calculate progress percentages
            const progressData = await progressTrackingService.calculateProgressPercentages(
              user._id.toString()
            );

            // Property: Progress percentages should be valid numbers between 0 and 100
            expect(typeof progressData.overallProgress).toBe('number');
            expect(progressData.overallProgress).toBeGreaterThanOrEqual(0);
            expect(progressData.overallProgress).toBeLessThanOrEqual(100);

            expect(typeof progressData.weeklyProgress).toBe('number');
            expect(progressData.weeklyProgress).toBeGreaterThanOrEqual(0);
            expect(progressData.weeklyProgress).toBeLessThanOrEqual(100);

            // Property: Module progress should be valid for all modules
            Object.values(progressData.moduleProgress).forEach(moduleProgress => {
              expect(typeof moduleProgress).toBe('number');
              expect(moduleProgress).toBeGreaterThanOrEqual(0);
              expect(moduleProgress).toBeLessThanOrEqual(100);
            });

            // Property: Progress should reflect actual activity completion
            const progress = await Progress.findOne({ userId: user._id, isActive: true });
            expect(progress).toBeTruthy();
            
            // If activities were recorded, there should be some progress
            if (activitiesData.length > 0) {
              expect(progress!.analytics.totalActivities).toBeGreaterThan(0);
              expect(progress!.analytics.totalHoursSpent).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Learning Velocity Calculation', () => {
    it('should calculate accurate learning velocity metrics for any activity pattern', async () => {
      await fc.assert(
        fc.asyncProperty(
          testUserArb,
          learningPathArb,
          fc.array(activitySubmissionArb, { minLength: 1, maxLength: 8 }),
          async (userData, pathData, activitiesData) => {
            // Create test user and learning path
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

            // Calculate learning velocity
            const velocityData = await progressTrackingService.calculateLearningVelocity(
              user._id.toString()
            );

            // Property: All velocity metrics should be valid numbers
            expect(typeof velocityData.velocity).toBe('number');
            expect(velocityData.velocity).toBeGreaterThanOrEqual(0);
            expect(isFinite(velocityData.velocity)).toBe(true);

            expect(typeof velocityData.efficiency).toBe('number');
            expect(velocityData.efficiency).toBeGreaterThanOrEqual(0);
            expect(isFinite(velocityData.efficiency)).toBe(true);

            expect(typeof velocityData.consistency).toBe('number');
            expect(velocityData.consistency).toBeGreaterThanOrEqual(0);
            expect(velocityData.consistency).toBeLessThanOrEqual(100);
            expect(isFinite(velocityData.consistency)).toBe(true);

            expect(typeof velocityData.engagement).toBe('number');
            expect(velocityData.engagement).toBeGreaterThanOrEqual(0);
            expect(velocityData.engagement).toBeLessThanOrEqual(100);
            expect(isFinite(velocityData.engagement)).toBe(true);

            // Property: Learning velocity should reflect skills per hour ratio
            const progress = await Progress.findOne({ userId: user._id, isActive: true });
            expect(progress).toBeTruthy();
            
            const expectedVelocity = progress!.analytics.totalHoursSpent > 0 ? 
              progress!.analytics.skillsAcquired / progress!.analytics.totalHoursSpent : 0;
            
            expect(Math.abs(velocityData.velocity - expectedVelocity)).toBeLessThan(0.01);

            // Property: Performance metrics should be updated in the progress document
            expect(progress!.performance.learningVelocity).toBe(velocityData.velocity);
            expect(progress!.performance.timeEfficiency).toBe(velocityData.efficiency);
            expect(progress!.performance.consistencyScore).toBe(velocityData.consistency);
            expect(progress!.performance.engagementLevel).toBe(velocityData.engagement);
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Analytics Data Integrity', () => {
    it('should maintain consistent analytics across different timeframes', async () => {
      await fc.assert(
        fc.asyncProperty(
          testUserArb,
          learningPathArb,
          fc.array(activitySubmissionArb, { minLength: 3, maxLength: 6 }),
          async (userData, pathData, activitiesData) => {
            // Create test user and learning path
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

            // Get analytics for different timeframes
            const allTimeAnalytics = await progressTrackingService.getUserAnalytics(
              user._id.toString(),
              AnalyticsTimeframe.ALL_TIME
            );

            const lastYearAnalytics = await progressTrackingService.getUserAnalytics(
              user._id.toString(),
              AnalyticsTimeframe.LAST_YEAR
            );

            // Property: Analytics should exist for both timeframes
            expect(allTimeAnalytics).toBeTruthy();
            expect(lastYearAnalytics).toBeTruthy();

            // Property: All-time analytics should include all activities
            expect(allTimeAnalytics!.analytics.totalActivities).toBe(activitiesData.length);
            
            // Property: Last year analytics should include all recent activities (since we just created them)
            expect(lastYearAnalytics!.timeframeData.activities).toBe(activitiesData.length);

            // Property: Analytics structure should be consistent across timeframes
            expect(allTimeAnalytics!.analytics).toHaveProperty('totalHoursSpent');
            expect(allTimeAnalytics!.analytics).toHaveProperty('skillsAcquired');
            expect(allTimeAnalytics!.performance).toHaveProperty('completionRate');
            expect(allTimeAnalytics!.streaks).toHaveProperty('currentStreak');

            expect(lastYearAnalytics!.analytics).toHaveProperty('totalHoursSpent');
            expect(lastYearAnalytics!.analytics).toHaveProperty('skillsAcquired');
            expect(lastYearAnalytics!.performance).toHaveProperty('completionRate');
            expect(lastYearAnalytics!.streaks).toHaveProperty('currentStreak');

            // Property: Timeframe data should be consistent with overall analytics
            const totalHours = activitiesData.reduce((sum, activity) => sum + activity.hoursSpent, 0);
            const totalSkills = new Set(activitiesData.flatMap(activity => activity.skillsAcquired)).size;

            expect(Math.abs(allTimeAnalytics!.analytics.totalHoursSpent - totalHours)).toBeLessThan(0.01);
            expect(allTimeAnalytics!.analytics.skillsAcquired).toBe(totalSkills);
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});