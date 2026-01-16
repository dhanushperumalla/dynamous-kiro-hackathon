import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { connectDatabase } from '../../src/config/database';
import Progress from '../../src/models/Progress';
import LearningPath from '../../src/models/LearningPath';
import { User } from '../../src/models/User';
import Notification from '../../src/models/Notification';
import { progressTrackingService } from '../../src/services/progressTrackingService';
import NotificationService from '../../src/services/notificationService';
import {
  IActivitySubmission,
  ActivityType,
  MilestoneType
} from '../../src/types/progress';
import {
  NotificationType,
  NotificationPriority,
  DeliveryChannel
} from '../../src/types/notification';

/**
 * Property-Based Test for Achievement Recognition
 * **Feature: ai-sikshak-platform, Property 11: Achievement Recognition**
 * **Validates: Requirements 4.4, 5.2**
 * 
 * Property: For any milestone achievement or weekly target completion, the system should 
 * celebrate accomplishments with appropriate badges or certificates and send motivational messages.
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
  await Notification.deleteMany({});
});

// Generators for property-based testing
const activityTypeArb = fc.constantFrom(...Object.values(ActivityType));
const milestoneTypeArb = fc.constantFrom(...Object.values(MilestoneType));

// Generator for test users
const testUserArb = fc.record({
  email: fc.emailAddress(),
  firstName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  lastName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
  currentStatus: fc.constantFrom('student', 'graduate', 'employed', 'unemployed', 'career_changer'),
  timeZone: fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo')
});

// Generator for learning paths
const learningPathArb = fc.record({
  title: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  domain: fc.constantFrom('software-development', 'data-science', 'digital-marketing', 'design'),
  estimatedDuration: fc.integer({ min: 4, max: 52 }), // 4-52 weeks
  modules: fc.array(fc.record({
    id: fc.string({ minLength: 5, maxLength: 20 }),
    title: fc.string({ minLength: 5, maxLength: 100 }),
    description: fc.string({ minLength: 10, maxLength: 300 }),
    estimatedHours: fc.integer({ min: 5, max: 40 }),
    weeklyTargets: fc.array(fc.record({
      id: fc.string({ minLength: 5, maxLength: 20 }),
      week: fc.integer({ min: 1, max: 12 }),
      title: fc.string({ minLength: 5, maxLength: 100 }),
      description: fc.string({ minLength: 10, maxLength: 200 }),
      tasks: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 3 }),
      completed: fc.boolean(),
      completedAt: fc.option(fc.date())
    }), { minLength: 1, maxLength: 4 })
  }), { minLength: 1, maxLength: 3 })
});

// Generator for activity submissions that trigger milestones
const milestoneActivityArb = fc.record({
  type: activityTypeArb,
  title: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.option(fc.string({ minLength: 10, maxLength: 300 })),
  hoursSpent: fc.float({ min: 0.5, max: 8, noNaN: true }),
  skillsAcquired: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
  qualityScore: fc.option(fc.integer({ min: 1, max: 10 })),
  notes: fc.option(fc.string({ minLength: 5, maxLength: 200 }))
});

// Generator for milestone achievements
const milestoneArb = fc.record({
  type: milestoneTypeArb,
  title: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 300 }),
  points: fc.integer({ min: 5, max: 100 }),
  badge: fc.option(fc.string({ minLength: 3, maxLength: 30 })),
  celebrationMessage: fc.option(fc.string({ minLength: 10, maxLength: 200 }))
});

// Helper function to create test user
async function createTestUser(userData: any) {
  const user = new User({
    email: userData.email,
    passwordHash: 'test-hash',
    profile: {
      firstName: userData.firstName,
      lastName: userData.lastName,
      currentStatus: userData.currentStatus
    },
    preferences: {
      timeZone: userData.timeZone,
      notificationFrequency: 'daily',
      learningPace: 'moderate'
    }
  });
  return await user.save();
}

// Helper function to create test learning path
async function createTestLearningPath(userId: string, pathData: any) {
  const learningPath = new LearningPath({
    userId,
    title: pathData.title,
    description: pathData.description,
    domain: pathData.domain,
    estimatedDuration: pathData.estimatedDuration,
    modules: pathData.modules,
    progress: {
      completedModules: [],
      currentModule: pathData.modules[0]?.id || '',
      overallProgress: 0,
      weeklyTargetsMet: 0,
      totalWeeklyTargets: pathData.modules.reduce((total: number, module: any) => 
        total + module.weeklyTargets.length, 0
      )
    }
  });
  return await learningPath.save();
}

// Helper function to simulate milestone-triggering activities
async function simulateMilestoneActivity(progress: any, activityData: any, milestoneType: MilestoneType) {
  const baseActivity: IActivitySubmission = {
    type: activityData.type,
    title: activityData.title,
    hoursSpent: activityData.hoursSpent,
    skillsAcquired: activityData.skillsAcquired,
    ...(activityData.description && { description: activityData.description }),
    ...(activityData.qualityScore && { qualityScore: activityData.qualityScore }),
    ...(activityData.notes && { notes: activityData.notes })
  };

  // Modify activity to trigger specific milestone types
  switch (milestoneType) {
    case MilestoneType.FIRST_ACTIVITY:
      // Ensure this is the first activity
      progress.activities = [];
      break;
    case MilestoneType.STREAK_MILESTONE:
      // Set up for 7-day streak
      progress.streaks.currentStreak = 6;
      progress.streaks.lastActivityDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      break;
    case MilestoneType.HOURS_MILESTONE:
      // Set up to reach 10 hours
      progress.analytics.totalHoursSpent = 9.5;
      baseActivity.hoursSpent = 0.5;
      break;
    case MilestoneType.SKILLS_MILESTONE:
      // Set up to reach 5 skills
      progress.analytics.skillsAcquired = 4;
      baseActivity.skillsAcquired = ['new-skill'];
      break;
  }

  return baseActivity;
}

describe('Achievement Recognition Property Tests', () => {
  /**
   * Property Test 1: Milestone Achievement Recognition
   * Tests that when a milestone is achieved, the system creates appropriate celebration
   */
  test('Property: Milestone achievements should be celebrated with badges and messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        testUserArb,
        learningPathArb,
        milestoneActivityArb,
        milestoneTypeArb,
        async (userData, pathData, activityData, milestoneType) => {
          // Create test user and learning path
          const user = await createTestUser(userData);
          const learningPath = await createTestLearningPath(user._id.toString(), pathData);
          
          // Initialize progress tracking
          const progress = await progressTrackingService.initializeProgress(
            user._id.toString(),
            learningPath._id.toString()
          );

          // Simulate activity that triggers milestone
          const activity = await simulateMilestoneActivity(progress, activityData, milestoneType);
          
          // Record the activity (this should trigger milestone checking)
          const updatedProgress = await progressTrackingService.recordActivity(
            user._id.toString(),
            activity
          );

          // Check if milestone was achieved
          const achievedMilestone = updatedProgress.milestones.find(m => m.type === milestoneType);
          
          if (achievedMilestone) {
            // Verify milestone has celebration elements
            expect(achievedMilestone.title).toBeDefined();
            expect(achievedMilestone.title.length).toBeGreaterThan(0);
            expect(achievedMilestone.description).toBeDefined();
            expect(achievedMilestone.description.length).toBeGreaterThan(0);
            expect(achievedMilestone.points).toBeGreaterThan(0);
            expect(achievedMilestone.achievedAt).toBeInstanceOf(Date);

            // Check for celebration message or badge
            const hasCelebration = achievedMilestone.celebrationMessage || achievedMilestone.badge;
            expect(hasCelebration).toBeTruthy();

            // Verify notification was created for milestone achievement
            const notifications = await Notification.find({
              userId: user._id,
              type: { $in: [NotificationType.MILESTONE_ACHIEVEMENT, NotificationType.STREAK_CELEBRATION] }
            });

            expect(notifications.length).toBeGreaterThan(0);
            
            // Verify notification content
            const milestoneNotification = notifications[0];
            expect(milestoneNotification).toBeDefined();
            expect(milestoneNotification!.content.title).toBeDefined();
            expect(milestoneNotification!.content.body).toBeDefined();
            expect(milestoneNotification!.priority).toBeDefined();
            expect(milestoneNotification!.deliveryPreferences.channels).toContain(DeliveryChannel.EMAIL);
          }
        }
      ),
      { numRuns: 20, timeout: 15000 }
    );
  });

  /**
   * Property Test 2: Weekly Target Completion Recognition
   * Tests that weekly target completions trigger appropriate celebrations
   */
  test('Property: Weekly target completions should trigger motivational messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        testUserArb,
        learningPathArb,
        milestoneActivityArb,
        async (userData, pathData, activityData) => {
          // Create test user and learning path
          const user = await createTestUser(userData);
          const learningPath = await createTestLearningPath(user._id.toString(), pathData);
          
          // Initialize progress tracking
          await progressTrackingService.initializeProgress(
            user._id.toString(),
            learningPath._id.toString()
          );

          // Get a weekly target to complete
          const firstModule = learningPath.modules[0];
          const weeklyTarget = firstModule?.weeklyTargets[0];
          
          if (weeklyTarget) {
            // Create activity that completes the weekly target
            const targetActivity: IActivitySubmission = {
              type: ActivityType.WEEKLY_TARGET_COMPLETED,
              weeklyTargetId: weeklyTarget.id,
              moduleId: firstModule.id,
              title: `Completed: ${weeklyTarget.title}`,
              hoursSpent: activityData.hoursSpent,
              skillsAcquired: activityData.skillsAcquired,
              ...(activityData.description && { description: activityData.description }),
              ...(activityData.qualityScore && { qualityScore: activityData.qualityScore }),
              ...(activityData.notes && { notes: activityData.notes })
            };

            // Record the activity
            const updatedProgress = await progressTrackingService.recordActivity(
              user._id.toString(),
              targetActivity
            );

            // Verify the activity was recorded
            const targetCompletionActivity = updatedProgress.activities.find(
              a => a.type === ActivityType.WEEKLY_TARGET_COMPLETED && a.weeklyTargetId === weeklyTarget.id
            );
            expect(targetCompletionActivity).toBeDefined();

            // Check for motivational notifications
            const notifications = await Notification.find({
              userId: user._id,
              type: { $in: [
                NotificationType.WEEKLY_PROGRESS_SUMMARY,
                NotificationType.MOTIVATIONAL_MESSAGE,
                NotificationType.MILESTONE_ACHIEVEMENT
              ]}
            });

            // Should have at least some form of recognition
            if (notifications.length > 0) {
              const motivationalNotification = notifications.find(n => 
                n.type === NotificationType.MOTIVATIONAL_MESSAGE ||
                n.type === NotificationType.WEEKLY_PROGRESS_SUMMARY
              );

              if (motivationalNotification) {
                expect(motivationalNotification.content.title).toBeDefined();
                expect(motivationalNotification.content.body).toBeDefined();
                expect(motivationalNotification.content.body.length).toBeGreaterThan(0);
                expect(motivationalNotification.priority).toBeDefined();
              }
            }

            // Verify progress analytics were updated
            expect(updatedProgress.analytics.weeklyTargetsCompleted).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 20, timeout: 15000 }
    );
  });

  /**
   * Property Test 3: Achievement Notification Consistency
   * Tests that achievement notifications are consistent and properly formatted
   */
  test('Property: Achievement notifications should be consistently formatted and delivered', async () => {
    await fc.assert(
      fc.asyncProperty(
        testUserArb,
        milestoneArb,
        async (userData, milestoneData) => {
          // Create test user
          const user = await createTestUser(userData);
          
          // Create a notification for milestone achievement
          const notification = await NotificationService.createNotification({
            userId: user._id.toString(),
            type: NotificationType.MILESTONE_ACHIEVEMENT,
            priority: NotificationPriority.MEDIUM,
            content: {
              title: `🎉 ${milestoneData.title}`,
              body: milestoneData.celebrationMessage || milestoneData.description,
              data: {
                milestoneType: milestoneData.type,
                points: milestoneData.points,
                badge: milestoneData.badge
              }
            },
            deliveryPreferences: {
              channels: [DeliveryChannel.EMAIL, DeliveryChannel.IN_APP],
              frequency: 'immediate' as any
            },
            templateData: {
              milestone: milestoneData,
              user: {
                firstName: userData.firstName,
                lastName: userData.lastName
              }
            }
          });

          // Verify notification structure
          expect(notification).toBeDefined();
          expect(notification.userId.toString()).toBe(user._id.toString());
          expect(notification.type).toBe(NotificationType.MILESTONE_ACHIEVEMENT);
          expect(notification.content.title).toContain(milestoneData.title);
          expect(notification.content.body).toBeDefined();
          expect(notification.content.body.length).toBeGreaterThan(0);
          
          // Verify celebration elements in notification data
          expect(notification.content.data).toBeDefined();
          if (notification.content.data) {
            expect(notification.content.data['milestoneType']).toBe(milestoneData.type);
            expect(notification.content.data['points']).toBe(milestoneData.points);
          }
          
          // Verify delivery preferences
          expect(notification.deliveryPreferences.channels).toContain(DeliveryChannel.EMAIL);
          expect(notification.deliveryPreferences.channels).toContain(DeliveryChannel.IN_APP);
          
          // Verify template data for personalization
          expect(notification.templateData).toBeDefined();
          if (notification.templateData) {
            expect(notification.templateData['milestone']).toEqual(milestoneData);
            expect(notification.templateData['user']['firstName']).toBe(userData.firstName);
          }
        }
      ),
      { numRuns: 20, timeout: 15000 }
    );
  });

  /**
   * Property Test 4: Badge and Certificate Assignment
   * Tests that appropriate badges and certificates are assigned for achievements
   */
  test('Property: Achievements should assign appropriate badges and certificates', async () => {
    await fc.assert(
      fc.asyncProperty(
        testUserArb,
        learningPathArb,
        fc.array(milestoneActivityArb, { minLength: 1, maxLength: 5 }),
        async (userData, pathData, activities) => {
          // Create test user and learning path
          const user = await createTestUser(userData);
          const learningPath = await createTestLearningPath(user._id.toString(), pathData);
          
          // Initialize progress tracking
          let progress = await progressTrackingService.initializeProgress(
            user._id.toString(),
            learningPath._id.toString()
          );

          // Record multiple activities to trigger various milestones
          for (const activityData of activities) {
            const activity: IActivitySubmission = {
              type: activityData.type,
              title: activityData.title,
              hoursSpent: activityData.hoursSpent,
              skillsAcquired: activityData.skillsAcquired,
              ...(activityData.description && { description: activityData.description }),
              ...(activityData.qualityScore && { qualityScore: activityData.qualityScore }),
              ...(activityData.notes && { notes: activityData.notes })
            };

            progress = await progressTrackingService.recordActivity(
              user._id.toString(),
              activity
            );
          }

          // Check achieved milestones
          const achievedMilestones = progress.milestones;
          
          for (const milestone of achievedMilestones) {
            // Verify milestone has proper structure
            expect(milestone.id).toBeDefined();
            expect(milestone.type).toBeDefined();
            expect(milestone.title).toBeDefined();
            expect(milestone.description).toBeDefined();
            expect(milestone.points).toBeGreaterThan(0);
            expect(milestone.achievedAt).toBeInstanceOf(Date);

            // Verify celebration elements exist
            const hasCelebrationElements = milestone.badge || milestone.celebrationMessage;
            expect(hasCelebrationElements).toBeTruthy();

            // Verify milestone-specific requirements
            switch (milestone.type) {
              case MilestoneType.FIRST_ACTIVITY:
                expect(milestone.title).toContain('First');
                expect(milestone.points).toBeGreaterThanOrEqual(5);
                break;
              case MilestoneType.STREAK_MILESTONE:
                expect(milestone.title.toLowerCase()).toMatch(/streak|day/);
                expect(milestone.points).toBeGreaterThanOrEqual(25);
                break;
              case MilestoneType.HOURS_MILESTONE:
                expect(milestone.title.toLowerCase()).toMatch(/hour|time/);
                expect(milestone.points).toBeGreaterThanOrEqual(10);
                break;
              case MilestoneType.SKILLS_MILESTONE:
                expect(milestone.title.toLowerCase()).toMatch(/skill/);
                expect(milestone.points).toBeGreaterThanOrEqual(15);
                break;
            }
          }

          // Verify that milestone achievements are properly tracked in analytics
          expect(progress.analytics.milestonesAchieved).toBe(achievedMilestones.length);
        }
      ),
      { numRuns: 20, timeout: 15000 }
    );
  });
});