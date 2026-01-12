import { Types } from 'mongoose';
import {
  ILearningPath,
  ILearningModule,
  IWeeklyTarget,
  ITask,
  IResource,
  DifficultyLevel,
  TaskType,
  TaskPriority,
  ResourceType,
  ResourceFormat
} from '../types/learning';
import { generateDefaultPersonalization } from './learningPathValidation';

/**
 * Factory for creating learning path test data and examples
 */
export class LearningPathFactory {
  /**
   * Creates a sample learning path for testing
   */
  static createSamplePath(userId: string, domainId: string): Partial<ILearningPath> {
    const modules = this.createSampleModules();
    
    return {
      userId,
      domainId,
      title: 'Full-Stack Web Development Fundamentals',
      description: 'A comprehensive learning path covering HTML, CSS, JavaScript, React, Node.js, and database fundamentals for aspiring web developers.',
      estimatedDuration: 16, // 16 weeks
      difficulty: DifficultyLevel.BEGINNER,
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
      personalization: generateDefaultPersonalization(),
      isActive: true
    };
  }

  /**
   * Creates sample learning modules
   */
  static createSampleModules(): ILearningModule[] {
    return [
      {
        id: 'module-1',
        title: 'HTML & CSS Fundamentals',
        description: 'Learn the building blocks of web development with HTML structure and CSS styling.',
        order: 1,
        prerequisites: [],
        estimatedHours: 40,
        difficulty: DifficultyLevel.BEGINNER,
        weeklyTargets: this.createWeeklyTargets('module-1', 4),
        resources: this.createSampleResources('html-css'),
        skills: ['HTML', 'CSS', 'Responsive Design', 'Flexbox', 'Grid'],
        assessments: [],
        isOptional: false,
        completionCriteria: {
          requiredTasks: 8,
          requiredHours: 35,
          requiredAssessments: [],
          requiredSkillLevel: 6,
          customCriteria: ['Build a responsive portfolio website']
        }
      },
      {
        id: 'module-2',
        title: 'JavaScript Fundamentals',
        description: 'Master JavaScript programming concepts, DOM manipulation, and modern ES6+ features.',
        order: 2,
        prerequisites: ['module-1'],
        estimatedHours: 50,
        difficulty: DifficultyLevel.BEGINNER,
        weeklyTargets: this.createWeeklyTargets('module-2', 5),
        resources: this.createSampleResources('javascript'),
        skills: ['JavaScript', 'DOM Manipulation', 'ES6+', 'Async Programming', 'APIs'],
        assessments: [],
        isOptional: false,
        completionCriteria: {
          requiredTasks: 10,
          requiredHours: 45,
          requiredAssessments: [],
          requiredSkillLevel: 7,
          customCriteria: ['Build an interactive web application']
        }
      },
      {
        id: 'module-3',
        title: 'React Development',
        description: 'Build modern user interfaces with React, including components, state management, and hooks.',
        order: 3,
        prerequisites: ['module-2'],
        estimatedHours: 45,
        difficulty: DifficultyLevel.INTERMEDIATE,
        weeklyTargets: this.createWeeklyTargets('module-3', 4),
        resources: this.createSampleResources('react'),
        skills: ['React', 'JSX', 'Components', 'State Management', 'Hooks', 'Context API'],
        assessments: [],
        isOptional: false,
        completionCriteria: {
          requiredTasks: 9,
          requiredHours: 40,
          requiredAssessments: [],
          requiredSkillLevel: 7,
          customCriteria: ['Build a React application with multiple components']
        }
      },
      {
        id: 'module-4',
        title: 'Backend Development with Node.js',
        description: 'Create server-side applications with Node.js, Express, and database integration.',
        order: 4,
        prerequisites: ['module-2'],
        estimatedHours: 40,
        difficulty: DifficultyLevel.INTERMEDIATE,
        weeklyTargets: this.createWeeklyTargets('module-4', 3),
        resources: this.createSampleResources('nodejs'),
        skills: ['Node.js', 'Express.js', 'REST APIs', 'Database Integration', 'Authentication'],
        assessments: [],
        isOptional: false,
        completionCriteria: {
          requiredTasks: 8,
          requiredHours: 35,
          requiredAssessments: [],
          requiredSkillLevel: 7,
          customCriteria: ['Build a REST API with authentication']
        }
      }
    ];
  }

  /**
   * Creates weekly targets for a module
   */
  static createWeeklyTargets(moduleId: string, weekCount: number): IWeeklyTarget[] {
    const targets: IWeeklyTarget[] = [];
    
    for (let week = 1; week <= weekCount; week++) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (week * 7));
      
