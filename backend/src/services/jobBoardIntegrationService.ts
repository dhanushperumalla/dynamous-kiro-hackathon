import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { logger } from '@/utils/logger';
import { 
  IExternalJobData, 
  IJobSyncResult, 
  IJobBoardIntegration,
  JobSource,
  JobType,
  ExperienceLevel,
  SalaryPeriod
} from '@/types/job';

// Base interface for job board API responses
interface BaseJobBoardResponse {
  jobs: any[];
  totalResults?: number;
  hasMore?: boolean;
  nextPage?: string | number;
}

// Rate limiting interface
interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

// Abstract base class for job board integrations
abstract class BaseJobBoardService {
  protected client: AxiosInstance;
  protected source: JobSource;
  protected baseUrl: string;
  protected apiKey?: string;
  protected rateLimit: RateLimitConfig;
  protected requestCount: { minute: number; hour: number; day: number } = { minute: 0, hour: 0, day: 0 };
  protected lastResetTime: { minute: number; hour: number; day: number };

  constructor(source: JobSource, baseUrl: string, apiKey?: string, rateLimit?: RateLimitConfig) {
    this.source = source;
    this.baseUrl = baseUrl;
    if (apiKey !== undefined) {
      this.apiKey = apiKey;
    }
    this.rateLimit = rateLimit || { requestsPerMinute: 60, requestsPerHour: 1000, requestsPerDay: 10000 };
    
    const now = Date.now();
    this.lastResetTime = { minute: now, hour: now, day: now };

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'User-Agent': 'AI-Sikshak-Job-Aggregator/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for rate limiting and authentication
    this.client.interceptors.request.use(
      (config) => this.handleRequestInterceptor(config),
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleResponseError(error)
    );
  }

  // Abstract methods that must be implemented by subclasses
  abstract searchJobs(query: JobSearchQuery): Promise<IExternalJobData[]>;
  abstract getJobDetails(jobId: string): Promise<IExternalJobData | null>;
  protected abstract transformJobData(rawJob: any): IExternalJobData;
  protected abstract buildSearchUrl(query: JobSearchQuery): string;
  protected abstract parseResponse(response: any): BaseJobBoardResponse;

  // Rate limiting check
  protected async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counters if time periods have passed
    if (now - this.lastResetTime.minute >= 60000) { // 1 minute
      this.requestCount.minute = 0;
      this.lastResetTime.minute = now;
    }
    if (now - this.lastResetTime.hour >= 3600000) { // 1 hour
      this.requestCount.hour = 0;
      this.lastResetTime.hour = now;
    }
    if (now - this.lastResetTime.day >= 86400000) { // 1 day
      this.requestCount.day = 0;
      this.lastResetTime.day = now;
    }

    // Check if we've exceeded any limits
    if (this.requestCount.minute >= this.rateLimit.requestsPerMinute) {
      const waitTime = 60000 - (now - this.lastResetTime.minute);
      logger.warn(`Rate limit exceeded for ${this.source}. Waiting ${waitTime}ms`, {
        source: this.source,
        requestsThisMinute: this.requestCount.minute,
        limit: this.rateLimit.requestsPerMinute
      });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    if (this.requestCount.hour >= this.rateLimit.requestsPerHour) {
      throw new Error(`Hourly rate limit exceeded for ${this.source}`);
    }

    if (this.requestCount.day >= this.rateLimit.requestsPerDay) {
      throw new Error(`Daily rate limit exceeded for ${this.source}`);
    }

    // Increment counters
    this.requestCount.minute++;
    this.requestCount.hour++;
    this.requestCount.day++;
  }

  // Request interceptor
  private async handleRequestInterceptor(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    await this.checkRateLimit();

    // Add authentication if available
    if (this.apiKey) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    logger.debug(`Making request to ${this.source}`, {
      url: config.url,
      method: config.method,
      source: this.source
    });

    return config;
  }

