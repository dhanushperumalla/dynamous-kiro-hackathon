import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  Target,
  Award,
  Calendar,
  BarChart3,
  Activity,
  Zap,
  ArrowLeft,
  Download
} from 'lucide-react';
import { learningService } from '@/services/learningService';
import { LearningProgress, LearningRoadmap, WeeklyStats } from '@/types/learning';
import toast from 'react-hot-toast';

export const ProgressDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [roadmaps, setRoadmaps] = useState<LearningRoadmap[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoadmap, setSelectedRoadmap] = useState<string | null>(null);

  useEffect(() => {
    loadProgressData();
  }, [selectedRoadmap]);

  const loadProgressData = async () => {
    try {
      setIsLoading(true);
      
      // Load all roadmaps
      const roadmapsData = await learningService.getAllRoadmaps();
      setRoadmaps(roadmapsData);
      
      // If no roadmap selected, select the first active one
      if (!selectedRoadmap && roadmapsData.length > 0) {
        const activeRoadmap = roadmapsData.find(r => r.isActive) || roadmapsData[0];
        setSelectedRoadmap(activeRoadmap.id);
        return;
      }
      
      if (selectedRoadmap) {
        // Load progress for selected roadmap
        const progressData = await learningService.getProgress(selectedRoadmap);
        setProgress(progressData);
        
        // Load analytics
        const analyticsData = await learningService.getAnalytics(selectedRoadmap);
        setAnalytics(analyticsData);
      }
    } catch (err: any) {
      toast.error('Failed to load progress data');
    } finally {
      setIsLoading(false);
    }
  };

  const exportProgress = async () => {
    try {
      toast.success('Progress report exported successfully!');
      // In a real implementation, this would generate and download a PDF/CSV
    } catch (err: any) {
      toast.error('Failed to export progress report');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!progress || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Progress Data</h2>
          <p className="text-gray-600 mb-6">Start a learning roadmap to track your progress</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            Return to Dashboard
          </button>
        </div>
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
              <h1 className="text-3xl font-bold text-gray-900">Progress Dashboard</h1>
              <p className="text-gray-600 mt-2">Track your learning journey and achievements</p>
            </div>
            <button
              onClick={exportProgress}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Roadmap Selector */}
        {roadmaps.length > 1 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Roadmap
            </label>
            <select
              value={selectedRoadmap || ''}
              onChange={(e) => setSelectedRoadmap(e.target.value)}
              className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {roadmaps.map((roadmap) => (
                <option key={roadmap.id} value={roadmap.id}>
                  {roadmap.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Hours</span>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.totalHoursSpent}</div>
            <div className="text-sm text-gray-600 mt-1">
              Avg {analytics.averageSessionDuration} min/session
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Streak</span>
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.streakDays}</div>
            <div className="text-sm text-gray-600 mt-1">days in a row</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completion Rate</span>
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.completionRate}%</div>
            <div className="text-sm text-gray-600 mt-1">
              {progress.completedModules}/{progress.totalModules} modules
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Current Week</span>
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{progress.currentWeek}</div>
            <div className="text-sm text-gray-600 mt-1">of {progress.totalWeeks} weeks</div>
          </div>
        </div>

        {/* Weekly Progress Chart */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BarChart3 className="w-6 h-6 text-blue-600 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">Weekly Progress</h2>
            </div>
          </div>
          
          <div className="space-y-4">
            {analytics.weeklyProgress.map((week: WeeklyStats) => (
              <div key={week.weekNumber} className="border-b pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900">Week {week.weekNumber}</span>
                    <span className={`ml-3 px-2 py-1 text-xs font-medium rounded ${
                      week.isOnTrack
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {week.isOnTrack ? 'On Track' : 'Behind'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {week.hoursSpent}h spent • {week.modulesCompleted} modules
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Target Progress</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${week.targetProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{week.targetProgress}%</div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Actual Progress</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          week.actualProgress >= week.targetProgress
                            ? 'bg-green-600'
                            : 'bg-yellow-600'
                        }`}
                        style={{ width: `${week.actualProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{week.actualProgress}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Performing Days */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <Activity className="w-6 h-6 text-green-600 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">Top Performing Days</h2>
            </div>
            <div className="space-y-3">
              {analytics.topPerformingDays.map((day: string, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="font-medium text-gray-900 capitalize">{day}</span>
                  <Award className="w-5 h-5 text-green-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Areas for Improvement */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="w-6 h-6 text-orange-600 mr-3" />
              <h2 className="text-xl font-bold text-gray-900">Areas for Improvement</h2>
            </div>
            <div className="space-y-3">
              {analytics.strugglingAreas.map((area: string, index: number) => (
                <div key={index} className="p-3 bg-orange-50 rounded-lg">
                  <div className="font-medium text-gray-900">{area}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <Target className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-bold text-gray-900">Personalized Recommendations</h2>
          </div>
          <div className="space-y-3">
            {analytics.recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex items-start p-4 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                  {index + 1}
                </div>
                <p className="text-gray-900">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
