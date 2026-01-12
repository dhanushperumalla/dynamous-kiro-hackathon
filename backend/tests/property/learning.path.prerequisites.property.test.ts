import * as fc from 'fast-check';
import { LearningPathGenerationService } from '../../src/services/learningPathGenerationService';
import { CareerDomainService } from '../../src/services/careerDomainService';
import { User } from '../../src/models/User';
import { CareerDomain } from '../../src/models/CareerDomain';
import {
  ICreateLearningPath,
  ILearningModule,
  DifficultyLevel,
  LearningPace,
  LearningStyle,
  SkillLevel
} from '../../src/types/learning';
import {
  ICareerDomainDocument,
  SkillCategory,
  ExperienceLevel
} from '../../src/types/recommendation';
import { IUser } from '../../src/types/user';
import { connectDatabase } from '../../src/config/database';
import mongoose from 'mongoose';

/**
 * Property-Based Test for Learning Path Prerequisites
 * **Feature: ai-sikshak-platform, Property 8: Learning Path Prerequisites**
 * **Validates: Requirements 3.4**
 * 
 * Property: For any generated learning path, the prerequisite relationships between modules 
 * should form a valid directed acyclic graph ensuring logical progression.
 */

// Generators for property-based testing
const difficultyArb = fc.constantFrom(...Object.values(DifficultyLevel));
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
  pushNotifications: fc.record({
    dailyReminders: fc.boolean(),
    weeklyProgress: fc.boolean(),
    milestoneAlerts: fc.boolean()
  })
});

// Generator for user stats
const userStatsArb = fc.record({
  assessmentCompleted: fc.boolean(),
  skillsAcquired: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 0, maxLength: 25 }),
  totalLearningHours: fc.integer({ min: 0, max: 1000 }),
  completedPaths: fc.integer({ min: 0, max: 10 }),
  averageWeeklyHours: fc.float({ min: 0, max: 40 })
});

// Generator for valid users
const userArb = fc.record({
  _id: objectIdArb,
  email: fc.emailAddress(),
  profile: userProfileArb,
  preferences: userPreferencesArb,
  stats: userStatsArb,
  phoneNumber: fc.option(fc.string({ minLength: 10, maxLength: 15 }))
}).map((userData) => ({
  ...userData,
  _id: userData._id as any,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: 'user',
  security: { lastPasswordChange: new Date() },
  oauth: {},
  isActive: true
} as unknown as IUser));

