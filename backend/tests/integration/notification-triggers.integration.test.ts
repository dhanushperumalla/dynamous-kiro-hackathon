import { NotificationScheduler } from '../../src/services/notificationScheduler';
import { NotificationType, NotificationPriority, DeliveryChannel } from '../../src/types/notification';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('Notification Triggers Integration', () => {
  let scheduler: NotificationScheduler;

  beforeEach(() => {
    scheduler = new NotificationScheduler();
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('Weekly Target Reminder Templates', () => {
    it('should create appropriate notification for single target', async () => {
      const templateData = {
        firstName: 'John',
        targetTitle: 'Complete React Basics',
        moduleTitle: 'Frontend Development',
        estimatedHours: 5,
        learningPathUrl: '/learning-path/123'
      };

      const notification = await scheduler.createNotificationFromTemplate(
        'user123',
        NotificationType.WEEKLY_TARGET_REMINDER,
        templateData
      );

      expect(notification.type).toBe(NotificationType.WEEKLY_TARGET_REMINDER);
      expect(notification.priority).toBe(NotificationPriority.MEDIUM);
      expect(notification.deliveryPreferences.channels).toContain(DeliveryChannel.EMAIL);
      expect(notification.deliveryPreferences.channels).toContain(DeliveryChannel.PUSH);
      expect(notification.content.title).toBe('Weekly Target Reminder');
      expect(notification.content.body).toContain('Complete React Basics');
      expect(notification.content.body).toContain('5 hours estimated');
    });

    it('should create appropriate notification for multiple targets', async () => {
      const templateData = {
        firstName: 'Jane',
        targetTitle: 'Learn TypeScript',
        moduleTitle: 'Advanced JavaScript',
        estimatedHours: 8,
        weekNumber: 3,
        totalTargets: 3,
        learningPathUrl: '/learning-path/456'
      };

      const notification = await scheduler.createNotificationFromTemplate(
        'user456',
        NotificationType.WEEKLY_TARGET_REMINDER,
        templateData
      );

      expect(notification.content.title).toBe('Week 3 Learning Target');
      expect(notification.content.body).toContain('3 learning targets');
      expect(notification.content.body).toContain('Learn TypeScript');
      expect(notification.content.data?.['weekNumber']).toBe(3);
      expect(notification.content.data?.['totalTargets']).toBe(3);
    });
  });

  describe('Inactivity Alert Templates', () => {
    it('should create gentle reminder for short inactivity', async () => {
      const templateData = {
        firstName: 'Alice',
        daysSinceLastActivity: 4,
        totalHoursSpent: 15,
        dashboardUrl: '/dashboard'
      };

      const notification = await scheduler.createNotificationFromTemplate(
        'user789',
        NotificationType.INACTIVITY_ALERT,
        templateData
      );

      expect(notification.priority).toBe(NotificationPriority.LOW);
      expect(notification.deliveryPreferences.channels).toEqual([DeliveryChannel.EMAIL]);
      expect(notification.content.title).toBe('Ready to continue learning?');
      expect(notification.content.body).toContain('4 days');
      expect(notification.content.body).toContain('15 hours');
    });

    it('should create urgent reminder for long inactivity', async () => {
      const templateData = {
        firstName: 'Bob',
        daysSinceLastActivity: 10,
        totalHoursSpent: 50,
        dashboardUrl: '/dashboard'
      };

      const notification = await scheduler.createNotificationFromTemplate(
        'user101',
        NotificationType.INACTIVITY_ALERT,
        templateData
      );

      expect(notification.priority).toBe(NotificationPriority.HIGH);
      expect(notification.deliveryPreferences.channels).toContain(DeliveryChannel.EMAIL);
      expect(notification.deliveryPreferences.channels).toContain(DeliveryChannel.PUSH);
      expect(notification.content.title).toBe('We miss you!');
      expect(notification.content.body).toContain('10 days');
    });
  });

  describe('Milestone Achievement Templates', () => {
    it('should create celebration notification with badge', async () => {
      const templateData = {
        firstName: 'Charlie',
        milestoneTitle: 'First Module Complete',
        celebrationMessage: '🎉 Congratulations on completing your first module!',
        badge: 'first-module',
        points: 100,
        achievementUrl: '/achievements/first-module',
        shareUrl: '/share/milestone/123'
      };

      const notification = await scheduler.createNotificationFromTemplate(
        'user202',
        NotificationType.MILESTONE_ACHIEVEMENT,
        templateData
      );

      expect(notification.priority).toBe(NotificationPriority.HIGH);
      expect(notification.deliveryPreferences.channels).toHaveLength(3);
      expect(notification.deliveryPreferences.channels).toContain(DeliveryChannel.EMAIL);
      expect(notification.deliveryPreferences.channels).toContain(DeliveryChannel.PUSH);
      expect(notification.deliveryPreferences.channels).toContain(DeliveryChannel.IN_APP);
      
      expect(notification.content.title).toBe('🎉 First Module Complete Achieved!');
      expect(notification.content.body).toContain('🎉 Congratulations on completing your first module!');
      expect(notification.content.data?.['badge']).toBe('first-module');
      expect(notification.content.data?.['points']).toBe(100);
    });
  });

  describe('Streak Celebration Templates', () => {
    it('should create streak notification with appropriate badge', async () => {
      const templateData = {
        firstName: 'Diana',
        streakDays: 30,
        celebrationMessage: '🔥 Amazing 30-day learning streak!',
        badge: 'streak-master',
        points: 300,
        shareUrl: '/share/streak/30'
      };

      const notification = await scheduler.createNotificationFromTemplate(
        'user303',
        NotificationType.STREAK_CELEBRATION,
        templateData
      );

      expect(notification.priority).toBe(NotificationPriority.HIGH);
      expect(notification.content.title).toBe('🔥 30 Day Streak!');
      expect(notification.content.body).toContain('🔥 Amazing 30-day learning streak!');
      expect(notification.content.data?.['streakDays']).toBe(30);
      expect(notification.content.data?.['badge']).toBe('streak-master');
    });
  });

  describe('Course Completion Templates', () => {
    it('should create completion notification with full details', async () => {
      const templateData = {
        firstName: 'Eve',
        learningPathTitle: 'Full Stack Web Development',
        totalHours: 150,
        skillsAcquired: 20,
        completionRate: 100,
        badge: 'fullstack-complete',
        points: 1000,
        achievementUrl: '/achievements/completion/100'
      };

      const notification = await scheduler.createNotificationFromTemplate(
        'user404',
        NotificationType.COURSE_COMPLETION,
        templateData
      );

      expect(notification.priority).toBe(NotificationPriority.URGENT);
      expect(notification.content.title).toBe('🎓 Course Completed!');
      expect(notification.content.body).toContain('Full Stack Web Development');
      expect(notification.content.body).toContain('150 hours');
      expect(notification.content.body).toContain('20 new skills');
      expect(notification.content.data?.['totalHours']).toBe(150);
      expect(notification.content.data?.['skillsAcquired']).toBe(20);
    });
  });

  describe('Weekly Progress Summary Templates', () => {
    it('should create planning notification for upcoming week', async () => {
      const templateData = {
        firstName: 'Frank',
        upcomingTargets: [
          { targetTitle: 'Learn Redux', estimatedHours: 6 },
          { targetTitle: 'Build Todo App', estimatedHours: 4 }
        ],
        totalHours: 10,
        weekNumber: 5,
        progressUrl: '/progress'
      };

      const notification = await scheduler.createNotificationFromTemplate(
        'user505',
        NotificationType.WEEKLY_PROGRESS_SUMMARY,
        templateData
      );

      expect(notification.priority).toBe(NotificationPriority.MEDIUM);
      expect(notification.deliveryPreferences.channels).toEqual([DeliveryChannel.EMAIL]);
      expect(notification.content.title).toBe('Week 5 Learning Plan');
      expect(notification.content.body).toContain('10 hours of learning');
      expect(notification.content.body).toContain('2 targets');
    });

    it('should create summary notification for completed week', async () => {
      const templateData = {
        firstName: 'Grace',
        hoursLearned: 12,
        modulesCompleted: 2,
        streakDays: 7,
        progressUrl: '/progress'
      };

      const notification = await scheduler.createNotificationFromTemplate(
        'user606',
        NotificationType.WEEKLY_PROGRESS_SUMMARY,
        templateData
      );

      expect(notification.content.title).toBe('Your Weekly Progress Summary');
      expect(notification.content.body).toContain('12 hours completed');
      expect(notification.content.data?.['hoursLearned']).toBe(12);
      expect(notification.content.data?.['modulesCompleted']).toBe(2);
    });
  });

  describe('Scheduler Management', () => {
    it('should start with correct number of scheduled jobs', () => {
      scheduler.start();
      const status = scheduler.getSchedulerStatus();
      
      expect(status.isRunning).toBe(true);
      expect(status.jobCount).toBe(6); // 6 main cron jobs
      expect(status.jobs).toHaveLength(6);
      
      const jobIds = status.jobs.map(job => job.id);
      expect(jobIds).toContain('processPending');
      expect(jobIds).toContain('cleanupExpired');
      expect(jobIds).toContain('weeklyTargetReminders');
      expect(jobIds).toContain('inactivityAlerts');
      expect(jobIds).toContain('weeklyProgressSummaries');
      expect(jobIds).toContain('milestoneAchievements');
    });

    it('should handle custom trigger scheduling', async () => {
      scheduler.start();
      
      const customTrigger = jest.fn().mockResolvedValue(undefined);
      await scheduler.scheduleCustomTrigger('test-trigger', '0 9 * * *', customTrigger);
      
      const status = scheduler.getSchedulerStatus();
      expect(status.jobCount).toBe(7); // 6 main + 1 custom
      expect(status.jobs.some(job => job.id === 'test-trigger')).toBe(true);
      
      scheduler.removeCustomTrigger('test-trigger');
      const updatedStatus = scheduler.getSchedulerStatus();
      expect(updatedStatus.jobCount).toBe(6);
      expect(updatedStatus.jobs.some(job => job.id === 'test-trigger')).toBe(false);
    });
  });

  describe('Streak Badge Logic', () => {
    it('should return appropriate badges for different streak lengths', () => {
      const testCases = [
        { days: 5, expected: 'streak-badge' },
        { days: 7, expected: 'streak-starter' },
        { days: 14, expected: 'streak-warrior' },
        { days: 30, expected: 'streak-master' },
        { days: 60, expected: 'streak-champion' },
        { days: 100, expected: 'streak-centurion' },
        { days: 150, expected: 'streak-centurion' }
      ];

      testCases.forEach(({ days, expected }) => {
        const badge = (scheduler as any).getStreakBadge(days);
        expect(badge).toBe(expected);
      });
    });
  });
});