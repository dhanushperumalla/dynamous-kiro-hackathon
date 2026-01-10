import request from 'supertest';
import app from '../../src/app';
import { connectDatabase } from '../../src/config/database';
import mongoose from 'mongoose';
import { User } from '../../src/models/User';

/**
 * Integration Test: User Registration and Assessment Flow
 * Tests the complete end-to-end flow from user registration to assessment completion
 */

describe('User Registration and Assessment Flow Integration', () => {
  let authToken: string;
  let userId: string;
  
  beforeAll(async () => {
    // Connect to test database
    await connectDatabase();
  });
  
  afterAll(async () => {
    // Clean up test data and close connections
    if (userId) {
      await mongoose.connection.db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(userId) });
      await mongoose.connection.db.collection('assessments').deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
    }
    await mongoose.connection.close();
  });

  // Helper function to verify email for testing
  const verifyUserEmail = async (userId: string) => {
    await User.findByIdAndUpdate(userId, {
      'security.emailVerified': true,
      'security.emailVerifiedAt': new Date()
    });
  };

  describe('User Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1995-01-01',
        location: 'Test City',
        educationLevel: 'bachelor',
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
      
      // Store for subsequent tests
      authToken = response.body.data.tokens.accessToken;
      userId = response.body.data.user.id;
      
      // Verify email for testing purposes
      await verifyUserEmail(userId);
    });

    it('should login with registered user credentials', async () => {
      const loginData = {
        email: `test-${Date.now()}@example.com`,
        password: 'TestPassword123!'
      };

      // First register the user
      await request(app)
        .post('/api/auth/register')
        .send({
          ...loginData,
          confirmPassword: 'TestPassword123!',
          firstName: 'Login',
          lastName: 'Test',
          dateOfBirth: '1995-01-01',
          location: 'Test City',
          educationLevel: 'bachelor',
          currentStatus: 'student',
          acceptedTerms: true
        });

      // Then login
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
    });
  });

  describe('Assessment Flow', () => {
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

    it('should start assessment for authenticated user', async () => {
      const response = await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assessment).toBeDefined();
      expect(response.body.data.assessment.userId).toBe(userId);
      expect(response.body.data.assessment.isComplete).toBe(false);
    });

    it('should submit assessment responses', async () => {
      // First get the questionnaire to know the question structure
      const questionnaireResponse = await request(app)
        .get('/api/assessment/questionnaire');
      
      const questions = questionnaireResponse.body.data.questionnaire.questions;
      
      // Create sample responses for the first few questions
      const responses = questions.slice(0, 3).map((question: any) => ({
        questionId: question.id,
        answer: question.type === 'rating_scale' ? 4 : 'Sample answer',
        responseTime: 5000,
        confidence: 4
      }));

      const response = await request(app)
        .post('/api/assessment/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ responses })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assessment).toBeDefined();
      expect(response.body.data.assessment.responses.length).toBe(responses.length);
    });

    it('should get assessment progress', async () => {
      const response = await request(app)
        .get('/api/assessment/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.progress).toBeDefined();
      expect(typeof response.body.data.progress.completeness).toBe('number');
      expect(response.body.data.progress.completeness).toBeGreaterThanOrEqual(0);
      expect(response.body.data.progress.completeness).toBeLessThanOrEqual(100);
    });

    it('should allow assessment retaking', async () => {
      const response = await request(app)
        .post('/api/assessment/retake')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'Testing retake functionality' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assessment).toBeDefined();
      expect(response.body.data.assessment.isComplete).toBe(false);
      expect(response.body.data.assessment.responses.length).toBe(0);
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

  describe('Data Validation', () => {
    it('should validate registration data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
        firstName: '', // Empty
        lastName: 'User',
        confirmPassword: '123',
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

    it('should validate assessment response data', async () => {
      const invalidResponses = {
        responses: [
          {
            questionId: '', // Empty question ID
            answer: null, // Null answer
            responseTime: -1000, // Negative response time
            confidence: 10 // Out of range confidence
          }
        ]
      };

      const response = await request(app)
        .post('/api/assessment/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidResponses)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1995-01-01',
        location: 'Test City',
        educationLevel: 'bachelor',
        currentStatus: 'student',
        acceptedTerms: true
      };

      // Register first user
      const firstResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(firstResponse.body.success).toBe(true);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should handle invalid login credentials', async () => {
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
});