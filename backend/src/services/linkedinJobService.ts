import { BaseJobBoardService, JobSearchQuery } from './jobBoardIntegrationService';
import { IExternalJobData, JobSource, JobType, ExperienceLevel, SalaryPeriod } from '@/types/job';
import { logger } from '@/utils/logger';

// LinkedIn job data interface
interface LinkedInJob {
  id: string;
  title: string;
  companyDetails: {
    company: string;
    companyId: string;
    companyLogo?: string;
  };
  location: {
    countryCode: string;
    postalCode?: string;
    city?: string;
    region?: string;
  };
  description: {
    text: string;
    html?: string;
  };
  formattedLocation: string;
  listedAt: number;
  expireAt?: number;
  jobState: string;
  workplaceTypes: string[];
  employmentStatus: string;
  jobFunctions: string[];
  industries: string[];
  seniority: string;
  applyMethod: {
    companyApplyUrl?: string;
    easyApplyUrl?: string;
  };
  salary?: {
    currency: string;
    min?: number;
    max?: number;
    period: string;
  };
  benefits?: string[];
  skills?: string[];
}

class LinkedInJobService extends BaseJobBoardService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor() {
    const clientId = process.env['LINKEDIN_CLIENT_ID'] || '';
    const clientSecret = process.env['LINKEDIN_CLIENT_SECRET'] || '';
    const accessToken = process.env['LINKEDIN_ACCESS_TOKEN'];
    
    super(
      JobSource.LINKEDIN,
      'https://api.linkedin.com/rest',
      undefined, // We'll handle auth differently for LinkedIn
      { requestsPerMinute: 100, requestsPerHour: 5000, requestsPerDay: 50000 }
    );

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    if (accessToken) {
      this.accessToken = accessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      logger.warn('LinkedIn API credentials not configured. Service will be limited.');
    }

    // Set up LinkedIn-specific headers
    (this.client.defaults.headers as any)['LinkedIn-Version'] = '202401';
    (this.client.defaults.headers as any)['X-Restli-Protocol-Version'] = '2.0.0';

