import { CareerDomain } from '@/models/CareerDomain';
import { User } from '@/models/User';
import {
  ILearningPath,
  ILearningModule,
  IWeeklyTarget,
  ITask,
  IResource,
  IPersonalizationSettings,
  DifficultyLevel,
  TaskType,
  TaskPriority,
  ResourceType,
  ResourceFormat,
  LearningPace,
  LearningStyle,
  SkillLevel,
  ReminderFrequency,
  NotificationChannel,
  ICreateLearningPath,
  IPathCustomization
} from '@/types/learning';
import {
  ICareerDomainDocument,
  ISkill,
  SkillCategory
} from '@/types/recommendation';
import { IUser } from '@/types/user';
import { logger } from '@/utils/logger';
import { generateDefaultPersonalization } from '@/utils/learningPathValidation';

/**
 * Service for generating personalized learning paths based on career domains and user preferences
 */
export class LearningPathGenerationService {
  /**
   * Generate a personalized learning path for a user and domain
   */
  static async generateLearningPath(request: ICreateLearningPath): Promise<ILearningPath> {
    try {
      logger.info('Starting learning path generation', {
        userId: request.userId,
        domainId: request.domainId
      });

      // Fetch user and domain data
      const [user, domain] = await Promise.all([
        User.findById(request.userId),
        CareerDomain.findById(request.domainId)
      ]);

      if (!user) {
        throw new Error(`User not found: ${request.userId}`);
      }

      if (!domain) {
        throw new Error(`Career domain not found: ${request.domainId}`);
      }

      // Generate personalization settings
      const personalization = this.generatePersonalizationSettings(user, request.personalization);

      // Generate learning modules based on domain skills and user level
      const modules = await this.generateLearningModules(domain, personalization, request.customizations);

      // Calculate total duration and adjust based on user pace
      const estimatedDuration = this.calculatePathDuration(modules, personalization);

      // Create the learning path
      const learningPath: ILearningPath = {
        id: '', // Will be set when saved to database
        userId: request.userId,
        domainId: request.domainId,
        title: `${domain.title} Learning Path`,
        description: `Personalized learning journey for ${domain.title} tailored to your skill level and preferences.`,
        estimatedDuration,
        difficulty: this.determineDifficultyLevel(domain, user),
        modules,
        progress: {
          completedModules: [],
          currentModule: modules[0]?.id || '',
          overallProgress: 0,
          weeklyTargetsMet: 0,
          totalWeeklyTargets: modules.reduce((total, m) => total + m.weeklyTargets.length, 0),
          totalHoursSpent: 0,
          averageWeeklyHours: 0,
          streakWeeks: 0,
          lastActivityDate: new Date(),
          milestones: [],
          skillsAcquired: [],
          certificationsEarned: []
        },
        personalization,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info('Learning path generated successfully', {
        userId: request.userId,
        domainId: request.domainId,
        moduleCount: modules.length,
        estimatedDuration,
        difficulty: learningPath.difficulty
      });

      return learningPath;
    } catch (error) {
      logger.error('Error generating learning path', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        domainId: request.domainId
      });
      throw error;
    }
  }

  /**
   * Generate personalization settings based on user profile and preferences
   */
  private static generatePersonalizationSettings(
    user: IUser,
    customPersonalization?: Partial<IPersonalizationSettings>
  ): IPersonalizationSettings {
    const defaultSettings = generateDefaultPersonalization();

    // Map user preferences to learning settings
    const userBasedSettings: Partial<IPersonalizationSettings> = {
      learningPace: this.mapUserPaceToLearningPace(user.preferences.learningPace),
      preferredLearningStyle: this.mapUserStyleToLearningStyle(user.preferences.preferredLearningStyle),
      availableHoursPerWeek: this.estimateAvailableHours(user),
      skillLevel: this.determineUserSkillLevel(user),
      focusAreas: user.preferences.careerGoals || [],
      preferredSchedule: {
        ...defaultSettings.preferredSchedule,
        timezone: user.preferences.timeZone || 'UTC',
        reminderSettings: {
          enabled: user.preferences.notificationFrequency !== 'none',
          frequency: this.mapNotificationFrequency(user.preferences.notificationFrequency),
          preferredTime: '18:00', // Default evening time
          channels: this.getNotificationChannels(user)
        }
      }
    };

    // Merge default, user-based, and custom settings
    return {
      ...defaultSettings,
      ...userBasedSettings,
      ...customPersonalization
    };
  }

