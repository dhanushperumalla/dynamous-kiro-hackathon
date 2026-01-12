import {
  ILearningPath,
  ILearningModule,
  IWeeklyTarget,
  IPersonalizationSettings,
  DifficultyLevel,
  LearningPace,
  LearningStyle,
  SkillLevel,
  TaskType
} from '@/types/learning';
import { ICareerDomainDocument, ISkill } from '@/types/recommendation';
import { IUser } from '@/types/user';
import { logger } from '@/utils/logger';

/**
 * Service for estimating learning durations and assessing difficulty levels
 */
export class DurationEstimationService {
  /**
   * Estimate total learning path duration
   */
  static estimatePathDuration(
    modules: ILearningModule[],
    personalization: IPersonalizationSettings,
    userProfile?: IUser
  ): {
    estimatedWeeks: number;
    estimatedHours: number;
    breakdown: {
      moduleId: string;
      title: string;
      weeks: number;
      hours: number;
      difficulty: DifficultyLevel;
    }[];
    confidenceLevel: number;
  } {
    try {
      logger.debug('Estimating learning path duration', {
        moduleCount: modules.length,
        learningPace: personalization.learningPace,
        availableHours: personalization.availableHoursPerWeek
      });

      const breakdown = modules.map(module => {
        const moduleEstimate = this.estimateModuleDuration(module, personalization, userProfile);
        return {
          moduleId: module.id,
          title: module.title,
          weeks: moduleEstimate.weeks,
          hours: moduleEstimate.hours,
          difficulty: module.difficulty
        };
      });

      const totalHours = breakdown.reduce((sum, item) => sum + item.hours, 0);
      const totalWeeks = this.calculateTotalWeeks(breakdown, personalization);
      
      // Calculate confidence level based on various factors
      const confidenceLevel = this.calculateConfidenceLevel(modules, personalization, userProfile);

      return {
        estimatedWeeks: totalWeeks,
        estimatedHours: totalHours,
        breakdown,
        confidenceLevel
      };
    } catch (error) {
      logger.error('Error estimating path duration', {
        error: error instanceof Error ? error.message : 'Unknown error',
        moduleCount: modules.length
      });
      throw error;
    }
  }

  /**
   * Estimate duration for a single module
   */
  static estimateModuleDuration(
    module: ILearningModule,
    personalization: IPersonalizationSettings,
    userProfile?: IUser
  ): {
    weeks: number;
    hours: number;
    factors: {
      baseHours: number;
      difficultyMultiplier: number;
      paceMultiplier: number;
      styleMultiplier: number;
      skillLevelMultiplier: number;
    };
  } {
    // Base estimation from module content
    const baseHours = this.calculateBaseHours(module);
    
    // Apply various multipliers
    const difficultyMultiplier = this.getDifficultyMultiplier(module.difficulty);
    const paceMultiplier = this.getPaceMultiplier(personalization.learningPace);
    const styleMultiplier = this.getStyleMultiplier(
      personalization.preferredLearningStyle,
      module
    );
    const skillLevelMultiplier = this.getSkillLevelMultiplier(
      personalization.skillLevel,
      module.difficulty
    );

    // Calculate adjusted hours
    const adjustedHours = Math.ceil(
      baseHours * 
      difficultyMultiplier * 
      paceMultiplier * 
      styleMultiplier * 
      skillLevelMultiplier
    );

    // Convert to weeks based on available hours per week
    const weeks = Math.ceil(adjustedHours / personalization.availableHoursPerWeek);

    return {
      weeks,
      hours: adjustedHours,
      factors: {
        baseHours,
        difficultyMultiplier,
        paceMultiplier,
        styleMultiplier,
        skillLevelMultiplier
      }
    };
  }

