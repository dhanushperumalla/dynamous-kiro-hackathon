import React from 'react';
import { CareerDomain } from '@/types/recommendations';

interface LearningRoadmapProps {
  domain: CareerDomain;
  roadmapId: string;
  onBack: () => void;
}

export const LearningRoadmap: React.FC<LearningRoadmapProps> = ({
  domain,
  roadmapId,
  onBack
}) => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Recommendations
          </button>
        </div>
        
        <div className="text-center py-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Learning Roadmap for {domain.title}
          </h1>
          <p className="text-gray-600 mb-6">
            Roadmap ID: {roadmapId}
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Coming Soon!
            </h2>
            <p className="text-blue-800">
              The learning roadmap feature is currently under development. 
              You'll soon be able to access personalized learning paths, weekly targets, 
              and progress tracking for your chosen domain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};