  /**
   * Generate learning modules based on domain skills and user requirements
   */
  private static async generateLearningModules(
    domain: ICareerDomainDocument,
    personalization: IPersonalizationSettings,
    _customizations?: IPathCustomization
  ): Promise<ILearningModule[]> {
    const modules: ILearningModule[] = [];

    // Group skills by category and importance
    const skillGroups = this.groupSkillsByCategory(domain.requiredSkills, domain.optionalSkills);

    // Generate foundational module
    const foundationalModule = this.generateFoundationalModule(domain, skillGroups, personalization);
    modules.push(foundationalModule);

    // Generate core skill modules
    const coreModules = this.generateCoreSkillModules(skillGroups, personalization, _customizations);
    modules.push(...coreModules);

    // Generate advanced/specialization modules
    const advancedModules = this.generateAdvancedModules(skillGroups, personalization, _customizations);
    modules.push(...advancedModules);

    // Generate capstone/project module
    const capstoneModule = this.generateCapstoneModule(domain, personalization);
    modules.push(capstoneModule);

    // Set up prerequisite dependencies
    this.setupPrerequisiteDependencies(modules);

    // Adjust module difficulty and duration based on user level
    this.adjustModulesForUserLevel(modules, personalization.skillLevel);

    return modules;
  }

  /**
   * Group skills by category and importance for structured learning
   */
  private static groupSkillsByCategory(requiredSkills: ISkill[], optionalSkills: ISkill[]): Record<SkillCategory, ISkill[]> {
    const allSkills = [...requiredSkills, ...optionalSkills];
    
    const groups: Record<SkillCategory, ISkill[]> = {
      [SkillCategory.TECHNICAL]: allSkills.filter(s => s.category === SkillCategory.TECHNICAL),
      [SkillCategory.SOFT_SKILLS]: allSkills.filter(s => s.category === SkillCategory.SOFT_SKILLS),
      [SkillCategory.TOOLS]: allSkills.filter(s => s.category === SkillCategory.TOOLS),
      [SkillCategory.DOMAIN_SPECIFIC]: allSkills.filter(s => s.category === SkillCategory.DOMAIN_SPECIFIC),
      [SkillCategory.CERTIFICATIONS]: allSkills.filter(s => s.category === SkillCategory.CERTIFICATIONS),
      [SkillCategory.LANGUAGES]: allSkills.filter(s => s.category === SkillCategory.LANGUAGES)
    };

    // Sort each group by importance (descending)
    Object.keys(groups).forEach(category => {
      groups[category as SkillCategory].sort((a: ISkill, b: ISkill) => b.importance - a.importance);
    });

    return groups;
  }

