import * as fc from 'fast-check';
import { LearningPathGenerationService } from '../../src/services/learningPathGenerationService';
import { CareerDomainService } from '../../src/services/careerDomainService';
import { User } from '../../src/models/User';
import { CareerDomain } from '../../src/models/CareerDomain';
import {
  ICreateLearningPath,
  IPersonalizationSettings,
  DifficultyLevel,
  LearningPace,
  LearningStyle,
  SkillLevel
} from '../../src/types/learning';
import {
  ICareerDomainDocument,
  SkillCategory,
  ExperienceLevel,
  DomainCategory,
  CompetitionLevel
} from '../../src/types/recommendation';
import { IUser } from '../../src/types/user';
import { connectDatabase } from '../../src/config/database';
import mongoose from 'mongoose';

/**
 * Property-Based Test for Learning Path Generation
 * **Feature: ai-sikshak-platform, Property 7: Learning Path Generation**
 * **Validates: Requirements 3.1, 3.2, 3.3**
 * 
 * Property: For any selected career domain, the system should generate a comprehensive learning path 
 * with structured modules, weekly targets, and estimated timeframes.
 */

// Generators for property-based testing
const difficultyArb = fc.constantFrom(...Object.values(DifficultyLevel));
const learningPaceArb = fc.constantFrom(...Object.values(LearningPace));
const learningStyleArb = fc.constantFrom(...Object.values(LearningStyle));
const skillLevelArb = fc.constantFrom(...Object.values(SkillLevel));

// Generator for valid MongoDB ObjectIds
const objectIdArb = fc.string({ minLength: 24, maxLength: 24 })
  .filter(s => /^[a-f0-9]{24}$/.test(s));

// Generator for user profiles
const userProfileArb = fc.record({
  firstName: fc.string({ minLength: 2, maxLength: 50 }),
  lastName: fc.string({ minLength: 2, maxLength: 50 }),
  dateOfBirth: fc.date({ min: new Date('1970-01-01'), max: new Date('2005-01-01') }),
  location: fc.string({ minLength: 3, maxLength: 100 }),
  educationLevel: fc.constantFrom('high_school', 'bachelor', 'master', 'phd'),
  currentStatus: fc.constantFrom('student', 'graduate', 'employed', 'unemployed', 'career_changer')
});

// Generator for user preferences
const userPreferencesArb = fc.record({
  notificationFrequency: fc.constantFrom('daily', 'weekly', 'minimal', 'none'),
  learningPace: fc.constantFrom('slow', 'moderate', 'fast'),
  preferredLearningStyle: fc.constantFrom('visual', 'auditory', 'kinesthetic', 'reading', 'mixed'),
  careerGoals: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
  timeZone: fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'),
  language: fc.constant('en'),
  emailNotifications: fc.record({
    weeklyProgress: fc.boolean(),
    milestoneAchievements: fc.boolean(),
    jobRecommendations: fc.boolean(),
    learningReminders: fc.boolean(),
    systemUpdates: fc.boolean()
  }),
  pushNotifications: fc.record({
    dailyReminders: fc.boolean(),
    weeklyTargets: fc.boolean(),
    achievements: fc.boolean(),
    jobMatches: fc.boolean()
  })
});

// Generator for user security
const userSecurityArb = fc.record({
  passwordHash: fc.string({ minLength: 60, maxLength: 60 }),
  emailVerified: fc.boolean(),
  lastPasswordChange: fc.date(),
  loginAttempts: fc.integer({ min: 0, max: 5 }),
  twoFactorEnabled: fc.boolean(),
  refreshTokens: fc.array(fc.string(), { minLength: 0, maxLength: 3 })
});

// Generator for user OAuth
const userOAuthArb = fc.record({
  providers: fc.array(fc.constantFrom('local', 'google', 'linkedin', 'facebook'), { minLength: 1, maxLength: 2 })
});

// Generator for user stats
const userStatsArb = fc.record({
  totalLearningHours: fc.integer({ min: 0, max: 1000 }),
  completedModules: fc.integer({ min: 0, max: 50 }),
  achievementsEarned: fc.integer({ min: 0, max: 25 }),
  streakDays: fc.integer({ min: 0, max: 365 }),
  lastActiveDate: fc.date(),
  joinDate: fc.date(),
  assessmentCompleted: fc.boolean(),
  skillsAcquired: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 0, maxLength: 25 })
});

