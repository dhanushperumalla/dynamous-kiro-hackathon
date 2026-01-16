import { JobMatch } from '@/models/JobMatch';
import { JobPreferences } from '@/models/JobPreferences';
import { User } from '@/models/User';
import { jobAggregationService } from './jobAggregationService';
import { JobSearchQuery } from './jobBoardIntegrationService';
import { 
  IExternalJobData, 
  IJobMatchingCriteria, 
  IJobFilters,
  JobType,
  ExperienceLevel,
  ApplicationStatus
} from '@/types/job';
import { logger } from '@/utils/logger';
import mongoose from 'mongoose';

interface UserSkillProfile {
  userId: string;
  skills: Record<string, number>; // skill name -> proficiency level (0-10)
  experienceLevel: ExperienceLevel;
  preferredJobTypes: JobType[];
  locations: string[];
  salaryExpectations: {
    min: number;
    max: number;
    currency: string;
  };
}

interface MatchingResult {
  jobMatches: any[];
  totalMatches: number;
  averageMatchScore: number;
  processingTime: number;
  criteria: IJobMatchingCriteria;
}

class JobMatchingService {
  private readonly defaultCriteria: IJobMatchingCriteria = {
    userId: '',
    skillWeights: {},
    locationWeight: 0.2,
    salaryWeight: 0.25,
    experienceWeight: 0.15,
    companyWeight: 0.1,
    minimumMatchScore: 30,
    maxResults: 50,
    filters: {}
  };

  constructor() {
    logger.info('Job matching service initialized');
  }

  /**
   * Find job matches for a user
   */
  async findJobMatches(userId: string, criteria?: Partial<IJobMatchingCriteria>): Promise<MatchingResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting job matching process', { userId });

