import apiClient from './authApi';
import {
  JobListing,
  JobRecommendation,
  JobFilters,
  JobApplication,
  JobAlert,
  JobStats,
  CompanyInfo,
  ApplicationDocument,
  Interview,
  FollowUp,
} from '@/types/jobs';

class JobService {
  /**
   * Get job recommendations based on user profile and domain
   */
  async getJobRecommendations(filters?: JobFilters): Promise<JobRecommendation> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await apiClient.get(`/jobs/recommendations?${params.toString()}`);
    return response.data.data.recommendation;
  }

  /**
   * Search jobs with filters
   */
  async searchJobs(filters: JobFilters): Promise<{
    jobs: JobListing[];
    totalJobs: number;
    hasMore: boolean;
    filters: JobFilters;
  }> {
    const response = await apiClient.post('/jobs/search', filters);
    return response.data.data;
  }

  /**
   * Get job details by ID
   */
  async getJobDetails(jobId: string): Promise<JobListing & {
    companyInfo: CompanyInfo;
    similarJobs: JobListing[];
    applicationDeadline?: string;
    applicationInstructions?: string;
  }> {
    const response = await apiClient.get(`/jobs/${jobId}`);
    return response.data.data.job;
  }

  /**
   * Save job for later
   */
  async saveJob(jobId: string, notes?: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await apiClient.post(`/jobs/${jobId}/save`, { notes });
    return response.data;
  }

  /**
   * Remove saved job
   */
  async unsaveJob(jobId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await apiClient.delete(`/jobs/${jobId}/save`);
    return response.data;
  }

  /**
   * Apply to job
   */
  async applyToJob(jobId: string, applicationData: {
    coverLetter?: string;
    documents: string[]; // Document IDs
    notes?: string;
  }): Promise<JobApplication> {
    const response = await apiClient.post(`/jobs/${jobId}/apply`, applicationData);
    return response.data.data.application;
  }

  /**
   * Get user's job applications
   */
  async getApplications(status?: JobApplication['status']): Promise<JobApplication[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const response = await apiClient.get(`/jobs/applications?${params.toString()}`);
    return response.data.data.applications;
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    applicationId: string,
    status: JobApplication['status'],
    notes?: string
  ): Promise<JobApplication> {
    const response = await apiClient.put(`/jobs/applications/${applicationId}/status`, {
      status,
      notes,
    });
    return response.data.data.application;
  }

  /**
   * Add interview to application
   */
  async addInterview(applicationId: string, interview: Omit<Interview, 'id'>): Promise<Interview> {
    const response = await apiClient.post(`/jobs/applications/${applicationId}/interviews`, interview);
    return response.data.data.interview;
  }

  /**
   * Update interview
   */
  async updateInterview(interviewId: string, updates: Partial<Interview>): Promise<Interview> {
    const response = await apiClient.put(`/jobs/interviews/${interviewId}`, updates);
    return response.data.data.interview;
  }

  /**
   * Add follow-up to application
   */
  async addFollowUp(applicationId: string, followUp: Omit<FollowUp, 'id'>): Promise<FollowUp> {
    const response = await apiClient.post(`/jobs/applications/${applicationId}/followups`, followUp);
    return response.data.data.followUp;
  }

  /**
   * Upload application document
   */
  async uploadDocument(file: File, type: ApplicationDocument['type']): Promise<ApplicationDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const response = await apiClient.post('/jobs/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data.document;
  }

  /**
   * Get user's documents
   */
  async getDocuments(): Promise<ApplicationDocument[]> {
    const response = await apiClient.get('/jobs/documents');
    return response.data.data.documents;
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await apiClient.delete(`/jobs/documents/${documentId}`);
    return response.data;
  }

  /**
   * Create job alert
   */
  async createJobAlert(alert: Omit<JobAlert, 'id' | 'userId' | 'createdAt' | 'lastSent'>): Promise<JobAlert> {
    const response = await apiClient.post('/jobs/alerts', alert);
    return response.data.data.alert;
  }

  /**
   * Get user's job alerts
   */
  async getJobAlerts(): Promise<JobAlert[]> {
    const response = await apiClient.get('/jobs/alerts');
    return response.data.data.alerts;
  }

  /**
   * Update job alert
   */
  async updateJobAlert(alertId: string, updates: Partial<JobAlert>): Promise<JobAlert> {
    const response = await apiClient.put(`/jobs/alerts/${alertId}`, updates);
    return response.data.data.alert;
  }

  /**
   * Delete job alert
   */
  async deleteJobAlert(alertId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await apiClient.delete(`/jobs/alerts/${alertId}`);
    return response.data;
  }

  /**
   * Get job application statistics
   */
  async getJobStats(): Promise<JobStats> {
    const response = await apiClient.get('/jobs/stats');
    return response.data.data.stats;
  }

  /**
   * Get company information
   */
  async getCompanyInfo(companyName: string): Promise<CompanyInfo> {
    const response = await apiClient.get(`/jobs/companies/${encodeURIComponent(companyName)}`);
    return response.data.data.company;
  }

  /**
   * Get trending jobs in user's domain
   */
  async getTrendingJobs(domainId?: string, limit: number = 10): Promise<JobListing[]> {
    const params = new URLSearchParams();
    if (domainId) params.append('domainId', domainId);
    params.append('limit', limit.toString());

    const response = await apiClient.get(`/jobs/trending?${params.toString()}`);
    return response.data.data.jobs;
  }

  /**
   * Get salary insights for a role/location
   */
  async getSalaryInsights(jobTitle: string, location?: string): Promise<{
    averageSalary: number;
    salaryRange: { min: number; max: number };
    currency: string;
    dataPoints: number;
    trends: Array<{
      year: number;
      averageSalary: number;
    }>;
    byExperience: Array<{
      level: string;
      averageSalary: number;
      range: { min: number; max: number };
    }>;
  }> {
    const params = new URLSearchParams();
    params.append('jobTitle', jobTitle);
    if (location) params.append('location', location);

    const response = await apiClient.get(`/jobs/salary-insights?${params.toString()}`);
    return response.data.data;
  }

  /**
   * Get job market insights
   */
  async getMarketInsights(domainId?: string): Promise<{
    totalJobs: number;
    jobGrowth: number;
    topSkills: Array<{ skill: string; demand: number }>;
    topCompanies: Array<{ company: string; jobCount: number }>;
    salaryTrends: Array<{ month: string; averageSalary: number }>;
    locationDistribution: Array<{ location: string; jobCount: number }>;
  }> {
    const params = new URLSearchParams();
    if (domainId) params.append('domainId', domainId);

    const response = await apiClient.get(`/jobs/market-insights?${params.toString()}`);
    return response.data.data;
  }
}

export const jobService = new JobService();