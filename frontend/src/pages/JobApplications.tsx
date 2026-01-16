import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Video,
  Phone,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { jobService } from '@/services/jobService';
import { JobApplication, JobStats } from '@/types/jobs';
import toast from 'react-hot-toast';

export const JobApplications: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<JobApplication['status'] | 'all'>('all');

  useEffect(() => {
    loadApplications();
    loadStats();
  }, [filterStatus]);

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      const data = await jobService.getApplications(
        filterStatus === 'all' ? undefined : filterStatus
      );
      setApplications(data);
    } catch (err: any) {
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await jobService.getJobStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  };

  const getStatusIcon = (status: JobApplication['status']) => {
    switch (status) {
      case 'saved':
        return <FileText className="w-5 h-5 text-gray-600" />;
      case 'applied':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'interviewing':
        return <Video className="w-5 h-5 text-purple-600" />;
      case 'offered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'withdrawn':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: JobApplication['status']) => {
    switch (status) {
      case 'saved':
        return 'bg-gray-100 text-gray-800';
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'interviewing':
        return 'bg-purple-100 text-purple-800';
      case 'offered':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'withdrawn':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
              <h1 className="text-3xl font-bold text-gray-900">Job Applications</h1>
              <p className="text-gray-600 mt-2">
                Track and manage your job applications
              </p>
            </div>
            <button
              onClick={() => navigate('/jobs')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Find Jobs
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Saved</span>
                <FileText className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalSaved}</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Applied</span>
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalApplied}</div>
              <div className="text-sm text-gray-600 mt-1">
                {stats.applicationRate}% of saved
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Interviews</span>
                <Video className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalInterviews}</div>
              <div className="text-sm text-gray-600 mt-1">
                {stats.interviewRate}% of applications
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Offers</span>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalOffers}</div>
              <div className="text-sm text-gray-600 mt-1">
                {stats.offerRate}% of interviews
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex items-center space-x-1 p-2">
            {['all', 'saved', 'applied', 'interviewing', 'offered', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as any)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {applications.map((application) => (
            <div
              key={application.id}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-xl font-bold text-gray-900 mr-3">
                      {application.jobTitle}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${getStatusColor(application.status)}`}>
                      {getStatusIcon(application.status)}
                      <span className="ml-2 capitalize">{application.status}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center text-gray-600 space-x-4 mb-3">
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-1" />
                      <span className="text-sm">{application.company}</span>
                    </div>
                    {application.appliedAt && (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span className="text-sm">
                          Applied {new Date(application.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="text-sm">
                        Updated {new Date(application.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interviews */}
              {application.interviews.length > 0 && (
                <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Video className="w-4 h-4 text-purple-600 mr-2" />
                    <span className="text-sm font-medium text-purple-900">
                      Upcoming Interviews ({application.interviews.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {application.interviews.map((interview) => (
                      <div key={interview.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                          {interview.type === 'phone' && <Phone className="w-4 h-4 mr-2 text-purple-600" />}
                          {interview.type === 'video' && <Video className="w-4 h-4 mr-2 text-purple-600" />}
                          <span className="text-purple-900 capitalize">{interview.type} Interview</span>
                        </div>
                        <span className="text-purple-700">
                          {new Date(interview.scheduledAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {application.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{application.notes}</p>
                </div>
              )}

              {/* Documents */}
              {application.documents.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center mb-2">
                    <FileText className="w-4 h-4 text-gray-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900">
                      Documents ({application.documents.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {application.documents.map((doc) => (
                      <span
                        key={doc.id}
                        className="px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700"
                      >
                        {doc.type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate(`/applications/${application.id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  View Details
                </button>
                <button
                  onClick={() => navigate(`/jobs/${application.jobId}`)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  View Job
                </button>
              </div>
            </div>
          ))}
        </div>

        {applications.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-gray-600 mb-6">
              Start applying to jobs to track your applications here
            </p>
            <button
              onClick={() => navigate('/jobs')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Find Jobs
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