      targets.push({
        id: `${moduleId}-week-${week}`,
        moduleId,
        week,
        title: `Week ${week} Learning Goals`,
        description: `Complete the learning objectives and practical exercises for week ${week}.`,
        tasks: this.createSampleTasks(week),
        estimatedHours: 10,
        dueDate,
        priority: TaskPriority.MEDIUM,
        skills: [`Week ${week} Skills`],
        resources: [`resource-${week}`],
        completed: false
      });
    }
    
    return targets;
  }

  /**
   * Creates sample tasks for a week
   */
  static createSampleTasks(week: number): ITask[] {
    return [
      {
        id: `task-${week}-1`,
        title: `Read Chapter ${week} Materials`,
        description: `Study the theoretical concepts covered in week ${week}.`,
        type: TaskType.READING,
        estimatedMinutes: 120,
        isRequired: true,
        completed: false,
        resources: [`reading-${week}`]
      },
      {
        id: `task-${week}-2`,
        title: `Watch Video Tutorials`,
        description: `Complete the video lessons for week ${week} topics.`,
        type: TaskType.VIDEO,
        estimatedMinutes: 180,
        isRequired: true,
        completed: false,
        resources: [`video-${week}`]
      },
      {
        id: `task-${week}-3`,
        title: `Complete Practical Exercises`,
        description: `Work through the hands-on coding exercises.`,
        type: TaskType.EXERCISE,
        estimatedMinutes: 240,
        isRequired: true,
        completed: false,
        resources: [`exercise-${week}`]
      },
      {
        id: `task-${week}-4`,
        title: `Build Mini Project`,
        description: `Apply the concepts by building a small project.`,
        type: TaskType.PROJECT,
        estimatedMinutes: 180,
        isRequired: false,
        completed: false,
        resources: [`project-${week}`]
      }
    ];
  }

  /**
   * Creates sample resources for different topics
   */
  static createSampleResources(topic: string): IResource[] {
    const baseResources = [
      {
        id: `${topic}-article-1`,
        title: `${topic.toUpperCase()} Fundamentals Guide`,
        type: ResourceType.ARTICLE,
        provider: 'MDN Web Docs',
        url: `https://developer.mozilla.org/docs/${topic}`,
        description: `Comprehensive guide to ${topic} fundamentals and best practices.`,
        duration: 60,
        difficulty: DifficultyLevel.BEGINNER,
        cost: 0,
        rating: 4.8,
        tags: [topic, 'fundamentals', 'guide'],
        isRequired: true,
        format: ResourceFormat.TEXT,
        language: 'en',
        lastUpdated: new Date()
      },
      {
        id: `${topic}-video-1`,
        title: `${topic.toUpperCase()} Complete Course`,
        type: ResourceType.VIDEO,
        provider: 'YouTube',
        url: `https://youtube.com/watch?v=${topic}`,
        description: `Complete video course covering ${topic} from basics to advanced concepts.`,
        duration: 300,
        difficulty: DifficultyLevel.BEGINNER,
        cost: 0,
        rating: 4.6,
        tags: [topic, 'video', 'course'],
        isRequired: true,
        format: ResourceFormat.VIDEO,
        language: 'en',
        lastUpdated: new Date()
      },
      {
        id: `${topic}-exercise-1`,
        title: `${topic.toUpperCase()} Practice Exercises`,
        type: ResourceType.EXERCISE,
        provider: 'FreeCodeCamp',
        url: `https://freecodecamp.org/${topic}`,
        description: `Interactive coding exercises to practice ${topic} skills.`,
        duration: 180,
        difficulty: DifficultyLevel.BEGINNER,
        cost: 0,
        rating: 4.7,
        tags: [topic, 'practice', 'interactive'],
        isRequired: true,
        format: ResourceFormat.INTERACTIVE,
        language: 'en',
        lastUpdated: new Date()
      }
    ];

    return baseResources;
  }

  /**
   * Creates a minimal learning path for testing
   */
  static createMinimalPath(userId: string, domainId: string): Partial<ILearningPath> {
    return {
      userId,
      domainId,
      title: 'Basic Programming Concepts',
      description: 'Introduction to programming fundamentals.',
      estimatedDuration: 4,
      difficulty: DifficultyLevel.BEGINNER,
      modules: [
        {
          id: 'basic-module',
          title: 'Programming Basics',
          description: 'Learn fundamental programming concepts.',
          order: 1,
          prerequisites: [],
          estimatedHours: 20,
          difficulty: DifficultyLevel.BEGINNER,
          weeklyTargets: [
            {
              id: 'basic-week-1',
              moduleId: 'basic-module',
              week: 1,
              title: 'Week 1: Variables and Data Types',
              description: 'Learn about variables and basic data types.',
              tasks: [
                {
                  id: 'basic-task-1',
                  title: 'Read Variables Guide',
                  description: 'Study variables and data types.',
                  type: TaskType.READING,
                  estimatedMinutes: 60,
                  isRequired: true,
                  completed: false,
                  resources: []
                }
              ],
              estimatedHours: 5,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              priority: TaskPriority.HIGH,
              skills: ['Variables', 'Data Types'],
              resources: [],
              completed: false
            }
          ],
          resources: [],
          skills: ['Programming Fundamentals'],
          assessments: [],
          isOptional: false,
          completionCriteria: {
            requiredTasks: 1,
            requiredHours: 5,
            requiredAssessments: [],
            requiredSkillLevel: 5
          }
        }
      ],
      progress: {
        completedModules: [],
        currentModule: 'basic-module',
        overallProgress: 0,
        weeklyTargetsMet: 0,
        totalWeeklyTargets: 1,
        totalHoursSpent: 0,
        averageWeeklyHours: 0,
        streakWeeks: 0,
        lastActivityDate: new Date(),
        milestones: [],
        skillsAcquired: [],
        certificationsEarned: []
      },
      personalization: generateDefaultPersonalization(),
      isActive: true
    };
  }
}

/**
 * Helper function to create ObjectId strings for testing
 */
export function createTestObjectId(): string {
  return new Types.ObjectId().toString();
}