// Generator for skills
const skillArb = fc.record({
  name: fc.string({ minLength: 3, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  category: fc.constantFrom(...Object.values(SkillCategory)),
  importance: fc.integer({ min: 1, max: 10 }),
  difficulty: difficultyArb,
  estimatedHours: fc.integer({ min: 5, max: 100 })
});

// Generator for career domains
const careerDomainArb = fc.record({
  _id: objectIdArb,
  name: fc.string({ minLength: 3, maxLength: 50 }),
  title: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.string({ minLength: 20, maxLength: 500 }),
  difficulty: difficultyArb,
  requiredSkills: fc.array(skillArb, { minLength: 5, maxLength: 15 }),
  optionalSkills: fc.array(skillArb, { minLength: 2, maxLength: 8 }),
  averageSalary: fc.record({
    min: fc.integer({ min: 30000, max: 80000 }),
    max: fc.integer({ min: 80000, max: 200000 }),
    currency: fc.constant('USD')
  }),
  jobGrowth: fc.float({ min: -5, max: 25 }),
  marketDemand: fc.integer({ min: 1, max: 10 }),
  experienceLevel: fc.constantFrom(...Object.values(ExperienceLevel)),
  isActive: fc.constant(true)
}).map((domainData) => ({
  ...domainData,
  _id: domainData._id as any,
  createdAt: new Date(),
  updatedAt: new Date(),
  detailedDescription: domainData.description,
  category: 'technology',
  careerPaths: [],
  marketData: {
    averageSalary: domainData.averageSalary,
    jobGrowth: domainData.jobGrowth,
    marketDemand: domainData.marketDemand
  }
} as unknown as ICareerDomainDocument));

describe('Learning Path Prerequisites Property Tests', () => {
  beforeAll(async () => {
    await connectDatabase();
    // Seed domains if not already present
    await CareerDomainService.seedDomains();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  /**
   * Property 8: Learning Path Prerequisites
   * For any generated learning path, the prerequisite relationships between modules 
   * should form a valid directed acyclic graph ensuring logical progression.
   */
  
  describe('Prerequisite Dependency Graph Validation', () => {
    it('should form a valid directed acyclic graph with no circular dependencies', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          careerDomainArb,
          async (user, domain) => {
            // Mock the database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            const request: ICreateLearningPath = {
              userId: user._id as unknown as string,
              domainId: domain._id as unknown as string
            };

            const learningPath = await LearningPathGenerationService.generateLearningPath(request);

            // Property: Prerequisites should form a valid directed acyclic graph (DAG)
            expect(learningPath).toBeDefined();
            expect(learningPath.modules).toBeDefined();
            expect(Array.isArray(learningPath.modules)).toBe(true);
            expect(learningPath.modules!.length).toBeGreaterThan(0);

            const modules = learningPath.modules!;
            const moduleIds = new Set(modules.map(m => m.id));
            
            // 1. All prerequisites must exist in the learning path
            modules.forEach(module => {
              expect(Array.isArray(module.prerequisites)).toBe(true);
              module.prerequisites.forEach(prereqId => {
                expect(moduleIds.has(prereqId)).toBe(true);
              });
            });

            // 2. Prerequisites must have lower order numbers (logical progression)
            modules.forEach(module => {
              module.prerequisites.forEach(prereqId => {
                const prereqModule = modules.find(m => m.id === prereqId);
                expect(prereqModule).toBeDefined();
                if (prereqModule) {
                  expect(prereqModule.order).toBeLessThan(module.order);
                }
              });
            });

            // 3. No circular dependencies (DAG property)
            const visited = new Set<string>();
            const recursionStack = new Set<string>();

            const hasCycle = (moduleId: string): boolean => {
              if (recursionStack.has(moduleId)) return true;
              if (visited.has(moduleId)) return false;

              visited.add(moduleId);
              recursionStack.add(moduleId);

              const module = modules.find(m => m.id === moduleId);
              if (module) {
                for (const prereqId of module.prerequisites) {
                  if (hasCycle(prereqId)) return true;
                }
              }

              recursionStack.delete(moduleId);
              return false;
            };

            // Check for cycles in all modules
            for (const module of modules) {
              expect(hasCycle(module.id)).toBe(false);
            }

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should ensure logical progression with foundation modules having no prerequisites', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          careerDomainArb,
          async (user, domain) => {
            // Mock the database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            const request: ICreateLearningPath = {
              userId: user._id as unknown as string,
              domainId: domain._id as unknown as string
            };

            const learningPath = await LearningPathGenerationService.generateLearningPath(request);

            expect(learningPath.modules).toBeDefined();
            const modules = learningPath.modules!;

            // Property: Foundation modules should have no prerequisites
            const foundationModules = modules.filter(m => 
              m.id.includes('foundation') || m.order === 1
            );

            foundationModules.forEach(module => {
              expect(module.prerequisites.length).toBe(0);
            });

            // Property: Advanced modules should have prerequisites
            const advancedModules = modules.filter(m => 
              m.id.includes('advanced') || m.id.includes('capstone')
            );

            advancedModules.forEach(module => {
              expect(module.prerequisites.length).toBeGreaterThan(0);
            });

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain prerequisite consistency across different skill levels', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          careerDomainArb,
          skillLevelArb,
          async (user, domain, skillLevel) => {
            // Mock the database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            const request: ICreateLearningPath = {
              userId: user._id as unknown as string,
              domainId: domain._id as unknown as string,
              personalization: {
                skillLevel,
                learningPace: LearningPace.MODERATE,
                preferredLearningStyle: LearningStyle.MIXED,
                availableHoursPerWeek: 15
              }
            };

            const learningPath = await LearningPathGenerationService.generateLearningPath(request);

            expect(learningPath.modules).toBeDefined();
            const modules = learningPath.modules!;

            // Property: Prerequisite relationships should remain valid regardless of skill level
            const moduleIds = new Set(modules.map(m => m.id));
            
            modules.forEach(module => {
              module.prerequisites.forEach(prereqId => {
                // All prerequisites must exist
                expect(moduleIds.has(prereqId)).toBe(true);
                
                // Prerequisites must come before current module
                const prereqModule = modules.find(m => m.id === prereqId);
                if (prereqModule) {
                  expect(prereqModule.order).toBeLessThan(module.order);
                }
              });
            });

            // Property: Even if foundation modules are optional for advanced users,
            // the prerequisite chain should still be valid
            const nonOptionalModules = modules.filter(m => !m.isOptional);
            if (nonOptionalModules.length > 1) {
              // There should be a valid path through non-optional modules
              nonOptionalModules.forEach(module => {
                module.prerequisites.forEach(prereqId => {
                  // If prerequisite is required, it should be in non-optional modules
                  // OR it should be an optional module that provides foundation
                  const prereqModule = modules.find(m => m.id === prereqId);
                  expect(prereqModule).toBeDefined();
                });
              });
            }

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should ensure capstone modules depend on core learning modules', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          careerDomainArb,
          async (user, domain) => {
            // Mock the database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            const request: ICreateLearningPath = {
              userId: user._id as unknown as string,
              domainId: domain._id as unknown as string
            };

            const learningPath = await LearningPathGenerationService.generateLearningPath(request);

            expect(learningPath.modules).toBeDefined();
            const modules = learningPath.modules!;

            // Property: Capstone modules should depend on core learning modules
            const capstoneModules = modules.filter(m => 
              m.id.includes('capstone') || m.title.toLowerCase().includes('capstone')
            );

            const coreModules = modules.filter(m => 
              (m.id.includes('technical') || m.id.includes('tools')) && !m.isOptional
            );

            capstoneModules.forEach(capstoneModule => {
              // Capstone should have prerequisites
              expect(capstoneModule.prerequisites.length).toBeGreaterThan(0);
              
              // At least one prerequisite should be a core module
              const hasCorePrerequisite = capstoneModule.prerequisites.some(prereqId =>
                coreModules.some(coreModule => coreModule.id === prereqId)
              );
              
              if (coreModules.length > 0) {
                expect(hasCorePrerequisite).toBe(true);
              }
            });

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should validate prerequisite transitivity and reachability', async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          careerDomainArb,
          async (user, domain) => {
            // Mock the database calls
            jest.spyOn(User, 'findById').mockResolvedValue(user as any);
            jest.spyOn(CareerDomain, 'findById').mockResolvedValue(domain as any);

            const request: ICreateLearningPath = {
              userId: user._id as unknown as string,
              domainId: domain._id as unknown as string
            };

            const learningPath = await LearningPathGenerationService.generateLearningPath(request);

            expect(learningPath.modules).toBeDefined();
            const modules = learningPath.modules!;

            // Property: All modules should be reachable from foundation modules
            const moduleMap = new Map<string, ILearningModule>();
            modules.forEach(module => {
              moduleMap.set(module.id, module);
            });

            // Find modules with no prerequisites (starting points)
            const startingModules = modules.filter(m => m.prerequisites.length === 0);
            expect(startingModules.length).toBeGreaterThan(0);

            // Build reachability graph using BFS
            const reachable = new Set<string>();
            const queue: string[] = [];

            // Start from modules with no prerequisites
            startingModules.forEach(module => {
              reachable.add(module.id);
              queue.push(module.id);
            });

            while (queue.length > 0) {
              const currentId = queue.shift()!;
              
              // Find modules that have current module as prerequisite
              modules.forEach(module => {
                if (module.prerequisites.includes(currentId) && !reachable.has(module.id)) {
                  // Check if all prerequisites are reachable
                  const allPrereqsReachable = module.prerequisites.every(prereqId => 
                    reachable.has(prereqId)
                  );
                  
                  if (allPrereqsReachable) {
                    reachable.add(module.id);
                    queue.push(module.id);
                  }
                }
              });
            }

            // Property: All non-optional modules should be reachable
            const nonOptionalModules = modules.filter(m => !m.isOptional);
            nonOptionalModules.forEach(module => {
              expect(reachable.has(module.id)).toBe(true);
            });

            // Property: Prerequisite chains should not be unnecessarily long
            modules.forEach(module => {
              // Calculate maximum depth from any starting module
              const calculateDepth = (moduleId: string, visited: Set<string> = new Set()): number => {
                if (visited.has(moduleId)) return 0; // Avoid infinite loops
                visited.add(moduleId);
                
                const mod = moduleMap.get(moduleId);
                if (!mod || mod.prerequisites.length === 0) return 0;
                
                const maxPrereqDepth = Math.max(
                  ...mod.prerequisites.map(prereqId => calculateDepth(prereqId, new Set(visited)))
                );
                return maxPrereqDepth + 1;
              };

              const depth = calculateDepth(module.id);
              expect(depth).toBeLessThanOrEqual(5); // Reasonable maximum depth
            });

            // Clean up mocks
            jest.restoreAllMocks();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});