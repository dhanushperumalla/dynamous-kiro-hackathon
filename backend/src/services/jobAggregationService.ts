import { indeedJobService } from './indeedJobService';
import { linkedinJobService } from './linkedinJobService';
import { JobSearchQuery } from './jobBoardIntegrationService';
import { 
  IExternalJobData, 
  IJobAggregation, 
  INormalizedJob,
  IJobSyncResult,
  ISalaryRange,
  JobSource 
} from '@/types/job';
import { logger } from '@/utils/logger';

interface JobAggregationConfig {
  enabledSources: JobSource[];
  maxJobsPerSource: number;
  duplicateThreshold: number; // 0-100 similarity score threshold
  priorityOrder: JobSource[];
}

class JobAggregationService {
  private readonly services: Map<JobSource, any>;
  private readonly config: JobAggregationConfig;

  constructor() {
    this.services = new Map<JobSource, any>([
      [JobSource.INDEED, indeedJobService],
      [JobSource.LINKEDIN, linkedinJobService]
    ]);

    this.config = {
      enabledSources: [JobSource.INDEED, JobSource.LINKEDIN],
      maxJobsPerSource: 100,
      duplicateThreshold: 80,
      priorityOrder: [JobSource.LINKEDIN, JobSource.INDEED] // LinkedIn first for better data quality
    };

    logger.info('Job aggregation service initialized', {
      enabledSources: this.config.enabledSources,
      availableServices: Array.from(this.services.keys())
    });
  }