  /**
   * Assess difficulty level for a learning path
   */
  static assessPathDifficulty(
    domain: ICareerDomainDocument,
    userProfile: IUser,
    modules: ILearningModule[]
  ): {
    overallDifficulty: DifficultyLevel;
    difficultyScore: number; // 1-10 scale
    factors: {
      domainComplexity: number;
      userExperience: number;
      skillGap: number;
      timeConstraints: number;
    };
    recommendations: string[];
  } {
    try {
      // Assess various difficulty factors
      const domainComplexity = this.assessDomainComplexity(domain);
      const userExperience = this.assessUserExperience(userProfile);
      const skillGap = this.assessSkillGap(domain, userProfile);
      const timeConstraints = this.assessTimeConstraints(userProfile);

      // Calculate weighted difficulty score
      const difficultyScore = this.calculateDifficultyScore({
        domainComplexity,
        userExperience,
        skillGap,
        timeConstraints
      });

      // Determine overall difficulty level
      const overallDifficulty = this.scoreToDifficultyLevel(difficultyScore);

      // Generate recommendations
      const recommendations = this.generateDifficultyRecommendations(
        difficultyScore,
        { domainComplexity, userExperience, skillGap, timeConstraints }
      );

      return {
        overallDifficulty,
        difficultyScore,
        factors: {
          domainComplexity,
          userExperience,
          skillGap,
          timeConstraints
        },
        recommendations
      };
    } catch (error) {
      logger.error('Error assessing path difficulty', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domainId: domain._id,
        userId: userProfile._id
      });
      throw error;
    }
  }

  /**
   * Estimate time to proficiency for specific skills
   */
  static estimateSkillProficiency(
    skills: ISkill[],
    targetProficiencyLevel: number, // 1-10 scale
    personalization: IPersonalizationSettings
  ): {
    skillEstimates: {
      skillName: string;
      currentLevel: number;
      targetLevel: number;
      estimatedHours: number;
      estimatedWeeks: number;
      difficulty: DifficultyLevel;
    }[];
    totalHours: number;
    totalWeeks: number;
  } {
    const skillEstimates = skills.map(skill => {
      const currentLevel = this.estimateCurrentSkillLevel(skill, personalization.skillLevel);
      const hoursNeeded = this.calculateSkillHours(
        skill,
        currentLevel,
        targetProficiencyLevel,
        personalization
      );
      const weeks = Math.ceil(hoursNeeded / personalization.availableHoursPerWeek);

      return {
        skillName: skill.name,
        currentLevel,
        targetLevel: targetProficiencyLevel,
        estimatedHours: hoursNeeded,
        estimatedWeeks: weeks,
        difficulty: this.assessSkillDifficulty(skill)
      };
    });

    const totalHours = skillEstimates.reduce((sum, skill) => sum + skill.estimatedHours, 0);
    const totalWeeks = Math.max(...skillEstimates.map(skill => skill.estimatedWeeks));

    return {
      skillEstimates,
      totalHours,
      totalWeeks
    };
  }

  /**
   * Calculate adaptive duration adjustments based on progress
   */
  static calculateAdaptiveDuration(
    originalEstimate: number,
    actualProgress: {
      completedHours: number;
      completedModules: number;
      totalModules: number;
      averageWeeklyHours: number;
      completionRate: number; // percentage of tasks completed on time
    }
  ): {
    adjustedEstimate: number;
    adjustmentFactor: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let adjustmentFactor = 1.0;

    // Adjust based on completion rate
    if (actualProgress.completionRate < 0.7) {
      adjustmentFactor *= 1.3;
      reasoning.push('Below-average completion rate suggests need for more time');
    } else if (actualProgress.completionRate > 0.9) {
      adjustmentFactor *= 0.9;
      reasoning.push('High completion rate suggests faster than expected progress');
    }

    // Adjust based on actual vs planned hours
    const progressRatio = actualProgress.completedModules / actualProgress.totalModules;
    if (progressRatio > 0.1) { // Only adjust if we have meaningful progress
      const expectedHours = originalEstimate * progressRatio;
      const actualHours = actualProgress.completedHours;
      
      if (actualHours > expectedHours * 1.2) {
        adjustmentFactor *= 1.2;
        reasoning.push('Taking longer than expected per module');
      } else if (actualHours < expectedHours * 0.8) {
        adjustmentFactor *= 0.9;
        reasoning.push('Progressing faster than expected');
      }
    }

    // Adjust based on weekly hour consistency
    if (actualProgress.averageWeeklyHours < 5) {
      adjustmentFactor *= 1.4;
      reasoning.push('Low weekly engagement may extend timeline');
    }

    const adjustedEstimate = Math.ceil(originalEstimate * adjustmentFactor);

    return {
      adjustedEstimate,
      adjustmentFactor,
      reasoning
    };
  }

  /**
   * Private helper methods
   */

  /**
   * Calculate base hours for a module
   */
  private static calculateBaseHours(module: ILearningModule): number {
    // Sum up estimated hours from weekly targets
    const weeklyTargetHours = module.weeklyTargets.reduce(
      (sum, target) => sum + target.estimatedHours,
      0
    );

    // If no weekly targets, estimate based on tasks
    if (weeklyTargetHours === 0) {
      const totalTasks = module.weeklyTargets.reduce(
        (sum, target) => sum + target.tasks.length,
        0
      );
      return totalTasks * 2; // Assume 2 hours per task on average
    }

    return weeklyTargetHours;
  }

  /**
   * Get difficulty multiplier
   */
  private static getDifficultyMultiplier(difficulty: DifficultyLevel): number {
    const multipliers = {
      [DifficultyLevel.BEGINNER]: 1.0,
      [DifficultyLevel.INTERMEDIATE]: 1.3,
      [DifficultyLevel.ADVANCED]: 1.6,
      [DifficultyLevel.EXPERT]: 2.0
    };
    return multipliers[difficulty] || 1.0;
  }

  /**
   * Get learning pace multiplier
   */
  private static getPaceMultiplier(pace: LearningPace): number {
    const multipliers = {
      [LearningPace.SLOW]: 1.5,
      [LearningPace.MODERATE]: 1.0,
      [LearningPace.FAST]: 0.8,
      [LearningPace.INTENSIVE]: 0.6
    };
    return multipliers[pace] || 1.0;
  }

  /**
   * Get learning style multiplier
   */
  private static getStyleMultiplier(
    style: LearningStyle,
    module: ILearningModule
  ): number {
    // Analyze module content to determine if it matches learning style
    const hasVisualContent = module.resources.some(r => 
      r.type.includes('video') || r.type.includes('diagram')
    );
    const hasAudioContent = module.resources.some(r => 
      r.type.includes('audio') || r.type.includes('podcast')
    );
    const hasHandsOnContent = module.weeklyTargets.some(target =>
      target.tasks.some(task => 
        task.type === TaskType.EXERCISE || task.type === TaskType.PROJECT
      )
    );
    const hasReadingContent = module.resources.some(r => 
      r.type.includes('article') || r.type.includes('book')
    );

    // Apply multiplier based on content match
    switch (style) {
      case LearningStyle.VISUAL:
        return hasVisualContent ? 0.9 : 1.1;
      case LearningStyle.AUDITORY:
        return hasAudioContent ? 0.9 : 1.1;
      case LearningStyle.KINESTHETIC:
        return hasHandsOnContent ? 0.9 : 1.2;
      case LearningStyle.READING:
        return hasReadingContent ? 0.9 : 1.1;
      case LearningStyle.MIXED:
      default:
        return 1.0;
    }
  }

  /**
   * Get skill level multiplier
   */
  private static getSkillLevelMultiplier(
    skillLevel: SkillLevel,
    moduleDifficulty: DifficultyLevel
  ): number {
    const skillLevelScores = {
      [SkillLevel.ABSOLUTE_BEGINNER]: 1,
      [SkillLevel.BEGINNER]: 2,
      [SkillLevel.SOME_EXPERIENCE]: 3,
      [SkillLevel.INTERMEDIATE]: 4,
      [SkillLevel.ADVANCED]: 5,
      [SkillLevel.EXPERT]: 6
    };

    const difficultyScores = {
      [DifficultyLevel.BEGINNER]: 2,
      [DifficultyLevel.INTERMEDIATE]: 4,
      [DifficultyLevel.ADVANCED]: 5,
      [DifficultyLevel.EXPERT]: 6
    };

    const skillScore = skillLevelScores[skillLevel] || 2;
    const difficultyScore = difficultyScores[moduleDifficulty] || 2;

    // If skill level is much lower than difficulty, increase time
    const gap = difficultyScore - skillScore;
    if (gap > 2) {
      return 1.5;
    } else if (gap > 0) {
      return 1.2;
    } else if (gap < -1) {
      return 0.8;
    }
    
    return 1.0;
  }

  /**
   * Calculate total weeks considering parallel learning
   */
  private static calculateTotalWeeks(
    breakdown: { weeks: number; difficulty: DifficultyLevel }[],
    personalization: IPersonalizationSettings
  ): number {
    // Simple sequential approach for now
    // In the future, could implement parallel learning optimization
    const totalSequentialWeeks = breakdown.reduce((sum, item) => sum + item.weeks, 0);
    
    // Add buffer time based on learning pace
    const bufferMultiplier = personalization.learningPace === LearningPace.SLOW ? 1.2 : 1.1;
    
    return Math.ceil(totalSequentialWeeks * bufferMultiplier);
  }

  /**
   * Calculate confidence level for estimates
   */
  private static calculateConfidenceLevel(
    modules: ILearningModule[],
    personalization: IPersonalizationSettings,
    userProfile?: IUser
  ): number {
    let confidence = 0.8; // Base confidence

    // Reduce confidence for complex paths
    if (modules.length > 8) {
      confidence -= 0.1;
    }

    // Reduce confidence for beginners
    if (personalization.skillLevel === SkillLevel.ABSOLUTE_BEGINNER) {
      confidence -= 0.15;
    }

    // Reduce confidence for very fast or very slow paces
    if (personalization.learningPace === LearningPace.INTENSIVE || 
        personalization.learningPace === LearningPace.SLOW) {
      confidence -= 0.1;
    }

    // Increase confidence if user has completed assessments
    if (userProfile?.stats.assessmentCompleted) {
      confidence += 0.1;
    }

    return Math.max(0.5, Math.min(0.95, confidence));
  }

  /**
   * Assess domain complexity
   */
  private static assessDomainComplexity(domain: ICareerDomainDocument): number {
    let complexity = 5; // Base complexity

    // Adjust based on required skills count
    const skillCount = domain.requiredSkills.length;
    if (skillCount > 15) {
      complexity += 2;
    } else if (skillCount > 10) {
      complexity += 1;
    } else if (skillCount < 5) {
      complexity -= 1;
    }

    // Adjust based on time to mastery
    if (domain.timeToMastery > 24) { // More than 2 years
      complexity += 2;
    } else if (domain.timeToMastery > 12) { // More than 1 year
      complexity += 1;
    }

    // Adjust based on domain difficulty
    const difficultyAdjustments = {
      [DifficultyLevel.BEGINNER]: -1,
      [DifficultyLevel.INTERMEDIATE]: 0,
      [DifficultyLevel.ADVANCED]: 1,
      [DifficultyLevel.EXPERT]: 2
    };
    complexity += difficultyAdjustments[domain.difficulty] || 0;

    return Math.max(1, Math.min(10, complexity));
  }

  /**
   * Assess user experience level
   */
  private static assessUserExperience(userProfile: IUser): number {
    let experience = 5; // Base experience

    // Adjust based on current status
    const statusAdjustments = {
      'student': -1,
      'graduate': 0,
      'employed': 2,
      'unemployed': 0,
      'career_changer': 1
    };
    experience += statusAdjustments[userProfile.profile.currentStatus] || 0;

    // Adjust based on education level
    const educationAdjustments = {
      'high_school': -1,
      'bachelor': 0,
      'master': 1,
      'phd': 2,
      'other': 0
    };
    experience += educationAdjustments[userProfile.profile.educationLevel || 'other'] || 0;

    // Adjust based on skills acquired
    const skillCount = userProfile.stats.skillsAcquired.length;
    if (skillCount > 20) {
      experience += 2;
    } else if (skillCount > 10) {
      experience += 1;
    } else if (skillCount < 3) {
      experience -= 1;
    }

    return Math.max(1, Math.min(10, experience));
  }

  /**
   * Assess skill gap between user and domain requirements
   */
  private static assessSkillGap(domain: ICareerDomainDocument, userProfile: IUser): number {
    const requiredSkills = domain.requiredSkills.map(s => s.name.toLowerCase());
    const userSkills = userProfile.stats.skillsAcquired.map(s => s.toLowerCase());
    
    const matchingSkills = requiredSkills.filter(skill => 
      userSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
    );
    
    const gapPercentage = 1 - (matchingSkills.length / requiredSkills.length);
    return Math.ceil(gapPercentage * 10);
  }

  /**
   * Assess time constraints
   */
  private static assessTimeConstraints(userProfile: IUser): number {
    const { currentStatus } = userProfile.profile;
    
    // Higher score means more time constraints
    const constraintScores = {
      'student': 3,
      'graduate': 2,
      'employed': 7,
      'unemployed': 1,
      'career_changer': 6
    };
    
    return constraintScores[currentStatus] || 5;
  }

  /**
   * Calculate overall difficulty score
   */
  private static calculateDifficultyScore(factors: {
    domainComplexity: number;
    userExperience: number;
    skillGap: number;
    timeConstraints: number;
  }): number {
    // Weighted average of factors
    const weights = {
      domainComplexity: 0.3,
      userExperience: -0.25, // Negative because higher experience reduces difficulty
      skillGap: 0.3,
      timeConstraints: 0.15
    };

    const score = 
      factors.domainComplexity * weights.domainComplexity +
      factors.userExperience * weights.userExperience +
      factors.skillGap * weights.skillGap +
      factors.timeConstraints * weights.timeConstraints;

    return Math.max(1, Math.min(10, Math.round(score)));
  }

  /**
   * Convert difficulty score to difficulty level
   */
  private static scoreToDifficultyLevel(score: number): DifficultyLevel {
    if (score <= 3) return DifficultyLevel.BEGINNER;
    if (score <= 6) return DifficultyLevel.INTERMEDIATE;
    if (score <= 8) return DifficultyLevel.ADVANCED;
    return DifficultyLevel.EXPERT;
  }

  /**
   * Generate difficulty-based recommendations
   */
  private static generateDifficultyRecommendations(
    score: number,
    factors: {
      domainComplexity: number;
      userExperience: number;
      skillGap: number;
      timeConstraints: number;
    }
  ): string[] {
    const recommendations: string[] = [];

    if (score >= 8) {
      recommendations.push('Consider starting with foundational courses before this learning path');
      recommendations.push('Plan for extended timeline due to high complexity');
    }

    if (factors.skillGap >= 7) {
      recommendations.push('Focus on building prerequisite skills first');
      recommendations.push('Consider mentorship or additional support');
    }

    if (factors.timeConstraints >= 7) {
      recommendations.push('Consider part-time learning approach');
      recommendations.push('Set realistic weekly hour commitments');
    }

    if (factors.userExperience <= 3) {
      recommendations.push('Start with beginner-friendly resources');
      recommendations.push('Join study groups or communities for support');
    }

    return recommendations;
  }

  /**
   * Estimate current skill level for a specific skill
   */
  private static estimateCurrentSkillLevel(skill: ISkill, userSkillLevel: SkillLevel): number {
    const baseLevel = {
      [SkillLevel.ABSOLUTE_BEGINNER]: 1,
      [SkillLevel.BEGINNER]: 2,
      [SkillLevel.SOME_EXPERIENCE]: 3,
      [SkillLevel.INTERMEDIATE]: 5,
      [SkillLevel.ADVANCED]: 7,
      [SkillLevel.EXPERT]: 9
    }[userSkillLevel] || 2;

    // Adjust based on skill importance (higher importance skills might be lower for beginners)
    const importanceAdjustment = skill.importance > 8 ? -1 : 0;
    
    return Math.max(1, Math.min(10, baseLevel + importanceAdjustment));
  }

  /**
   * Calculate hours needed to reach target skill level
   */
  private static calculateSkillHours(
    skill: ISkill,
    currentLevel: number,
    targetLevel: number,
    personalization: IPersonalizationSettings
  ): number {
    const levelGap = targetLevel - currentLevel;
    if (levelGap <= 0) return 0;

    // Base hours per skill level (exponential growth)
    const baseHoursPerLevel = [0, 5, 8, 12, 18, 25, 35, 50, 70, 100, 150];
    
    let totalHours = 0;
    for (let level = currentLevel; level < targetLevel; level++) {
      totalHours += baseHoursPerLevel[level + 1] || 50;
    }

    // Adjust for skill importance
    const importanceMultiplier = 0.5 + (skill.importance / 20);
    totalHours *= importanceMultiplier;

    // Adjust for learning pace
    const paceMultiplier = this.getPaceMultiplier(personalization.learningPace);
    totalHours *= paceMultiplier;

    return Math.ceil(totalHours);
  }

  /**
   * Assess difficulty of a specific skill
   */
  private static assessSkillDifficulty(skill: ISkill): DifficultyLevel {
    // Map skill importance to difficulty
    if (skill.importance >= 9) return DifficultyLevel.EXPERT;
    if (skill.importance >= 7) return DifficultyLevel.ADVANCED;
    if (skill.importance >= 5) return DifficultyLevel.INTERMEDIATE;
    return DifficultyLevel.BEGINNER;
  }
}