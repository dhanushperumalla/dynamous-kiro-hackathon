// Job recommendations and application tracking types
export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'internship' | 'remote';
  experience: 'entry' | 'mid' | 'senior' | 'executive';
  salary: {
    min?: number;
    max?: number;
    currency: string;
    period: 'hourly' | 'monthly' | 'yearly';
  };
  description: string;
  requirements: string[];
  skills: string[];
  benefits: string[];
  postedAt: string;
  expiresAt?: string;
  applicationUrl: string;
  companyLogo?: string;
  isRemote: boolean;
  matchScore: number; // 0-100 based on user profile
  matchReasons: string[];
  source: string; // Where the job was scraped from
}

export interface JobRecommendation {
  id: string;
  userId: string;
  domainId?: string;
  jobs: JobListing[];
  filters: JobFilters;
  totalJobs: number;
  confidence: number;
  reasoning: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JobFilters {
  keywords?: string[];
  location?: string;
  remote?: boolean;
  jobTypes?: ('full-time' | 'part-time' | 'contract' | 'internship')[];
  experienceLevels?: ('entry' | 'mid' | 'senior' | 'executive')[];
  salaryMin?: number;
  salaryMax?: number;
  companies?: string[];
  skills?: string[];
  sortBy?: 'relevance' | 'salary' | 'date' | 'match_score';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface JobApplication {
  id: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';
  appliedAt?: string;
  lastUpdated: string;
  notes?: string;
  documents: ApplicationDocument[];
  interviews: Interview[];
  followUps: FollowUp[];
}

export interface ApplicationDocument {
  id: string;
  type: 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'other';
  name: string;
  url: string;
  uploadedAt: string;
}

export interface Interview {
  id: string;
  type: 'phone' | 'video' | 'in-person' | 'technical' | 'behavioral';
  scheduledAt: string;
  duration: number; // in minutes
  interviewer?: string;
  notes?: string;
  outcome?: 'passed' | 'failed' | 'pending';
  feedback?: string;
}

export interface FollowUp {
  id: string;
  type: 'email' | 'call' | 'linkedin' | 'other';
  scheduledAt: string;
  completedAt?: string;
  notes?: string;
  outcome?: string;
}

export interface JobAlert {
  id: string;
  userId: string;
  name: string;
  filters: JobFilters;
  frequency: 'daily' | 'weekly' | 'monthly';
  isActive: boolean;
  lastSent?: string;
  createdAt: string;
}

export interface JobStats {
  totalSaved: number;
  totalApplied: number;
  totalInterviews: number;
  totalOffers: number;
  applicationRate: number; // percentage of saved jobs applied to
  responseRate: number; // percentage of applications that got responses
  interviewRate: number; // percentage of applications that led to interviews
  offerRate: number; // percentage of interviews that led to offers
}

export interface CompanyInfo {
  id: string;
  name: string;
  description?: string;
  industry: string;
  size: string; // e.g., "1-10", "11-50", "51-200", etc.
  location: string;
  website?: string;
  logo?: string;
  rating?: number;
  reviews?: number;
  benefits?: string[];
  culture?: string[];
}