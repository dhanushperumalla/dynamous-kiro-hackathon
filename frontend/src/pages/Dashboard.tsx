import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { assessmentService, Assessment } from '@/services/assessmentService';
import { AssessmentCard } from '@/components/AssessmentCard';
import { QuestionnaireView } from '@/components/QuestionnaireView';
import { AssessmentResults } from '@/components/AssessmentResults';
import toast from 'react-hot-toast';

type DashboardView = 'overview' | 'questionnaire' | 'results';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssessmentData();
  }, []);

  const loadAssessmentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get current assessment progress
      const progressData = await assessmentService.getProgress();
      setAssessment(progressData.assessment as Assessment);
    } catch (err: any) {
      // If no assessment exists, that's okay - user hasn't started yet
      if (err.response?.status === 404) {
        setAssessment(null);
      } else {
        console.error('Error loading assessment data:', err);
        setError('Failed to load assessment data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async () => {
    try {
      const newAssessment = await assessmentService.startAssessment();
      setAssessment(newAssessment);
      setCurrentView('questionnaire');
      toast.success('Assessment started successfully!');
    } catch (err: any) {
      console.error('Error starting assessment:', err);
      toast.error('Failed to start assessment. Please try again.');
    }
  };

  const handleViewResults = async () => {
    try {
      const results = await assessmentService.getResults();
      setAssessment(results);
      setCurrentView('results');
    } catch (err: any) {
      console.error('Error loading results:', err);
      toast.error('Failed to load assessment results.');
    }
  };

  const handleRetakeAssessment = async () => {
    try {
      const retakeData = await assessmentService.retakeAssessment({
        reason: 'User requested retake from dashboard'
      });
      setAssessment(retakeData.assessment);
      setCurrentView('questionnaire');
      toast.success('New assessment started!');
    } catch (err: any) {
      console.error('Error retaking assessment:', err);
      toast.error('Failed to start new assessment. Please try again.');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-red-800">{error}</span>
          </div>
          <button
            onClick={loadAssessmentData}
            className="mt-2 text-sm text-red-600 hover:text-red-500 font-medium"
          >
            Try again
          </button>
        </div>
      );
    }

    switch (currentView) {
      case 'questionnaire':
        return (
          <QuestionnaireView
            assessment={assessment}
            onComplete={(completedAssessment) => {
              setAssessment(completedAssessment);
              setCurrentView('results');
            }}
            onBack={() => setCurrentView('overview')}
          />
        );
      
      case 'results':
        return (
          <AssessmentResults
            assessment={assessment}
            onRetake={handleRetakeAssessment}
            onBack={() => setCurrentView('overview')}
          />
        );
      
      default:
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Career Interest Assessment
              </h2>
              <p className="text-gray-600 mb-6">
                Discover your career interests and get personalized domain recommendations 
                based on your preferences and aptitudes.
              </p>
              
              <AssessmentCard
                assessment={assessment}
                onStart={handleStartAssessment}
                onContinue={() => setCurrentView('questionnaire')}
                onViewResults={handleViewResults}
                onRetake={handleRetakeAssessment}
              />
            </div>

            {/* Additional dashboard content can go here */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Learning Roadmaps
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Personalized learning paths based on your assessment results.
                </p>
                <button
                  disabled={!assessment?.isComplete}
                  className="text-blue-600 hover:text-blue-500 font-medium text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {assessment?.isComplete ? 'View Roadmaps' : 'Complete Assessment First'}
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Job Recommendations
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Curated job opportunities matching your interests.
                </p>
                <button
                  disabled={!assessment?.isComplete}
                  className="text-blue-600 hover:text-blue-500 font-medium text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {assessment?.isComplete ? 'Browse Jobs' : 'Complete Assessment First'}
                </button>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Progress Tracking
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Monitor your learning progress and achievements.
                </p>
                <button className="text-blue-600 hover:text-blue-500 font-medium text-sm">
                  View Progress
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">AI-Sikshak</h1>
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                <button
                  onClick={() => setCurrentView('overview')}
                  className={`px-3 py-2 text-sm font-medium ${
                    currentView === 'overview'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </button>
                {assessment && (
                  <>
                    <button
                      onClick={() => setCurrentView('questionnaire')}
                      className={`px-3 py-2 text-sm font-medium ${
                        currentView === 'questionnaire'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Assessment
                    </button>
                    {assessment.isComplete && (
                      <button
                        onClick={() => setCurrentView('results')}
                        className={`px-3 py-2 text-sm font-medium ${
                          currentView === 'results'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Results
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};