  /**
   * Generate foundational module covering basic concepts
   */
  private static generateFoundationalModule(
    domain: ICareerDomainDocument,
    skillGroups: Record<SkillCategory, ISkill[]>,
    personalization: IPersonalizationSettings
  ): ILearningModule {
    const foundationalSkills = [
      ...skillGroups[SkillCategory.DOMAIN_SPECIFIC].slice(0, 3),
      ...skillGroups[SkillCategory.TECHNICAL].slice(0, 2)
    ];

    const weeklyTargets = this.generateWeeklyTargets('foundation-module', 2, foundationalSkills, personalization);
    const resources = this.generateModuleResources('foundation', foundationalSkills, DifficultyLevel.BEGINNER);

    return {
      id: 'foundation-module',
      title: `${domain.title} Fundamentals`,
      description: `Introduction to core concepts and foundational knowledge in ${domain.title}.`,
      order: 1,
      prerequisites: [],
      estimatedHours: weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0),
      difficulty: DifficultyLevel.BEGINNER,
      weeklyTargets,
      resources,
      skills: foundationalSkills.map(s => s.name),
      assessments: [],
      isOptional: false,
      completionCriteria: {
        requiredTasks: Math.ceil(weeklyTargets.reduce((total, target) => total + target.tasks.length, 0) * 0.8),
        requiredHours: Math.ceil(weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0) * 0.8),
        requiredAssessments: [],
        requiredSkillLevel: 6,
        customCriteria: ['Complete foundational project', 'Demonstrate basic understanding']
      }
    };
  }

  /**
   * Generate core skill modules
   */
  private static generateCoreSkillModules(
    skillGroups: Record<SkillCategory, ISkill[]>,
    personalization: IPersonalizationSettings,
    _customizations?: IPathCustomization
  ): ILearningModule[] {
    const modules: ILearningModule[] = [];
    let moduleOrder = 2;

    // Technical skills module
    if (skillGroups[SkillCategory.TECHNICAL].length > 2) {
      const technicalSkills = skillGroups[SkillCategory.TECHNICAL].slice(2, 8); // Skip first 2 used in foundation
      const weeklyTargets = this.generateWeeklyTargets(`technical-module`, 4, technicalSkills, personalization);
      
      modules.push({
        id: 'technical-module',
        title: 'Technical Skills Development',
        description: 'Master the essential technical skills required for success in this domain.',
        order: moduleOrder++,
        prerequisites: ['foundation-module'],
        estimatedHours: weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0),
        difficulty: DifficultyLevel.INTERMEDIATE,
        weeklyTargets,
        resources: this.generateModuleResources('technical', technicalSkills, DifficultyLevel.INTERMEDIATE),
        skills: technicalSkills.map(s => s.name),
        assessments: [],
        isOptional: false,
        completionCriteria: {
          requiredTasks: Math.ceil(weeklyTargets.reduce((total, target) => total + target.tasks.length, 0) * 0.85),
          requiredHours: Math.ceil(weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0) * 0.85),
          requiredAssessments: [],
          requiredSkillLevel: 7,
          customCriteria: ['Complete technical project', 'Pass skill assessment']
        }
      });
    }

    // Tools and technologies module
    if (skillGroups[SkillCategory.TOOLS].length > 0) {
      const toolSkills = skillGroups[SkillCategory.TOOLS].slice(0, 6);
      const weeklyTargets = this.generateWeeklyTargets(`tools-module`, 3, toolSkills, personalization);
      
      modules.push({
        id: 'tools-module',
        title: 'Tools and Technologies',
        description: 'Learn to use industry-standard tools and technologies effectively.',
        order: moduleOrder++,
        prerequisites: ['foundation-module'],
        estimatedHours: weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0),
        difficulty: DifficultyLevel.INTERMEDIATE,
        weeklyTargets,
        resources: this.generateModuleResources('tools', toolSkills, DifficultyLevel.INTERMEDIATE),
        skills: toolSkills.map(s => s.name),
        assessments: [],
        isOptional: false,
        completionCriteria: {
          requiredTasks: Math.ceil(weeklyTargets.reduce((total, target) => total + target.tasks.length, 0) * 0.8),
          requiredHours: Math.ceil(weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0) * 0.8),
          requiredAssessments: [],
          requiredSkillLevel: 7,
          customCriteria: ['Demonstrate tool proficiency', 'Complete hands-on exercises']
        }
      });
    }

    // Soft skills module (optional but recommended)
    if (skillGroups[SkillCategory.SOFT_SKILLS].length > 0) {
      const softSkills = skillGroups[SkillCategory.SOFT_SKILLS].slice(0, 4);
      const weeklyTargets = this.generateWeeklyTargets(`soft-skills-module`, 2, softSkills, personalization);
      
      modules.push({
        id: 'soft-skills-module',
        title: 'Professional Skills Development',
        description: 'Develop essential soft skills for professional success.',
        order: moduleOrder++,
        prerequisites: ['foundation-module'],
        estimatedHours: weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0),
        difficulty: DifficultyLevel.BEGINNER,
        weeklyTargets,
        resources: this.generateModuleResources('soft-skills', softSkills, DifficultyLevel.BEGINNER),
        skills: softSkills.map(s => s.name),
        assessments: [],
        isOptional: true,
        completionCriteria: {
          requiredTasks: Math.ceil(weeklyTargets.reduce((total, target) => total + target.tasks.length, 0) * 0.7),
          requiredHours: Math.ceil(weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0) * 0.7),
          requiredAssessments: [],
          requiredSkillLevel: 6,
          customCriteria: ['Complete self-reflection exercises', 'Participate in peer discussions']
        }
      });
    }

    return modules;
  }

  /**
   * Generate advanced/specialization modules
   */
  private static generateAdvancedModules(
    skillGroups: Record<SkillCategory, ISkill[]>,
    personalization: IPersonalizationSettings,
    _customizations?: IPathCustomization
  ): ILearningModule[] {
    const modules: ILearningModule[] = [];
    let moduleOrder = 5; // Assuming 4 modules before this

    // Advanced technical skills
    const advancedTechnicalSkills = skillGroups[SkillCategory.TECHNICAL].slice(8); // Remaining technical skills
    if (advancedTechnicalSkills.length > 0) {
      const weeklyTargets = this.generateWeeklyTargets(`advanced-technical-module`, 3, advancedTechnicalSkills, personalization);
      
      modules.push({
        id: 'advanced-technical-module',
        title: 'Advanced Technical Mastery',
        description: 'Master advanced technical concepts and specialized skills.',
        order: moduleOrder++,
        prerequisites: ['technical-module', 'tools-module'],
        estimatedHours: weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0),
        difficulty: DifficultyLevel.ADVANCED,
        weeklyTargets,
        resources: this.generateModuleResources('advanced-technical', advancedTechnicalSkills, DifficultyLevel.ADVANCED),
        skills: advancedTechnicalSkills.map(s => s.name),
        assessments: [],
        isOptional: personalization.skillLevel === SkillLevel.BEGINNER,
        completionCriteria: {
          requiredTasks: Math.ceil(weeklyTargets.reduce((total, target) => total + target.tasks.length, 0) * 0.9),
          requiredHours: Math.ceil(weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0) * 0.9),
          requiredAssessments: [],
          requiredSkillLevel: 8,
          customCriteria: ['Complete advanced project', 'Demonstrate expertise']
        }
      });
    }

    // Specialization based on focus areas
    if (personalization.focusAreas.length > 0) {
      const specializationSkills = skillGroups[SkillCategory.DOMAIN_SPECIFIC].slice(3); // Remaining domain skills
      const weeklyTargets = this.generateWeeklyTargets(`specialization-module`, 2, specializationSkills, personalization);
      
      modules.push({
        id: 'specialization-module',
        title: 'Specialization Track',
        description: `Specialized knowledge in ${personalization.focusAreas.join(', ')}.`,
        order: moduleOrder++,
        prerequisites: ['technical-module'],
        estimatedHours: weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0),
        difficulty: DifficultyLevel.ADVANCED,
        weeklyTargets,
        resources: this.generateModuleResources('specialization', specializationSkills, DifficultyLevel.ADVANCED),
        skills: specializationSkills.map(s => s.name),
        assessments: [],
        isOptional: true,
        completionCriteria: {
          requiredTasks: Math.ceil(weeklyTargets.reduce((total, target) => total + target.tasks.length, 0) * 0.8),
          requiredHours: Math.ceil(weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0) * 0.8),
          requiredAssessments: [],
          requiredSkillLevel: 8,
          customCriteria: ['Complete specialization project', 'Demonstrate specialized knowledge']
        }
      });
    }

    return modules;
  }

  /**
   * Generate capstone/project module
   */
  private static generateCapstoneModule(
    _domain: ICareerDomainDocument,
    personalization: IPersonalizationSettings
  ): ILearningModule {
    const capstoneSkills = ['Project Management', 'Integration', 'Problem Solving', 'Portfolio Development'];
    const weeklyTargets = this.generateWeeklyTargets('capstone-module', 3, [], personalization, true);

    return {
      id: 'capstone-module',
      title: 'Capstone Project',
      description: 'Apply all learned skills in a comprehensive real-world project.',
      order: 10, // Last module
      prerequisites: ['technical-module', 'tools-module'],
      estimatedHours: weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0),
      difficulty: DifficultyLevel.ADVANCED,
      weeklyTargets,
      resources: this.generateModuleResources('capstone', [], DifficultyLevel.ADVANCED),
      skills: capstoneSkills,
      assessments: [],
      isOptional: false,
      completionCriteria: {
        requiredTasks: weeklyTargets.reduce((total, target) => total + target.tasks.length, 0),
        requiredHours: weeklyTargets.reduce((total, target) => total + target.estimatedHours, 0),
        requiredAssessments: [],
        requiredSkillLevel: 8,
        customCriteria: [
          'Complete comprehensive project',
          'Present project to peers',
          'Create portfolio entry',
          'Demonstrate job readiness'
        ]
      }
    };
  }

  /**
   * Generate weekly targets for a module
   */
  private static generateWeeklyTargets(
    moduleId: string,
    weekCount: number,
    skills: ISkill[],
    personalization: IPersonalizationSettings,
    isCapstone: boolean = false
  ): IWeeklyTarget[] {
    const targets: IWeeklyTarget[] = [];
    const hoursPerWeek = Math.min(personalization.availableHoursPerWeek, 15); // Cap at 15 hours per week

    for (let week = 1; week <= weekCount; week++) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (week * 7));

      const weekSkills = skills.slice(
        Math.floor((skills.length * (week - 1)) / weekCount),
        Math.floor((skills.length * week) / weekCount)
      );

      targets.push({
        id: `${moduleId}-week-${week}`,
        moduleId,
        week,
        title: isCapstone ? `Project Phase ${week}` : `Week ${week}: ${weekSkills.map(s => s.name).join(', ') || 'Core Concepts'}`,
        description: isCapstone 
          ? `Complete phase ${week} of your capstone project.`
          : `Master ${weekSkills.map(s => s.name).join(', ') || 'fundamental concepts'} through theory and practice.`,
        tasks: this.generateWeeklyTasks(week, weekSkills, isCapstone),
        estimatedHours: hoursPerWeek,
        dueDate,
        priority: week === 1 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
        skills: weekSkills.map(s => s.name),
        resources: weekSkills.map(s => `resource-${s.name.toLowerCase().replace(/\s+/g, '-')}`),
        completed: false
      });
    }

    return targets;
  }

  /**
   * Generate tasks for a weekly target
   */
  private static generateWeeklyTasks(week: number, skills: ISkill[], isCapstone: boolean = false): ITask[] {
    if (isCapstone) {
      return this.generateCapstoneWeekTasks(week);
    }

    const tasks: ITask[] = [];

    // Reading/theory task
    tasks.push({
      id: `task-${week}-reading`,
      title: `Study ${skills.length > 0 ? skills.map(s => s.name).join(' & ') : 'Core Concepts'}`,
      description: `Read and understand the theoretical foundations of ${skills.length > 0 ? skills.map(s => s.name).join(' and ') : 'this week\'s topics'}.`,
      type: TaskType.READING,
      estimatedMinutes: 120,
      isRequired: true,
      completed: false,
      resources: skills.map(s => `reading-${s.name.toLowerCase().replace(/\s+/g, '-')}`)
    });

    // Video/tutorial task
    tasks.push({
      id: `task-${week}-video`,
      title: 'Watch Tutorial Videos',
      description: 'Complete video tutorials and demonstrations for this week\'s topics.',
      type: TaskType.VIDEO,
      estimatedMinutes: 180,
      isRequired: true,
      completed: false,
      resources: skills.map(s => `video-${s.name.toLowerCase().replace(/\s+/g, '-')}`)
    });

    // Practical exercise
    tasks.push({
      id: `task-${week}-exercise`,
      title: 'Complete Practical Exercises',
      description: 'Work through hands-on exercises to reinforce learning.',
      type: TaskType.EXERCISE,
      estimatedMinutes: 240,
      isRequired: true,
      completed: false,
      resources: skills.map(s => `exercise-${s.name.toLowerCase().replace(/\s+/g, '-')}`)
    });

    // Optional project task
    tasks.push({
      id: `task-${week}-project`,
      title: 'Mini Project',
      description: 'Apply concepts in a small project or assignment.',
      type: TaskType.PROJECT,
      estimatedMinutes: 180,
      isRequired: false,
      completed: false,
      resources: skills.map(s => `project-${s.name.toLowerCase().replace(/\s+/g, '-')}`)
    });

    // Quiz/assessment task
    if (skills.length > 0) {
      tasks.push({
        id: `task-${week}-quiz`,
        title: 'Knowledge Check Quiz',
        description: 'Test your understanding with a short quiz.',
        type: TaskType.QUIZ,
        estimatedMinutes: 30,
        isRequired: true,
        completed: false,
        resources: [`quiz-week-${week}`]
      });
    }

    return tasks;
  }

  /**
   * Generate capstone project tasks
   */
  private static generateCapstoneWeekTasks(week: number): ITask[] {
    const phases = [
      {
        title: 'Project Planning & Design',
        description: 'Define project scope, create wireframes, and plan architecture.',
        tasks: [
          { title: 'Define Project Requirements', type: TaskType.RESEARCH, minutes: 120 },
          { title: 'Create Project Plan', type: TaskType.PROJECT, minutes: 180 },
          { title: 'Design System Architecture', type: TaskType.PROJECT, minutes: 240 }
        ]
      },
      {
        title: 'Core Implementation',
        description: 'Build the main functionality of your project.',
        tasks: [
          { title: 'Set Up Development Environment', type: TaskType.PROJECT, minutes: 60 },
          { title: 'Implement Core Features', type: TaskType.PROJECT, minutes: 360 },
          { title: 'Write Unit Tests', type: TaskType.PROJECT, minutes: 120 }
        ]
      },
      {
        title: 'Integration & Deployment',
        description: 'Complete the project and prepare for presentation.',
        tasks: [
          { title: 'Integrate All Components', type: TaskType.PROJECT, minutes: 180 },
          { title: 'Deploy Project', type: TaskType.PROJECT, minutes: 120 },
          { title: 'Create Presentation', type: TaskType.PROJECT, minutes: 180 },
          { title: 'Document Project', type: TaskType.PROJECT, minutes: 120 }
        ]
      }
    ];

    const phase = phases[Math.min(week - 1, phases.length - 1)];
    
    if (!phase) {
      // Fallback to the last phase if somehow we don't have a valid phase
      const fallbackPhase = phases[phases.length - 1];
      if (!fallbackPhase) {
        // Ultimate fallback - create a simple task
        return [{
          id: `capstone-week-${week}-task-1`,
          title: 'Complete Project Work',
          description: 'Work on your capstone project.',
          type: TaskType.PROJECT,
          estimatedMinutes: 240,
          isRequired: true,
          completed: false,
          resources: [`capstone-week-${week}`]
        }];
      }
      return fallbackPhase.tasks.map((task, index) => ({
        id: `capstone-week-${week}-task-${index + 1}`,
        title: task.title,
        description: fallbackPhase.description,
        type: task.type,
        estimatedMinutes: task.minutes,
        isRequired: true,
        completed: false,
        resources: [`capstone-${task.title.toLowerCase().replace(/\s+/g, '-')}`]
      }));
    }
    
    return phase.tasks.map((task, index) => ({
      id: `capstone-week-${week}-task-${index + 1}`,
      title: task.title,
      description: phase.description,
      type: task.type,
      estimatedMinutes: task.minutes,
      isRequired: true,
      completed: false,
      resources: [`capstone-${task.title.toLowerCase().replace(/\s+/g, '-')}`]
    }));
  }

  /**
   * Generate resources for a module
   */
  private static generateModuleResources(
    moduleType: string,
    skills: ISkill[],
    difficulty: DifficultyLevel
  ): IResource[] {
    const resources: IResource[] = [];

    // Add general resources for the module type
    resources.push({
      id: `${moduleType}-overview`,
      title: `${moduleType.charAt(0).toUpperCase() + moduleType.slice(1)} Overview`,
      type: ResourceType.ARTICLE,
      provider: 'Learning Platform',
      url: `https://learning.platform.com/${moduleType}/overview`,
      description: `Comprehensive overview of ${moduleType} concepts and best practices.`,
      duration: 60,
      difficulty,
      cost: 0,
      rating: 4.5,
      tags: [moduleType, 'overview', 'guide'],
      isRequired: true,
      format: ResourceFormat.TEXT,
      language: 'en',
      lastUpdated: new Date()
    });

    // Add skill-specific resources
    skills.forEach(skill => {
      const skillId = skill.name.toLowerCase().replace(/\s+/g, '-');
      
      resources.push({
        id: `${skillId}-tutorial`,
        title: `${skill.name} Tutorial`,
        type: ResourceType.TUTORIAL,
        provider: 'SkillShare',
        url: `https://skillshare.com/tutorial/${skillId}`,
        description: skill.description,
        duration: 120,
        difficulty,
        cost: 0,
        rating: 4.3,
        tags: [skill.name.toLowerCase(), 'tutorial', 'hands-on'],
        isRequired: true,
        format: ResourceFormat.VIDEO,
        language: 'en',
        lastUpdated: new Date()
      });

      resources.push({
        id: `${skillId}-exercise`,
        title: `${skill.name} Practice Exercises`,
        type: ResourceType.EXERCISE,
        provider: 'CodePractice',
        url: `https://codepractice.com/exercises/${skillId}`,
        description: `Interactive exercises to practice ${skill.name} skills.`,
        duration: 180,
        difficulty,
        cost: 0,
        rating: 4.6,
        tags: [skill.name.toLowerCase(), 'practice', 'interactive'],
        isRequired: false,
        format: ResourceFormat.INTERACTIVE,
        language: 'en',
        lastUpdated: new Date()
      });
    });

    return resources;
  }

  /**
   * Set up prerequisite dependencies between modules
   */
  private static setupPrerequisiteDependencies(modules: ILearningModule[]): void {
    // Sort modules by order to ensure proper dependency setup
    modules.sort((a, b) => a.order - b.order);

    for (let i = 1; i < modules.length; i++) {
      const currentModule = modules[i];
      
      if (!currentModule) {
        continue;
      }
      
      // Set prerequisites based on module type and order
      if (currentModule.id === 'technical-module') {
        currentModule.prerequisites = ['foundation-module'];
      } else if (currentModule.id === 'tools-module') {
        currentModule.prerequisites = ['foundation-module'];
      } else if (currentModule.id === 'soft-skills-module') {
        currentModule.prerequisites = ['foundation-module'];
      } else if (currentModule.id === 'advanced-technical-module') {
        currentModule.prerequisites = ['technical-module', 'tools-module'];
      } else if (currentModule.id === 'specialization-module') {
        currentModule.prerequisites = ['technical-module'];
      } else if (currentModule.id === 'capstone-module') {
        // Capstone requires core modules but not optional ones
        currentModule.prerequisites = modules
          .filter(m => !m.isOptional && m.order < currentModule.order)
          .map(m => m.id);
      } else {
        // Default: require previous non-optional module
        const previousModule = modules[i - 1];
        if (previousModule && !previousModule.isOptional) {
          currentModule.prerequisites = [previousModule.id];
        }
      }
    }
  }

  /**
   * Adjust modules based on user skill level
   */
  private static adjustModulesForUserLevel(modules: ILearningModule[], skillLevel: SkillLevel): void {
    modules.forEach(module => {
      switch (skillLevel) {
        case SkillLevel.ABSOLUTE_BEGINNER:
          // Add more foundational content, extend duration
          module.estimatedHours = Math.ceil(module.estimatedHours * 1.3);
          if (module.difficulty === DifficultyLevel.INTERMEDIATE) {
            module.difficulty = DifficultyLevel.BEGINNER;
          }
          break;
          
        case SkillLevel.SOME_EXPERIENCE:
          // Slightly reduce foundational content
          if (module.id === 'foundation-module') {
            module.estimatedHours = Math.ceil(module.estimatedHours * 0.8);
          }
          break;
          
        case SkillLevel.INTERMEDIATE:
          // Reduce foundational content, add more advanced topics
          if (module.id === 'foundation-module') {
            module.estimatedHours = Math.ceil(module.estimatedHours * 0.6);
          }
          if (module.isOptional && module.id === 'advanced-technical-module') {
            module.isOptional = false;
          }
          break;
          
        case SkillLevel.ADVANCED:
          // Skip basic modules, focus on advanced content
          if (module.id === 'foundation-module') {
            module.estimatedHours = Math.ceil(module.estimatedHours * 0.4);
          }
          if (module.difficulty === DifficultyLevel.BEGINNER) {
            module.difficulty = DifficultyLevel.INTERMEDIATE;
          }
          break;
          
        case SkillLevel.EXPERT:
          // Minimal foundational content, focus on specialization
          if (module.id === 'foundation-module') {
            module.isOptional = true;
            module.estimatedHours = Math.ceil(module.estimatedHours * 0.3);
          }
          break;
      }
    });
  }

  /**
   * Calculate total path duration based on modules and user pace
   */
  private static calculatePathDuration(
    modules: ILearningModule[],
    personalization: IPersonalizationSettings
  ): number {
    const totalHours = modules.reduce((total, module) => total + module.estimatedHours, 0);
    const hoursPerWeek = personalization.availableHoursPerWeek;
    
    let baseDuration = Math.ceil(totalHours / hoursPerWeek);
    
    // Adjust for learning pace
    switch (personalization.learningPace) {
      case LearningPace.SLOW:
        baseDuration = Math.ceil(baseDuration * 1.4);
        break;
      case LearningPace.FAST:
        baseDuration = Math.ceil(baseDuration * 0.8);
        break;
      case LearningPace.INTENSIVE:
        baseDuration = Math.ceil(baseDuration * 0.6);
        break;
      default: // MODERATE
        baseDuration = Math.ceil(baseDuration * 1.1); // Add buffer time
    }
    
    // Ensure minimum and maximum duration bounds
    return Math.max(4, Math.min(52, baseDuration)); // 4 weeks to 1 year
  }

  /**
   * Determine difficulty level based on domain and user
   */
  private static determineDifficultyLevel(domain: ICareerDomainDocument, user: IUser): DifficultyLevel {
    const domainDifficulty = domain.difficulty;
    const userSkillLevel = this.determineUserSkillLevel(user);
    
    // Map user skill level to difficulty adjustment
    const skillLevelMap = {
      [SkillLevel.ABSOLUTE_BEGINNER]: -2,
      [SkillLevel.BEGINNER]: -1,
      [SkillLevel.SOME_EXPERIENCE]: 0,
      [SkillLevel.INTERMEDIATE]: 0,
      [SkillLevel.ADVANCED]: 1,
      [SkillLevel.EXPERT]: 1
    };
    
    const difficultyLevels = [
      DifficultyLevel.BEGINNER,
      DifficultyLevel.INTERMEDIATE,
      DifficultyLevel.ADVANCED,
      DifficultyLevel.EXPERT
    ];
    
    const domainIndex = difficultyLevels.indexOf(domainDifficulty);
    const adjustment = skillLevelMap[userSkillLevel];
    const adjustedIndex = Math.max(0, Math.min(difficultyLevels.length - 1, domainIndex + adjustment));
    
    return difficultyLevels[adjustedIndex] || DifficultyLevel.INTERMEDIATE;
  }

  /**
   * Helper methods for mapping user preferences
   */
  private static mapUserPaceToLearningPace(userPace: string): LearningPace {
    switch (userPace) {
      case 'slow': return LearningPace.SLOW;
      case 'fast': return LearningPace.FAST;
      default: return LearningPace.MODERATE;
    }
  }

  private static mapUserStyleToLearningStyle(userStyle: string): LearningStyle {
    switch (userStyle) {
      case 'visual': return LearningStyle.VISUAL;
      case 'auditory': return LearningStyle.AUDITORY;
      case 'kinesthetic': return LearningStyle.KINESTHETIC;
      case 'reading': return LearningStyle.READING;
      default: return LearningStyle.MIXED;
    }
  }

  private static determineUserSkillLevel(user: IUser): SkillLevel {
    // Determine skill level based on user profile and stats
    const { currentStatus, educationLevel } = user.profile;
    const { assessmentCompleted, skillsAcquired } = user.stats;
    
    if (!assessmentCompleted) {
      return SkillLevel.BEGINNER;
    }
    
    const skillCount = skillsAcquired.length;
    
    if (currentStatus === 'student' && educationLevel === 'high_school') {
      return SkillLevel.ABSOLUTE_BEGINNER;
    }
    
    if (currentStatus === 'graduate' && skillCount < 5) {
      return SkillLevel.BEGINNER;
    }
    
    if (currentStatus === 'employed' && skillCount >= 10) {
      return SkillLevel.INTERMEDIATE;
    }
    
    if (skillCount >= 20) {
      return SkillLevel.ADVANCED;
    }
    
    return SkillLevel.SOME_EXPERIENCE;
  }

  private static estimateAvailableHours(user: IUser): number {
    const { currentStatus } = user.profile;
    
    // Estimate based on current status
    switch (currentStatus) {
      case 'student': return 15; // Students have more time
      case 'unemployed': return 25; // Unemployed can dedicate more time
      case 'employed': return 8; // Working professionals have limited time
      case 'graduate': return 12; // Recent graduates have moderate time
      case 'career_changer': return 10; // Career changers are usually employed
      default: return 10;
    }
  }

  private static mapNotificationFrequency(frequency: string): ReminderFrequency {
    switch (frequency) {
      case 'daily': return ReminderFrequency.DAILY;
      case 'weekly': return ReminderFrequency.WEEKLY;
      case 'minimal': return ReminderFrequency.BI_WEEKLY;
      default: return ReminderFrequency.WEEKLY;
    }
  }

  private static getNotificationChannels(user: IUser): NotificationChannel[] {
    const channels: NotificationChannel[] = [NotificationChannel.EMAIL];
    
    if (user.preferences.pushNotifications?.dailyReminders) {
      channels.push(NotificationChannel.PUSH);
    }
    
    if (user.profile.phoneNumber) {
      channels.push(NotificationChannel.SMS);
    }
    
    return channels;
  }
}