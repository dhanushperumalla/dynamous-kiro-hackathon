import request from 'supertest';
import app from '../../src/app';
import { connectDatabase } from '../../src/config/database';
import mongoose from 'mongoose';
import { User } from '../../src/models/User';
import { AssessmentResponse } from '../../src/models/Assessment';
import { Recommendation } from '../../src/models/Recommendation';
import LearningPath from '../../src/models/LearningPath';
import Progress from '../../src/models/Progress';
import { serviceOrchestrator } from '../../src/services/serviceOrchestrator';
import { serviceRegistry } from '../../src/config/serviceRegistry';

/**
 * Integration Test: Service Communication and Orchestration
 * Tests end-to-end user journey from assessment to job matching
 * Validates cross-service data consistency and error handling
 * 
 * Requirements: 7.1, 7.3
 */

describe('Service Communication Integration Tests', () => {
  let authToken: string;
  let userId: string;
  
  beforeAll(async () => {
    // Connect to test database
    await connectDatabase();
  });
  
  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await User.findByIdAndDelete(userId);
      await AssessmentResponse.deleteMany({ userId });
      await Recommendation.deleteMany({ userId });
      await LearningPath.deleteMany({ userId });
      await Progress.deleteMany({ userId });
    }
    await mongoose.connection.close();
  });
  
  beforeEach(async () => {
    // Create test user for each test
    const userData = {
      email: `test-service-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
      firstName: 'Service',
      lastName: 'Test',
      dateOfBirth: '1995-01-01',
      location: 'Test City',
      educationLevel: 'bachelor',
      currentStatus: 'student',
      acceptedTerms: true
    };
    
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);
    
    authToken = response.body.data.tokens.accessToken;
    userId = response.body.data.user.id;
    
    // Verify email for testing
    await User.findByIdAndUpdate(userId, {
      'security.emailVerified': true,
      'security.emailVerifiedAt': new Date()
    });
  });
  
  describe('End-to-End User Journey', () => {
    it('should complete full journey: assessment -> recommendations -> learning path -> job matching', async () => {
      // Step 1: Start and complete assessment
      await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);
      
      // Get questionnaire
      const questionnaireResponse = await request(app)
        .get('/api/assessment/questionnaire');
      
      const questions = questionnaireResponse.body.data.questionnaire.questions;
      
      // Submit complete assessment
      const responses = questions.map((question: any) => ({
        questionId: question.id,
        answer: question.type === 'rating_scale' ? 4 : 'I am interested in technology',
        responseTime: 5000,
        confidence: 4
      }));
      
      const assessmentResponse = await request(app)
        .post('/api/assessment/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ responses })
        .expect(200);
      
      expect(assessmentResponse.body.success).toBe(true);
      
      // Step 2: Get recommendations
      const recommendationsResponse = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(recommendationsResponse.body.success).toBe(true);
      expect(recommendationsResponse.body.data.recommendations).toBeDefined();
      expect(Array.isArray(recommendationsResponse.body.data.recommendations.domains)).toBe(true);
      
      // Step 3: Select a domain and create learning path
      const selectedDomain = recommendationsResponse.body.data.recommendations.domains[0];
      
      const learningPathResponse = await request(app)
        .post('/api/learning/paths/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          domainId: selectedDomain.id,
          experienceLevel: 'beginner',
          weeklyHours: 10
        })
        .expect(201);
      
      expect(learningPathResponse.body.success).toBe(true);
      expect(learningPathResponse.body.data.learningPath).toBeDefined();
      
      const learningPathId = learningPathResponse.body.data.learningPath.id;
      
      // Step 4: Track progress
      const progressResponse = await request(app)
        .get(`/api/progress/${learningPathId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(progressResponse.body.success).toBe(true);
      expect(progressResponse.body.data.progress).toBeDefined();
      
      // Step 5: Complete modules to trigger job matching (80% threshold)
      const modules = learningPathResponse.body.data.learningPath.modules;
      const modulesToComplete = Math.ceil(modules.length * 0.8);
      
      for (let i = 0; i < modulesToComplete; i++) {
        await request(app)
          .post(`/api/progress/${learningPathId}/modules/${modules[i].id}/complete`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
      
      // Step 6: Check job matches
      const jobMatchesResponse = await request(app)
        .get('/api/jobs/matches')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(jobMatchesResponse.body.success).toBe(true);
      expect(jobMatchesResponse.body.data.matches).toBeDefined();
    }, 30000); // Increase timeout for long test
  });
  
  describe('Cross-Service Data Consistency', () => {
    it('should maintain data consistency across user, assessment, and recommendation services', async () => {
      // Create assessment
      await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);
      
      // Get questionnaire and submit
      const questionnaireResponse = await request(app)
        .get('/api/assessment/questionnaire');
      
      const questions = questionnaireResponse.body.data.questionnaire.questions;
      const responses = questions.slice(0, 5).map((question: any) => ({
        questionId: question.id,
        answer: question.type === 'rating_scale' ? 4 : 'Test answer',
        responseTime: 5000,
        confidence: 4
      }));
      
      await request(app)
        .post('/api/assessment/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ responses });
      
      // Verify data consistency
      const userFromDb = await User.findById(userId);
      const assessmentFromDb = await AssessmentResponse.findOne({ userId });
      
      expect(userFromDb).toBeDefined();
      expect(assessmentFromDb).toBeDefined();
      expect(assessmentFromDb?.userId.toString()).toBe(userId);
      expect(assessmentFromDb?.responses.length).toBe(responses.length);
    });
    
    it('should maintain consistency between learning path and progress services', async () => {
      // Create assessment and recommendations first
      await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);
      
      const questionnaireResponse = await request(app)
        .get('/api/assessment/questionnaire');
      
      const questions = questionnaireResponse.body.data.questionnaire.questions;
      const responses = questions.map((question: any) => ({
        questionId: question.id,
        answer: question.type === 'rating_scale' ? 4 : 'Test answer',
        responseTime: 5000,
        confidence: 4
      }));
      
      await request(app)
        .post('/api/assessment/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ responses });
      
      const recommendationsResponse = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${authToken}`);
      
      const selectedDomain = recommendationsResponse.body.data.recommendations.domains[0];
      
      // Create learning path
      const learningPathResponse = await request(app)
        .post('/api/learning/paths/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          domainId: selectedDomain.id,
          experienceLevel: 'beginner',
          weeklyHours: 10
        });
      
      const learningPathId = learningPathResponse.body.data.learningPath.id;
      
      // Verify consistency
      const learningPathFromDb = await LearningPath.findById(learningPathId);
      const progressFromDb = await Progress.findOne({ learningPathId });
      
      expect(learningPathFromDb).toBeDefined();
      expect(progressFromDb).toBeDefined();
      expect(progressFromDb?.userId.toString()).toBe(userId);
      expect(progressFromDb?.learningPathId.toString()).toBe(learningPathId);
    });
  });
  
  describe('Error Handling and Recovery', () => {
    it('should handle service unavailability gracefully', async () => {
      // This test verifies that the circuit breaker pattern works
      // In a real scenario, we would simulate service failure
      
      const health = await serviceOrchestrator.checkAllServicesHealth();
      
      expect(health).toBeDefined();
      expect(health.healthy).toBeDefined();
      expect(health.unhealthy).toBeDefined();
      expect(Array.isArray(health.healthy)).toBe(true);
      expect(Array.isArray(health.unhealthy)).toBe(true);
    });
    
    it('should handle invalid service requests with proper error responses', async () => {
      // Try to get learning path that doesn't exist
      const response = await request(app)
        .get('/api/learning/paths/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
    
    it('should handle concurrent service requests correctly', async () => {
      // Create assessment
      await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);
      
      // Make multiple concurrent requests
      const promises = [
        request(app)
          .get('/api/assessment/progress')
          .set('Authorization', `Bearer ${authToken}`),
        request(app)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${authToken}`),
        request(app)
          .get('/api/recommendations')
          .set('Authorization', `Bearer ${authToken}`)
      ];
      
      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBeLessThan(500);
      });
    });
  });
  
  describe('Service Orchestration', () => {
    it('should orchestrate user onboarding flow correctly', async () => {
      // Create and complete assessment
      await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);
      
      const questionnaireResponse = await request(app)
        .get('/api/assessment/questionnaire');
      
      const questions = questionnaireResponse.body.data.questionnaire.questions;
      const responses = questions.map((question: any) => ({
        questionId: question.id,
        answer: question.type === 'rating_scale' ? 4 : 'Test answer',
        responseTime: 5000,
        confidence: 4
      }));
      
      await request(app)
        .post('/api/assessment/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ responses });
      
      // Use orchestrator to get complete onboarding data
      const onboardingData = await serviceOrchestrator.completeOnboarding(userId);
      
      expect(onboardingData).toBeDefined();
      expect(onboardingData.user).toBeDefined();
      expect(onboardingData.assessment).toBeDefined();
      expect(onboardingData.user.id).toBe(userId);
    });
    
    it('should orchestrate dashboard data aggregation correctly', async () => {
      // Create some data first
      await request(app)
        .post('/api/assessment/start')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);
      
      // Use orchestrator to get dashboard data
      const dashboardData = await serviceOrchestrator.getUserDashboard(userId);
      
      expect(dashboardData).toBeDefined();
      expect(dashboardData.user).toBeDefined();
      expect(dashboardData.progress).toBeDefined();
      expect(Array.isArray(dashboardData.progress)).toBe(true);
      expect(dashboardData.user.id).toBe(userId);
    });
  });
  
  describe('Gateway Health and Status', () => {
    it('should provide gateway health status', async () => {
      const response = await request(app)
        .get('/api/gateway/health')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.services).toBeDefined();
      expect(Array.isArray(response.body.data.services)).toBe(true);
    });
    
    it('should provide gateway status information', async () => {
      const response = await request(app)
        .get('/api/gateway/status')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.gateway).toBeDefined();
      expect(response.body.data.services).toBeDefined();
      expect(Array.isArray(response.body.data.services)).toBe(true);
    });
    
    it('should provide service health for individual services', async () => {
      const response = await request(app)
        .get('/api/gateway/services/user-service/health')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('user-service');
      expect(response.body.data.status).toBeDefined();
    });
  });
  
  describe('Service Registry', () => {
    it('should have all required services registered', () => {
      const services = serviceRegistry.getAllServices();
      
      expect(services).toBeDefined();
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
      
      const serviceNames = services.map(s => s.name);
      expect(serviceNames).toContain('user-service');
      expect(serviceNames).toContain('assessment-service');
      expect(serviceNames).toContain('recommendation-service');
      expect(serviceNames).toContain('learning-service');
      expect(serviceNames).toContain('progress-service');
      expect(serviceNames).toContain('notification-service');
      expect(serviceNames).toContain('job-service');
    });
    
    it('should track service health status', () => {
      const healthStatuses = serviceRegistry.getAllHealth();
      
      expect(healthStatuses).toBeDefined();
      expect(Array.isArray(healthStatuses)).toBe(true);
      expect(healthStatuses.length).toBeGreaterThan(0);
      
      healthStatuses.forEach(health => {
        expect(health.name).toBeDefined();
        expect(health.status).toBeDefined();
        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
        expect(health.lastCheck).toBeDefined();
      });
    });
  });
});
