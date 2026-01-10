import React from 'react';
import { Assessment } from '@/services/assessmentService';

interface AssessmentCardProps {
  assessment: Assessment | null;
  onStart: () => void;
  onContinue: () => void;
  onViewResults: () => void;
  onRetake: () => void;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assessment,
  onStart,
  onContinue,
  onViewResults,
  onRetake
}) => {
  if (!assessment) {
    // No assessment started yet
    return (
      <div className="text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Start Your Career Assessment
        </h3>
        <p className="text-gray-600 mb-6">
          Take our comprehensive assessment to discover your career interests and get personalized recommendations.
        </p>
        <button
          onClick={onStart}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          Start Assessment
        </button>
      </div>
    );
  }

  if (assessment.isComplete) {
    // Assessment completed
    return (
      <div className="text-center">
        <div className="mb-6">
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Assessment Completed!
        </h3>
        <p className="text-gray-600 mb-4">
          Great job! You've completed your career interest assessment.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-green-800">
            <p><strong>Completed:</strong> {new Date(assessment.completedAt!).toLocaleDateString()}</p>
            <p><strong>Total Questions:</strong> {assessment.progress?.totalQuestions || 'N/A'}</p>
            {assessment.totalCompletionTime && (
              <p><strong>Time Taken:</strong> {Math.round(assessment.totalCompletionTime / 60000)} minutes</p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onViewResults}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            View Results
          </button>
          <button
            onClick={onRetake}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Retake Assessment
          </button>
        </div>
      </div>
    );
  }

  // Assessment in progress
  const progressPercentage = assessment.progress?.completionPercentage || 0;
  
  return (
    <div className="text-center">
      <div className="mb-6">
        <svg
          className="mx-auto h-16 w-16 text-yellow-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Assessment In Progress
      </h3>
      <p className="text-gray-600 mb-4">
        You've started your assessment. Continue where you left off.
      </p>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{progressPercentage}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="text-sm text-gray-500 mt-2">
          {assessment.progress?.answeredQuestions || 0} of {assessment.progress?.totalQuestions || 0} questions completed
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="text-sm text-blue-800">
          <p><strong>Started:</strong> {new Date(assessment.startedAt).toLocaleDateString()}</p>
          <p><strong>Version:</strong> {assessment.version}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onContinue}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          Continue Assessment
        </button>
        <button
          onClick={onRetake}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};