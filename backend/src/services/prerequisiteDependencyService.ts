import {
  ILearningModule,
  ILearningPath,
  IPrerequisiteValidation,
  IPathValidation
} from '@/types/learning';
import { logger } from '@/utils/logger';

/**
 * Service for managing prerequisite dependencies in learning paths
 */
export class PrerequisiteDependencyService {
  /**
   * Validate all prerequisite dependencies in a learning path
   */
  static validatePathDependencies(learningPath: Partial<ILearningPath>): IPathValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!learningPath.modules || learningPath.modules.length === 0) {
      errors.push('Learning path must contain at least one module');
      return { isValid: false, errors, warnings, suggestions };
    }

    const modules = learningPath.modules;
    const moduleIds = modules.map(m => m.id);

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(modules);
    if (circularDeps.length > 0) {
      errors.push(`Circular dependencies detected: ${circularDeps.join(', ')}`);
    }

    // Validate each module's prerequisites
    modules.forEach(module => {
      const validation = this.validateModulePrerequisites(module, moduleIds);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
      suggestions.push(...validation.suggestions);
    });

    // Check for orphaned modules (modules with no path to completion)
    const orphanedModules = this.findOrphanedModules(modules);
    if (orphanedModules.length > 0) {
      warnings.push(`Modules may be difficult to reach: ${orphanedModules.join(', ')}`);
    }

    // Validate topological ordering
    const orderValidation = this.validateTopologicalOrder(modules);
    errors.push(...orderValidation.errors);
    warnings.push(...orderValidation.warnings);

    // Generate optimization suggestions
    const optimizations = this.generateOptimizationSuggestions(modules);
    suggestions.push(...optimizations);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate prerequisites for a specific module
   */
  static validateModulePrerequisites(
    module: ILearningModule,
    availableModuleIds: string[]
  ): IPathValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check if all prerequisites exist
    const missingPrerequisites = module.prerequisites.filter(
      prereqId => !availableModuleIds.includes(prereqId)
    );

    if (missingPrerequisites.length > 0) {
      errors.push(
        `Module "${module.title}" has invalid prerequisites: ${missingPrerequisites.join(', ')}`
      );
    }

    // Check for self-dependency
    if (module.prerequisites.includes(module.id)) {
      errors.push(`Module "${module.title}" cannot depend on itself`);
    }

    // Validate prerequisite complexity
    if (module.prerequisites.length > 5) {
      warnings.push(
        `Module "${module.title}" has many prerequisites (${module.prerequisites.length}). Consider simplifying.`
      );
    }

    // Check for redundant prerequisites
    const redundantPrereqs = this.findRedundantPrerequisites(module, availableModuleIds);
    if (redundantPrereqs.length > 0) {
      suggestions.push(
        `Module "${module.title}" has redundant prerequisites: ${redundantPrereqs.join(', ')}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Check if a user can start a specific module based on completed modules
   */
  static canStartModule(
    moduleId: string,
    modules: ILearningModule[],
    completedModuleIds: string[]
  ): IPrerequisiteValidation {
    const module = modules.find(m => m.id === moduleId);
    
    if (!module) {
      return {
        moduleId,
        canStart: false,
        missingPrerequisites: [],
        recommendedOrder: []
      };
    }

    const missingPrerequisites = module.prerequisites.filter(
      prereqId => !completedModuleIds.includes(prereqId)
    );

    const recommendedOrder = this.generateRecommendedOrder(modules, completedModuleIds);

    return {
      moduleId,
      canStart: missingPrerequisites.length === 0,
      missingPrerequisites,
      recommendedOrder
    };
  }

  /**
   * Generate the optimal order for completing modules
   */
  static generateOptimalModuleOrder(modules: ILearningModule[]): string[] {
    try {
      return this.topologicalSort(modules);
    } catch (error) {
      logger.error('Error generating optimal module order', {
        error: error instanceof Error ? error.message : 'Unknown error',
        moduleCount: modules.length
      });
      
      // Fallback to order-based sorting
      return modules
        .sort((a, b) => a.order - b.order)
        .map(m => m.id);
    }
  }

  /**
   * Get next available modules that can be started
   */
  static getNextAvailableModules(
    modules: ILearningModule[],
    completedModuleIds: string[]
  ): ILearningModule[] {
    return modules.filter(module => {
      // Skip already completed modules
      if (completedModuleIds.includes(module.id)) {
        return false;
      }

      // Check if all prerequisites are completed
      return module.prerequisites.every(prereqId => 
        completedModuleIds.includes(prereqId)
      );
    });
  }

  /**
   * Calculate the critical path through the learning modules
   */
  static calculateCriticalPath(modules: ILearningModule[]): {
    path: string[];
    totalDuration: number;
    bottlenecks: string[];
  } {
    const moduleMap = new Map(modules.map(m => [m.id, m]));
    const visited = new Set<string>();
    const paths: { path: string[]; duration: number }[] = [];

    // Find all possible paths from modules with no prerequisites to modules with no dependents
    const startModules = modules.filter(m => m.prerequisites.length === 0);
    const endModules = this.findEndModules(modules);

    startModules.forEach(startModule => {
      endModules.forEach(endModule => {
        const path = this.findPath(startModule.id, endModule.id, modules, visited);
        if (path.length > 0) {
          const duration = path.reduce((total, moduleId) => {
            const module = moduleMap.get(moduleId);
            return total + (module?.estimatedHours || 0);
          }, 0);
          paths.push({ path, duration });
        }
      });
    });

    // Find the longest path (critical path)
    const criticalPath = paths.reduce((longest, current) => 
      current.duration > longest.duration ? current : longest,
      { path: [], duration: 0 }
    );

    // Identify bottlenecks (modules that appear in multiple critical paths)
    const bottlenecks = this.identifyBottlenecks(modules, paths);

    return {
      path: criticalPath.path,
      totalDuration: criticalPath.duration,
      bottlenecks
    };
  }

  /**
   * Optimize module dependencies for better learning flow
   */
  static optimizeDependencies(modules: ILearningModule[]): ILearningModule[] {
    const optimizedModules = modules.map(module => ({ ...module }));

    // Remove redundant prerequisites
    optimizedModules.forEach(module => {
      module.prerequisites = this.removeRedundantPrerequisites(
        module.prerequisites,
        optimizedModules
      );
    });

    // Reorder modules for optimal flow
    const optimalOrder = this.generateOptimalModuleOrder(optimizedModules);
    optimizedModules.forEach((module, index) => {
      const optimalIndex = optimalOrder.indexOf(module.id);
      if (optimalIndex !== -1) {
        module.order = optimalIndex + 1;
      }
    });

    return optimizedModules;
  }

  /**
   * Private helper methods
   */

  /**
   * Detect circular dependencies using DFS
   */
  private static detectCircularDependencies(modules: ILearningModule[]): string[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const circularDeps: string[] = [];

    const dfs = (moduleId: string): boolean => {
      if (recursionStack.has(moduleId)) {
        circularDeps.push(moduleId);
        return true;
      }

      if (visited.has(moduleId)) {
        return false;
      }

      visited.add(moduleId);
      recursionStack.add(moduleId);

      const module = modules.find(m => m.id === moduleId);
      if (module) {
        for (const prereqId of module.prerequisites) {
          if (dfs(prereqId)) {
            return true;
          }
        }
      }

      recursionStack.delete(moduleId);
      return false;
    };

    modules.forEach(module => {
      if (!visited.has(module.id)) {
        dfs(module.id);
      }
    });

    return [...new Set(circularDeps)];
  }

  /**
   * Find modules that may be difficult to reach
   */
  private static findOrphanedModules(modules: ILearningModule[]): string[] {
    const reachableModules = new Set<string>();
    const startModules = modules.filter(m => m.prerequisites.length === 0);

    const dfs = (moduleId: string) => {
      if (reachableModules.has(moduleId)) return;
      
      reachableModules.add(moduleId);
      const dependentModules = modules.filter(m => 
        m.prerequisites.includes(moduleId)
      );
      
      dependentModules.forEach(module => dfs(module.id));
    };

    startModules.forEach(module => dfs(module.id));

    return modules
      .filter(module => !reachableModules.has(module.id))
      .map(module => module.id);
  }

  /**
   * Validate topological ordering of modules
   */
  private static validateTopologicalOrder(modules: ILearningModule[]): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const topologicalOrder = this.topologicalSort(modules);
      const currentOrder = modules
        .sort((a, b) => a.order - b.order)
        .map(m => m.id);

      // Check if current order violates topological constraints
      for (let i = 0; i < currentOrder.length; i++) {
        const moduleId = currentOrder[i];
        const module = modules.find(m => m.id === moduleId);
        
        if (module) {
          for (const prereqId of module.prerequisites) {
            const prereqIndex = currentOrder.indexOf(prereqId);
            if (prereqIndex > i) {
              errors.push(
                `Module "${module.title}" appears before its prerequisite "${prereqId}"`
              );
            }
          }
        }
      }

      // Suggest optimal ordering if different from current
      if (JSON.stringify(topologicalOrder) !== JSON.stringify(currentOrder)) {
        warnings.push('Module ordering could be optimized for better learning flow');
      }
    } catch (error) {
      errors.push('Unable to validate module ordering due to dependency issues');
    }

    return { errors, warnings };
  }

  /**
   * Topological sort implementation
   */
  private static topologicalSort(modules: ILearningModule[]): string[] {
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (moduleId: string) => {
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
    };

    // Sort modules by order first to maintain stability
    const sortedModules = [...modules].sort((a, b) => a.order - b.order);
    sortedModules.forEach(module => {
      dfs(module.id);
    });

    return result;
  }

  /**
   * Find redundant prerequisites for a module
   */
  private static findRedundantPrerequisites(
    module: ILearningModule,
    availableModuleIds: string[]
  ): string[] {
    const redundant: string[] = [];
    
    // A prerequisite is redundant if it's also a prerequisite of another prerequisite
    module.prerequisites.forEach(prereqId => {
      const prereqModule = availableModuleIds.find(id => id === prereqId);
      if (prereqModule) {
        const otherPrereqs = module.prerequisites.filter(id => id !== prereqId);
        
        // Check if this prerequisite is transitively covered by others
        const isTransitivelyCovered = otherPrereqs.some(otherPrereqId => {
          return this.isTransitivePrerequisite(prereqId, otherPrereqId, availableModuleIds);
        });
        
        if (isTransitivelyCovered) {
          redundant.push(prereqId);
        }
      }
    });

    return redundant;
  }

  /**
   * Check if one module is a transitive prerequisite of another
   */
  private static isTransitivePrerequisite(
    targetId: string,
    sourceId: string,
    moduleIds: string[]
  ): boolean {
    // This is a simplified check - in a real implementation,
    // you would traverse the full dependency graph
    return false; // Placeholder implementation
  }

  /**
   * Generate optimization suggestions
   */
  private static generateOptimizationSuggestions(modules: ILearningModule[]): string[] {
    const suggestions: string[] = [];

    // Check for modules with too many prerequisites
    const complexModules = modules.filter(m => m.prerequisites.length > 3);
    if (complexModules.length > 0) {
      suggestions.push(
        `Consider breaking down complex modules: ${complexModules.map(m => m.title).join(', ')}`
      );
    }

    // Check for long dependency chains
    const maxChainLength = this.findLongestDependencyChain(modules);
    if (maxChainLength > 6) {
      suggestions.push(
        'Consider parallelizing some learning paths to reduce total completion time'
      );
    }

    // Check for bottleneck modules
    const bottlenecks = this.findBottleneckModules(modules);
    if (bottlenecks.length > 0) {
      suggestions.push(
        `Consider providing alternative paths around bottleneck modules: ${bottlenecks.join(', ')}`
      );
    }

    return suggestions;
  }

  /**
   * Generate recommended order for remaining modules
   */
  private static generateRecommendedOrder(
    modules: ILearningModule[],
    completedModuleIds: string[]
  ): string[] {
    const remainingModules = modules.filter(m => !completedModuleIds.includes(m.id));
    return this.topologicalSort(remainingModules);
  }

  /**
   * Find modules that have no dependents (end modules)
   */
  private static findEndModules(modules: ILearningModule[]): ILearningModule[] {
    return modules.filter(module => {
      return !modules.some(otherModule => 
        otherModule.prerequisites.includes(module.id)
      );
    });
  }

  /**
   * Find path between two modules
   */
  private static findPath(
    startId: string,
    endId: string,
    modules: ILearningModule[],
    visited: Set<string>
  ): string[] {
    if (startId === endId) {
      return [startId];
    }

    if (visited.has(startId)) {
      return [];
    }

    visited.add(startId);
    const startModule = modules.find(m => m.id === startId);
    
    if (!startModule) {
      return [];
    }

    // Find modules that depend on this one
    const dependentModules = modules.filter(m => 
      m.prerequisites.includes(startId)
    );

    for (const dependent of dependentModules) {
      const path = this.findPath(dependent.id, endId, modules, new Set(visited));
      if (path.length > 0) {
        return [startId, ...path];
      }
    }

    return [];
  }

  /**
   * Identify bottleneck modules
   */
  private static identifyBottlenecks(
    modules: ILearningModule[],
    paths: { path: string[]; duration: number }[]
  ): string[] {
    const moduleFrequency = new Map<string, number>();

    paths.forEach(({ path }) => {
      path.forEach(moduleId => {
        moduleFrequency.set(moduleId, (moduleFrequency.get(moduleId) || 0) + 1);
      });
    });

    const averageFrequency = Array.from(moduleFrequency.values())
      .reduce((sum, freq) => sum + freq, 0) / moduleFrequency.size;

    return Array.from(moduleFrequency.entries())
      .filter(([_, frequency]) => frequency > averageFrequency * 1.5)
      .map(([moduleId]) => moduleId);
  }

  /**
   * Remove redundant prerequisites
   */
  private static removeRedundantPrerequisites(
    prerequisites: string[],
    modules: ILearningModule[]
  ): string[] {
    // Simplified implementation - remove direct redundancies
    return prerequisites.filter((prereqId, index) => {
      // Keep if no other prerequisite transitively includes this one
      return !prerequisites.some((otherPrereqId, otherIndex) => {
        if (index === otherIndex) return false;
        
        const otherModule = modules.find(m => m.id === otherPrereqId);
        return otherModule?.prerequisites.includes(prereqId);
      });
    });
  }

  /**
   * Find longest dependency chain
   */
  private static findLongestDependencyChain(modules: ILearningModule[]): number {
    let maxLength = 0;

    const dfs = (moduleId: string, currentLength: number, visited: Set<string>): number => {
      if (visited.has(moduleId)) {
        return currentLength;
      }

      visited.add(moduleId);
      const module = modules.find(m => m.id === moduleId);
      
      if (!module || module.prerequisites.length === 0) {
        return currentLength;
      }

      let maxChildLength = currentLength;
      module.prerequisites.forEach(prereqId => {
        const childLength = dfs(prereqId, currentLength + 1, new Set(visited));
        maxChildLength = Math.max(maxChildLength, childLength);
      });

      return maxChildLength;
    };

    modules.forEach(module => {
      const chainLength = dfs(module.id, 1, new Set());
      maxLength = Math.max(maxLength, chainLength);
    });

    return maxLength;
  }

  /**
   * Find bottleneck modules (modules that many others depend on)
   */
  private static findBottleneckModules(modules: ILearningModule[]): string[] {
    const dependencyCount = new Map<string, number>();

    modules.forEach(module => {
      module.prerequisites.forEach(prereqId => {
        dependencyCount.set(prereqId, (dependencyCount.get(prereqId) || 0) + 1);
      });
    });

    const averageDependencies = Array.from(dependencyCount.values())
      .reduce((sum, count) => sum + count, 0) / dependencyCount.size;

    return Array.from(dependencyCount.entries())
      .filter(([_, count]) => count > averageDependencies * 1.5)
      .map(([moduleId]) => moduleId);
  }
}