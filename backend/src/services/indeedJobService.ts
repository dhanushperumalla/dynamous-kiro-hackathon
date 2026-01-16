import { BaseJobBoardService, JobSearchQuery } from './jobBoardIntegrationService';
import { IExternalJobData, JobSource, JobType, ExperienceLevel } from '@/types/job';
import { logger } from '@/utils/logger';

// Indeed job data interface
interface IndeedJob {
  jobkey: string;
  jobtitle: string;
  company: string;
  city: string;
  state: string;
  country: string;
  language: string;
  formattedLocation: string;
  source: string;
  date: string;
  snippet: string;
  url: string;
  onmousedown: string;
  latitude: number;
  longitude: number;
  jobTypeLabel?: string;
  salarySnippet?: string;
  sponsored: boolean;
  expired: boolean;
  indeedApply: boolean;
  formattedLocationFull: string;
  formattedRelativeTime: string;
  noUniqueUrl: boolean;
}

class IndeedJobService extends BaseJobBoardService {
  private readonly publisherId: string;
  private readonly version: string = '2';

  constructor() {
    const apiKey = process.env['INDEED_API_KEY'];
    const publisherId = process.env['INDEED_PUBLISHER_ID'] || '';
    
    super(
      JobSource.INDEED,
      'https://api.indeed.com/ads/apisearch',
      apiKey,
      { requestsPerMinute: 60, requestsPerHour: 1000, requestsPerDay: 10000 }
    );

    this.publisherId = publisherId;

    if (!this.publisherId) {
      logger.warn('Indeed Publisher ID not configured. Service will be limited.');
    }

    logger.info('Indeed job service initialized', {
      hasApiKey: !!apiKey,
      hasPublisherId: !!publisherId,
      baseUrl: this.baseUrl
    });
  }