// Generator for valid users
const userArb = fc.record({
  _id: objectIdArb,
  email: fc.emailAddress(),
  role: fc.constantFrom('student', 'admin', 'mentor', 'moderator'),
  profile: userProfileArb,
  preferences: userPreferencesArb,
  security: userSecurityArb,
  oauth: userOAuthArb,
  stats: userStatsArb,
  isActive: fc.boolean()
}).map((userData) => ({
  ...userData,
  _id: new mongoose.Types.ObjectId(userData._id),
  createdAt: new Date(),
  updatedAt: new Date()
} as unknown as IUser));

// Generator for skills
const skillArb = fc.record({
  name: fc.string({ minLength: 3, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  category: fc.constantFrom(...Object.values(SkillCategory)),
  importance: fc.integer({ min: 1, max: 10 }),
  learningResources: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
  assessmentCriteria: fc.array(fc.string(), { minLength: 0, maxLength: 3 })
});

// Generator for career paths
const careerPathArb = fc.record({
  title: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.string({ minLength: 20, maxLength: 300 }),
  experienceLevel: fc.constantFrom(...Object.values(ExperienceLevel)),
  averageSalary: fc.record({
    currency: fc.constant('USD'),
    min: fc.integer({ min: 30000, max: 80000 }),
    max: fc.integer({ min: 80000, max: 200000 }),
    median: fc.integer({ min: 50000, max: 120000 }),
    location: fc.string({ minLength: 3, maxLength: 50 }),
    lastUpdated: fc.date()
  }),
  growthProjection: fc.float({ min: -5, max: 25 }),
  responsibilities: fc.array(fc.string(), { minLength: 3, maxLength: 8 }),
  requiredSkills: fc.array(fc.string(), { minLength: 3, maxLength: 10 }),
  careerProgression: fc.array(fc.string(), { minLength: 2, maxLength: 5 })
});

// Generator for market data
const marketDataArb = fc.record({
  demandScore: fc.integer({ min: 1, max: 100 }),
  competitionLevel: fc.constantFrom(...Object.values(CompetitionLevel)),
  jobGrowthRate: fc.float({ min: -5, max: 25 }),
  averageSalaryRange: fc.record({
    currency: fc.constant('USD'),
    min: fc.integer({ min: 30000, max: 80000 }),
    max: fc.integer({ min: 80000, max: 200000 }),
    median: fc.integer({ min: 50000, max: 120000 }),
    location: fc.string({ minLength: 3, maxLength: 50 }),
    lastUpdated: fc.date()
  }),
  topEmployers: fc.array(fc.string(), { minLength: 3, maxLength: 10 }),
  geographicHotspots: fc.array(fc.string(), { minLength: 2, maxLength: 8 }),
  industryTrends: fc.array(fc.string(), { minLength: 2, maxLength: 6 }),
  futureOutlook: fc.string({ minLength: 50, maxLength: 300 }),
  lastUpdated: fc.date()
});

// Generator for career domains
const careerDomainArb = fc.record({
  _id: objectIdArb,
  name: fc.string({ minLength: 3, maxLength: 50 }),
  title: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.string({ minLength: 20, maxLength: 500 }),
  detailedDescription: fc.string({ minLength: 100, maxLength: 1000 }),
  category: fc.constantFrom(...Object.values(DomainCategory)),
  difficulty: difficultyArb,
  requiredSkills: fc.array(skillArb, { minLength: 5, maxLength: 15 }),
  optionalSkills: fc.array(skillArb, { minLength: 2, maxLength: 8 }),
  careerPaths: fc.array(careerPathArb, { minLength: 2, maxLength: 6 }),
  marketData: marketDataArb,
  learningResources: fc.array(fc.record({
    title: fc.string(),
    type: fc.constantFrom('course', 'book', 'tutorial'),
    provider: fc.string(),
    url: fc.string(),
    description: fc.string(),
    duration: fc.integer({ min: 1, max: 100 }),
    difficulty: difficultyArb,
    cost: fc.integer({ min: 0, max: 500 }),
    rating: fc.float({ min: 1, max: 5 }),
    skills: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
    isRecommended: fc.boolean()
  }), { minLength: 3, maxLength: 10 }),
  prerequisites: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
  timeToMastery: fc.integer({ min: 3, max: 24 }),
  isActive: fc.constant(true),
  tags: fc.array(fc.string(), { minLength: 2, maxLength: 8 }),
  relatedDomains: fc.array(objectIdArb, { minLength: 0, maxLength: 5 })
}).map((domainData) => ({
  ...domainData,
  _id: new mongoose.Types.ObjectId(domainData._id),
  relatedDomains: domainData.relatedDomains.map(id => new mongoose.Types.ObjectId(id)),
  createdAt: new Date(),
  updatedAt: new Date()
} as unknown as ICareerDomainDocument));

// Generator for personalization settings
const personalizationArb = fc.record({
  learningPace: learningPaceArb,
  preferredLearningStyle: learningStyleArb,
  availableHoursPerWeek: fc.integer({ min: 5, max: 40 }),
  skillLevel: skillLevelArb,
  focusAreas: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
  excludedTopics: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 0, maxLength: 3 }),
  preferredSchedule: fc.record({
    preferredDays: fc.array(fc.constantFrom('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'), { minLength: 1, maxLength: 7 }).map(days => days as any),
    preferredTimeSlots: fc.array(fc.constantFrom('early_morning', 'morning', 'afternoon', 'evening', 'night'), { minLength: 1, maxLength: 3 }).map(slots => slots as any),
    timezone: fc.constant('UTC'),
    flexibleSchedule: fc.boolean(),
    reminderSettings: fc.record({
      enabled: fc.boolean(),
      frequency: fc.constantFrom('daily', 'weekly', 'bi_weekly', 'custom').map(freq => freq as any),
      preferredTime: fc.constant('09:00'),
      channels: fc.array(fc.constantFrom('email', 'sms', 'push', 'in_app'), { minLength: 1, maxLength: 2 }).map(channels => channels as any)
    })
  }),
  adaptiveSettings: fc.record({
    enabled: fc.boolean(),
    difficultyAdjustment: fc.boolean(),
    paceAdjustment: fc.boolean(),
    contentRecommendation: fc.boolean(),
    pathOptimization: fc.boolean()
  })
}) as fc.Arbitrary<Partial<IPersonalizationSettings>>;

