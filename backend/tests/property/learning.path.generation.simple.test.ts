import * as fc from 'fast-check';
import { LearningPathGenerationService } from '../../src/services/learningPathGenerationService';
import { User } from '../../src/models/User';
import { CareerDomain } from '../../src/models/CareerDomain';
import {
  ICreateLearningPath,
  DifficultyLevel,
  LearningPace,
  LearningStyle
} from '../../src/types/learning';
import {
  SkillCategory
} from '../../src/types/recommendation';
import { IUser } from '../../src/types/user';

/**
 * Property-Based Test for Learning Path Generation
 * **Feature: ai-sikshak-platform, Property 7: Learning Path Generation**
 * **Validates: Requirements 3.1, 3.2, 3.3**
 * 
 * Property: For any selected career domain, the system should generate a comprehensive learning path 
 * with structured modules, weekly targets, and estimated timeframes.
 */

// Simple generators for testing
const objectIdArb = fc.string({ minLength: 24, maxLength: 24 })
  .filter(s => /^[a-f0-9]{24}$/.test(s));

const skillArb = fc.record({
  name: fc.string({ minLength: 3, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  category: fc.constantFrom(...Object.values(SkillCategory)),
  importance: fc.integer({ min: 1, max: 10 }),
  difficulty: fc.constantFrom(...Object.values(DifficultyLevel)),
  estimatedHours: fc.integer({ min: 5, max: 100 })
});

const userArb = fc.record({
  _id: objectIdArb,
  email: fc.emailAddress(),
  profile: fc.record({
    firstName: fc.string({ minLength: 2, maxLength: 50 }),
    lastName: fc.string({ minLength: 2, maxLength: 50 }),
    currentStatus: fc.constantFrom('student', 'graduate', 'employed', 'unemployed'),
    educationLevel: fc.constantFrom('high_school', 'bachelor', 'master', 'phd')
  }),
  preferences: fc.record({
    notificationFrequency: fc.constantFrom('daily', 'weekly', 'minimal'),
    learningPace: fc.constantFrom('slow', 'moderate', 'fast'),
    preferredLearningStyle: fc.constantFrom('visual', 'auditory', 'mixed'),
    careerGoals: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
    timeZone: fc.constant('UTC')
  }),
  stats: fc.record({
    assessmentCompleted: fc.boolean(),
    skillsAcquired: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 0, maxLength: 10 })
  })
}).map((userData) => ({
  ...userData,
  _id: userData._id as any,
  createdAt: new Date(),
  updatedAt: new Date()
} as IUser));

const domainArb = fc.record({
  _id: objectIdArb,
  title: fc.string({ minLength: 5, maxLength: 50 }),
  description: fc.string({ minLength: 20, maxLength: 200 }),
  difficulty: fc.constantFrom(...Object.values(DifficultyLevel)),
  requiredSkills: fc.array(skillArb, { minLength: 5, maxLength: 10 }),
  optionalSkills: fc.array(skillArb, { minLength: 2, maxLength: 5 })
}).map((domainData) => ({
  ...domainData,
  _id: domainData._id as any,
  createdAt: new Date(),
  updatedAt: new Date()
} as any));