  async searchJobs(query: JobSearchQuery): Promise<IExternalJobData[]> {
    try {
      logger.debug('Searching Indeed jobs', { query, source: this.source });

      const url = this.buildSearchUrl(query);
      const response = await this.client.get(url);
      const parsedResponse = this.parseResponse(response.data);

      const jobs = parsedResponse.jobs.map(job => this.transformJobData(job));
      
      logger.info(`Found ${jobs.length} jobs from Indeed`, {
        source: this.source,
        query: query.query,
        location: query.location,
        totalResults: parsedResponse.totalResults
      });

      return jobs;

    } catch (error) {
      logger.error('Error searching Indeed jobs', {
        source: this.source,
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      throw error;
    }
  }

  async getJobDetails(jobId: string): Promise<IExternalJobData | null> {
    try {
      logger.debug('Fetching Indeed job details', { jobId, source: this.source });

      // Indeed doesn't have a separate job details endpoint in their public API
      // We'll need to use the search endpoint with the specific job key
      const url = `${this.baseUrl}?publisher=${this.publisherId}&v=${this.version}&format=json&jobkeys=${jobId}`;
      const response = await this.client.get(url);
      const parsedResponse = this.parseResponse(response.data);

      if (parsedResponse.jobs.length === 0) {
        logger.warn('Job not found on Indeed', { jobId, source: this.source });
        return null;
      }

      const firstJob = parsedResponse.jobs[0];
      if (!firstJob) {
        logger.warn('Job data is undefined', { jobId, source: this.source });
        return null;
      }

      const job = this.transformJobData(firstJob);
      
      logger.debug('Retrieved Indeed job details', {
        jobId,
        source: this.source,
        title: job.title
      });

      return job;

    } catch (error) {
      logger.error('Error fetching Indeed job details', {
        source: this.source,
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  protected buildSearchUrl(query: JobSearchQuery): string {
    const params = new URLSearchParams();
    
    // Required parameters
    params.append('publisher', this.publisherId);
    params.append('v', this.version);
    params.append('format', 'json');

    // Search parameters
    if (query.query) {
      params.append('q', query.query);
    }

    if (query.location) {
      params.append('l', query.location);
    }

    if (query.salaryMin) {
      params.append('salary', `$${query.salaryMin}+`);
    }

    if (query.company) {
      params.append('co', query.company);
    }

    // Job type mapping
    if (query.jobType) {
      const jobTypeMap: Record<JobType, string> = {
        [JobType.FULL_TIME]: 'fulltime',
        [JobType.PART_TIME]: 'parttime',
        [JobType.CONTRACT]: 'contract',
        [JobType.FREELANCE]: 'contract',
        [JobType.INTERNSHIP]: 'internship',
        [JobType.TEMPORARY]: 'temporary',
        [JobType.REMOTE]: 'fulltime',
        [JobType.HYBRID]: 'fulltime'
      };
      params.append('jt', jobTypeMap[query.jobType]);
    }

    // Experience level mapping (Indeed uses different terms)
    if (query.experienceLevel) {
      const experienceMap: Record<ExperienceLevel, string> = {
        [ExperienceLevel.ENTRY_LEVEL]: 'entry_level',
        [ExperienceLevel.JUNIOR]: 'entry_level',
        [ExperienceLevel.MID_LEVEL]: 'mid_level',
        [ExperienceLevel.SENIOR]: 'senior_level',
        [ExperienceLevel.LEAD]: 'senior_level',
        [ExperienceLevel.MANAGER]: 'senior_level',
        [ExperienceLevel.DIRECTOR]: 'senior_level',
        [ExperienceLevel.EXECUTIVE]: 'senior_level'
      };
      params.append('explvl', experienceMap[query.experienceLevel]);
    }

    // Date posted filter
    if (query.postedWithin) {
      if (query.postedWithin <= 1) {
        params.append('fromage', '1');
      } else if (query.postedWithin <= 3) {
        params.append('fromage', '3');
      } else if (query.postedWithin <= 7) {
        params.append('fromage', '7');
      } else if (query.postedWithin <= 14) {
        params.append('fromage', '14');
      } else {
        params.append('fromage', '30');
      }
    }

    // Pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 25, 25); // Indeed max is 25 per request
    const start = (page - 1) * limit;
    params.append('start', start.toString());
    params.append('limit', limit.toString());

    // Additional parameters
    params.append('sort', 'relevance');
    params.append('radius', '25'); // 25 mile radius
    params.append('st', 'jobsite'); // Direct employer jobs
    params.append('jt', 'fulltime,parttime,contract,internship,temporary');
    params.append('duplicates', 'filter'); // Remove duplicates

    const url = `${this.baseUrl}?${params.toString()}`;
    
    logger.debug('Built Indeed search URL', {
      source: this.source,
      url: url.replace(this.publisherId, '[PUBLISHER_ID]'), // Hide publisher ID in logs
      query
    });

    return url;
  }

  protected parseResponse(response: any): { jobs: IndeedJob[]; totalResults?: number; hasMore?: boolean } {
    if (!response || !response.results) {
      logger.warn('Invalid Indeed API response', { source: this.source, response });
      return { jobs: [], totalResults: 0, hasMore: false };
    }

    return {
      jobs: response.results || [],
      totalResults: response.totalResults || 0,
      hasMore: (response.end || 0) < (response.totalResults || 0)
    };
  }

  protected transformJobData(rawJob: IndeedJob): IExternalJobData {
    try {
      // Extract requirements from snippet
      const requirements = this.extractRequirements(rawJob.snippet);
      
      // Determine job type
      let jobType = JobType.FULL_TIME;
      if (rawJob.jobTypeLabel) {
        jobType = this.normalizeJobType(rawJob.jobTypeLabel);
      }

      // Determine experience level from title and snippet
      const experienceLevel = this.extractExperienceLevel(rawJob.jobtitle, rawJob.snippet);

      // Extract salary information
      const salaryRange = rawJob.salarySnippet ? 
        this.extractSalary(rawJob.salarySnippet, rawJob.formattedLocation) : 
        undefined;

      // Build application URL
      const applicationUrl = rawJob.url || `https://www.indeed.com/viewjob?jk=${rawJob.jobkey}`;

      // Parse posted date
      const postedDate = this.parseIndeedDate(rawJob.date, rawJob.formattedRelativeTime);

      const transformedJob: IExternalJobData = {
        externalId: rawJob.jobkey,
        source: this.source,
        title: rawJob.jobtitle,
        company: rawJob.company,
        location: rawJob.formattedLocation || `${rawJob.city}, ${rawJob.state}`,
        description: rawJob.snippet,
        requirements,
        jobType,
        experienceLevel,
        postedDate,
        applicationUrl,
        rawData: rawJob
      };

      // Only add salaryRange if it exists
      if (salaryRange) {
        transformedJob.salaryRange = salaryRange;
      }

      logger.debug('Transformed Indeed job data', {
        source: this.source,
        jobId: rawJob.jobkey,
        title: transformedJob.title,
        company: transformedJob.company,
        jobType: transformedJob.jobType,
        experienceLevel: transformedJob.experienceLevel
      });

      return transformedJob;

    } catch (error) {
      logger.error('Error transforming Indeed job data', {
        source: this.source,
        jobId: rawJob.jobkey,
        error: error instanceof Error ? error.message : 'Unknown error',
        rawJob
      });
      throw error;
    }
  }

  private extractRequirements(snippet: string): string[] {
    if (!snippet) return [];

    const requirements: string[] = [];

    // Common requirement patterns
    const patterns = [
      /(?:requires?|must have|need|looking for|seeking)\s+([^.!?]+)/gi,
      /(?:experience with|knowledge of|proficient in|skilled in)\s+([^.!?]+)/gi,
      /(?:bachelor|master|degree|certification|license)\s+([^.!?]+)/gi,
      /(?:\d+\+?\s*years?\s*(?:of\s*)?(?:experience|exp))/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(snippet)) !== null) {
        const requirement = match[1] || match[0];
        if (requirement && requirement.length > 5 && requirement.length < 200) {
          requirements.push(requirement.trim());
        }
      }
    });

    // Extract skills and technologies
    const skillPatterns = [
      /\b(?:javascript|python|java|react|angular|vue|node\.?js|typescript|sql|aws|azure|docker|kubernetes)\b/gi,
      /\b(?:html|css|php|ruby|go|rust|swift|kotlin|scala|r|matlab)\b/gi,
      /\b(?:git|jenkins|ci\/cd|agile|scrum|devops|machine learning|ai|data science)\b/gi
    ];

    skillPatterns.forEach(pattern => {
      const matches = snippet.match(pattern);
      if (matches) {
        matches.forEach(skill => {
          if (!requirements.some(req => req.toLowerCase().includes(skill.toLowerCase()))) {
            requirements.push(skill);
          }
        });
      }
    });

    return [...new Set(requirements)].slice(0, 10); // Remove duplicates and limit to 10
  }

  private extractExperienceLevel(title: string, snippet: string): ExperienceLevel {
    const text = `${title} ${snippet}`.toLowerCase();

    // Experience level indicators
    if (text.includes('intern') || text.includes('internship')) {
      return ExperienceLevel.ENTRY_LEVEL;
    }
    
    if (text.includes('entry') || text.includes('junior') || text.includes('jr.') || 
        text.includes('graduate') || text.includes('associate')) {
      return ExperienceLevel.JUNIOR;
    }

    if (text.includes('senior') || text.includes('sr.') || text.includes('lead') ||
        text.match(/\b\d+\+?\s*years?\b/) && parseInt(text.match(/\b(\d+)\+?\s*years?\b/)?.[1] || '0') >= 5) {
      return ExperienceLevel.SENIOR;
    }

    if (text.includes('manager') || text.includes('supervisor') || text.includes('team lead')) {
      return ExperienceLevel.MANAGER;
    }

    if (text.includes('director') || text.includes('vp') || text.includes('vice president') ||
        text.includes('head of') || text.includes('chief')) {
      return ExperienceLevel.DIRECTOR;
    }

    if (text.includes('ceo') || text.includes('cto') || text.includes('cfo') || 
        text.includes('president') || text.includes('executive')) {
      return ExperienceLevel.EXECUTIVE;
    }

    // Default to mid-level if no clear indicators
    return ExperienceLevel.MID_LEVEL;
  }

  private parseIndeedDate(dateString: string, relativeTime?: string): Date {
    try {
      // Try parsing the relative time first (e.g., "2 days ago")
      if (relativeTime) {
        const now = new Date();
        const match = relativeTime.match(/(\d+)\s*(day|hour|minute)s?\s*ago/i);
        
        if (match && match[1] && match[2]) {
          const amount = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          
          switch (unit) {
            case 'day':
              return new Date(now.getTime() - (amount * 24 * 60 * 60 * 1000));
            case 'hour':
              return new Date(now.getTime() - (amount * 60 * 60 * 1000));
            case 'minute':
              return new Date(now.getTime() - (amount * 60 * 1000));
          }
        }

        if (relativeTime.includes('today')) {
          return new Date();
        }
      }

      // Try parsing the date string
      if (dateString) {
        const parsed = new Date(dateString);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }

      // Default to current date if parsing fails
      return new Date();

    } catch (error) {
      logger.debug('Error parsing Indeed date', {
        source: this.source,
        dateString,
        relativeTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return new Date();
    }
  }

  // Override rate limit for Indeed's specific limits
  protected override async checkRateLimit(): Promise<void> {
    // Indeed has specific rate limits: 1000 queries per month for free tier
    // We'll implement a more conservative approach
    await super.checkRateLimit();
  }

  // Get Indeed-specific integration status
  override getIntegrationStatus() {
    const baseStatus = super.getIntegrationStatus();
    return {
      ...baseStatus,
      publisherId: !!this.publisherId,
      version: this.version,
      features: {
        jobSearch: true,
        jobDetails: true,
        salaryData: true,
        companyInfo: false,
        applicationTracking: false
      }
    };
  }
}

export const indeedJobService = new IndeedJobService();