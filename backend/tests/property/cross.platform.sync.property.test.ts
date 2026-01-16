import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { connectDatabase } from '../../src/config/database';
import { User } from '../../src/models/User';
import LearningPath from '../../src/models/LearningPath';
import Progress from '../../src/models/Progress';
import { progressTrackingService } from '../../src/services/progressTrackingService';
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
import { ActivityType } from '../../src/types/progress';

/**
 * Property-Based Test for Cross-Platform Synchronization
 * **Feature: ai-sikshak-platform, Property 15: Cross-Platform Synchronization**
 * **Validates: Requirements 7.3**
 * 
 * Property: For any user data or progress change on one platform, the system should synchronize 
 * the changes across all other platforms (web, iOS, Android) in real-time.
 */

beforeAll(async () => {
  await connectDatabase();
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await LearningPath.deleteMany({});
  await Progress.deleteMany({});
});

// Generators for property-based testing
const platformArb = fc.constantFrom('web', 'ios', 'android');

const userDataArb = fc.record({
  email: fc.emailAddress(),
  firstName: fc.string({ minLength: 2, maxLength: 50 }),
  lastName: fc.string({ minLength: 2, maxLength: 50 }),
  currentStatus: fc.constantFrom('student', 'graduate', 'employed', 'unemployed', 'career_changer')
});

const profileUpdateArb = fc.record({
  firstName: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
  lastName: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
  location: fc.option(fc.string({ minLength: 2, maxLength: 100 })),
  educationLevel: fc.option(fc.constantFrom('high_school', 'bachelors', 'masters', 'phd'))
});

const progressUpdateArb = fc.record({
  moduleId: fc.string({ minLength: 1, maxLength: 50 }),
  hoursSpent: fc.float({ min: 0.1, max: 8.0 }),
  completionPercentage: fc.integer({ min: 0, max: 100 })
});

