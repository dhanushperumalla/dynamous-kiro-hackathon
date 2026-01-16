import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CareerDomain } from '@/types/recommendations';
import { learningService } from '@/services/learningService';
import { LearningRoadmap as LearningRoadmapType } from '@/types/learning';
import { BookOpen, Clock, Target, TrendingUp, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface LearningRoadmapProps {
  domain: CareerDomain;
  roadmapId?: string;
  onBack: () => void;
}

export const LearningRoadmap: React.FC<LearningRoadmapProps> = ({
  domain,
  roadmapId,
  onBack
}) => {
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState<LearningRoadmapType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (roadmapId) {
      loadRoadmap();
    }
  }, [roadmapId]);

  const loadRoadmap = async () => {
    if (!roadmapId) return;
    
    try {
      setIsLoading(true);
      const data = await learningService.getRoadmap(roadmapId);
      setRoadmap(data);
    } catch (err: any) {
      toast.error('Failed to load roadmap');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartRoadmap = async () => {
    try {
      setIsCreating(true);
      const newRoadmap = await learningService.startRoadmap(domain.id);
      toast.success('Learning roadmap created successfully!');
      navigate(`/learning/${newRoadmap.id}`);
    } catch (err: any) {
      toast.error('Failed to create learning roadmap');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (roadmap) {
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
            <button
              onClick={() => navigate(`/learning/${roadmap.id}`)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              View Full Roadmap
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
          
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{roadmap.title}</h1>
            <p className="text-gray-600">{roadmap.description}</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{roadmap.progress}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{roadmap.completedModules}/{roadmap.totalModules}</div>
              <div className="text-sm text-gray-600">Modules</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{roadmap.totalDuration}</div>
              <div className="text-sm text-gray-600">Weeks</div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900 capitalize">{roadmap.difficulty}</div>
              <div className="text-sm text-gray-600">Level</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-medium text-gray-900">{roadmap.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${roadmap.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Start Your Learning Journey in {domain.title}
          </h1>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Create a personalized learning roadmap tailored to your goals and experience level. 
            Get structured weekly targets, track your progress, and achieve your career objectives.
          </p>
          
          <button
            onClick={handleStartRoadmap}
            disabled={isCreating}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Roadmap...
              </>
            ) : (
              <>
                <BookOpen className="w-5 h-5 mr-2" />
                Start Learning Roadmap
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};