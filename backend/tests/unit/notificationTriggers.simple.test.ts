import { NotificationScheduler } from '../../src/services/notificationScheduler';
import { NotificationType } from '../../src/types/notification';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('NotificationScheduler Core Functionality', () => {
  let scheduler: NotificationScheduler;

  beforeEach(() => {
    scheduler = new NotificationScheduler();
    jest.clearAllMocks();
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('Scheduler Status', () => {
    it('should start and stop correctly', () => {
      expect(scheduler.getSchedulerStatus().isRunning).toBe(false);
      
      scheduler.start();
      expect(scheduler.getSchedulerStatus().isRunning).toBe(true);
      expect(scheduler.getSchedulerStatus().jobCount).toBeGreaterThan(0);
      
      scheduler.stop();
      expect(scheduler.getSchedulerStatus().isRunning).toBe(false);
    });

    it('should have correct number of scheduled jobs', () => {
      scheduler.start();
      const status = scheduler.getSchedulerStatus();
      
      // Should have 6 main jobs: processPending, cleanupExpired, weeklyTargetReminders, 
      // inactivityAlerts, weeklyProgressSummaries, milestoneAchievements
      expect(status.jobCount).toBe(6);
      expect(status.jobs).toHaveLength(6);
    });
  });

  describe('Notification Template Creation', () => {
    it('should create weekly target reminder with correct template data', async () => {
      const templateData = {
        firstName: 'John',
        targetTitle: 'Complete React Basics',
        moduleTitle: 'Frontend Development',
        estimatedHours: 5,
        weekNumber: 3,
        totalTargets: 2,
        learningPathUrl: '/learning-path/123'
      };

      const result = await scheduler.createNotificationFromTemplate(
        'user123',
        NotificationType.WEEKLY_TARGET_REMINDER,
        templateData
      );

      expect(result.type).toBe(NotificationType.WEEKLY_TARGET_REMINDER);
      expect(result.content.title).toContain('Week 3 Learning Target');
      expect(result.content.body).toContain('John');
      expect(result.content.body).toContain('2 learning targets');
      expect(result.content.body).toContain('Complete React Basics');
      expect(result.content.body).toContain('5 hours estimated');
    });

    it('should create inactivity alert with personalized message', async () => {
      const templateData = {
        firstName: 'Jane',
        daysSinceLastActivity: 5,
        totalHoursSpent: 25,
        dashboardUrl: '/dashboard'
      };

      const result = await scheduler.createNotificationFromTemplate(
        'user456',
        NotificationType.INACTIVITY_ALERT,
        templateData
      );

      expect(result.type).toBe(NotificationType.INACTIVITY_ALERT);
      expect(result.content.title).toBe('Ready to continue learning?');
      expect(result.content.body).toContain('Jane');
      expect(result.content.body).toContain('5 days');
      expect(result.content.body).toContain('25 hours');
    });

    it('should create milestone achievement with celebration data', async () => {
      const templateData = {
        firstName: 'Bob',
        milestoneTitle: 'Module Completion',
        celebrationMessage: '🎉 Great job completing the module!',
        badge: 'module-complete',
        points: 100,
        achievementUrl: '/achievements/123'
      };

      const result = await scheduler.createNotificationFromTemplate(
        'user789',
        NotificationType.MILESTONE_ACHIEVEMENT,
        templateData
      );

      expect(result.type).toBe(NotificationType.MILESTONE_ACHIEVEMENT);
      expect(result.content.title).toContain('🎉 Module Completion Achieved!');
      expect(result.content.body).toContain('🎉 Great job completing the module!');
      expect(result.content.data?.['badge']).toBe('module-complete');
      expect(result.content.data?.['points']).toBe(100);
    });

    it('should create streak celebration notification', async () => {
      const templateData = {
        firstName: 'Alice',
        streakDays: 14,
        celebrationMessage: '🔥 Amazing 14-day streak!',
        badge: 'streak-warrior',
        points: 140,
        shareUrl: '/share/streak/14'
      };

      const result = await scheduler.createNotificationFromTemplate(
        'user101',
        NotificationType.STREAK_CELEBRATION,
        templateData
      );

      expect(result.type).toBe(NotificationType.STREAK_CELEBRATION);
      expect(result.content.title).toBe('🔥 14 Day Streak!');
      expect(result.content.body).toContain('🔥 Amazing 14-day streak!');
      expect(result.content.data?.['streakDays']).toBe(14);
      expect(result.content.data?.['badge']).toBe('streak-warrior');
    });

    it('should create course completion notification', async () => {
      const templateData = {
        firstName: 'Charlie',
        learningPathTitle: 'Full Stack Development',
        totalHours: 120,
        skillsAcquired: 15,
        completionRate: 100,
        badge: 'path-complete',
        points: 500,
        achievementUrl: '/achievements/completion/100'
      };

      const result = await scheduler.createNotificationFromTemplate(
        'user202',
        NotificationType.COURSE_COMPLETION,
        templateData
      );

      expect(result.type).toBe(NotificationType.COURSE_COMPLETION);
      expect(result.content.title).toBe('🎓 Course Completed!');
      expect(result.content.body).toContain('Charlie');
      expect(result.content.body).toContain('Full Stack Development');
      expect(result.content.body).toContain('120 hours');
      expect(result.content.body).toContain('15 new skills');
    });
  });

  describe('Streak Badge Generation', () => {
    it('should return correct badges for different streak lengths', () => {
      expect((scheduler as any).getStreakBadge(7)).toBe('streak-starter');
      expect((scheduler as any).getStreakBadge(14)).toBe('streak-warrior');
      expect((scheduler as any).getStreakBadge(30)).toBe('streak-master');
      expect((scheduler as any).getStreakBadge(60)).toBe('streak-champion');
      expect((scheduler as any).getStreakBadge(100)).toBe('streak-centurion');
      expect((scheduler as any).getStreakBadge(5)).toBe('streak-badge');
    });
  });

  describe('Custom Trigger Management', () => {
    it('should schedule and remove custom triggers', async () => {
      const triggerId = 'test-trigger';
      const cronExpression = '0 9 * * *'; // Daily at 9 AM
      const triggerFunction = jest.fn().mockResolvedValue(undefined);

      await scheduler.scheduleCustomTrigger(triggerId, cronExpression, triggerFunction);
      
      let status = scheduler.getSchedulerStatus();
      expect(status.jobs.some(job => job.id === triggerId)).toBe(true);

      scheduler.removeCustomTrigger(triggerId);
      
      status = scheduler.getSchedulerStatus();
      expect(status.jobs.some(job => job.id === triggerId)).toBe(false);
    });
  });
});