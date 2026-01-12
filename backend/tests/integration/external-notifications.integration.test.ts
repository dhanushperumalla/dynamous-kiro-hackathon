import request from 'supertest';
import app from '../../src/app';
import { connectDB, disconnectDB } from '../setup/database';
import { User } from '../../src/models/User';
import { emailService } from '../../src/services/emailService';
import { smsService } from '../../src/services/smsService';
import { pushNotificationService } from '../../src/services/pushNotificationService';

describe('External Notification Services Integration', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});

    // Create test user
    const userData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      currentStatus: 'student' as const,
      acceptedTerms: true
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(response.status).toBe(201);
    userId = response.body.data.user.id;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    expect(loginResponse.status).toBe(200);
    authToken = loginResponse.body.data.accessToken;
  });

  describe('Device Token Management', () => {
    const validDeviceToken = 'c1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

    it('should register a device token successfully', async () => {
      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceToken: validDeviceToken,
          platform: 'android'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Device token registered successfully');
      expect(response.body.data.tokenCount).toBe(1);

      // Verify token was saved to user
      const user = await User.findById(userId);
      expect(user?.preferences.deviceTokens).toContain(validDeviceToken);
    });

    it('should not register invalid device token', async () => {
      const response = await request(app)
        .post('/api/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceToken: 'invalid-token',
          platform: 'android'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid device token format');
    });

    it('should unregister a device token successfully', async () => {
      // First register a token
      await request(app)
        .post('/api/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceToken: validDeviceToken,
          platform: 'android'
        });

      // Then unregister it
      const response = await request(app)
        .post('/api/devices/unregister')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceToken: validDeviceToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Device token unregistered successfully');
      expect(response.body.data.tokenCount).toBe(0);

      // Verify token was removed from user
      const user = await User.findById(userId);
      expect(user?.preferences.deviceTokens).not.toContain(validDeviceToken);
    });

    it('should get device tokens info', async () => {
      // Register a token first
      await request(app)
        .post('/api/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceToken: validDeviceToken,
          platform: 'android'
        });

      const response = await request(app)
        .get('/api/devices/tokens')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokenCount).toBe(1);
      expect(response.body.data.hasTokens).toBe(true);
    });

    it('should send test push notification in development', async () => {
      // Register a token first
      await request(app)
        .post('/api/devices/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deviceToken: validDeviceToken,
          platform: 'android'
        });

      const response = await request(app)
        .post('/api/devices/test-notification')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Title',
          body: 'Test Body'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Test notification sent');
      expect(response.body.data.deviceTokenCount).toBe(1);
    });
  });

  describe('Email Service', () => {
    it('should have email service initialized', () => {
      expect(emailService).toBeDefined();
      expect(typeof emailService.sendVerificationEmail).toBe('function');
      expect(typeof emailService.sendPasswordResetEmail).toBe('function');
      expect(typeof emailService.sendWelcomeEmail).toBe('function');
      expect(typeof emailService.sendWeeklyProgressReminder).toBe('function');
      expect(typeof emailService.sendMilestoneAchievementEmail).toBe('function');
      expect(typeof emailService.sendJobRecommendationEmail).toBe('function');
    });

    it('should send verification email in development mode', async () => {
      // This will be logged instead of actually sent in development
      await expect(
        emailService.sendVerificationEmail('test@example.com', 'test-token', 'Test')
      ).resolves.not.toThrow();
    });

    it('should send welcome email in development mode', async () => {
      // This will be logged instead of actually sent in development
      await expect(
        emailService.sendWelcomeEmail('test@example.com', 'Test')
      ).resolves.not.toThrow();
    });
  });

  describe('SMS Service', () => {
    it('should have SMS service initialized', () => {
      expect(smsService).toBeDefined();
      expect(typeof smsService.sendWeeklyProgressReminder).toBe('function');
      expect(typeof smsService.sendMilestoneAchievementSMS).toBe('function');
      expect(typeof smsService.sendInactivityReminderSMS).toBe('function');
      expect(typeof smsService.sendJobRecommendationSMS).toBe('function');
      expect(typeof smsService.sendUrgentNotificationSMS).toBe('function');
    });

    it('should validate phone numbers correctly', () => {
      expect(smsService.validatePhoneNumber('+1234567890')).toBe(true);
      expect(smsService.validatePhoneNumber('+919876543210')).toBe(true);
      expect(smsService.validatePhoneNumber('1234567890')).toBe(false);
      expect(smsService.validatePhoneNumber('+123')).toBe(false);
      expect(smsService.validatePhoneNumber('invalid')).toBe(false);
    });

    it('should format phone numbers correctly', () => {
      expect(smsService.formatPhoneNumber('1234567890')).toBe('+11234567890');
      expect(smsService.formatPhoneNumber('+1234567890')).toBe('+1234567890');
      expect(smsService.formatPhoneNumber('9876543210', '+91')).toBe('+919876543210');
    });

    it('should send SMS in development mode', async () => {
      // This will be logged instead of actually sent in development
      await expect(
        smsService.sendWeeklyProgressReminder('+1234567890', 'Test', {
          completedTargets: 3,
          totalTargets: 5,
          currentWeek: 2
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Push Notification Service', () => {
    it('should have push notification service initialized', () => {
      expect(pushNotificationService).toBeDefined();
      expect(typeof pushNotificationService.sendWeeklyProgressReminder).toBe('function');
      expect(typeof pushNotificationService.sendMilestoneAchievementPush).toBe('function');
      expect(typeof pushNotificationService.sendInactivityReminderPush).toBe('function');
      expect(typeof pushNotificationService.sendJobRecommendationPush).toBe('function');
      expect(typeof pushNotificationService.sendLearningReminderPush).toBe('function');
    });

    it('should send push notification in development mode', async () => {
      const validDeviceToken = 'c1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      // This will be logged instead of actually sent in development
      await expect(
        pushNotificationService.sendWeeklyProgressReminder(validDeviceToken, 'Test', {
          completedTargets: 3,
          totalTargets: 5,
          currentWeek: 2
        })
      ).resolves.not.toThrow();
    });

    it('should validate device tokens', async () => {
      const validToken = 'c1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const invalidToken = 'invalid-token';

      // In development mode, validation should return false for both
      const validResult = await pushNotificationService.validateDeviceToken(validToken);
      const invalidResult = await pushNotificationService.validateDeviceToken(invalidToken);

      expect(typeof validResult).toBe('boolean');
      expect(typeof invalidResult).toBe('boolean');
    });

    it('should handle topic subscriptions', async () => {
      const validToken = 'c1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      // These should not throw in development mode
      await expect(
        pushNotificationService.subscribeToTopic(validToken, 'test-topic')
      ).resolves.not.toThrow();

      await expect(
        pushNotificationService.unsubscribeFromTopic(validToken, 'test-topic')
      ).resolves.not.toThrow();
    });
  });

  describe('Service Integration', () => {
    it('should handle missing user data gracefully', async () => {
      // Test that services handle missing user data without crashing
      const user = await User.findById(userId);
      expect(user).toBeTruthy();

      // Update user with phone number for SMS testing
      if (user) {
        user.profile.phoneNumber = '+1234567890';
        user.preferences.deviceTokens = ['c1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'];
        await user.save();
      }

      // These should all work in development mode
      await expect(
        emailService.sendWelcomeEmail(user!.email, user!.profile.firstName)
      ).resolves.not.toThrow();

      await expect(
        smsService.sendWeeklyProgressReminder(user!.profile.phoneNumber!, user!.profile.firstName, {
          completedTargets: 2,
          totalTargets: 4,
          currentWeek: 1
        })
      ).resolves.not.toThrow();

      await expect(
        pushNotificationService.sendMilestoneAchievementPush(
          user!.preferences.deviceTokens![0]!,
          user!.profile.firstName,
          {
            title: 'Test Milestone',
            description: 'Test Description'
          }
        )
      ).resolves.not.toThrow();
    });
  });
});