    logger.info('LinkedIn job service initialized', {
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      hasAccessToken: !!accessToken,
      baseUrl: this.baseUrl
    });
  }

  async searchJobs(query: JobSearchQuery): Promise<IExternalJobData[]> {
    try {
      await this.ensureAuthenticated();
      
      logger.debug('Searching LinkedIn jobs', { query, source: this.source });

      const url = this.buildSearchUrl(query);
      const response = await this.client.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const parsedResponse = this.parseResponse(response.data);
      const jobs = parsedResponse.jobs.map(job => this.transformJobData(job));
      
      logger.info(`Found ${jobs.length} jobs from LinkedIn`, {
        source: this.source,
        query: query.query,
        location: query.location,
        totalResults: parsedResponse.totalResults
      });

      return jobs;

    } catch (error) {
      logger.error('Error searching LinkedIn jobs', {
        source: this.source,
        error: error instanceof Error ? error.message : 'Unknown error',
        query
      });
      throw error;
    }
  }

  async getJobDetails(jobId: string): Promise<IExternalJobData | null> {
    try {
      await this.ensureAuthenticated();
      
      logger.debug('Fetching LinkedIn job details', { jobId, source: this.source });

      const url = `/jobs/${jobId}?decoration=(id,title,companyDetails,location,description,formattedLocation,listedAt,expireAt,jobState,workplaceTypes,employmentStatus,jobFunctions,industries,seniority,applyMethod,salary,benefits,skills,fullDescription,requirements,responsibilities,qualifications,companyInfo)`;
      
      const response = await this.client.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data) {
        logger.warn('Job not found on LinkedIn', { jobId, source: this.source });
        return null;
      }

      const job = this.transformJobData(response.data);
      
      logger.debug('Retrieved LinkedIn job details', {
        jobId,
        source: this.source,
        title: job.title
      });

      return job;

    } catch (error) {
      logger.error('Error fetching LinkedIn job details', {
        source: this.source,
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  protected buildSearchUrl(query: JobSearchQuery): string {
    const params = new URLSearchParams();
    
    // Base endpoint for job search
    let endpoint = '/jobSearch';
    
    // Build search criteria
    const searchCriteria: any = {};

    if (query.query) {
      searchCriteria.keywords = query.query;
    }

    if (query.location) {
      searchCriteria.location = query.location;
    }

    if (query.company) {
      searchCriteria.company = query.company;
    }

    // Job type mapping for LinkedIn
    if (query.jobType) {
      const jobTypeMap: Record<JobType, string[]> = {
        [JobType.FULL_TIME]: ['F'],
        [JobType.PART_TIME]: ['P'],
        [JobType.CONTRACT]: ['C'],
        [JobType.FREELANCE]: ['C'],
        [JobType.INTERNSHIP]: ['I'],
        [JobType.TEMPORARY]: ['T'],
        [JobType.REMOTE]: ['F'], // Remote is a workplace type, not employment type
        [JobType.HYBRID]: ['F']
      };
      searchCriteria.employmentStatus = jobTypeMap[query.jobType];
    }

    // Experience level mapping
    if (query.experienceLevel) {
      const experienceMap: Record<ExperienceLevel, string[]> = {
        [ExperienceLevel.ENTRY_LEVEL]: ['1', '2'], // Internship, Entry level
        [ExperienceLevel.JUNIOR]: ['2', '3'], // Entry level, Associate
        [ExperienceLevel.MID_LEVEL]: ['4', '5'], // Mid-Senior level
        [ExperienceLevel.SENIOR]: ['5', '6'], // Mid-Senior level, Director
        [ExperienceLevel.LEAD]: ['6', '7'], // Director, Executive
        [ExperienceLevel.MANAGER]: ['6', '7'],
        [ExperienceLevel.DIRECTOR]: ['7', '8'],
        [ExperienceLevel.EXECUTIVE]: ['8', '9', '10']
      };
      searchCriteria.experienceLevel = experienceMap[query.experienceLevel];
    }

    // Salary filter
    if (query.salaryMin) {
      searchCriteria.salary = {
        min: query.salaryMin,
        currency: 'USD'
      };
    }

    // Date posted filter
    if (query.postedWithin) {
      const now = Date.now();
      const daysAgo = query.postedWithin * 24 * 60 * 60 * 1000;
      searchCriteria.datePosted = now - daysAgo;
    }

    // Pagination
    const page = query.page || 1;
    const limit = Math.min(query.limit || 25, 50); // LinkedIn max varies
    const start = (page - 1) * limit;
    
    params.append('start', start.toString());
    params.append('count', limit.toString());

    // Add search criteria as query parameter
    if (Object.keys(searchCriteria).length > 0) {
      params.append('q', 'criteria');
      params.append('criteria', JSON.stringify(searchCriteria));
    }

    // Decoration parameter to specify which fields to return
    const decoration = '(elements*(id,title,companyDetails,location,description,formattedLocation,listedAt,expireAt,jobState,workplaceTypes,employmentStatus,jobFunctions,industries,seniority,applyMethod,salary,benefits,skills))';
    params.append('decoration', decoration);

    const url = `${endpoint}?${params.toString()}`;
    
    logger.debug('Built LinkedIn search URL', {
      source: this.source,
      endpoint,
      searchCriteria,
      pagination: { start, count: limit }
    });

    return url;
  }

  protected parseResponse(response: any): { jobs: LinkedInJob[]; totalResults?: number; hasMore?: boolean } {
    if (!response || !response.elements) {
      logger.warn('Invalid LinkedIn API response', { source: this.source, response });
      return { jobs: [], totalResults: 0, hasMore: false };
    }

    const paging = response.paging || {};
    const totalResults = paging.total || 0;
    const currentStart = paging.start || 0;
    const currentCount = paging.count || 0;

    return {
      jobs: response.elements || [],
      totalResults,
      hasMore: (currentStart + currentCount) < totalResults
    };
  }

  protected transformJobData(rawJob: LinkedInJob): IExternalJobData {
    try {
      // Extract requirements from description
      const requirements = this.extractRequirements(rawJob.description.text);
      
      // Determine job type from employment status and workplace types
      const jobType = this.determineJobType(rawJob.employmentStatus, rawJob.workplaceTypes);
      
      // Map LinkedIn seniority to our experience levels
      const experienceLevel = this.mapLinkedInSeniority(rawJob.seniority);

      // Extract salary information
      let salaryRange;
      if (rawJob.salary) {
        const period = this.normalizeLinkedInSalaryPeriod(rawJob.salary.period);
        const salaryData: any = {
          currency: rawJob.salary.currency,
          period,
          location: rawJob.formattedLocation,
          negotiable: false
        };
        
        // Only add min/max if they exist
        if (rawJob.salary.min !== undefined) {
          salaryData.min = rawJob.salary.min;
        }
        if (rawJob.salary.max !== undefined) {
          salaryData.max = rawJob.salary.max;
        }
        
        salaryRange = salaryData;
      }

      // Determine application URL
      const applicationUrl = rawJob.applyMethod.easyApplyUrl || 
                           rawJob.applyMethod.companyApplyUrl || 
                           `https://www.linkedin.com/jobs/view/${rawJob.id}`;

      // Parse posted date
      const postedDate = new Date(rawJob.listedAt);
      const expiryDate = rawJob.expireAt ? new Date(rawJob.expireAt) : undefined;

      // Extract benefits
      const benefits = rawJob.benefits || [];

      const transformedJob: IExternalJobData = {
        externalId: rawJob.id,
        source: this.source,
        title: rawJob.title,
        company: rawJob.companyDetails.company,
        location: rawJob.formattedLocation,
        description: rawJob.description.text,
        requirements,
        jobType,
        experienceLevel,
        postedDate,
        applicationUrl,
        benefits,
        rawData: rawJob
      };

      // Only add optional properties if they exist
      if (salaryRange) {
        transformedJob.salaryRange = salaryRange;
      }
      if (expiryDate) {
        transformedJob.expiryDate = expiryDate;
      }
      if (rawJob.companyDetails.companyLogo) {
        transformedJob.companyLogo = rawJob.companyDetails.companyLogo;
      }

      logger.debug('Transformed LinkedIn job data', {
        source: this.source,
        jobId: rawJob.id,
        title: transformedJob.title,
        company: transformedJob.company,
        jobType: transformedJob.jobType,
        experienceLevel: transformedJob.experienceLevel
      });

      return transformedJob;

    } catch (error) {
      logger.error('Error transforming LinkedIn job data', {
        source: this.source,
        jobId: rawJob.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        rawJob
      });
      throw error;
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return; // Token is still valid
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('LinkedIn API credentials not configured');
    }

    try {
      // LinkedIn OAuth 2.0 Client Credentials flow
      const tokenResponse = await this.client.post('https://www.linkedin.com/oauth/v2/accessToken', {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'r_jobs'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = tokenResponse.data.access_token;
      const expiresIn = tokenResponse.data.expires_in || 3600; // Default 1 hour
      this.tokenExpiry = new Date(Date.now() + (expiresIn * 1000));

      logger.info('LinkedIn access token refreshed', {
        source: this.source,
        expiresAt: this.tokenExpiry
      });

    } catch (error) {
      logger.error('Failed to authenticate with LinkedIn API', {
        source: this.source,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('LinkedIn authentication failed');
    }
  }

  private extractRequirements(description: string): string[] {
    if (!description) return [];

    const requirements: string[] = [];

    // LinkedIn-specific requirement patterns
    const patterns = [
      /(?:requirements?|qualifications?|must have|we're looking for|you have|you bring)\s*:?\s*([^.!?\n]+)/gi,
      /(?:experience with|knowledge of|proficient in|skilled in|expertise in)\s+([^.!?\n]+)/gi,
      /(?:bachelor|master|degree|certification|license)\s+([^.!?\n]+)/gi,
      /(?:\d+\+?\s*years?\s*(?:of\s*)?(?:experience|exp))/gi,
      /(?:required skills?|key skills?|technical skills?)\s*:?\s*([^.!?\n]+)/gi
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        const requirement = match[1] || match[0];
        if (requirement && requirement.length > 5 && requirement.length < 300) {
          requirements.push(requirement.trim());
        }
      }
    });

    // Extract technical skills
    const skillPatterns = [
      /\b(?:javascript|typescript|python|java|react|angular|vue|node\.?js|sql|aws|azure|gcp|docker|kubernetes)\b/gi,
      /\b(?:html|css|php|ruby|go|rust|swift|kotlin|scala|r|matlab|c\+\+|c#)\b/gi,
      /\b(?:git|jenkins|ci\/cd|agile|scrum|devops|machine learning|ai|data science|analytics)\b/gi,
      /\b(?:salesforce|sap|oracle|microsoft|adobe|tableau|power bi|excel|powerpoint)\b/gi
    ];

    skillPatterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        matches.forEach(skill => {
          if (!requirements.some(req => req.toLowerCase().includes(skill.toLowerCase()))) {
            requirements.push(skill);
          }
        });
      }
    });

    return [...new Set(requirements)].slice(0, 15); // Remove duplicates and limit to 15
  }

  private determineJobType(employmentStatus: string, workplaceTypes: string[]): JobType {
    // Check workplace types first for remote/hybrid
    if (workplaceTypes.includes('remote')) {
      return JobType.REMOTE;
    }
    if (workplaceTypes.includes('hybrid')) {
      return JobType.HYBRID;
    }

    // Map LinkedIn employment status
    switch (employmentStatus?.toUpperCase()) {
      case 'F':
      case 'FULL_TIME':
        return JobType.FULL_TIME;
      case 'P':
      case 'PART_TIME':
        return JobType.PART_TIME;
      case 'C':
      case 'CONTRACT':
        return JobType.CONTRACT;
      case 'I':
      case 'INTERNSHIP':
        return JobType.INTERNSHIP;
      case 'T':
      case 'TEMPORARY':
        return JobType.TEMPORARY;
      default:
        return JobType.FULL_TIME;
    }
  }

  private mapLinkedInSeniority(seniority: string): ExperienceLevel {
    if (!seniority) return ExperienceLevel.MID_LEVEL;

    const seniorityMap: Record<string, ExperienceLevel> = {
      '1': ExperienceLevel.ENTRY_LEVEL, // Internship
      '2': ExperienceLevel.ENTRY_LEVEL, // Entry level
      '3': ExperienceLevel.JUNIOR, // Associate
      '4': ExperienceLevel.MID_LEVEL, // Mid-Senior level
      '5': ExperienceLevel.SENIOR, // Mid-Senior level
      '6': ExperienceLevel.LEAD, // Director
      '7': ExperienceLevel.MANAGER, // Executive
      '8': ExperienceLevel.DIRECTOR, // Senior Executive
      '9': ExperienceLevel.EXECUTIVE, // Owner/Partner
      '10': ExperienceLevel.EXECUTIVE // Owner/Partner
    };

    return seniorityMap[seniority] || ExperienceLevel.MID_LEVEL;
  }

  private normalizeLinkedInSalaryPeriod(period: string): SalaryPeriod {
    const normalized = period.toLowerCase();
    
    if (normalized.includes('hour')) return SalaryPeriod.HOURLY;
    if (normalized.includes('day')) return SalaryPeriod.DAILY;
    if (normalized.includes('week')) return SalaryPeriod.WEEKLY;
    if (normalized.includes('month')) return SalaryPeriod.MONTHLY;
    
    return SalaryPeriod.YEARLY;
  }

  // Get LinkedIn-specific integration status
  override getIntegrationStatus() {
    const baseStatus = super.getIntegrationStatus();
    return {
      ...baseStatus,
      clientId: !!this.clientId,
      hasValidToken: !!(this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()),
      tokenExpiry: this.tokenExpiry,
      features: {
        jobSearch: true,
        jobDetails: true,
        salaryData: true,
        companyInfo: true,
        applicationTracking: false,
        easyApply: true
      }
    };
  }
}

export const linkedinJobService = new LinkedInJobService();