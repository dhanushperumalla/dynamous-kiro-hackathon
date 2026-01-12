import {
  ILearningPath,
  ILearningModule,
  IWeeklyTarget,
  IPathValidation,
  IPrerequisiteValidation,
  DifficultyLevel
} from '../types/learning';

/**
 * Validates a learning path structure and content
 */
export function validateLearningPath(path: Partial<ILearningPath>): IPathValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Required field validation
  if (!path.title || path.title.trim().length === 0) {
    errors.push('Learning path title is required');
  }

  if (!path.description || path.description.trim().length === 0) {
    errors.push('Learning path description is required');
  }

  if (!path.estimatedDuration || path.estimatedDuration < 1) {
    errors.push('Estimated duration must be at least 1 week');
  }

  if (!path.difficulty || !Object.values(DifficultyLevel).includes(path.difficulty)) {
    errors.push('Valid difficulty level is required');
  }

  if (!path.modules || path.modules.length === 0) {
    errors.push('At least one learning module is required');
  }

  // Module validation
  if (path.modules && path.modules.length > 0) {
    const moduleValidation = validateModules(path.modules);
    errors.push(...moduleValidation.errors);
    warnings.push(...moduleValidation.warnings);
    suggestions.push(...moduleValidation.suggestions);
  }

  // Duration validation
  if (path.modules && path.estimatedDuration) {
    const totalModuleWeeks = path.modules.reduce((total, module) => {
      return total + Math.ceil(module.estimatedHours / 10); // Assuming 10 hours per week
    }, 0);

    if (totalModuleWeeks > path.estimatedDuration * 1.2) {
      warnings.push('Estimated duration may be too short for the module content');
    } else if (totalModuleWeeks < path.estimatedDuration * 0.8) {
      warnings.push('Estimated duration may be too long for the module content');
    }
  }

  // Personalization validation
  if (path.personalization) {
    if (path.personalization.availableHoursPerWeek < 1) {
      errors.push('Available hours per week must be at least 1');
    }
    if (path.personalization.availableHoursPerWeek > 40) {
      warnings.push('Available hours per week exceeds recommended maximum of 40');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Validates learning modules structure and prerequisites
 */
export function validateModules(modules: ILearningModule[]): IPathValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  const moduleIds = modules.map(m => m.id);
  const orders = modules.map(m => m.order);

  // Check for duplicate module IDs
  const duplicateIds = moduleIds.filter((id, index) => moduleIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate module IDs found: ${duplicateIds.join(', ')}`);
  }

  // Check for sequential order
  const sortedOrders = [...orders].sort((a, b) => a - b);
  for (let i = 0; i < sortedOrders.length; i++) {
    if (sortedOrders[i] !== i + 1) {
      errors.push('Module orders must be sequential starting from 1');
      break;
    }
  }

  // Validate each module
  modules.forEach((module) => {
    // Check prerequisites exist
    module.prerequisites.forEach(prereqId => {
      if (!moduleIds.includes(prereqId)) {
        errors.push(`Module "${module.title}" has invalid prerequisite: ${prereqId}`);
      }
    });

    // Check for circular dependencies
    if (hasCircularDependency(module.id, modules)) {
      errors.push(`Circular dependency detected for module: ${module.title}`);
    }

    // Validate weekly targets
    if (module.weeklyTargets.length === 0) {
      warnings.push(`Module "${module.title}" has no weekly targets`);
    }

    // Check estimated hours
    if (module.estimatedHours < 0.5) {
      warnings.push(`Module "${module.title}" has very low estimated hours`);
    }

    // Validate resources
    if (module.resources.length === 0) {
      warnings.push(`Module "${module.title}" has no learning resources`);
    }

    // Check completion criteria
    if (!module.completionCriteria) {
      errors.push(`Module "${module.title}" missing completion criteria`);
    } else {
      if (module.completionCriteria.requiredTasks > module.weeklyTargets.reduce((total, target) => total + target.tasks.length, 0)) {
        errors.push(`Module "${module.title}" requires more tasks than available`);
      }
    }
  });

  // Suggestions for improvement
  if (modules.length > 10) {
    suggestions.push('Consider breaking down the learning path into smaller, more focused paths');
  }

  const avgHoursPerModule = modules.reduce((total, m) => total + m.estimatedHours, 0) / modules.length;
  if (avgHoursPerModule > 40) {
    suggestions.push('Consider reducing module size for better learner engagement');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Validates prerequisites for a specific module
 */
export function validatePrerequisites(moduleId: string, modules: ILearningModule[]): IPrerequisiteValidation {
  const module = modules.find(m => m.id === moduleId);
  if (!module) {
    return {
      moduleId,
      canStart: false,
      missingPrerequisites: [],
      recommendedOrder: []
    };
  }

  const moduleIds = modules.map(m => m.id);
  const missingPrerequisites = module.prerequisites.filter(prereqId => !moduleIds.includes(prereqId));

  // Generate recommended order using topological sort
  const recommendedOrder = topologicalSort(modules);

  return {
    moduleId,
    canStart: missingPrerequisites.length === 0,
    missingPrerequisites,
    recommendedOrder
  };
}

/**
 * Validates weekly targets structure
 */
export function validateWeeklyTargets(targets: IWeeklyTarget[]): IPathValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check for sequential week numbers
  const weeks = targets.map(t => t.week).sort((a, b) => a - b);
  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i] !== i + 1) {
      errors.push('Weekly target weeks must be sequential starting from 1');
      break;
    }
  }

  targets.forEach(target => {
    // Validate estimated hours
    if (target.estimatedHours > 40) {
      warnings.push(`Week ${target.week} has excessive hours (${target.estimatedHours})`);
    }

    if (target.estimatedHours < 1) {
      warnings.push(`Week ${target.week} has very low estimated hours`);
    }

    // Validate tasks
    if (target.tasks.length === 0) {
      warnings.push(`Week ${target.week} has no tasks defined`);
    }

    // Check due dates
    if (target.dueDate < new Date()) {
      warnings.push(`Week ${target.week} due date is in the past`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Checks for circular dependencies in module prerequisites
 */
function hasCircularDependency(moduleId: string, modules: ILearningModule[], visited: Set<string> = new Set(), recursionStack: Set<string> = new Set()): boolean {
  if (recursionStack.has(moduleId)) {
    return true; // Circular dependency found
  }

  if (visited.has(moduleId)) {
    return false; // Already processed
  }

  visited.add(moduleId);
  recursionStack.add(moduleId);

  const module = modules.find(m => m.id === moduleId);
  if (module) {
    for (const prereqId of module.prerequisites) {
      if (hasCircularDependency(prereqId, modules, visited, recursionStack)) {
        return true;
      }
    }
  }

  recursionStack.delete(moduleId);
  return false;
}

/**
 * Performs topological sort to determine recommended module order
 */
function topologicalSort(modules: ILearningModule[]): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function dfs(moduleId: string) {
    if (visited.has(moduleId)) return;

    visited.add(moduleId);
    const module = modules.find(m => m.id === moduleId);
    
    if (module) {
      // Visit prerequisites first
      module.prerequisites.forEach(prereqId => {
        dfs(prereqId);
      });
      
      result.push(moduleId);
    }
  }

  // Sort modules by order first, then apply DFS
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);
  sortedModules.forEach(module => {
    dfs(module.id);
  });

  return result;
}

import {
  LearningPace,
  LearningStyle,
  SkillLevel,
  WeekDay,
  TimeSlot,
  ReminderFrequency,
  NotificationChannel
} from '../types/learning';

/**
 * Generates default personalization settings
 */
export function generateDefaultPersonalization() {
  return {
    learningPace: LearningPace.MODERATE,
    preferredLearningStyle: LearningStyle.MIXED,
    availableHoursPerWeek: 10,
    preferredSchedule: {
      preferredDays: [WeekDay.MONDAY, WeekDay.WEDNESDAY, WeekDay.FRIDAY],
      preferredTimeSlots: [TimeSlot.EVENING],
      timezone: 'UTC',
      flexibleSchedule: true,
      reminderSettings: {
        enabled: true,
        frequency: ReminderFrequency.WEEKLY,
        preferredTime: '18:00',
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH]
      }
    },
    skillLevel: SkillLevel.BEGINNER,
    focusAreas: [],
    excludedTopics: [],
    adaptiveSettings: {
      enabled: true,
      difficultyAdjustment: true,
      paceAdjustment: true,
      contentRecommendation: true,
      pathOptimization: true
    }
  };
}