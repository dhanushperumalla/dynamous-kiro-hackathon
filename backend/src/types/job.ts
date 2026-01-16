import { Document, Types } from 'mongoose';

// Job match interface
export interface IJobMatch {
  id: string;
  userId: string;
  jobId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  matchScore: number; // 0-100 scale
  skillAlignment: ISkillAlignment;
  source: JobSource;
  applicationStatus: ApplicationStatus;
  salaryRange?: ISalaryRange;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  postedDate: Date;
  expiryDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Skill alignment interface
export interface ISkillAlignment {
  [skill: string]: {
    required: boolean;
    userLevel: number; // 0-10 scale
    requiredLevel: number; // 0-10 scale
    gap: number; // requiredLevel - userLevel
    weight: number; // Importance weight for this skill
  };
}

// Salary range interface
export interface ISalaryRange {
  currency: string;
  min?: number;
  max?: number;
  median?: number;
  period: SalaryPeriod;
  location: string;
  negotiable: boolean;
}

// Job source enum
export enum JobSource {
  INDEED = 'indeed',
  LINKEDIN = 'linkedin',
  GLASSDOOR = 'glassdoor',
  COMPANY_WEBSITE = 'company_website',
  INTERNAL = 'internal'
}

// Application status enum
export enum ApplicationStatus {
  NOT_APPLIED = 'not_applied',
  APPLIED = 'applied',
  UNDER_REVIEW = 'under_review',
  INTERVIEWING = 'interviewing',
  OFFER_RECEIVED = 'offer_received',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  ACCEPTED = 'accepted'
}

// Job type enum
export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  FREELANCE = 'freelance',
  INTERNSHIP = 'internship',
  TEMPORARY = 'temporary',
  REMOTE = 'remote',
  HYBRID = 'hybrid'
}

// Experience level enum
export enum ExperienceLevel {
  ENTRY_LEVEL = 'entry_level',
  JUNIOR = 'junior',
  MID_LEVEL = 'mid_level',
  SENIOR = 'senior',
  LEAD = 'lead',
  MANAGER = 'manager',
  DIRECTOR = 'director',
  EXECUTIVE = 'executive'
}

// Salary period enum
export enum SalaryPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

