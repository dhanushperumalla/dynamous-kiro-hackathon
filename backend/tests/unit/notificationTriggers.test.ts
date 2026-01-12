import { NotificationScheduler } from '../../src/services/notificationScheduler';
import { NotificationType } from '../../src/types/notification';
import { logger } from '../../src/utils/logger';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock the models to avoid database dependencies
jest.mock('../../src/models/User', () => ({
  User: {
    find: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock('../../src/models/LearningPath', () => ({
  default: {
    find: jest.fn()
  }
}));

jest.mock('../../src/models/Progress', () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn()
  }
}));

jest.mock('../../src/models/Notification', () => ({
  default: {
    findOne: jest.fn()
  }
}));

describe('NotificationScheduler Triggers', () => {
  let scheduler: NotificationScheduler;

  beforeEach(() => {
    scheduler = new NotificationScheduler();
    jest.clearAllMocks();
  });

  afterEach(() => {
    scheduler.stop();
  });

  describe('Weekly Target Reminders', () => {
    it('should process weekly target reminders on Wednesday', async () => {
      // Mock Date to return Wednesday
      const mockDate = new Date('2024-01-03'); // Wednesday
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      const processSpy = jest.spyOn(scheduler as any, 'sendMidWeekReminders').mockResolvedValue(undefined);
      
      await (scheduler as any).processWeeklyTargetReminders();
      
      expect(processSpy).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Processing weekly target reminders');
    });

    it('should process weekly planning reminders on Sunday', async () => {
      // Mock Date to return Sunday
      const mockDate = new Date('2024-01-07'); // Sunday
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      const processSpy = jest.spyOn(scheduler as any, 'sendWeeklyPlanningReminders').mockResolvedValue(undefined);
      
      await (scheduler as any).processWeeklyTargetReminders();
      
      expect(processSpy).toHaveBeenCalled();
    });

    it('should not process reminders on other days', async () => {
      // Mock Date to return Monday
      const mockDate = new Date('2024-01-01'); // Monday
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      const midWeekSpy = jest.spyOn(scheduler as any, 'sendMidWeekReminders');
      const planningSpy = jest.spyOn(scheduler as any, 'sendWeeklyPlanningReminders');
      
      await (scheduler as any).processWeeklyTargetReminders();
      
      expect(midWeekSpy).not.toHaveBeenCalled();
      expect(planningSpy).not.toHaveBeenCalled();
    });
  });

  describe('Inactivity Alerts', () => {
    it('should calculate correct inactivity cutoff date', async () => {
      const mockNow = new Date('2024-01-10');
      jest.spyOn(global, 'Date').mockImplementation((arg?: any) => {
        if (arg === undefined) return mockNow as any;
        return new Date(arg) as any;
      });

      const { User } = require('../../src/models/User');
      User.find.mockResolvedValue([]);

      await (scheduler as any).processInactivityAlerts();

      const expectedCutoff = new Date('2024-01-07'); // 3 days ago
      expect(User.find).toHaveBeenCalledWith({
        isActive: true,
        'stats.lastActiveDate': {
          $lt: expectedCutoff,
          $gte: new Date('2023-12-11') // 30 days ago
        }
      });
    });
  });

  describe('Milestone Achievements', () => {
    it('should process recent milestone achievements', async () => {
      const mockNow = new Date('2024-01-10T10:30:00Z');
      jest.spyOn(global, 'Date').mockImplementation((arg?: any) => {
        if (arg === undefined) return mockNow as any;
        return new Date(arg) as any;
      });

      const Progress = require('../../src/models/Progress').default;
      Progress.find.mockResolvedValue([]);

      await (scheduler as any).processMilestoneAchievements();

      const expectedCutoff = new Date('2024-01-10T10:00:00Z'); // 30 minutes ago
      expect(Progress.find).toHaveBeenCalledWith({
        isActive: true,
        'milestones.achievedAt': { $gte: expectedCutoff }
      });
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

  describe('Celebration Data Generation', () => {
    it('should generate appropriate celebration messages for different milestone types', () => {
      const { MilestoneType } = require('../../src/types/progress');
      
      const milestone = {
        type: MilestoneType.MODULE_COMPLETION,
        title: 'JavaScript Fundamentals'
      };
      
      const progress = {
        performance: { completionRate: 75 },
        analytics: { completedActivities: 5 }
      };
      
      const learningPath = {
        modules: [1, 2, 3, 4] // 4 modules
      };

      const result = (scheduler as any).generateCelebrationData(milestone, progress, learningPath);
      
      expect(result.message).toContain('🎉 Fantastic!');
      expect(result.message).toContain('JavaScript Fundamentals');
      expect(result.extraData.completionRate).toBe(75);
      expect(result.extraData.totalModules).toBe(4);
    });
  });
});