  // Response error handler
  private handleResponseError(error: any): Promise<never> {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    logger.error(`${this.source} API error`, {
      status,
      message,
      url: error.config?.url,
      source: this.source
    });

    // Handle specific error codes
    if (status === 429) {
      throw new Error(`Rate limit exceeded for ${this.source}`);
    } else if (status === 401 || status === 403) {
      throw new Error(`Authentication failed for ${this.source}`);
    } else if (status >= 500) {
      throw new Error(`${this.source} server error: ${message}`);
    }

    throw error;
  }

  // Sync jobs with pagination support
  async syncJobs(query: JobSearchQuery, maxJobs: number = 1000): Promise<IJobSyncResult> {
    const startTime = Date.now();
    const result: IJobSyncResult = {
      source: this.source,
      jobsFetched: 0,
      jobsProcessed: 0,
      jobsSkipped: 0,
      errors: [],
      duration: 0,
      timestamp: new Date()
    };

    try {
      logger.info(`Starting job sync for ${this.source}`, {
        source: this.source,
        maxJobs,
        query
      });

      let allJobs: IExternalJobData[] = [];
      let currentQuery = { ...query };
      let hasMore = true;
      let page = 1;

      while (hasMore && allJobs.length < maxJobs) {
        try {
          const jobs = await this.searchJobs({ ...currentQuery, page });
          
          if (jobs.length === 0) {
            hasMore = false;
            break;
          }

          allJobs = allJobs.concat(jobs);
          result.jobsFetched += jobs.length;

          logger.debug(`Fetched page ${page} from ${this.source}`, {
            source: this.source,
            page,
            jobsInPage: jobs.length,
            totalFetched: allJobs.length
          });

          // Check if we should continue
          if (jobs.length < (currentQuery.limit || 50)) {
            hasMore = false;
          } else {
            page++;
            currentQuery.page = page;
          }

          // Add delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Page ${page}: ${errorMessage}`);
          logger.error(`Error fetching page ${page} from ${this.source}`, {
            source: this.source,
            page,
            error: errorMessage
          });
          
          // Continue with next page unless it's a critical error
          if (errorMessage.includes('rate limit') || errorMessage.includes('authentication')) {
            break;
          }
          page++;
        }
      }

      // Process and validate jobs
      for (const job of allJobs) {
        try {
          if (this.validateJobData(job)) {
            result.jobsProcessed++;
          } else {
            result.jobsSkipped++;
          }
        } catch (error) {
          result.jobsSkipped++;
          result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      result.duration = Date.now() - startTime;

      logger.info(`Job sync completed for ${this.source}`, {
        ...result
      });

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      
      logger.error(`Job sync failed for ${this.source}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        ...result
      });

      return result;
    }
  }

  // Validate job data
  protected validateJobData(job: IExternalJobData): boolean {
    const required = ['externalId', 'title', 'company', 'location', 'description'];
    
    for (const field of required) {
      if (!job[field as keyof IExternalJobData] || 
          (typeof job[field as keyof IExternalJobData] === 'string' && 
           (job[field as keyof IExternalJobData] as string).trim() === '')) {
        logger.debug(`Job validation failed: missing ${field}`, {
          source: this.source,
          jobId: job.externalId
        });
        return false;
      }
    }

    // Validate enums
    if (!Object.values(JobType).includes(job.jobType)) {
      logger.debug(`Job validation failed: invalid job type ${job.jobType}`, {
        source: this.source,
        jobId: job.externalId
      });
      return false;
    }

    if (!Object.values(ExperienceLevel).includes(job.experienceLevel)) {
      logger.debug(`Job validation failed: invalid experience level ${job.experienceLevel}`, {
        source: this.source,
        jobId: job.externalId
      });
      return false;
    }

    return true;
  }

  // Normalize job type from various formats
  protected normalizeJobType(jobType: string): JobType {
    const normalized = jobType.toLowerCase().replace(/[-_\s]/g, '');
    
    const mappings: Record<string, JobType> = {
      'fulltime': JobType.FULL_TIME,
      'full': JobType.FULL_TIME,
      'parttime': JobType.PART_TIME,
      'part': JobType.PART_TIME,
      'contract': JobType.CONTRACT,
      'contractor': JobType.CONTRACT,
      'freelance': JobType.FREELANCE,
      'freelancer': JobType.FREELANCE,
      'internship': JobType.INTERNSHIP,
      'intern': JobType.INTERNSHIP,
      'temporary': JobType.TEMPORARY,
      'temp': JobType.TEMPORARY,
      'remote': JobType.REMOTE,
      'hybrid': JobType.HYBRID
    };

    return mappings[normalized] || JobType.FULL_TIME;
  }

  // Normalize experience level
  protected normalizeExperienceLevel(level: string): ExperienceLevel {
    const normalized = level.toLowerCase().replace(/[-_\s]/g, '');
    
    const mappings: Record<string, ExperienceLevel> = {
      'entry': ExperienceLevel.ENTRY_LEVEL,
      'entrylevel': ExperienceLevel.ENTRY_LEVEL,
      'junior': ExperienceLevel.JUNIOR,
      'jr': ExperienceLevel.JUNIOR,
      'mid': ExperienceLevel.MID_LEVEL,
      'midlevel': ExperienceLevel.MID_LEVEL,
      'middle': ExperienceLevel.MID_LEVEL,
      'senior': ExperienceLevel.SENIOR,
      'sr': ExperienceLevel.SENIOR,
      'lead': ExperienceLevel.LEAD,
      'manager': ExperienceLevel.MANAGER,
      'mgr': ExperienceLevel.MANAGER,
      'director': ExperienceLevel.DIRECTOR,
      'executive': ExperienceLevel.EXECUTIVE,
      'exec': ExperienceLevel.EXECUTIVE
    };

    return mappings[normalized] || ExperienceLevel.MID_LEVEL;
  }

  // Extract salary information
  protected extractSalary(salaryText: string, location: string = 'Unknown') {
    if (!salaryText) return undefined;

    // Common salary patterns
    const patterns = [
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(per\s+)?(year|annual|yearly|hour|hourly|month|monthly)/i,
      /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(per\s+)?(year|annual|yearly|hour|hourly|month|monthly)/i,
      /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*k/i
    ];

    for (const pattern of patterns) {
      const match = salaryText.match(pattern);
      if (match) {
        const minValue = match[1];
        const maxValue = match[2];
        const min = minValue ? parseFloat(minValue.replace(/,/g, '')) : 0;
        const max = maxValue ? parseFloat(maxValue.replace(/,/g, '')) : min;
        const period = this.normalizeSalaryPeriod((match[3] || match[4] || 'yearly') as string);

        // Handle 'k' notation (e.g., "50-80k")
        if (salaryText.includes('k') && min < 1000) {
          return {
            currency: 'USD',
            min: min * 1000,
            max: max * 1000,
            period,
            location,
            negotiable: false
          };
        }

        return {
          currency: 'USD',
          min,
          max,
          period,
          location,
          negotiable: false
        };
      }
    }

    return undefined;
  }

  // Normalize salary period
  private normalizeSalaryPeriod(period: string): SalaryPeriod {
    const normalized = period.toLowerCase();
    
    if (normalized.includes('hour')) return SalaryPeriod.HOURLY;
    if (normalized.includes('day')) return SalaryPeriod.DAILY;
    if (normalized.includes('week')) return SalaryPeriod.WEEKLY;
    if (normalized.includes('month')) return SalaryPeriod.MONTHLY;
    
    return SalaryPeriod.YEARLY;
  }

  // Get integration status
  getIntegrationStatus(): IJobBoardIntegration {
    const status: IJobBoardIntegration = {
      source: this.source,
      baseUrl: this.baseUrl,
      rateLimit: this.rateLimit.requestsPerMinute,
      isActive: true,
      lastSync: new Date(),
      totalJobsFetched: 0,
      errorCount: 0
    };

    if (this.apiKey !== undefined) {
      status.apiKey = this.apiKey;
    }

    return status;
  }
}

// Job search query interface
export interface JobSearchQuery {
  query?: string;
  location?: string;
  jobType?: JobType;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  company?: string;
  skills?: string[];
  postedWithin?: number; // days
  page?: number;
  limit?: number;
}

export { BaseJobBoardService };