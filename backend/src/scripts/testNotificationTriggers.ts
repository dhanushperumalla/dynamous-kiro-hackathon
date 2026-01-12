import { NotificationScheduler } from '../services/notificationScheduler';
import { NotificationType } from '../types/notification';

/**
 * Simple demonstration script to test notification triggers
 */
async function testNotificationTriggers() {
  console.log('🚀 Testing Notification Triggers Implementation');
  console.log('================================================');

  const scheduler = new NotificationScheduler();

  try {
    // Test 1: Weekly Target Reminder
    console.log('\n📅 Testing Weekly Target Reminder...');
    const weeklyTargetNotification = await scheduler.createNotificationFromTemplate(
      'test-user-1',
      NotificationType.WEEKLY_TARGET_REMINDER,
      {
        firstName: 'John',
        targetTitle: 'Complete React Basics',
        moduleTitle: 'Frontend Development',
        estimatedHours: 5,
        weekNumber: 3,
        totalTargets: 2,
        learningPathUrl: '/learning-path/123'
      }
    );
    console.log('✅ Weekly Target Reminder created successfully');
    console.log(`   Title: ${weeklyTargetNotification.content.title}`);
    console.log(`   Body: ${weeklyTargetNotification.content.body}`);

    // Test 2: Inactivity Alert
    console.log('\n😴 Testing Inactivity Alert...');
    const inactivityNotification = await scheduler.createNotificationFromTemplate(
      'test-user-2',
      NotificationType.INACTIVITY_ALERT,
      {
        firstName: 'Jane',
        daysSinceLastActivity: 5,
        totalHoursSpent: 25,
        dashboardUrl: '/dashboard'
      }
    );
    console.log('✅ Inactivity Alert created successfully');
    console.log(`   Title: ${inactivityNotification.content.title}`);
    console.log(`   Body: ${inactivityNotification.content.body}`);

    // Test 3: Milestone Achievement
    console.log('\n🏆 Testing Milestone Achievement...');
    const milestoneNotification = await scheduler.createNotificationFromTemplate(
      'test-user-3',
      NotificationType.MILESTONE_ACHIEVEMENT,
      {
        firstName: 'Bob',
        milestoneTitle: 'First Module Complete',
        celebrationMessage: '🎉 Congratulations on completing your first module!',
        badge: 'first-module',
        points: 100,
        achievementUrl: '/achievements/first-module'
      }
    );
    console.log('✅ Milestone Achievement created successfully');
    console.log(`   Title: ${milestoneNotification.content.title}`);
    console.log(`   Body: ${milestoneNotification.content.body}`);

    // Test 4: Streak Celebration
    console.log('\n🔥 Testing Streak Celebration...');
    const streakNotification = await scheduler.createNotificationFromTemplate(
      'test-user-4',
      NotificationType.STREAK_CELEBRATION,
      {
        firstName: 'Alice',
        streakDays: 14,
        celebrationMessage: '🔥 Amazing 14-day learning streak!',
        badge: 'streak-warrior',
        points: 140,
        shareUrl: '/share/streak/14'
      }
    );
    console.log('✅ Streak Celebration created successfully');
    console.log(`   Title: ${streakNotification.content.title}`);
    console.log(`   Body: ${streakNotification.content.body}`);

    // Test 5: Course Completion
    console.log('\n🎓 Testing Course Completion...');
    const completionNotification = await scheduler.createNotificationFromTemplate(
      'test-user-5',
      NotificationType.COURSE_COMPLETION,
      {
        firstName: 'Charlie',
        learningPathTitle: 'Full Stack Development',
        totalHours: 120,
        skillsAcquired: 15,
        completionRate: 100,
        badge: 'fullstack-complete',
        points: 1000,
        achievementUrl: '/achievements/completion/100'
      }
    );
    console.log('✅ Course Completion created successfully');
    console.log(`   Title: ${completionNotification.content.title}`);
    console.log(`   Body: ${completionNotification.content.body}`);

    // Test 6: Scheduler Status
    console.log('\n⚙️  Testing Scheduler Status...');
    scheduler.start();
    const status = scheduler.getSchedulerStatus();
    console.log('✅ Scheduler started successfully');
    console.log(`   Running: ${status.isRunning}`);
    console.log(`   Jobs: ${status.jobCount}`);
    console.log(`   Job IDs: ${status.jobs.map(j => j.id).join(', ')}`);

    // Test 7: Streak Badge Logic
    console.log('\n🏅 Testing Streak Badge Logic...');
    const testStreaks = [7, 14, 30, 60, 100];
    testStreaks.forEach(days => {
      const badge = (scheduler as any).getStreakBadge(days);
      console.log(`   ${days} days → ${badge}`);
    });

    console.log('\n🎉 All notification trigger tests completed successfully!');
    console.log('================================================');

  } catch (error) {
    console.error('❌ Error testing notification triggers:', error);
  } finally {
    scheduler.stop();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testNotificationTriggers().catch(console.error);
}

export { testNotificationTriggers };