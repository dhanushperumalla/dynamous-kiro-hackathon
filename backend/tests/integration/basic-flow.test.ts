import request from 'supertest';
import app from '../../src/app';
import { connectDatabase } from '../../src/config/database';
import mongoose from 'mongoose';

/**
 * Basic Integration Test: Core User and Assessment Flow
 * Tests the essential functionality without complex property-based testing
 */

describe('Basic User and Assessment Flow', () => {
  beforeAll(async () => {
    // Connect to test database
    await connectDatabase();
  });
  
  afterAll(async () => {
    // Close database connections
    await mongoose.connection.close();
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('AI-Sikshak API is healthy');
    });
  });

  describe('Assessment Questionnaire', () => {
    it('should get assessment questionnaire without authentication', async () => {
      const response = await request(app)
        .get('/api/assessment/questionnaire')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.questionnaire).toBeDefined();
      expect(response.body.data.questionnaire.questions).toBeDefined();
      expect(Array.isArray(response.body.data.questionnaire.questions)).toBe(true);
      expect(response.body.data.questionnaire.questions.length).toBeGreaterThan(0);
    });
  });

  describe('User Registration', () => {
    it('should register a new user with valid data', async () => {
      const userData = {
        email: `test-basic-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        currentStatus: 'student',
        acceptedTerms: true
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        currentStatus: 'student',
        acceptedTerms: true
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const invalidData = {
        email: `test-weak-${Date.now()}@example.com`,
        password: '123',
        confirmPassword: '123',
        firstName: 'Test',
        lastName: 'User',
        currentStatus: 'student',
        acceptedTerms: true
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const email = `test-login-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      // First register the user
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password,
          confirmPassword: password,
          firstName: 'Login',
          lastName: 'Test',
          currentStatus: 'student',
          acceptedTerms: true
        })
        .expect(201);

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Authentication Middleware', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      await request(app)
        .post('/api/assessment/start')
        .expect(401);

      await request(app)
        .get('/api/assessment/progress')
        .expect(401);

      await request(app)
        .post('/api/assessment/submit')
        .send({ responses: [] })
        .expect(401);
    });

    it('should reject requests with invalid tokens', async () => {
      const invalidToken = 'invalid.jwt.token';

      await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);
    });
  });

  describe('API Documentation', () => {
    it('should provide API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('AI-Sikshak API');
      expect(response.body.endpoints).toBeDefined();
      expect(response.body.endpoints.auth).toBe('/api/auth');
      expect(response.body.endpoints.assessment).toBe('/api/assessment');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent API endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ENDPOINT_NOT_FOUND');
    });
  });
});