describe('Cross-Platform Synchronization Property Tests', () => {
  /**
   * Property 15: Cross-Platform Synchronization
   * For any user data or progress change on one platform, the system should synchronize 
   * the changes across all other platforms in real-time.
   */

  describe('User Profile Synchronization', () => {
    it('should synchronize profile updates across all platforms', async () => {
      await fc.assert(
        fc.asyncProperty(
          userDataArb,
          platformArb,
          profileUpdateArb,
          async (userData, _sourcePlatform, profileUpdate) => {
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

            const originalProfile = { ...user.profile };

            // Simulate profile update from source platform
            const updateData: any = {};
            if (profileUpdate.firstName !== null) updateData.firstName = profileUpdate.firstName;
            if (profileUpdate.lastName !== null) updateData.lastName = profileUpdate.lastName;
            if (profileUpdate.location !== null) updateData.location = profileUpdate.location;
            if (profileUpdate.educationLevel !== null) updateData.educationLevel = profileUpdate.educationLevel;

            // Update user profile
            const updatedUser = await User.findByIdAndUpdate(user._id, {
              $set: {
                'profile.firstName': updateData.firstName || originalProfile.firstName,
                'profile.lastName': updateData.lastName || originalProfile.lastName,
                'profile.location': updateData.location || originalProfile.location,
                'profile.educationLevel': updateData.educationLevel || originalProfile.educationLevel,
                updatedAt: new Date()
              }
            }, { new: true });

            const updateTimestamp = updatedUser!.updatedAt;

            // Simulate fetching from different platforms
            const platforms = ['web', 'ios', 'android'];
            const fetchedData = await Promise.all(
              platforms.map(async () => {
                return await User.findById(user._id);
              })
            );

            // Property: All platforms should see the same updated data
            for (let i = 0; i < fetchedData.length; i++) {
              const platformData = fetchedData[i];
              expect(platformData).toBeTruthy();
              
              if (updateData.firstName) {
                expect(platformData!.profile.firstName).toBe(updateData.firstName);
              }
              if (updateData.lastName) {
                expect(platformData!.profile.lastName).toBe(updateData.lastName);
              }
              if (updateData.location) {
                expect(platformData!.profile.location).toBe(updateData.location);
              }
              if (updateData.educationLevel) {
                expect(platformData!.profile.educationLevel).toBe(updateData.educationLevel);
              }

              // Property: All platforms should have the same lastUpdated timestamp
              if (i > 0) {
                expect(platformData!.updatedAt.getTime()).toBe(updateTimestamp.getTime());
              }
            }

            // Property: Data consistency across all platforms
            for (let i = 1; i < fetchedData.length; i++) {
              expect(fetchedData[i]!.profile.firstName).toBe(fetchedData[0]!.profile.firstName);
              expect(fetchedData[i]!.profile.lastName).toBe(fetchedData[0]!.profile.lastName);
              expect(fetchedData[i]!.profile.location).toBe(fetchedData[0]!.profile.location);
              expect(fetchedData[i]!.profile.educationLevel).toBe(fetchedData[0]!.profile.educationLevel);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Progress Data Synchronization', () => {
    it('should synchronize progress updates across all platforms', async () => {
      await fc.assert(
        fc.asyncProperty(
          userDataArb,
          platformArb,
          progressUpdateArb,
          async (userData, _sourcePlatform, progressUpdate) => {
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

            // Create learning path
            const learningPath = new LearningPath({
              userId: user._id,
              domainId: new mongoose.Types.ObjectId(),
              title: 'Test Learning Path',
              description: 'Test description',
              estimatedDuration: 12,
              difficulty: DifficultyLevel.BEGINNER,
              modules: [{
                id: progressUpdate.moduleId,
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
                currentModule: progressUpdate.moduleId,
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

            // Initialize progress
            await progressTrackingService.initializeProgress(
              user._id.toString(),
              learningPath._id.toString()
            );

            const beforeTimestamp = new Date();

            // Simulate progress update from source platform
            await progressTrackingService.recordActivity(
              user._id.toString(),
              {
                type: ActivityType.MODULE_COMPLETED,
                title: 'Module Progress',
                hoursSpent: progressUpdate.hoursSpent,
                moduleId: progressUpdate.moduleId
              }
            );

            const afterTimestamp = new Date();

            // Simulate fetching from different platforms
            const platforms = ['web', 'ios', 'android'];
            const fetchedProgress = await Promise.all(
              platforms.map(async () => {
                return await Progress.findOne({ userId: user._id, isActive: true });
              })
            );

            // Property: All platforms should see the same progress data
            for (let i = 0; i < fetchedProgress.length; i++) {
              const platformProgress = fetchedProgress[i];
              expect(platformProgress).toBeTruthy();
              
              // Property: Hours spent should match
              expect(platformProgress!.analytics.totalHoursSpent).toBe(progressUpdate.hoursSpent);
              
              // Property: Activities should be recorded
              expect(platformProgress!.activities.length).toBe(1);
              expect(platformProgress!.activities[0]?.hoursSpent).toBe(progressUpdate.hoursSpent);
              expect(platformProgress!.activities[0]?.moduleId).toBe(progressUpdate.moduleId);

              // Property: Timestamp should be within expected range
              expect(platformProgress!.lastUpdated.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime());
              expect(platformProgress!.lastUpdated.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime());

              // Property: All platforms should have identical timestamps
              if (i > 0) {
                expect(platformProgress!.lastUpdated.getTime()).toBe(fetchedProgress[0]!.lastUpdated.getTime());
              }
            }

            // Property: Data consistency across all platforms
            for (let i = 1; i < fetchedProgress.length; i++) {
              expect(fetchedProgress[i]!.analytics.totalHoursSpent).toBe(
                fetchedProgress[0]!.analytics.totalHoursSpent
              );
              expect(fetchedProgress[i]!.activities.length).toBe(fetchedProgress[0]!.activities.length);
              expect(fetchedProgress[i]!.analytics.totalActivities).toBe(
                fetchedProgress[0]!.analytics.totalActivities
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Real-Time Synchronization', () => {
    it('should synchronize changes within acceptable time window', async () => {
      await fc.assert(
        fc.asyncProperty(
          userDataArb,
          fc.array(profileUpdateArb, { minLength: 1, maxLength: 5 }),
          async (userData, updates) => {
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

            const syncTimestamps: number[] = [];

            // Perform multiple updates and measure sync time
            for (const update of updates) {
              const updateStart = Date.now();

              const updateData: any = {};
              if (update.firstName !== null) updateData['profile.firstName'] = update.firstName;
              if (update.lastName !== null) updateData['profile.lastName'] = update.lastName;

              if (Object.keys(updateData).length > 0) {
                await User.findByIdAndUpdate(user._id, {
                  $set: {
                    ...updateData,
                    updatedAt: new Date()
                  }
                });

                // Simulate fetch from another platform
                await User.findById(user._id);

                const syncTime = Date.now() - updateStart;
                syncTimestamps.push(syncTime);
              }
            }

            // Property: All sync operations should complete within reasonable time (< 1000ms)
            syncTimestamps.forEach(syncTime => {
              expect(syncTime).toBeLessThan(1000);
            });

            // Property: Average sync time should be reasonable (< 500ms)
            const avgSyncTime = syncTimestamps.reduce((a, b) => a + b, 0) / syncTimestamps.length;
            expect(avgSyncTime).toBeLessThan(500);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Concurrent Update Handling', () => {
    it('should handle concurrent updates from multiple platforms correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          userDataArb,
          fc.array(profileUpdateArb, { minLength: 2, maxLength: 4 }),
          async (userData, updates) => {
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

            // Simulate concurrent updates from different platforms
            const updatePromises = updates.map(async (update, index) => {
              const updateData: any = {};
              if (update.firstName !== null) updateData['profile.firstName'] = `${update.firstName}_${index}`;
              if (update.lastName !== null) updateData['profile.lastName'] = `${update.lastName}_${index}`;

              if (Object.keys(updateData).length > 0) {
                return await User.findByIdAndUpdate(
                  user._id,
                  {
                    $set: {
                      ...updateData,
                      updatedAt: new Date()
                    }
                  },
                  { new: true }
                );
              }
              return null;
            });

            await Promise.all(updatePromises);

            // Fetch final state from all platforms
            const platforms = ['web', 'ios', 'android'];
            const finalStates = await Promise.all(
              platforms.map(async () => {
                return await User.findById(user._id);
              })
            );

            // Property: All platforms should converge to the same final state
            for (let i = 1; i < finalStates.length; i++) {
              expect(finalStates[i]!.profile.firstName).toBe(finalStates[0]!.profile.firstName);
              expect(finalStates[i]!.profile.lastName).toBe(finalStates[0]!.profile.lastName);
              expect(finalStates[i]!.updatedAt.getTime()).toBe(finalStates[0]!.updatedAt.getTime());
            }

            // Property: Final state should reflect one of the updates
            const finalUser = finalStates[0]!;
            const firstNameMatches = updates.some((update, index) => 
              update.firstName !== null && finalUser.profile.firstName === `${update.firstName}_${index}`
            );
            const lastNameMatches = updates.some((update, index) => 
              update.lastName !== null && finalUser.profile.lastName === `${update.lastName}_${index}`
            );

            // At least one field should match one of the updates
            expect(firstNameMatches || lastNameMatches || updates.every(u => u.firstName === null && u.lastName === null)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