// Job application interface
export interface IJobApplication {
  id: string;
  userId: string;
  jobMatchId: string;
  applicationDate: Date;
  status: ApplicationStatus;
  coverLetter?: string;
  resume?: string;
  additionalDocuments?: IDocument[];
  notes?: string;
  timeline: IApplicationTimeline[];
  feedback?: IApplicationFeedback;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Document interface for attachments
export interface IDocument {
  id: string;
  name: string;
  type: DocumentType;
  url: string;
  size: number; // in bytes
  uploadedAt: Date;
}

// Document type enum
export enum DocumentType {
  RESUME = 'resume',
  COVER_LETTER = 'cover_letter',
  PORTFOLIO = 'portfolio',
  CERTIFICATE = 'certificate',
  TRANSCRIPT = 'transcript',
  REFERENCE = 'reference',
  OTHER = 'other'
}

// Application timeline interface
export interface IApplicationTimeline {
  id: string;
  status: ApplicationStatus;
  date: Date;
  notes?: string;
  source: TimelineSource;
  details?: Record<string, any>;
}

// Timeline source enum
export enum TimelineSource {
  USER = 'user',
  SYSTEM = 'system',
  EMPLOYER = 'employer',
  INTEGRATION = 'integration'
}

// Application feedback interface
export interface IApplicationFeedback {
  rating: number; // 1-5 scale
  comments?: string;
  interviewExperience?: string;
  companyRating?: number; // 1-5 scale
  wouldRecommend: boolean;
  submittedAt: Date;
}

// Job preferences interface
export interface IJobPreferences {
  userId: string;
  locations: string[];
  remoteWork: RemoteWorkPreference;
  jobTypes: JobType[];
  experienceLevels: ExperienceLevel[];
  salaryExpectations: ISalaryExpectation;
  industries: string[];
  companySize: CompanySize[];
  benefits: string[];
  workCulture: string[];
  commute: ICommutePreference;
  availability: IAvailability;
  updatedAt: Date;
}

// Remote work preference enum
export enum RemoteWorkPreference {
  REMOTE_ONLY = 'remote_only',
  HYBRID = 'hybrid',
  ON_SITE = 'on_site',
  FLEXIBLE = 'flexible'
}

// Company size enum
export enum CompanySize {
  STARTUP = 'startup', // 1-50 employees
  SMALL = 'small', // 51-200 employees
  MEDIUM = 'medium', // 201-1000 employees
  LARGE = 'large', // 1001-5000 employees
  ENTERPRISE = 'enterprise' // 5000+ employees
}

// Salary expectation interface
export interface ISalaryExpectation {
  currency: string;
  min: number;
  max: number;
  period: SalaryPeriod;
  negotiable: boolean;
  benefits: IBenefitImportance[];
}

// Benefit importance interface
export interface IBenefitImportance {
  benefit: string;
  importance: ImportanceLevel; // How important this benefit is to the user
}

// Importance level enum
export enum ImportanceLevel {
  NOT_IMPORTANT = 'not_important',
  SOMEWHAT_IMPORTANT = 'somewhat_important',
  IMPORTANT = 'important',
  VERY_IMPORTANT = 'very_important',
  CRITICAL = 'critical'
}

// Commute preference interface
export interface ICommutePreference {
  maxDistance: number; // in kilometers
  maxDuration: number; // in minutes
  transportMethods: TransportMethod[];
  flexibility: CommuteFlexibility;
}

// Transport method enum
export enum TransportMethod {
  CAR = 'car',
  PUBLIC_TRANSPORT = 'public_transport',
  BICYCLE = 'bicycle',
  WALKING = 'walking',
  MOTORCYCLE = 'motorcycle',
  RIDESHARE = 'rideshare'
}

// Commute flexibility enum
export enum CommuteFlexibility {
  STRICT = 'strict',
  SOMEWHAT_FLEXIBLE = 'somewhat_flexible',
  FLEXIBLE = 'flexible',
  VERY_FLEXIBLE = 'very_flexible'
}

// Availability interface
export interface IAvailability {
  startDate: Date;
  noticePeriod: number; // in days
  workingHours: IWorkingHours;
  timeZone: string;
  flexibility: ScheduleFlexibility;
}

// Working hours interface
export interface IWorkingHours {
  preferredStart: string; // HH:MM format
  preferredEnd: string; // HH:MM format
  flexibleHours: boolean;
  weekends: boolean;
  overtime: boolean;
}

// Schedule flexibility enum
export enum ScheduleFlexibility {
  FIXED = 'fixed',
  SOMEWHAT_FLEXIBLE = 'somewhat_flexible',
  FLEXIBLE = 'flexible',
  VERY_FLEXIBLE = 'very_flexible'
}

// Job matching algorithm interface
export interface IJobMatchingCriteria {
  userId: string;
  skillWeights: Record<string, number>; // Skill importance weights
  locationWeight: number; // 0-1 scale
  salaryWeight: number; // 0-1 scale
  experienceWeight: number; // 0-1 scale
  companyWeight: number; // 0-1 scale
  minimumMatchScore: number; // Minimum score to consider a match
  maxResults: number;
  filters: IJobFilters;
}

// Job filters interface
export interface IJobFilters {
  locations?: string[];
  jobTypes?: JobType[];
  experienceLevels?: ExperienceLevel[];
  salaryRange?: {
    min?: number;
    max?: number;
    currency: string;
  };
  companies?: string[];
  industries?: string[];
  skills?: string[];
  postedWithin?: number; // days
  excludeApplied?: boolean;
}

// External job data interface (for API integrations)
export interface IExternalJobData {
  externalId: string;
  source: JobSource;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salaryRange?: ISalaryRange;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  postedDate: Date;
  expiryDate?: Date;
  applicationUrl: string;
  companyLogo?: string;
  benefits?: string[];
  rawData: Record<string, any>; // Original API response
}

// Job aggregation interface
export interface IJobAggregation {
  id: string;
  externalJobs: IExternalJobData[];
  normalizedJob: INormalizedJob;
  duplicateScore: number; // 0-100 scale indicating how similar jobs are
  createdAt: Date;
  updatedAt: Date;
}

// Normalized job interface
export interface INormalizedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  skills: string[];
  salaryRange?: ISalaryRange;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  benefits: string[];
  industry: string;
  companySize?: CompanySize;
}

// MongoDB document interfaces
export interface IJobMatchDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  jobId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  matchScore: number;
  skillAlignment: ISkillAlignment;
  source: JobSource;
  applicationStatus: ApplicationStatus;
  salaryRange?: ISalaryRange;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  postedDate: Date;
  expiryDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  updateMatchScore(userSkills: Record<string, number>): Promise<number>;
  canApply(): { canApply: boolean; reason?: string };
}

export interface IJobApplicationDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  jobMatchId: Types.ObjectId;
  applicationDate: Date;
  status: ApplicationStatus;
  coverLetter?: string;
  resume?: string;
  additionalDocuments?: IDocument[];
  notes?: string;
  timeline: IApplicationTimeline[];
  feedback?: IApplicationFeedback;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  updateStatus(status: ApplicationStatus, notes?: string): Promise<void>;
  addTimelineEntry(entry: Omit<IApplicationTimeline, 'id'>): Promise<void>;
}