  /**
   * Aggregate jobs from multiple sources
   */
  async aggregateJobs(query: JobSearchQuery): Promise<{
    jobs: IExternalJobData[];
    aggregations: IJobAggregation[];
    syncResults: IJobSyncResult[];
  }> {
    const startTime = Date.now();
    const syncResults: IJobSyncResult[] = [];
    const allJobs: IExternalJobData[] = [];

    logger.info('Starting job aggregation', {
      query,
      enabledSources: this.config.enabledSources,
      maxJobsPerSource: this.config.maxJobsPerSource
    });

    // Fetch jobs from each enabled source
    for (const source of this.config.enabledSources) {
      const service = this.services.get(source);
      if (!service) {
        logger.warn(`Service not available for source: ${source}`);
        continue;
      }

      try {
        logger.debug(`Fetching jobs from ${source}`, { source, query });
        
        const jobs = await service.searchJobs({
          ...query,
          limit: Math.min(query.limit || 50, this.config.maxJobsPerSource)
        });

        allJobs.push(...jobs);

        syncResults.push({
          source,
          jobsFetched: jobs.length,
          jobsProcessed: jobs.length,
          jobsSkipped: 0,
          errors: [],
          duration: Date.now() - startTime,
          timestamp: new Date()
        });

        logger.info(`Successfully fetched ${jobs.length} jobs from ${source}`, {
          source,
          jobCount: jobs.length
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to fetch jobs from ${source}`, {
          source,
          error: errorMessage
        });

        syncResults.push({
          source,
          jobsFetched: 0,
          jobsProcessed: 0,
          jobsSkipped: 0,
          errors: [errorMessage],
          duration: Date.now() - startTime,
          timestamp: new Date()
        });
      }
    }

    // Detect and handle duplicates
    const { uniqueJobs, aggregations } = await this.detectAndAggregateDuplicates(allJobs);

    logger.info('Job aggregation completed', {
      totalJobsFetched: allJobs.length,
      uniqueJobs: uniqueJobs.length,
      duplicatesFound: allJobs.length - uniqueJobs.length,
      aggregations: aggregations.length,
      duration: Date.now() - startTime
    });

    return {
      jobs: uniqueJobs,
      aggregations,
      syncResults
    };
  }

  /**
   * Detect duplicate jobs and create aggregations
   */
  private async detectAndAggregateDuplicates(jobs: IExternalJobData[]): Promise<{
    uniqueJobs: IExternalJobData[];
    aggregations: IJobAggregation[];
  }> {
    const uniqueJobs: IExternalJobData[] = [];
    const aggregations: IJobAggregation[] = [];
    const processedJobs = new Set<string>();

    logger.debug('Starting duplicate detection', { totalJobs: jobs.length });

    for (let i = 0; i < jobs.length; i++) {
      const currentJob = jobs[i];
      if (!currentJob) continue;
      
      const currentJobKey = `${currentJob.source}-${currentJob.externalId}`;

      if (processedJobs.has(currentJobKey)) {
        continue; // Already processed as part of an aggregation
      }

      const duplicates: IExternalJobData[] = [currentJob];
      processedJobs.add(currentJobKey);

      // Find duplicates for the current job
      for (let j = i + 1; j < jobs.length; j++) {
        const compareJob = jobs[j];
        if (!compareJob) continue;
        
        const compareJobKey = `${compareJob.source}-${compareJob.externalId}`;

        if (processedJobs.has(compareJobKey)) {
          continue;
        }

        const similarity = this.calculateJobSimilarity(currentJob, compareJob);
        
        if (similarity >= this.config.duplicateThreshold) {
          duplicates.push(compareJob);
          processedJobs.add(compareJobKey);
          
          logger.debug('Duplicate job detected', {
            job1: `${currentJob.source}-${currentJob.title}`,
            job2: `${compareJob.source}-${compareJob.title}`,
            similarity
          });
        }
      }

      if (duplicates.length > 1) {
        // Create aggregation for duplicates
        const aggregation = this.createJobAggregation(duplicates);
        aggregations.push(aggregation);
        
        // Add the best job from the aggregation to unique jobs
        const bestJob = this.selectBestJob(duplicates);
        uniqueJobs.push(bestJob);
      } else {
        // No duplicates found, add the job as is
        uniqueJobs.push(currentJob);
      }
    }

    logger.debug('Duplicate detection completed', {
      originalJobs: jobs.length,
      uniqueJobs: uniqueJobs.length,
      aggregations: aggregations.length
    });

    return { uniqueJobs, aggregations };
  }

  /**
   * Calculate similarity between two jobs
   */
  private calculateJobSimilarity(job1: IExternalJobData, job2: IExternalJobData): number {
    let score = 0;
    let totalWeight = 0;

    // Title similarity (weight: 40%)
    const titleWeight = 40;
    const titleSimilarity = this.calculateStringSimilarity(job1.title, job2.title);
    score += titleSimilarity * titleWeight;
    totalWeight += titleWeight;

    // Company similarity (weight: 30%)
    const companyWeight = 30;
    const companySimilarity = this.calculateStringSimilarity(job1.company, job2.company);
    score += companySimilarity * companyWeight;
    totalWeight += companyWeight;

    // Location similarity (weight: 20%)
    const locationWeight = 20;
    const locationSimilarity = this.calculateStringSimilarity(job1.location, job2.location);
    score += locationSimilarity * locationWeight;
    totalWeight += locationWeight;

    // Description similarity (weight: 10%)
    const descriptionWeight = 10;
    const descriptionSimilarity = this.calculateStringSimilarity(
      job1.description.substring(0, 500), // Compare first 500 chars
      job2.description.substring(0, 500)
    );
    score += descriptionSimilarity * descriptionWeight;
    totalWeight += descriptionWeight;

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 100;
    
    const maxLength = Math.max(s1.length, s2.length);
    if (maxLength === 0) return 100;
    
    const distance = this.levenshteinDistance(s1, s2);
    return Math.max(0, (1 - distance / maxLength) * 100);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0]![i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j]![0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1, // deletion
          matrix[j - 1]![i]! + 1, // insertion
          matrix[j - 1]![i - 1]! + indicator // substitution
        );
      }
    }

    return matrix[str2.length]![str1.length]!;
  }

  /**
   * Create job aggregation from duplicate jobs
   */
  private createJobAggregation(jobs: IExternalJobData[]): IJobAggregation {
    const normalizedJob = this.normalizeJobData(jobs);
    const firstJob = jobs[0];
    const duplicateScore = jobs.length > 1 && firstJob ? 
      jobs.reduce((sum, job, index) => {
        if (index === 0) return sum;
        return sum + this.calculateJobSimilarity(firstJob, job);
      }, 0) / (jobs.length - 1) : 0;

    return {
      id: `agg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      externalJobs: jobs,
      normalizedJob,
      duplicateScore,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Normalize job data from multiple sources
   */
  private normalizeJobData(jobs: IExternalJobData[]): INormalizedJob {
    // Select the best job as the base
    const baseJob = this.selectBestJob(jobs);
    
    // Merge requirements from all sources
    const allRequirements = jobs.flatMap(job => job.requirements);
    const uniqueRequirements = [...new Set(allRequirements)];

    // Extract skills from requirements and descriptions
    const skills = this.extractSkillsFromJobs(jobs);

    // Merge benefits
    const allBenefits = jobs.flatMap(job => job.benefits || []);
    const uniqueBenefits = [...new Set(allBenefits)];

    // Determine best salary range
    const salaryRange = this.determineBestSalaryRange(jobs);

    // Determine industry from job functions or company info
    const industry = this.determineIndustry(jobs);

    const normalized: INormalizedJob = {
      title: baseJob.title,
      company: baseJob.company,
      location: baseJob.location,
      description: baseJob.description,
      requirements: uniqueRequirements,
      skills,
      jobType: baseJob.jobType,
      experienceLevel: baseJob.experienceLevel,
      benefits: uniqueBenefits,
      industry
    };

    // Only add salaryRange if it exists
    if (salaryRange) {
      normalized.salaryRange = salaryRange;
    }

    return normalized;
  }

  /**
   * Select the best job from duplicates based on priority and data quality
   */
  private selectBestJob(jobs: IExternalJobData[]): IExternalJobData {
    if (jobs.length === 0) {
      throw new Error('Cannot select best job from empty array');
    }

    // Sort by priority order first
    const sortedByPriority = jobs.sort((a, b) => {
      const aPriority = this.config.priorityOrder.indexOf(a.source);
      const bPriority = this.config.priorityOrder.indexOf(b.source);
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same priority, prefer job with more complete data
      const aScore = this.calculateDataCompletenessScore(a);
      const bScore = this.calculateDataCompletenessScore(b);
      
      return bScore - aScore;
    });

    return sortedByPriority[0]!;
  }

  /**
   * Calculate data completeness score for a job
   */
  private calculateDataCompletenessScore(job: IExternalJobData): number {
    let score = 0;
    
    // Basic fields (required)
    if (job.title) score += 10;
    if (job.company) score += 10;
    if (job.location) score += 10;
    if (job.description && job.description.length > 100) score += 15;
    
    // Optional but valuable fields
    if (job.requirements && job.requirements.length > 0) score += 15;
    if (job.salaryRange) score += 20;
    if (job.benefits && job.benefits.length > 0) score += 10;
    if (job.companyLogo) score += 5;
    if (job.expiryDate) score += 5;
    
    return score;
  }

  /**
   * Extract skills from job data
   */
  private extractSkillsFromJobs(jobs: IExternalJobData[]): string[] {
    const skillSet = new Set<string>();
    
    // Common technical skills patterns
    const skillPatterns = [
      /\b(?:javascript|typescript|python|java|react|angular|vue|node\.?js|sql|aws|azure|gcp)\b/gi,
      /\b(?:html|css|php|ruby|go|rust|swift|kotlin|scala|r|matlab|c\+\+|c#)\b/gi,
      /\b(?:git|jenkins|ci\/cd|agile|scrum|devops|machine learning|ai|data science)\b/gi,
      /\b(?:docker|kubernetes|terraform|ansible|linux|windows|macos)\b/gi
    ];

    jobs.forEach(job => {
      const text = `${job.title} ${job.description} ${job.requirements.join(' ')}`;
      
      skillPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(skill => skillSet.add(skill.toLowerCase()));
        }
      });
    });

    return Array.from(skillSet).slice(0, 20); // Limit to top 20 skills
  }

  /**
   * Determine the best salary range from multiple sources
   */
  private determineBestSalaryRange(jobs: IExternalJobData[]): ISalaryRange | null {
    const salaryRanges = jobs
      .map(job => job.salaryRange)
      .filter((range): range is ISalaryRange => !!range && !!(range.min || range.max));

    if (salaryRanges.length === 0) return null;

    // Calculate average min and max
    const validMins = salaryRanges.filter(r => r.min !== undefined).map(r => r.min!);
    const validMaxs = salaryRanges.filter(r => r.max !== undefined).map(r => r.max!);

    if (validMins.length === 0 && validMaxs.length === 0) return null;

    const firstRange = salaryRanges[0]!;

    const result: ISalaryRange = {
      currency: firstRange.currency,
      period: firstRange.period,
      location: firstRange.location,
      negotiable: false
    };

    // Only add min/max if they exist
    if (validMins.length > 0) {
      result.min = Math.round(validMins.reduce((sum, val) => sum + val, 0) / validMins.length);
    }

    if (validMaxs.length > 0) {
      result.max = Math.round(validMaxs.reduce((sum, val) => sum + val, 0) / validMaxs.length);
    }

    return result;
  }

  /**
   * Determine industry from job data
   */
  private determineIndustry(jobs: IExternalJobData[]): string {
    // Extract industry keywords from job titles and descriptions
    const industryKeywords = new Map<string, number>();
    
    const industryPatterns = {
      'Technology': /\b(?:software|tech|it|computer|digital|cyber|data|ai|ml)\b/gi,
      'Healthcare': /\b(?:health|medical|hospital|clinic|pharma|biotech)\b/gi,
      'Finance': /\b(?:bank|finance|financial|investment|insurance|fintech)\b/gi,
      'Education': /\b(?:education|school|university|teaching|academic)\b/gi,
      'Retail': /\b(?:retail|ecommerce|sales|customer|store)\b/gi,
      'Manufacturing': /\b(?:manufacturing|production|factory|industrial)\b/gi,
      'Consulting': /\b(?:consulting|advisory|strategy|management)\b/gi
    };

    jobs.forEach(job => {
      const text = `${job.title} ${job.description}`.toLowerCase();
      
      Object.entries(industryPatterns).forEach(([industry, pattern]) => {
        const matches = text.match(pattern);
        if (matches) {
          industryKeywords.set(industry, (industryKeywords.get(industry) || 0) + matches.length);
        }
      });
    });

    // Return the industry with the highest score
    let topIndustry = 'Technology'; // Default
    let maxScore = 0;

    for (const [industry, score] of industryKeywords) {
      if (score > maxScore) {
        maxScore = score;
        topIndustry = industry;
      }
    }

    return topIndustry;
  }

  /**
   * Get aggregation service status
   */
  getServiceStatus() {
    const serviceStatuses = Array.from(this.services.entries()).map(([source, service]) => ({
      source,
      status: service.getIntegrationStatus ? service.getIntegrationStatus() : { isActive: true }
    }));

    return {
      enabledSources: this.config.enabledSources,
      availableServices: Array.from(this.services.keys()),
      serviceStatuses,
      config: this.config
    };
  }

  /**
   * Update aggregation configuration
   */
  updateConfig(newConfig: Partial<JobAggregationConfig>) {
    Object.assign(this.config, newConfig);
    
    logger.info('Job aggregation config updated', {
      newConfig: this.config
    });
  }
}

export const jobAggregationService = new JobAggregationService();