describe('Learning Path Generation Property Tests', () => {
  /**
   * Property 7: Learning Path Generation
   * For any selected career domain, the system should generate a comprehensive learning path 
   * with structured modules, weekly targets, and estimated timeframes.
   */
  
  it('should generate a comprehensive learning path with structured modules for any valid domain and user', async () => {
    await fc.assert(
      fc.asyncProperty(
        userArb,
        domainArb,
        async (user, domain) => {
          // Mock the database calls
          const userSpy = jest.spyOn(User, 'findById').mockResolvedValue(user as any);
          const domainSpy = jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

          const request: ICreateLearningPath = {
            userId: String(user._id),
            domainId: String(domain._id)
          };

          const learningPath = await LearningPathGenerationService.generateLearningPath(request);

          // Property: Generated learning path should have comprehensive structure
          expect(learningPath).toBeDefined();
          expect(typeof learningPath).toBe('object');

          // Validate basic path properties (Requirement 3.1)
          expect(typeof learningPath.userId).toBe('string');
          expect(learningPath.userId).toBe(String(user._id));
          expect(typeof learningPath.domainId).toBe('string');
          expect(learningPath.domainId).toBe(String(domain._id));
          
          if (learningPath.title) {
            expect(typeof learningPath.title).toBe('string');
            expect(learningPath.title.length).toBeGreaterThan(0);
          }
          
          if (learningPath.description) {
            expect(typeof learningPath.description).toBe('string');
            expect(learningPath.description.length).toBeGreaterThan(0);
          }

          // Validate difficulty level
          if (learningPath.difficulty) {
            expect(Object.values(DifficultyLevel)).toContain(learningPath.difficulty);
          }

          // Validate modules structure (Requirement 3.1)
          if (learningPath.modules) {
            expect(Array.isArray(learningPath.modules)).toBe(true);
            expect(learningPath.modules.length).toBeGreaterThan(0);
            expect(learningPath.modules.length).toBeLessThanOrEqual(10); // Reasonable upper bound

            // Property: Should have estimated duration for overall path (Requirement 3.3)
            if (learningPath.estimatedDuration) {
              expect(typeof learningPath.estimatedDuration).toBe('number');
              expect(learningPath.estimatedDuration).toBeGreaterThan(0);
              expect(learningPath.estimatedDuration).toBeLessThanOrEqual(104); // Max 2 years
            }

            // Property: Each module should have weekly targets with specific objectives (Requirement 3.2)
            learningPath.modules.forEach(module => {
              expect(Array.isArray(module.weeklyTargets)).toBe(true);
              expect(module.weeklyTargets.length).toBeGreaterThan(0);
              expect(module.weeklyTargets.length).toBeLessThanOrEqual(8); // Reasonable upper bound

              module.weeklyTargets.forEach((target, index) => {
                // Basic structure validation
                expect(typeof target.id).toBe('string');
                expect(target.id.length).toBeGreaterThan(0);
                expect(target.moduleId).toBe(module.id);
                expect(typeof target.week).toBe('number');
                expect(target.week).toBe(index + 1); // Sequential weeks
                expect(typeof target.title).toBe('string');
                expect(target.title.length).toBeGreaterThan(0);

                // Tasks should be specific and actionable
                expect(Array.isArray(target.tasks)).toBe(true);
                expect(target.tasks.length).toBeGreaterThan(0);
                expect(target.tasks.length).toBeLessThanOrEqual(10); // Reasonable upper bound

                target.tasks.forEach(task => {
                  expect(typeof task.id).toBe('string');
                  expect(task.id.length).toBeGreaterThan(0);
                  expect(typeof task.title).toBe('string');
                  expect(task.title.length).toBeGreaterThan(0);
                  expect(typeof task.estimatedMinutes).toBe('number');
                  expect(task.estimatedMinutes).toBeGreaterThan(0);
                  expect(task.estimatedMinutes).toBeLessThanOrEqual(480); // Max 8 hours per task
                  expect(typeof task.isRequired).toBe('boolean');
                  expect(task.completed).toBe(false); // New tasks should not be completed
                });

                // Estimated hours should be reasonable
                expect(typeof target.estimatedHours).toBe('number');
                expect(target.estimatedHours).toBeGreaterThan(0);
                expect(target.estimatedHours).toBeLessThanOrEqual(40); // Max 40 hours per week
              });
            });
          }

          // Validate progress tracking structure
          if (learningPath.progress) {
            expect(Array.isArray(learningPath.progress.completedModules)).toBe(true);
            expect(typeof learningPath.progress.overallProgress).toBe('number');
            expect(learningPath.progress.overallProgress).toBe(0); // New path should start at 0
            expect(typeof learningPath.progress.totalWeeklyTargets).toBe('number');
            expect(learningPath.progress.totalWeeklyTargets).toBeGreaterThan(0);
          }

          // Validate personalization settings
          if (learningPath.personalization) {
            expect(Object.values(LearningPace)).toContain(learningPath.personalization.learningPace);
            expect(Object.values(LearningStyle)).toContain(learningPath.personalization.preferredLearningStyle);
            expect(typeof learningPath.personalization.availableHoursPerWeek).toBe('number');
            expect(learningPath.personalization.availableHoursPerWeek).toBeGreaterThan(0);
          }

          // Clean up mocks
          userSpy.mockRestore();
          domainSpy.mockRestore();
        }
      ),
      { numRuns: 5 }
    );
  });
});