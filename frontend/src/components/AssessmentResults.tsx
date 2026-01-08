import React from 'react';
import { Assessment } from '@/services/assessmentService';

interface AssessmentResultsProps {
  assessment: Assessment | null;
  onRetake: () => void;
  onBack: () => void;
}

export const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  assessment,
  onRetake,
  onBack
}) => {
  if (!assessment || !assessment.isComplete || !assessment.interestProfile) {
    return (
      <div className="text-center">
        <p className="text-gray-600">No assessment results available</p>
        <button onClick={onBack} className="mt-4 text-blue-600 hover:text-blue-500">
          Go Back
        </button>
      </div>
    );
  }

  const { interestProfile } = assessment;
  const dimensionEntries = Object.entries(interestProfile.dimensions).sort(
    ([, a], [, b]) => b - a
  );

  const formatDimensionName = (dimension: string) => {
    return dimension
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Moderate';
    return 'Low';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <button
            onClick={onRetake}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Retake Assessment
          </button>
        </div>
        
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Career Interest Profile
          </h1>
          <p className="text-gray-600">
            Based on your responses, here's your personalized career interest analysis
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {Math.round(interestProfile.confidence)}%
          </div>
          <div className="text-sm text-gray-600">Confidence Score</div>
          <div className="text-xs text-gray-500 mt-1">
            How reliable your results are
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">
            {Math.round(interestProfile.completeness)}%
          </div>
          <div className="text-sm text-gray-600">Completeness</div>
          <div className="text-xs text-gray-500 mt-1">
            Assessment completion rate
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">
            {assessment.totalCompletionTime ? Math.round(assessment.totalCompletionTime / 60000) : 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Minutes</div>
          <div className="text-xs text-gray-500 mt-1">
            Time to complete
          </div>
        </div>
      </div>

      {/* Top Dimensions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Your Top Career Dimensions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {interestProfile.topDimensions.slice(0, 3).map((dimension, index) => {
            const score = interestProfile.dimensions[dimension];
            return (
              <div key={dimension} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold mb-2">#{index + 1}</div>
                <div className="font-semibold text-gray-900 mb-2">
                  {formatDimensionName(dimension)}
                </div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(score)}`}>
                  {Math.round(score)}% - {getScoreLabel(score)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Dimensions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Complete Interest Profile
        </h2>
        <div className="space-y-4">
          {dimensionEntries.map(([dimension, score]) => (
            <div key={dimension} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {formatDimensionName(dimension)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
              </div>
              <div className="ml-4 text-right">
                <div className="font-semibold text-gray-900">
                  {Math.round(score)}%
                </div>
                <div className={`text-xs px-2 py-1 rounded ${getScoreColor(score)}`}>
                  {getScoreLabel(score)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {interestProfile.insights && interestProfile.insights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Personalized Insights
          </h2>
          <div className="space-y-3">
            {interestProfile.insights.map((insight, index) => (
              <div key={index} className="flex items-start">
                <svg
                  className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <p className="text-gray-700">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-4">
          What's Next?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Explore Learning Paths
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              Get personalized learning roadmaps based on your top interests.
            </p>
            <button className="text-blue-600 hover:text-blue-500 font-medium text-sm">
              View Recommendations →
            </button>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              Find Matching Jobs
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              Discover job opportunities that align with your interests.
            </p>
            <button className="text-blue-600 hover:text-blue-500 font-medium text-sm">
              Browse Jobs →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};