      // Get user profile and preferences
      const userProfile = await this.getUserSkillProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found or incomplete');
      }

      // Merge criteria with defaults
      const matchingCriteria: IJobMatchingCriteria = {
        ...this.defaultCriteria,
        userId,
        skillWeights: this.generateSkillWeights(userProfile.skills),
        ...criteria
      };

      // Build job search query from user preferences
      const searchQuery = this.buildSearchQuery(userProfile, matchingCriteria.filters);

      // Fetch jobs from external sources
      const { jobs: externalJobs } = await jobAggregationService.aggregateJobs(searchQuery);

      logger.debug('External jobs fetched', {
        userId,
        jobCount: externalJobs.length
      });

      // Calculate match scores for each job
      const jobMatches = await this.calculateJobMatches(
        externalJobs,
        userProfile,
        matchingCriteria
      );

      // Filter and sort matches
      const filteredMatches = jobMatches
        .filter(match => match.matchScore >= matchingCriteria.minimumMatchScore)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, matchingCriteria.maxResults);

      // Save matches to database
      await this.saveJobMatches(filteredMatches, userId);

      const processingTime = Date.now() - startTime;
      const averageMatchScore = filteredMatches.length > 0 ?
        filteredMatches.reduce((sum, match) => sum + match.matchScore, 0) / filteredMatches.length :
        0;

      logger.info('Job matching completed', {
        userId,
        totalJobs: externalJobs.length,
        matches: filteredMatches.length,
        averageScore: Math.round(averageMatchScore),
        processingTime
      });

      return {
        jobMatches: filteredMatches,
        totalMatches: filteredMatches.length,
        averageMatchScore: Math.round(averageMatchScore),
        processingTime,
        criteria: matchingCriteria
      };

    } catch (error) {
      logger.error('Job matching failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Get user skill profile from various sources
   */
  private async getUserSkillProfile(userId: string): Promise<UserSkillProfile | null> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        logger.warn('User not found', { userId });
        return null;
      }

      const preferences = await (JobPreferences as any).findByUser(userId);
      if (!preferences) {
        logger.warn('User job preferences not found', { userId });
        return null;
      }

      // Extract skills from user's learning progress and stats
      const skills = this.extractUserSkills(user) as Record<string, number>;

      // Determine experience level from user profile and stats
      const experienceLevel = this.determineExperienceLevel(user);

      return {
        userId,
        skills,
        experienceLevel,
        preferredJobTypes: preferences.jobTypes,
        locations: preferences.locations,
        salaryExpectations: {
          min: preferences.salaryExpectations.min,
          max: preferences.salaryExpectations.max,
          currency: preferences.salaryExpectations.currency
        }
      };

    } catch (error) {
      logger.error('Error getting user skill profile', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Extract user skills from profile and learning progress
   */
  private extractUserSkills(user: any): Record<string, number> {
    const skills: Record<string, number> = {};

    // Get skills from user stats
    if (user?.stats?.skillsAcquired && user.stats.skillsAcquired.length > 0) {
      user.stats.skillsAcquired.forEach((skill: string) => {
        // Assign skill level based on learning progress
        // This is a simplified approach - in reality, you'd have more sophisticated skill tracking
        const baseLevel = 5; // Mid-level proficiency
        const experienceBonus = Math.min((user.stats.completedModules || 0) * 0.1, 3);
        skills[skill.toLowerCase()] = Math.min(baseLevel + experienceBonus, 10);
      });
    }

    // Add default skills based on user's current status and education
    if (user?.profile?.educationLevel) {
      const educationSkills = this.getSkillsFromEducation(user.profile.educationLevel);
      Object.assign(skills, educationSkills);
    }

    // Add soft skills based on user activity
    const softSkills = this.inferSoftSkills(user);
    Object.assign(skills, softSkills);

    return skills;
  }

  /**
   * Get skills based on education level
   */
  private getSkillsFromEducation(educationLevel: string): Record<string, number> {
    const skillMaps: Record<string, Record<string, number>> = {
      'high_school': {
        'communication': 4,
        'teamwork': 4,
        'problem solving': 3
      },
      'bachelor': {
        'communication': 6,
        'teamwork': 6,
        'problem solving': 6,
        'critical thinking': 5,
        'research': 5
      },
      'master': {
        'communication': 7,
        'teamwork': 7,
        'problem solving': 7,
        'critical thinking': 7,
        'research': 7,
        'leadership': 6
      },
      'phd': {
        'communication': 8,
        'teamwork': 7,
        'problem solving': 8,
        'critical thinking': 9,
        'research': 9,
        'leadership': 7,
        'analytical thinking': 8
      }
    };

    return skillMaps[educationLevel] || skillMaps['bachelor'] || {};
  }

  /**
   * Infer soft skills from user activity
   */
  private inferSoftSkills(user: any): Record<string, number> {
    const softSkills: Record<string, number> = {};

    // Base soft skills on learning activity
    const streakDays = user?.stats?.streakDays || 0;
    const completedModules = user?.stats?.completedModules || 0;
    const totalLearningHours = user?.stats?.totalLearningHours || 0;

    if (streakDays > 30) {
      softSkills['self-motivation'] = 7;
      softSkills['discipline'] = 7;
    } else if (streakDays > 7) {
      softSkills['self-motivation'] = 5;
      softSkills['discipline'] = 5;
    }

    if (completedModules > 10) {
      softSkills['learning agility'] = 7;
      softSkills['adaptability'] = 6;
    } else if (completedModules > 3) {
      softSkills['learning agility'] = 5;
      softSkills['adaptability'] = 5;
    }

    // Add time management based on learning consistency
    if (totalLearningHours > 100) {
      softSkills['time management'] = 6;
    } else if (totalLearningHours > 20) {
      softSkills['time management'] = 4;
    }

    return softSkills;
  }

  /**
   * Determine user's experience level
   */
  private determineExperienceLevel(user: any): ExperienceLevel {
    const currentStatus = user?.profile?.currentStatus;
    const educationLevel = user?.profile?.educationLevel;
    const completedModules = user?.stats?.completedModules || 0;
    const totalLearningHours = user?.stats?.totalLearningHours || 0;

    // Recent graduates with learning progress
    if (currentStatus === 'graduate' && completedModules > 5) {
      return ExperienceLevel.JUNIOR;
    }

    // Students with significant learning
    if (currentStatus === 'student' && totalLearningHours > 50) {
      return ExperienceLevel.ENTRY_LEVEL;
    }

    // Career changers with learning progress
    if (currentStatus === 'career_changer' && completedModules > 10) {
      return ExperienceLevel.MID_LEVEL;
    }

    // Employed users (assume some experience)
    if (currentStatus === 'employed') {
      return ExperienceLevel.MID_LEVEL;
    }

    // Default based on education
    const educationLevelMap: Record<string, ExperienceLevel> = {
      'high_school': ExperienceLevel.ENTRY_LEVEL,
      'bachelor': ExperienceLevel.JUNIOR,
      'master': ExperienceLevel.MID_LEVEL,
      'phd': ExperienceLevel.SENIOR
    };

    return educationLevelMap[educationLevel] || ExperienceLevel.ENTRY_LEVEL;
  }

  /**
   * Generate skill weights based on user's skill profile
   */
  private generateSkillWeights(skills: Record<string, number>): Record<string, number> {
    const weights: Record<string, number> = {};
    const totalSkills = Object.keys(skills).length;

    if (totalSkills === 0) return weights;

    // Assign higher weights to stronger skills
    Object.entries(skills).forEach(([skill, level]) => {
      // Weight based on skill level (higher level = higher weight)
      weights[skill] = Math.min(level / 10, 1); // Normalize to 0-1
    });

    return weights;
  }

  /**
   * Build search query from user profile
   */
  private buildSearchQuery(userProfile: UserSkillProfile, filters: IJobFilters): JobSearchQuery {
    const query: JobSearchQuery = {
      limit: 100 // Fetch more jobs for better matching
    };

    // Add location preferences
    if (userProfile.locations.length > 0) {
      const location = userProfile.locations[0];
      if (location) {
        query.location = location;
      }
    }

    // Add job type preferences
    if (userProfile.preferredJobTypes.length > 0) {
      const jobType = userProfile.preferredJobTypes[0];
      if (jobType) {
        query.jobType = jobType;
      }
    }

    // Add experience level
    query.experienceLevel = userProfile.experienceLevel;

    // Add salary expectations
    if (userProfile.salaryExpectations.min > 0) {
      query.salaryMin = userProfile.salaryExpectations.min;
    }

    // Add skills as search terms
    const topSkills = Object.entries(userProfile.skills)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([skill]) => skill);

    if (topSkills.length > 0) {
      query.skills = topSkills;
      query.query = topSkills.join(' OR ');
    }

    // Apply additional filters
    if (filters.companies && filters.companies.length > 0) {
      const company = filters.companies[0];
      if (company) {
        query.company = company;
      }
    }

    if (filters.postedWithin) {
      query.postedWithin = filters.postedWithin;
    }

    return query;
  }

  /**
   * Calculate job matches with scoring
   */
  private async calculateJobMatches(
    jobs: IExternalJobData[],
    userProfile: UserSkillProfile,
    criteria: IJobMatchingCriteria
  ): Promise<any[]> {
    const matches = [];

    for (const job of jobs) {
      try {
        const matchScore = this.calculateMatchScore(job, userProfile, criteria);
        const skillAlignment = this.calculateSkillAlignment(job, userProfile);

        const jobMatch = {
          userId: new mongoose.Types.ObjectId(userProfile.userId),
          jobId: job.externalId,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          requirements: job.requirements,
          matchScore,
          skillAlignment,
          source: job.source,
          applicationStatus: ApplicationStatus.NOT_APPLIED,
          salaryRange: job.salaryRange,
          jobType: job.jobType,
          experienceLevel: job.experienceLevel,
          postedDate: job.postedDate,
          expiryDate: job.expiryDate,
          isActive: true
        };

        matches.push(jobMatch);

      } catch (error) {
        logger.error('Error calculating job match', {
          jobId: job.externalId,
          userId: userProfile.userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return matches;
  }

  /**
   * Calculate overall match score for a job
   */
  private calculateMatchScore(
    job: IExternalJobData,
    userProfile: UserSkillProfile,
    criteria: IJobMatchingCriteria
  ): number {
    let totalScore = 0;
    let totalWeight = 0;

    // Skill match score (weight varies by skill importance)
    const skillScore = this.calculateSkillMatchScore(job, userProfile, criteria.skillWeights);
    const skillWeight = 0.3; // 30% of total score
    totalScore += skillScore * skillWeight;
    totalWeight += skillWeight;

    // Location match score
    const locationScore = this.calculateLocationMatchScore(job, userProfile);
    totalScore += locationScore * criteria.locationWeight;
    totalWeight += criteria.locationWeight;

    // Salary match score
    const salaryScore = this.calculateSalaryMatchScore(job, userProfile);
    totalScore += salaryScore * criteria.salaryWeight;
    totalWeight += criteria.salaryWeight;

    // Experience level match score
    const experienceScore = this.calculateExperienceMatchScore(job, userProfile);
    totalScore += experienceScore * criteria.experienceWeight;
    totalWeight += criteria.experienceWeight;

    // Job type match score
    const jobTypeScore = this.calculateJobTypeMatchScore(job, userProfile);
    const jobTypeWeight = 0.1;
    totalScore += jobTypeScore * jobTypeWeight;
    totalWeight += jobTypeWeight;

    // Company preference score (if available)
    const companyScore = this.calculateCompanyMatchScore(job, userProfile);
    totalScore += companyScore * criteria.companyWeight;
    totalWeight += criteria.companyWeight;

    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
  }

  /**
   * Calculate skill match score
   */
  private calculateSkillMatchScore(
    job: IExternalJobData,
    userProfile: UserSkillProfile,
    skillWeights: Record<string, number>
  ): number {
    const jobSkills = this.extractJobSkills(job);
    if (jobSkills.length === 0) return 50; // Neutral score if no skills identified

    let totalScore = 0;
    let totalWeight = 0;

    jobSkills.forEach(jobSkill => {
      const skillName = jobSkill.toLowerCase();
      const userSkillLevel = userProfile.skills[skillName] || 0;
      const skillWeight = skillWeights[skillName] || 0.1; // Default weight

      // Score based on user's skill level vs requirement
      let skillScore = 0;
      if (userSkillLevel >= 7) {
        skillScore = 100; // Expert level
      } else if (userSkillLevel >= 5) {
        skillScore = 80; // Good level
      } else if (userSkillLevel >= 3) {
        skillScore = 60; // Basic level
      } else if (userSkillLevel > 0) {
        skillScore = 40; // Some knowledge
      } else {
        skillScore = 0; // No knowledge
      }

      totalScore += skillScore * skillWeight;
      totalWeight += skillWeight;
    });

    return totalWeight > 0 ? totalScore / totalWeight : 50;
  }

  /**
   * Extract skills from job data
   */
  private extractJobSkills(job: IExternalJobData): string[] {
    const skills = new Set<string>();
    const text = `${job.title} ${job.description} ${job.requirements.join(' ')}`.toLowerCase();

    // Technical skills patterns
    const skillPatterns = [
      /\b(?:javascript|typescript|python|java|react|angular|vue|node\.?js|sql|aws|azure|gcp)\b/gi,
      /\b(?:html|css|php|ruby|go|rust|swift|kotlin|scala|r|matlab|c\+\+|c#)\b/gi,
      /\b(?:git|jenkins|ci\/cd|agile|scrum|devops|machine learning|ai|data science)\b/gi,
      /\b(?:docker|kubernetes|terraform|ansible|linux|windows|mongodb|postgresql)\b/gi
    ];

    skillPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(skill => skills.add(skill.toLowerCase()));
      }
    });

    // Soft skills patterns
    const softSkillPatterns = [
      /\b(?:communication|leadership|teamwork|problem solving|analytical|creative)\b/gi,
      /\b(?:project management|time management|critical thinking|adaptability)\b/gi
    ];

    softSkillPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(skill => skills.add(skill.toLowerCase()));
      }
    });

    return Array.from(skills);
  }

  /**
   * Calculate location match score
   */
  private calculateLocationMatchScore(job: IExternalJobData, userProfile: UserSkillProfile): number {
    if (userProfile.locations.length === 0) return 100; // No preference = perfect match

    // Check for remote work
    if (job.jobType === JobType.REMOTE || job.location.toLowerCase().includes('remote')) {
      return 100;
    }

    // Check if job location matches any user preferred locations
    const jobLocation = job.location.toLowerCase();
    const matchingLocations = userProfile.locations.filter(userLoc =>
      jobLocation.includes(userLoc.toLowerCase()) || userLoc.toLowerCase().includes(jobLocation)
    );

    return matchingLocations.length > 0 ? 100 : 20; // High penalty for location mismatch
  }

  /**
   * Calculate salary match score
   */
  private calculateSalaryMatchScore(job: IExternalJobData, userProfile: UserSkillProfile): number {
    if (!job.salaryRange || (!job.salaryRange.min && !job.salaryRange.max)) {
      return 50; // Neutral score if no salary info
    }

    const jobMin = job.salaryRange.min || 0;
    const jobMax = job.salaryRange.max || job.salaryRange.min || 0;
    const userMin = userProfile.salaryExpectations.min;
    const userMax = userProfile.salaryExpectations.max;

    // Check for overlap
    if (jobMax >= userMin && jobMin <= userMax) {
      // Calculate overlap percentage
      const overlapMin = Math.max(jobMin, userMin);
      const overlapMax = Math.min(jobMax, userMax);
      const overlapSize = overlapMax - overlapMin;
      const userRangeSize = userMax - userMin;
      
      const overlapRatio = userRangeSize > 0 ? overlapSize / userRangeSize : 1;
      return Math.round(50 + (overlapRatio * 50)); // 50-100 score based on overlap
    }

    // No overlap - check how close they are
    if (jobMax < userMin) {
      const gap = userMin - jobMax;
      const gapRatio = gap / userMin;
      return Math.max(0, 50 - (gapRatio * 50)); // Penalty for low salary
    }

    if (jobMin > userMax) {
      // Job pays more than expected - bonus!
      return 100;
    }

    return 50;
  }

  /**
   * Calculate experience level match score
   */
  private calculateExperienceMatchScore(job: IExternalJobData, userProfile: UserSkillProfile): number {
    const experienceLevelOrder = [
      ExperienceLevel.ENTRY_LEVEL,
      ExperienceLevel.JUNIOR,
      ExperienceLevel.MID_LEVEL,
      ExperienceLevel.SENIOR,
      ExperienceLevel.LEAD,
      ExperienceLevel.MANAGER,
      ExperienceLevel.DIRECTOR,
      ExperienceLevel.EXECUTIVE
    ];

    const userLevelIndex = experienceLevelOrder.indexOf(userProfile.experienceLevel);
    const jobLevelIndex = experienceLevelOrder.indexOf(job.experienceLevel);

    if (userLevelIndex === jobLevelIndex) {
      return 100; // Perfect match
    }

    const levelDifference = Math.abs(userLevelIndex - jobLevelIndex);
    
    if (levelDifference === 1) {
      return 80; // Close match
    } else if (levelDifference === 2) {
      return 60; // Acceptable match
    } else {
      return 30; // Poor match
    }
  }

  /**
   * Calculate job type match score
   */
  private calculateJobTypeMatchScore(job: IExternalJobData, userProfile: UserSkillProfile): number {
    if (userProfile.preferredJobTypes.includes(job.jobType)) {
      return 100;
    }

    // Partial matches
    if (job.jobType === JobType.REMOTE && userProfile.preferredJobTypes.includes(JobType.FULL_TIME)) {
      return 90; // Remote full-time is usually acceptable
    }

    if (job.jobType === JobType.HYBRID && userProfile.preferredJobTypes.includes(JobType.FULL_TIME)) {
      return 85; // Hybrid full-time is usually acceptable
    }

    return 30; // Poor match
  }

  /**
   * Calculate company match score
   */
  private calculateCompanyMatchScore(_job: IExternalJobData, _userProfile: UserSkillProfile): number {
    // This is a placeholder - in a real system, you'd have user company preferences
    // For now, return neutral score
    return 50;
  }

  /**
   * Calculate detailed skill alignment
   */
  private calculateSkillAlignment(job: IExternalJobData, userProfile: UserSkillProfile): Map<string, any> {
    const skillAlignment = new Map();
    const jobSkills = this.extractJobSkills(job);

    jobSkills.forEach(jobSkill => {
      const skillName = jobSkill.toLowerCase();
      const userLevel = userProfile.skills[skillName] || 0;
      const requiredLevel = this.estimateRequiredSkillLevel(job, skillName);
      const gap = Math.max(0, requiredLevel - userLevel);
      const weight = this.calculateSkillWeight(skillName, job);

      skillAlignment.set(skillName, {
        required: requiredLevel > 0,
        userLevel,
        requiredLevel,
        gap,
        weight
      });
    });

    return skillAlignment;
  }

  /**
   * Estimate required skill level for a job
   */
  private estimateRequiredSkillLevel(job: IExternalJobData, _skill: string): number {
    const text = `${job.title} ${job.description} ${job.requirements.join(' ')}`.toLowerCase();
    
    // Check for skill level indicators
    if (text.includes('expert') || text.includes('advanced') || text.includes('senior')) {
      return 8;
    } else if (text.includes('proficient') || text.includes('experienced')) {
      return 6;
    } else if (text.includes('familiar') || text.includes('knowledge')) {
      return 4;
    } else if (text.includes('basic') || text.includes('entry')) {
      return 3;
    }

    // Default based on experience level
    const experienceLevelMap: Record<ExperienceLevel, number> = {
      [ExperienceLevel.ENTRY_LEVEL]: 3,
      [ExperienceLevel.JUNIOR]: 4,
      [ExperienceLevel.MID_LEVEL]: 6,
      [ExperienceLevel.SENIOR]: 7,
      [ExperienceLevel.LEAD]: 8,
      [ExperienceLevel.MANAGER]: 7,
      [ExperienceLevel.DIRECTOR]: 8,
      [ExperienceLevel.EXECUTIVE]: 6
    };

    return experienceLevelMap[job.experienceLevel] || 5;
  }

  /**
   * Calculate skill weight based on importance in job
   */
  private calculateSkillWeight(skill: string, job: IExternalJobData): number {
    const text = `${job.title} ${job.description} ${job.requirements.join(' ')}`.toLowerCase();
    
    // Count occurrences of the skill
    const occurrences = (text.match(new RegExp(skill, 'gi')) || []).length;
    
    // Check if it's in the title (higher weight)
    const inTitle = job.title.toLowerCase().includes(skill);
    
    // Check if it's marked as required
    const isRequired = text.includes(`required ${skill}`) || text.includes(`must have ${skill}`);
    
    let weight = 0.1; // Base weight
    
    if (inTitle) weight += 0.3;
    if (isRequired) weight += 0.4;
    if (occurrences > 1) weight += Math.min(occurrences * 0.1, 0.3);
    
    return Math.min(weight, 1.0);
  }

  /**
   * Save job matches to database
   */
  private async saveJobMatches(matches: any[], userId: string): Promise<void> {
    try {
      // Remove existing matches for this user to avoid duplicates
      await JobMatch.deleteMany({ 
        userId: new mongoose.Types.ObjectId(userId),
        applicationStatus: ApplicationStatus.NOT_APPLIED 
      });

      // Save new matches
      if (matches.length > 0) {
        await JobMatch.insertMany(matches);
        
        logger.info('Job matches saved to database', {
          userId,
          matchCount: matches.length
        });
      }

    } catch (error) {
      logger.error('Error saving job matches', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        matchCount: matches.length
      });
      throw error;
    }
  }

  /**
   * Get existing job matches for a user
   */
  async getUserJobMatches(userId: string, options: {
    minMatchScore?: number;
    limit?: number;
    applicationStatus?: ApplicationStatus;
  } = {}): Promise<any[]> {
    try {
      const query: any = { userId: new mongoose.Types.ObjectId(userId), isActive: true };
      
      if (options.minMatchScore) {
        query.matchScore = { $gte: options.minMatchScore };
      }
      
      if (options.applicationStatus) {
        query.applicationStatus = options.applicationStatus;
      }

      const matches = await JobMatch.find(query)
        .sort({ matchScore: -1, postedDate: -1 })
        .limit(options.limit || 50)
        .lean();

      logger.debug('Retrieved user job matches', {
        userId,
        matchCount: matches.length,
        options
      });

      return matches;

    } catch (error) {
      logger.error('Error retrieving user job matches', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update match score for existing job matches
   */
  async updateMatchScores(userId: string): Promise<void> {
    try {
      const userProfile = await this.getUserSkillProfile(userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const existingMatches = await JobMatch.find({ 
        userId: new mongoose.Types.ObjectId(userId),
        isActive: true 
      });

      for (const match of existingMatches) {
        const newScore = await match.updateMatchScore(userProfile.skills);
        
        logger.debug('Updated match score', {
          userId,
          jobId: match.jobId,
          oldScore: match.matchScore,
          newScore
        });
      }

      logger.info('Match scores updated', {
        userId,
        updatedMatches: existingMatches.length
      });

    } catch (error) {
      logger.error('Error updating match scores', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

export const jobMatchingService = new JobMatchingService();