// Generator for learning path creation requests
const createLearningPathArb = fc.record({
  userId: objectIdArb,
  domainId: objectIdArb,
  personalization: fc.option(personalizationArb, { nil: undefined })
});

describe('Learning Path Generation Property Tests', () => {
  beforeAll(async () => {
    await connectDatabase();
    // Seed domains if not already present
    await CareerDomainService.seedDomains();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  /**
   * Property 7: Learning Path Generation
   * For any selected career domain, the system should generate a comprehensive learning path 
   * with structured modules, weekly targets, and estimated timeframes.
   */
  
  describe('Comprehensive Learning Path Structure', () => {
    it('should generate a comprehensive learning path with structured modules for any valid domain and user', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          careerDomainArb,
          createLearningPathArb,
          async (user, domain, request) => {
            // Mock the database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            const learningPath = await LearningPathGenerationService.generateLearningPath({
              userId: user._id.toString(),
              domainId: domain._id.toString(),
              ...(request.personalization && { personalization: request.personalization })
            });

            // Property: Generated learning path should have comprehensive structure
            expect(learningPath).toBeDefined();
            expect(typeof learningPath).toBe('object');

            // Validate basic path properties (Requirement 3.1)
            expect(typeof learningPath.userId).toBe('string');
            expect(learningPath.userId).toBe(user._id.toString());
            expect(typeof learningPath.domainId).toBe('string');
            expect(learningPath.domainId).toBe(domain._id.toString());
            expect(typeof learningPath.title).toBe('string');
            expect(learningPath.title.length).toBeGreaterThan(0);
            expect(typeof learningPath.description).toBe('string');
            expect(learningPath.description.length).toBeGreaterThan(0);

            // Validate difficulty level
            expect(Object.values(DifficultyLevel)).toContain(learningPath.difficulty);

            // Validate modules structure (Requirement 3.1)
            expect(Array.isArray(learningPath.modules)).toBe(true);
            expect(learningPath.modules.length).toBeGreaterThan(0);
            expect(learningPath.modules.length).toBeLessThanOrEqual(10); // Reasonable upper bound

            // Each module should have proper structure
            learningPath.modules.forEach((module, index) => {
              expect(typeof module.id).toBe('string');
              expect(module.id.length).toBeGreaterThan(0);
              expect(typeof module.title).toBe('string');
              expect(module.title.length).toBeGreaterThan(0);
              expect(typeof module.description).toBe('string');
              expect(module.description.length).toBeGreaterThan(0);
              
              // Module order should be sequential
              expect(typeof module.order).toBe('number');
              expect(module.order).toBe(index + 1);
              
              // Prerequisites should be valid
              expect(Array.isArray(module.prerequisites)).toBe(true);
              module.prerequisites.forEach(prereq => {
                expect(typeof prereq).toBe('string');
                expect(prereq.length).toBeGreaterThan(0);
              });
              
              // Estimated hours should be reasonable
              expect(typeof module.estimatedHours).toBe('number');
              expect(module.estimatedHours).toBeGreaterThan(0);
              expect(module.estimatedHours).toBeLessThanOrEqual(200); // Reasonable upper bound
              
              // Difficulty should be valid
              expect(Object.values(DifficultyLevel)).toContain(module.difficulty);
              
              // Weekly targets should exist (Requirement 3.2)
              expect(Array.isArray(module.weeklyTargets)).toBe(true);
              expect(module.weeklyTargets.length).toBeGreaterThan(0);
              
              // Resources should exist
              expect(Array.isArray(module.resources)).toBe(true);
              
              // Skills should be defined
              expect(Array.isArray(module.skills)).toBe(true);
              
              // Completion criteria should be defined
              expect(module.completionCriteria).toBeDefined();
              expect(typeof module.completionCriteria.requiredTasks).toBe('number');
              expect(typeof module.completionCriteria.requiredHours).toBe('number');
              expect(typeof module.completionCriteria.requiredSkillLevel).toBe('number');
            });

            // Validate progress tracking structure
            expect(learningPath.progress).toBeDefined();
            expect(Array.isArray(learningPath.progress.completedModules)).toBe(true);
            expect(typeof learningPath.progress.overallProgress).toBe('number');
            expect(learningPath.progress.overallProgress).toBe(0); // New path should start at 0
            expect(typeof learningPath.progress.totalWeeklyTargets).toBe('number');
            expect(learningPath.progress.totalWeeklyTargets).toBeGreaterThan(0);

            // Validate personalization settings
            expect(learningPath.personalization).toBeDefined();
            expect(Object.values(LearningPace)).toContain(learningPath.personalization.learningPace);
            expect(Object.values(LearningStyle)).toContain(learningPath.personalization.preferredLearningStyle);
            expect(typeof learningPath.personalization.availableHoursPerWeek).toBe('number');
            expect(learningPath.personalization.availableHoursPerWeek).toBeGreaterThan(0);

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Weekly Targets Structure', () => {
    it('should break down learning path into weekly targets with specific objectives', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          careerDomainArb,
          async (user, domain) => {
            // Mock the database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            const request: ICreateLearningPath = {
              userId: user._id.toString(),
              domainId: domain._id.toString()
            };

            const learningPath = await LearningPathGenerationService.generateLearningPath(request);

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
                expect(typeof target.description).toBe('string');
                expect(target.description.length).toBeGreaterThan(0);

                // Tasks should be specific and actionable
                expect(Array.isArray(target.tasks)).toBe(true);
                expect(target.tasks.length).toBeGreaterThan(0);
                expect(target.tasks.length).toBeLessThanOrEqual(10); // Reasonable upper bound

                target.tasks.forEach(task => {
                  expect(typeof task.id).toBe('string');
                  expect(task.id.length).toBeGreaterThan(0);
                  expect(typeof task.title).toBe('string');
                  expect(task.title.length).toBeGreaterThan(0);
                  expect(typeof task.description).toBe('string');
                  expect(task.description.length).toBeGreaterThan(0);
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

                // Due date should be in the future
                expect(target.dueDate).toBeInstanceOf(Date);
                expect(target.dueDate.getTime()).toBeGreaterThan(Date.now());

                // Skills and resources should be defined
                expect(Array.isArray(target.skills)).toBe(true);
                expect(Array.isArray(target.resources)).toBe(true);

                // Should not be completed initially
                expect(target.completed).toBe(false);
              });
            });

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Duration Estimation', () => {
    it('should estimate completion timeframes for modules and overall path', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          careerDomainArb,
          personalizationArb,
          async (user, domain, customPersonalization) => {
            // Mock the database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            const request: ICreateLearningPath = {
              userId: user._id.toString(),
              domainId: domain._id.toString(),
              personalization: customPersonalization
            };

            const learningPath = await LearningPathGenerationService.generateLearningPath(request);

            // Property: Should have estimated duration for overall path (Requirement 3.3)
            expect(typeof learningPath.estimatedDuration).toBe('number');
            expect(learningPath.estimatedDuration).toBeGreaterThan(0);
            expect(learningPath.estimatedDuration).toBeLessThanOrEqual(104); // Max 2 years

            // Property: Duration should be reasonable based on available hours per week
            const totalModuleHours = learningPath.modules.reduce((total, module) => total + module.estimatedHours, 0);
            const availableHoursPerWeek = learningPath.personalization.availableHoursPerWeek;
            const expectedMinDuration = Math.ceil(totalModuleHours / availableHoursPerWeek);
            
            // Duration should be at least the minimum required time
            expect(learningPath.estimatedDuration).toBeGreaterThanOrEqual(expectedMinDuration * 0.8); // Allow some buffer

            // Property: Each module should have reasonable estimated hours (Requirement 3.3)
            learningPath.modules.forEach(module => {
              expect(typeof module.estimatedHours).toBe('number');
              expect(module.estimatedHours).toBeGreaterThan(0);
              
              // Module hours should roughly match sum of weekly target hours
              const weeklyTargetHours = module.weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0);
              expect(Math.abs(module.estimatedHours - weeklyTargetHours)).toBeLessThanOrEqual(module.estimatedHours * 0.2); // Allow 20% variance
            });

            // Property: Duration should be adjusted based on learning pace
            const pace = learningPath.personalization.learningPace;
            if (pace === LearningPace.FAST || pace === LearningPace.INTENSIVE) {
              // Fast/intensive pace should result in shorter duration
              expect(learningPath.estimatedDuration).toBeLessThanOrEqual(expectedMinDuration * 1.2);
            } else if (pace === LearningPace.SLOW) {
              // Slow pace should result in longer duration
              expect(learningPath.estimatedDuration).toBeGreaterThanOrEqual(expectedMinDuration * 1.1);
            }

            // Property: Duration should be within reasonable bounds
            expect(learningPath.estimatedDuration).toBeGreaterThanOrEqual(4); // Minimum 4 weeks
            expect(learningPath.estimatedDuration).toBeLessThanOrEqual(52); // Maximum 1 year

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Prerequisite Dependencies', () => {
    it('should establish valid prerequisite relationships between modules', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          careerDomainArb,
          async (user, domain) => {
            // Mock the database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            const request: ICreateLearningPath = {
              userId: user._id.toString(),
              domainId: domain._id.toString()
            };

            const learningPath = await LearningPathGenerationService.generateLearningPath(request);

            // Property: Prerequisites should form a valid dependency graph
            const moduleIds = new Set(learningPath.modules.map(m => m.id));
            
            learningPath.modules.forEach(module => {
              // All prerequisites should exist in the path
              module.prerequisites.forEach(prereqId => {
                expect(moduleIds.has(prereqId)).toBe(true);
              });

              // Prerequisites should have lower order numbers (come before)
              module.prerequisites.forEach(prereqId => {
                const prereqModule = learningPath.modules.find(m => m.id === prereqId);
                if (prereqModule) {
                  expect(prereqModule.order).toBeLessThan(module.order);
                }
              });
            });

            // Property: Should not have circular dependencies
            const visited = new Set<string>();
            const recursionStack = new Set<string>();

            const hasCycle = (moduleId: string): boolean => {
              if (recursionStack.has(moduleId)) return true;
              if (visited.has(moduleId)) return false;

              visited.add(moduleId);
              recursionStack.add(moduleId);

              const module = learningPath.modules.find(m => m.id === moduleId);
              if (module) {
                for (const prereqId of module.prerequisites) {
                  if (hasCycle(prereqId)) return true;
                }
              }

              recursionStack.delete(moduleId);
              return false;
            };

            // Check for cycles in all modules
            for (const module of learningPath.modules) {
              expect(hasCycle(module.id)).toBe(false);
            }

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Personalization Adaptation', () => {
    it('should adapt learning path based on user skill level and preferences', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          careerDomainArb,
          skillLevelArb,
          learningPaceArb,
          async (user, domain, skillLevel, learningPace) => {
            // Mock the database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            const customPersonalization: Partial<IPersonalizationSettings> = {
              skillLevel,
              learningPace,
              availableHoursPerWeek: 15
            };

            const request: ICreateLearningPath = {
              userId: user._id.toString(),
              domainId: domain._id.toString(),
              personalization: customPersonalization
            };

            const learningPath = await LearningPathGenerationService.generateLearningPath(request);

            // Property: Personalization settings should be applied
            expect(learningPath.personalization.skillLevel).toBe(skillLevel);
            expect(learningPath.personalization.learningPace).toBe(learningPace);

            // Property: Path should be adapted based on skill level
            if (skillLevel === SkillLevel.ABSOLUTE_BEGINNER || skillLevel === SkillLevel.BEGINNER) {
              // Beginners should have more foundational content
              const foundationModule = learningPath.modules.find(m => m.id.includes('foundation'));
              if (foundationModule) {
                expect(foundationModule.isOptional).toBe(false);
                expect(foundationModule.estimatedHours).toBeGreaterThan(0);
              }
            } else if (skillLevel === SkillLevel.ADVANCED || skillLevel === SkillLevel.EXPERT) {
              // Advanced users might have optional foundation modules or reduced hours
              const foundationModule = learningPath.modules.find(m => m.id.includes('foundation'));
              if (foundationModule) {
                // Foundation might be optional or have reduced hours for advanced users
                expect(foundationModule.estimatedHours).toBeGreaterThan(0);
              }
            }

            // Property: Learning pace should affect duration
            const totalHours = learningPath.modules.reduce((sum, m) => sum + m.estimatedHours, 0);
            const expectedBaseDuration = Math.ceil(totalHours / learningPath.personalization.availableHoursPerWeek);
            
            if (learningPace === LearningPace.FAST || learningPace === LearningPace.INTENSIVE) {
              expect(learningPath.estimatedDuration).toBeLessThanOrEqual(expectedBaseDuration * 1.1);
            } else if (learningPace === LearningPace.SLOW) {
              expect(learningPath.estimatedDuration).toBeGreaterThanOrEqual(expectedBaseDuration);
            }

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Resource and Content Quality', () => {
    it('should generate appropriate resources and content for each module', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          careerDomainArb,
          async (user, domain) => {
            // Mock the database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            const request: ICreateLearningPath = {
              userId: user._id.toString(),
              domainId: domain._id.toString()
            };

            const learningPath = await LearningPathGenerationService.generateLearningPath(request);

            // Property: Each module should have appropriate resources
            learningPath.modules.forEach(module => {
              expect(Array.isArray(module.resources)).toBe(true);
              expect(module.resources.length).toBeGreaterThan(0);

              module.resources.forEach(resource => {
                expect(typeof resource.id).toBe('string');
                expect(resource.id.length).toBeGreaterThan(0);
                expect(typeof resource.title).toBe('string');
                expect(resource.title.length).toBeGreaterThan(0);
                expect(typeof resource.description).toBe('string');
                expect(resource.description.length).toBeGreaterThan(0);
                expect(typeof resource.duration).toBe('number');
                expect(resource.duration).toBeGreaterThan(0);
                expect(typeof resource.cost).toBe('number');
                expect(resource.cost).toBeGreaterThanOrEqual(0);
                expect(Object.values(DifficultyLevel)).toContain(resource.difficulty);
                expect(Array.isArray(resource.tags)).toBe(true);
                expect(typeof resource.isRequired).toBe('boolean');
              });

              // Property: Skills should be relevant to the domain
              expect(Array.isArray(module.skills)).toBe(true);
              module.skills.forEach(skill => {
                expect(typeof skill).toBe('string');
                expect(skill.length).toBeGreaterThan(0);
              });
            });

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});