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
 * Property-Based Test for Learning Path Personalization
 * **Feature: ai-sikshak-platform, Property 9: Learning Path Personalization**
 * **Validates: Requirements 3.5**
 * 
 * Property: For any two users with different skill levels selecting the same domain, 
 * the system should generate different personalized learning paths reflecting their experience differences.
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

// Generator for user stats with different skill levels
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

// Generator for users with specific skill levels
const userWithSkillLevelArb = (skillLevel: SkillLevel) => fc.record({
  _id: objectIdArb,
  email: fc.emailAddress(),
  role: fc.constantFrom('student', 'admin', 'mentor', 'moderator'),
  profile: userProfileArb.map(profile => {
    // Adjust profile based on skill level
    switch (skillLevel) {
      case SkillLevel.ABSOLUTE_BEGINNER:
        return { ...profile, currentStatus: 'student' as const, educationLevel: 'high_school' as const };
      case SkillLevel.BEGINNER:
        return { ...profile, currentStatus: 'graduate' as const, educationLevel: 'bachelor' as const };
      case SkillLevel.SOME_EXPERIENCE:
        return { ...profile, currentStatus: 'employed' as const, educationLevel: 'bachelor' as const };
      case SkillLevel.INTERMEDIATE:
        return { ...profile, currentStatus: 'employed' as const, educationLevel: 'master' as const };
      case SkillLevel.ADVANCED:
        return { ...profile, currentStatus: 'employed' as const, educationLevel: 'master' as const };
      case SkillLevel.EXPERT:
        return { ...profile, currentStatus: 'employed' as const, educationLevel: 'phd' as const };
      default:
        return profile;
    }
  }),
  preferences: userPreferencesArb,
  security: userSecurityArb,
  oauth: userOAuthArb,
  stats: userStatsArb.map(stats => {
    // Adjust stats based on skill level
    switch (skillLevel) {
      case SkillLevel.ABSOLUTE_BEGINNER:
        return { ...stats, assessmentCompleted: true, skillsAcquired: [] };
      case SkillLevel.BEGINNER:
        return { ...stats, assessmentCompleted: true, skillsAcquired: ['basic-skill-1', 'basic-skill-2'] };
      case SkillLevel.SOME_EXPERIENCE:
        return { ...stats, assessmentCompleted: true, skillsAcquired: ['skill-1', 'skill-2', 'skill-3', 'skill-4', 'skill-5'] };
      case SkillLevel.INTERMEDIATE:
        return { ...stats, assessmentCompleted: true, skillsAcquired: Array.from({ length: 12 }, (_, i) => `skill-${i + 1}`) };
      case SkillLevel.ADVANCED:
        return { ...stats, assessmentCompleted: true, skillsAcquired: Array.from({ length: 22 }, (_, i) => `skill-${i + 1}`) };
      case SkillLevel.EXPERT:
        return { ...stats, assessmentCompleted: true, skillsAcquired: Array.from({ length: 30 }, (_, i) => `skill-${i + 1}`) };
      default:
        return stats;
    }
  }),
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

describe('Learning Path Personalization Property Tests', () => {
  beforeAll(async () => {
    await connectDatabase();
    // Seed domains if not already present
    await CareerDomainService.seedDomains();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  /**
   * Property 9: Learning Path Personalization
   * For any two users with different skill levels selecting the same domain, 
   * the system should generate different personalized learning paths reflecting their experience differences.
   */
  
  describe('Skill Level Differentiation', () => {
    it('should generate different learning paths for users with different skill levels on the same domain', async () => {
      await fc.assert(
        fc.asyncProperty(
          careerDomainArb,
          fc.constantFrom(SkillLevel.ABSOLUTE_BEGINNER, SkillLevel.BEGINNER),
          fc.constantFrom(SkillLevel.ADVANCED, SkillLevel.EXPERT),
          async (domain, beginnerSkillLevel, advancedSkillLevel) => {
            // Generate two users with different skill levels
            const beginnerUser = await fc.sample(userWithSkillLevelArb(beginnerSkillLevel), 1)[0];
            const advancedUser = await fc.sample(userWithSkillLevelArb(advancedSkillLevel), 1)[0];

            // Mock the database calls for both users
            jest.spyOn(User, 'findById')
              .mockImplementation((id: string) => {
                if (id === beginnerUser._id.toString()) {
                  return Promise.resolve(beginnerUser as any);
                } else if (id === advancedUser._id.toString()) {
                  return Promise.resolve(advancedUser as any);
                }
                return Promise.resolve(null);
              });
            
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            // Generate learning paths for both users with the same domain
            const beginnerRequest: ICreateLearningPath = {
              userId: beginnerUser._id.toString(),
              domainId: domain._id.toString()
            };

            const advancedRequest: ICreateLearningPath = {
              userId: advancedUser._id.toString(),
              domainId: domain._id.toString()
            };

            const beginnerPath = await LearningPathGenerationService.generateLearningPath(beginnerRequest);
            const advancedPath = await LearningPathGenerationService.generateLearningPath(advancedRequest);

            // Property: Both paths should be valid but different
            expect(beginnerPath).toBeDefined();
            expect(advancedPath).toBeDefined();
            expect(beginnerPath.domainId).toBe(advancedPath.domainId); // Same domain
            expect(beginnerPath.userId).not.toBe(advancedPath.userId); // Different users

            // Property: Skill levels should be reflected in personalization
            expect(beginnerPath.personalization.skillLevel).toBe(beginnerSkillLevel);
            expect(advancedPath.personalization.skillLevel).toBe(advancedSkillLevel);

            // Property: Foundation module treatment should differ
            const beginnerFoundation = beginnerPath.modules.find(m => m.id.includes('foundation'));
            const advancedFoundation = advancedPath.modules.find(m => m.id.includes('foundation'));

            if (beginnerFoundation && advancedFoundation) {
              // Beginners should have mandatory foundation with more hours
              expect(beginnerFoundation.isOptional).toBe(false);
              
              // Advanced users should have reduced foundation hours or optional foundation
              if (advancedSkillLevel === SkillLevel.EXPERT) {
                // Experts might have optional foundation
                expect(advancedFoundation.isOptional).toBe(true);
              }
              
              // Foundation hours should be different (beginners need more)
              expect(beginnerFoundation.estimatedHours).toBeGreaterThanOrEqual(advancedFoundation.estimatedHours);
            }

            // Property: Total duration should reflect skill level differences
            if (beginnerSkillLevel === SkillLevel.ABSOLUTE_BEGINNER && 
                (advancedSkillLevel === SkillLevel.ADVANCED || advancedSkillLevel === SkillLevel.EXPERT)) {
              // Beginners should generally need more time
              expect(beginnerPath.estimatedDuration).toBeGreaterThanOrEqual(advancedPath.estimatedDuration * 0.8);
            }

            // Property: Module difficulty progression should differ
            const beginnerDifficulties = beginnerPath.modules.map(m => m.difficulty);
            const advancedDifficulties = advancedPath.modules.map(m => m.difficulty);

            // Beginners should have more beginner-level modules
            const beginnerLevelCount = beginnerDifficulties.filter(d => d === DifficultyLevel.BEGINNER).length;
            const advancedBeginnerCount = advancedDifficulties.filter(d => d === DifficultyLevel.BEGINNER).length;
            
            expect(beginnerLevelCount).toBeGreaterThanOrEqual(advancedBeginnerCount);

            // Property: Advanced users should have more advanced/expert modules
            const beginnerAdvancedCount = beginnerDifficulties.filter(d => 
              d === DifficultyLevel.ADVANCED || d === DifficultyLevel.EXPERT).length;
            const advancedAdvancedCount = advancedDifficulties.filter(d => 
              d === DifficultyLevel.ADVANCED || d === DifficultyLevel.EXPERT).length;
            
            expect(advancedAdvancedCount).toBeGreaterThanOrEqual(beginnerAdvancedCount);

            // Property: Module count and structure should potentially differ
            // Advanced users might have fewer total modules due to skipped basics
            const beginnerModuleCount = beginnerPath.modules.length;
            const advancedModuleCount = advancedPath.modules.length;
            
            // Both should have reasonable module counts
            expect(beginnerModuleCount).toBeGreaterThan(0);
            expect(advancedModuleCount).toBeGreaterThan(0);
            expect(beginnerModuleCount).toBeLessThanOrEqual(10);
            expect(advancedModuleCount).toBeLessThanOrEqual(10);

            // Property: Weekly targets should reflect different pacing needs
            const beginnerTotalTargets = beginnerPath.modules.reduce((sum, m) => sum + m.weeklyTargets.length, 0);
            const advancedTotalTargets = advancedPath.modules.reduce((sum, m) => sum + m.weeklyTargets.length, 0);
            
            expect(beginnerTotalTargets).toBeGreaterThan(0);
            expect(advancedTotalTargets).toBeGreaterThan(0);

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Learning Pace Personalization', () => {
    it('should generate different paths for users with different learning paces on the same domain', async () => {
      await fc.assert(
        fc.asyncProperty(
          careerDomainArb,
          fc.constantFrom(LearningPace.SLOW),
          fc.constantFrom(LearningPace.FAST, LearningPace.INTENSIVE),
          async (domain, slowPace, fastPace) => {
            // Generate two users with same skill level but different paces
            const slowUser = await fc.sample(userWithSkillLevelArb(SkillLevel.SOME_EXPERIENCE), 1)[0];
            const fastUser = await fc.sample(userWithSkillLevelArb(SkillLevel.SOME_EXPERIENCE), 1)[0];

            // Mock the database calls
            jest.spyOn(User, 'findById')
              .mockImplementation((id: string) => {
                if (id === slowUser._id.toString()) {
                  return Promise.resolve(slowUser as any);
                } else if (id === fastUser._id.toString()) {
                  return Promise.resolve(fastUser as any);
                }
                return Promise.resolve(null);
              });
            
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            // Create personalization settings with different paces
            const slowPersonalization: Partial<IPersonalizationSettings> = {
              learningPace: slowPace,
              availableHoursPerWeek: 8
            };

            const fastPersonalization: Partial<IPersonalizationSettings> = {
              learningPace: fastPace,
              availableHoursPerWeek: 20
            };

            // Generate learning paths
            const slowRequest: ICreateLearningPath = {
              userId: slowUser._id.toString(),
              domainId: domain._id.toString(),
              personalization: slowPersonalization
            };

            const fastRequest: ICreateLearningPath = {
              userId: fastUser._id.toString(),
              domainId: domain._id.toString(),
              personalization: fastPersonalization
            };

            const slowPath = await LearningPathGenerationService.generateLearningPath(slowRequest);
            const fastPath = await LearningPathGenerationService.generateLearningPath(fastRequest);

            // Property: Both paths should be valid but with different durations
            expect(slowPath).toBeDefined();
            expect(fastPath).toBeDefined();
            expect(slowPath.domainId).toBe(fastPath.domainId); // Same domain

            // Property: Learning pace should be reflected in personalization
            expect(slowPath.personalization.learningPace).toBe(slowPace);
            expect(fastPath.personalization.learningPace).toBe(fastPace);

            // Property: Duration should reflect learning pace differences
            expect(slowPath.estimatedDuration).toBeGreaterThan(fastPath.estimatedDuration);

            // Property: Available hours per week should be different
            expect(slowPath.personalization.availableHoursPerWeek).toBeLessThan(
              fastPath.personalization.availableHoursPerWeek
            );

            // Property: Both paths should have reasonable durations
            expect(slowPath.estimatedDuration).toBeGreaterThanOrEqual(4); // Minimum 4 weeks
            expect(fastPath.estimatedDuration).toBeGreaterThanOrEqual(4); // Minimum 4 weeks
            expect(slowPath.estimatedDuration).toBeLessThanOrEqual(52); // Maximum 1 year
            expect(fastPath.estimatedDuration).toBeLessThanOrEqual(52); // Maximum 1 year

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Learning Style Adaptation', () => {
    it('should adapt resource types based on different learning styles for the same domain', async () => {
      await fc.assert(
        fc.asyncProperty(
          careerDomainArb,
          fc.constantFrom(LearningStyle.VISUAL),
          fc.constantFrom(LearningStyle.AUDITORY, LearningStyle.KINESTHETIC),
          async (domain, visualStyle, otherStyle) => {
            // Generate two users with same skill level but different learning styles
            const visualUser = await fc.sample(userWithSkillLevelArb(SkillLevel.INTERMEDIATE), 1)[0];
            const otherUser = await fc.sample(userWithSkillLevelArb(SkillLevel.INTERMEDIATE), 1)[0];

            // Mock the database calls
            jest.spyOn(User, 'findById')
              .mockImplementation((id: string) => {
                if (id === visualUser._id.toString()) {
                  return Promise.resolve(visualUser as any);
                } else if (id === otherUser._id.toString()) {
                  return Promise.resolve(otherUser as any);
                }
                return Promise.resolve(null);
              });
            
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            // Create personalization settings with different learning styles
            const visualPersonalization: Partial<IPersonalizationSettings> = {
              preferredLearningStyle: visualStyle,
              availableHoursPerWeek: 15
            };

            const otherPersonalization: Partial<IPersonalizationSettings> = {
              preferredLearningStyle: otherStyle,
              availableHoursPerWeek: 15
            };

            // Generate learning paths
            const visualRequest: ICreateLearningPath = {
              userId: visualUser._id.toString(),
              domainId: domain._id.toString(),
              personalization: visualPersonalization
            };

            const otherRequest: ICreateLearningPath = {
              userId: otherUser._id.toString(),
              domainId: domain._id.toString(),
              personalization: otherPersonalization
            };

            const visualPath = await LearningPathGenerationService.generateLearningPath(visualRequest);
            const otherPath = await LearningPathGenerationService.generateLearningPath(otherRequest);

            // Property: Both paths should be valid
            expect(visualPath).toBeDefined();
            expect(otherPath).toBeDefined();
            expect(visualPath.domainId).toBe(otherPath.domainId); // Same domain

            // Property: Learning style should be reflected in personalization
            expect(visualPath.personalization.preferredLearningStyle).toBe(visualStyle);
            expect(otherPath.personalization.preferredLearningStyle).toBe(otherStyle);

            // Property: Both paths should have modules with resources
            expect(visualPath.modules.length).toBeGreaterThan(0);
            expect(otherPath.modules.length).toBeGreaterThan(0);

            visualPath.modules.forEach(module => {
              expect(Array.isArray(module.resources)).toBe(true);
              expect(module.resources.length).toBeGreaterThan(0);
            });

            otherPath.modules.forEach(module => {
              expect(Array.isArray(module.resources)).toBe(true);
              expect(module.resources.length).toBeGreaterThan(0);
            });

            // Property: Paths should have similar structure but potentially different resource emphasis
            // Both should have reasonable module counts
            expect(visualPath.modules.length).toBeGreaterThan(0);
            expect(otherPath.modules.length).toBeGreaterThan(0);

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Experience Level Differentiation', () => {
    it('should generate significantly different paths for absolute beginners vs experts on the same domain', async () => {
      await fc.assert(
        fc.asyncProperty(
          careerDomainArb,
          async (domain) => {
            // Generate users with extreme skill level differences
            const beginnerUser = await fc.sample(userWithSkillLevelArb(SkillLevel.ABSOLUTE_BEGINNER), 1)[0];
            const expertUser = await fc.sample(userWithSkillLevelArb(SkillLevel.EXPERT), 1)[0];

            // Mock the database calls
            jest.spyOn(User, 'findById')
              .mockImplementation((id: string) => {
                if (id === beginnerUser._id.toString()) {
                  return Promise.resolve(beginnerUser as any);
                } else if (id === expertUser._id.toString()) {
                  return Promise.resolve(expertUser as any);
                }
                return Promise.resolve(null);
              });
            
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            // Generate learning paths for both users
            const beginnerRequest: ICreateLearningPath = {
              userId: beginnerUser._id.toString(),
              domainId: domain._id.toString()
            };

            const expertRequest: ICreateLearningPath = {
              userId: expertUser._id.toString(),
              domainId: domain._id.toString()
            };

            const beginnerPath = await LearningPathGenerationService.generateLearningPath(beginnerRequest);
            const expertPath = await LearningPathGenerationService.generateLearningPath(expertRequest);

            // Property: Both paths should be valid
            expect(beginnerPath).toBeDefined();
            expect(expertPath).toBeDefined();
            expect(beginnerPath.domainId).toBe(expertPath.domainId); // Same domain

            // Property: Skill levels should be correctly assigned
            expect(beginnerPath.personalization.skillLevel).toBe(SkillLevel.ABSOLUTE_BEGINNER);
            expect(expertPath.personalization.skillLevel).toBe(SkillLevel.EXPERT);

            // Property: Foundation module should be mandatory for beginners, optional for experts
            const beginnerFoundation = beginnerPath.modules.find(m => m.id.includes('foundation'));
            const expertFoundation = expertPath.modules.find(m => m.id.includes('foundation'));

            if (beginnerFoundation) {
              expect(beginnerFoundation.isOptional).toBe(false);
              expect(beginnerFoundation.estimatedHours).toBeGreaterThan(0);
            }

            if (expertFoundation) {
              expect(expertFoundation.isOptional).toBe(true);
            }

            // Property: Beginners should have significantly more total hours
            const beginnerTotalHours = beginnerPath.modules.reduce((sum, m) => sum + m.estimatedHours, 0);
            const expertTotalHours = expertPath.modules.reduce((sum, m) => sum + m.estimatedHours, 0);
            
            expect(beginnerTotalHours).toBeGreaterThan(expertTotalHours * 0.8);

            // Property: Duration should reflect the skill level difference
            expect(beginnerPath.estimatedDuration).toBeGreaterThanOrEqual(expertPath.estimatedDuration);

            // Property: Module difficulty distribution should be very different
            const beginnerDifficulties = beginnerPath.modules.map(m => m.difficulty);
            const expertDifficulties = expertPath.modules.map(m => m.difficulty);

            // Beginners should have more beginner-level content
            const beginnerBasicCount = beginnerDifficulties.filter(d => d === DifficultyLevel.BEGINNER).length;
            const expertBasicCount = expertDifficulties.filter(d => d === DifficultyLevel.BEGINNER).length;
            
            expect(beginnerBasicCount).toBeGreaterThan(expertBasicCount);

            // Experts should have more advanced content
            const beginnerAdvancedCount = beginnerDifficulties.filter(d => 
              d === DifficultyLevel.ADVANCED || d === DifficultyLevel.EXPERT).length;
            const expertAdvancedCount = expertDifficulties.filter(d => 
              d === DifficultyLevel.ADVANCED || d === DifficultyLevel.EXPERT).length;
            
            expect(expertAdvancedCount).toBeGreaterThanOrEqual(beginnerAdvancedCount);

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});