export interface IJobPreferencesDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  locations: string[];
  remoteWork: RemoteWorkPreference;
  jobTypes: JobType[];
  experienceLevels: ExperienceLevel[];
  salaryExpectations: ISalaryExpectation;
  industries: string[];
  companySize: CompanySize[];
  benefits: string[];
  workCulture: string[];
  commute: ICommutePreference;
  availability: IAvailability;
  updatedAt: Date;
}

// API request/response interfaces
export interface IJobMatchRequest {
  userId: string;
  criteria?: Partial<IJobMatchingCriteria>;
  refresh?: boolean; // Force refresh from external sources
}

export interface IJobMatchResponse {
  success: boolean;
  data: {
    matches: IJobMatch[];
    totalMatches: number;
    criteria: IJobMatchingCriteria;
    lastUpdated: Date;
  };
  message?: string;
}

export interface IJobApplicationRequest {
  jobMatchId: string;
  coverLetter?: string;
  resume?: string;
  additionalDocuments?: IDocument[];
  notes?: string;
}

export interface IJobApplicationResponse {
  success: boolean;
  data: {
    application: IJobApplication;
    nextSteps?: string[];
  };
  message?: string;
}

export interface IJobPreferencesRequest {
  locations?: string[];
  remoteWork?: RemoteWorkPreference;
  jobTypes?: JobType[];
  experienceLevels?: ExperienceLevel[];
  salaryExpectations?: ISalaryExpectation;
  industries?: string[];
  companySize?: CompanySize[];
  benefits?: string[];
  workCulture?: string[];
  commute?: ICommutePreference;
  availability?: IAvailability;
}

export interface IJobPreferencesResponse {
  success: boolean;
  data: {
    preferences: IJobPreferences;
    recommendedJobs?: IJobMatch[];
  };
  message?: string;
}

// Search and analytics interfaces
export interface IJobSearchQuery {
  query?: string;
  location?: string;
  jobType?: JobType;
  experienceLevel?: ExperienceLevel;
  salaryMin?: number;
  salaryMax?: number;
  company?: string;
  skills?: string[];
  postedWithin?: number; // days
  sortBy?: JobSortBy;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export enum JobSortBy {
  MATCH_SCORE = 'matchScore',
  POSTED_DATE = 'postedDate',
  SALARY = 'salary',
  COMPANY = 'company',
  LOCATION = 'location',
  TITLE = 'title'
}

export interface IJobAnalytics {
  userId: string;
  totalMatches: number;
  averageMatchScore: number;
  applicationRate: number; // percentage of matches that resulted in applications
  responseRate: number; // percentage of applications that got responses
  interviewRate: number; // percentage of applications that led to interviews
  offerRate: number; // percentage of applications that resulted in offers
  topSkillGaps: ISkillGap[];
  preferredJobTypes: Record<JobType, number>;
  salaryTrends: ISalaryTrend[];
  locationPreferences: Record<string, number>;
  lastUpdated: Date;
}

export interface ISkillGap {
  skill: string;
  currentLevel: number;
  averageRequiredLevel: number;
  gap: number;
  jobsRequiring: number;
  priority: SkillPriority;
}

export enum SkillPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface ISalaryTrend {
  period: string; // YYYY-MM format
  averageSalary: number;
  jobCount: number;
  currency: string;
}

// Validation interfaces
export interface IJobMatchValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number;
}

export interface IApplicationValidation {
  canApply: boolean;
  errors: string[];
  warnings: string[];
  requirements: string[];
}

// Integration interfaces for external job boards
export interface IJobBoardIntegration {
  source: JobSource;
  apiKey?: string;
  baseUrl: string;
  rateLimit: number; // requests per minute
  isActive: boolean;
  lastSync: Date;
  totalJobsFetched: number;
  errorCount: number;
}

export interface IJobSyncResult {
  source: JobSource;
  jobsFetched: number;
  jobsProcessed: number;
  jobsSkipped: number;
  errors: string[];
  duration: number; // in milliseconds
  timestamp: Date;
}

// Notification interfaces for job-related events
export interface IJobNotification {
  userId: string;
  type: JobNotificationType;
  jobMatchId?: string;
  applicationId?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
}

export enum JobNotificationType {
  NEW_MATCH = 'new_match',
  APPLICATION_STATUS_CHANGE = 'application_status_change',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  OFFER_RECEIVED = 'offer_received',
  JOB_EXPIRED = 'job_expired',
  SKILL_GAP_ALERT = 'skill_gap_alert',
  SALARY_ALERT = 'salary_alert'
}