import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Bookmark,
  BookmarkCheck,
  Filter,
  ArrowLeft,
  ExternalLink,
  TrendingUp
} from 'lucide-react';
import { jobService } from '@/services/jobService';
import { JobListing, JobFilters, JobRecommendation } from '@/types/jobs';
import toast from 'react-hot-toast';

export const JobMatching: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<JobFilters>({
    sortBy: 'match_score',
    sortOrder: 'desc',
    limit: 20
  });

  useEffect(() => {
    loadJobs();
  }, [filters]);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const data = await jobService.getJobRecommendations(filters);
      setJobs(data.jobs);
    } catch (err: any) {
      toast.error('Failed to load job recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveJob = async (jobId: string) => {
    try {
      if (savedJobs.has(jobId)) {
        await jobService.unsaveJob(jobId);
        setSavedJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobId);
          return newSet;
        });
        toast.success('Job removed from saved');
      } else {
        await jobService.saveJob(jobId);
        setSavedJobs(prev => new Set(prev).add(jobId));
        toast.success('Job saved successfully');
      }
    } catch (err: any) {
      toast.error('Failed to save job');
    }
  };

  const handleApplyToJob = async (job: JobListing) => {
    // Navigate to application page or open external link
    if (job.applicationUrl) {
      window.open(job.applicationUrl, '_blank');
      toast.success('Opening application page...');
    } else {
      toast.error('Application URL not available');
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getExperienceBadgeColor = (level: string) => {
    switch (level) {
      case 'entry': return 'bg-green-100 text-green-800';
      case 'mid': return 'bg-blue-100 text-blue-800';
      case 'senior': return 'bg-purple-100 text-purple-800';
      case 'executive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Job Recommendations</h1>
              <p className="text-gray-600 mt-2">
                {jobs.length} jobs matched to your profile
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Filter Jobs</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="e.g., New York, Remote"
                  value={filters.location || ''}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Type
                </label>
                <select
                  value={filters.jobTypes?.[0] || ''}
                  onChange={(e) => setFilters({ ...filters, jobTypes: e.target.value ? [e.target.value as any] : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="full-time">Full Time</option>
                  <option value="part-time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience Level
                </label>
                <select
                  value={filters.experienceLevels?.[0] || ''}
                  onChange={(e) => setFilters({ ...filters, experienceLevels: e.target.value ? [e.target.value as any] : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Levels</option>
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="executive">Executive</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex items-center">
              <input
                type="checkbox"
                id="remote"
                checked={filters.remote || false}
                onChange={(e) => setFilters({ ...filters, remote: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remote" className="ml-2 block text-sm text-gray-700">
                Remote only
              </label>
            </div>
          </div>
        )}

        {/* Job Listings */}
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-xl font-bold text-gray-900 mr-3">{job.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchScoreColor(job.matchScore)}`}>
                      {job.matchScore}% Match
                    </span>
                  </div>
                  
                  <div className="flex items-center text-gray-600 space-x-4 mb-3">
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-1" />
                      <span className="text-sm">{job.company}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{job.location}</span>
                    </div>
                    {job.salary.min && job.salary.max && (
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span className="text-sm">
                          {job.salary.currency} {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()}/{job.salary.period}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="text-sm">{new Date(job.postedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getExperienceBadgeColor(job.experience)}`}>
                      {job.experience}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                      {job.type}
                    </span>
                    {job.isRemote && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                        Remote
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => handleSaveJob(job.id)}
                  className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {savedJobs.has(job.id) ? (
                    <BookmarkCheck className="w-6 h-6 text-blue-600" />
                  ) : (
                    <Bookmark className="w-6 h-6 text-gray-400" />
                  )}
                </button>
              </div>
              
              <p className="text-gray-700 mb-4 line-clamp-2">{job.description}</p>
              
              {/* Skills */}
              {job.skills.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {job.skills.slice(0, 6).map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 6 && (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-600">
                        +{job.skills.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Match Reasons */}
              {job.matchReasons.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-900">Why this matches you:</span>
                  </div>
                  <ul className="text-sm text-green-800 space-y-1">
                    {job.matchReasons.slice(0, 3).map((reason, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleApplyToJob(job)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Apply Now
                  <ExternalLink className="w-4 h-4 ml-2" />
                </button>
                <button
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {jobs.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Jobs Found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your filters or complete your assessment to get better recommendations
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
