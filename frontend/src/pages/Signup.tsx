import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { SignupForm } from '@/components/auth/SignupForm';
import { useAuth } from '@/hooks/useAuth';

export const Signup: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // If user is already authenticated, redirect them
  if (isAuthenticated && user) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">AI-Sikshak</h1>
          <p className="mt-2 text-gray-600">Start your career journey today</p>
        </div>

        {/* Signup Form */}
        <SignupForm />

        {/* Benefits Section */}
        <div className="text-center">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What You'll Get
            </h3>
            <div className="grid grid-cols-1 gap-4 text-sm text-gray-600">
              <div className="flex items-start text-left">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-600 font-bold text-xs">1</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Interest Assessment</div>
                  <div className="text-gray-600">Discover your strengths and career preferences</div>
                </div>
              </div>
              
              <div className="flex items-start text-left">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-600 font-bold text-xs">2</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">AI Recommendations</div>
                  <div className="text-gray-600">Get personalized career domain suggestions</div>
                </div>
              </div>
              
              <div className="flex items-start text-left">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-600 font-bold text-xs">3</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Learning Roadmap</div>
                  <div className="text-gray-600">Follow structured weekly targets to master skills</div>
                </div>
              </div>
              
              <div className="flex items-start text-left">
                <div className="flex-shrink-0 h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-blue-600 font-bold text-xs">4</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">Job Placement</div>
                  <div className="text-gray-600">Connect with relevant opportunities upon completion</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <svg
                className="h-5 w-5 text-green-500 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span className="text-sm font-medium text-green-800">Secure & Private</span>
            </div>
            <p className="text-xs text-green-700">
              Your data is encrypted and never shared with third parties
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};