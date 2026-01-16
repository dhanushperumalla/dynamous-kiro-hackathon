import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  BookOpen, 
  Clock, 
  CheckCircle, 
  Circle, 
  TrendingUp, 
  Calendar,
  Target,
  Award,
  Play,
  Pause,
  ArrowLeft
} from 'lucide-react';
import { learningService } from '@/services/learningService';
import { LearningRoadmap, WeeklyTarget } from '@/types/learning';
import toast from 'react-hot-toast';

export const LearningPath: React.FC = () => {
  const { roadmapId } = useParams<{ roadmapId: string }>();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState<LearningRoadmap | null>(null);
  const [currentWeek, setCurrentWeek] = useState<WeeklyTarget | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRoadmap();
  }, [roadmapId]);

  const loadRoadmap = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await learningService.getRoadmap(roadmapId);
      setRoadmap(data);
      
      // Extract current week's targets from the roadmap data
      if (data.modules && data.modules.length > 0) {
        // Find the current module based on progress
        const currentModuleId = data.progress?.currentModule || data.modules[0]?.id;
        const currentModule = data.modules.find(m => m.id === currentModuleId);
        
        if (currentModule && currentModule.weeklyTargets && currentModule.weeklyTargets.length > 0) {
          // Find the first incomplete weekly target
          const incompleteTarget = currentModule.weeklyTargets.find(t => !t.completed);
          setCurrentWeek(incompleteTarget || currentModule.weeklyTargets[0]);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load learning roadmap');
      toast.error('Failed to load learning roadmap');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRoadmapStatus = async () => {
    if (!roadmap) return;
    
    try {
      const result = await learningService.toggleRoadmapStatus(roadmap.id, !roadmap.isActive);
      if (result.success) {
        toast.success(roadmap.isActive ? 'Roadmap paused' : 'Roadmap resumed');
        loadRoadmap();
      }
    } catch (err: any) {
      toast.error('Failed to update roadmap status');
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleTaskToggle = async (
    moduleId: string,
    targetId: string,
    taskId: string,
    currentStatus: boolean
  ) => {
    if (!roadmap || !roadmapId) return;
    
    const taskKey = `${moduleId}-${targetId}-${taskId}`;
    if (updatingTasks.has(taskKey)) return;
    
    try {
      setUpdatingTasks(prev => new Set(prev).add(taskKey));
      
      // Optimistically update UI
      setRoadmap(prev => {
        if (!prev) return prev;
        const newRoadmap = { ...prev };
        if (newRoadmap.modules) {
          newRoadmap.modules = newRoadmap.modules.map(module => {
            if (module.id === moduleId) {
              return {
                ...module,
                weeklyTargets: module.weeklyTargets?.map(target => {
                  if (target.id === targetId) {
                    return {
                      ...target,
                      tasks: target.tasks?.map(task => {
                        if (task.id === taskId) {
                          return {
                            ...task,
                            completed: !currentStatus,
                            completedAt: !currentStatus ? new Date() : undefined
                          };
                        }
                        return task;
                      })
                    };
                  }
                  return target;
                })
              };
            }
            return module;
          });
        }
        return newRoadmap;
      });

      // Call backend API
      await learningService.updateWeeklyTarget(roadmapId, moduleId, targetId, {
        taskUpdates: [{
          taskId,
          completed: !currentStatus,
          notes: ''
        }]
      });

      toast.success(!currentStatus ? 'Task completed!' : 'Task marked as incomplete');
      
      // Reload to get updated progress
      await loadRoadmap();
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
      // Revert optimistic update
      await loadRoadmap();
    } finally {
      setUpdatingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskKey);
        return newSet;
      });
    }
  };

  const handleWeeklyTargetComplete = async (moduleId: string, targetId: string) => {
    if (!roadmap || !roadmapId) return;
    
    try {
      await learningService.updateWeeklyTarget(roadmapId, moduleId, targetId, {
        completed: true,
        hoursSpent: 0,
        notes: 'Completed via UI'
      });

      toast.success('Weekly target completed! 🎉');
      await loadRoadmap();
    } catch (error: any) {
      console.error('Error completing weekly target:', error);
      toast.error('Failed to complete weekly target');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Roadmap</h2>
          <p className="text-gray-600 mb-6">{error || 'Roadmap not found'}</p>
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
              <h1 className="text-3xl font-bold text-gray-900">{roadmap.title}</h1>
              <p className="text-gray-600 mt-2">{roadmap.description}</p>
            </div>
            <button
              onClick={toggleRoadmapStatus}
              className={`flex items-center px-4 py-2 rounded-lg font-medium ${
                roadmap.isActive
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {roadmap.isActive ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Overall Progress</span>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{roadmap.progress?.overallProgress || 0}%</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${roadmap.progress?.overallProgress || 0}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Modules Completed</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {roadmap.progress?.completedModules?.length || 0}/{roadmap.modules?.length || 0}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Duration</span>
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{roadmap.estimatedDuration || roadmap.totalDuration || 0}</div>
            <div className="text-sm text-gray-600">weeks</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Difficulty</span>
              <Award className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900 capitalize">{roadmap.difficulty}</div>
          </div>
        </div>

        {/* Current Week Target */}
        {currentWeek && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Target className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Week {currentWeek.week || currentWeek.weekNumber || 1}: {currentWeek.title}
                  </h2>
                  <p className="text-gray-600 text-sm">{currentWeek.description}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{currentWeek.progress || 0}%</div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-600">Deadline</div>
                  <div className="font-medium text-gray-900">
                    {new Date(currentWeek.dueDate || currentWeek.deadline || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-600">Estimated Hours</div>
                  <div className="font-medium text-gray-900">{currentWeek.estimatedHours}h</div>
                </div>
              </div>
              
              <div className="flex items-center">
                <BookOpen className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <div className="text-sm text-gray-600">Tasks</div>
                  <div className="font-medium text-gray-900">{currentWeek.tasks?.length || 0}</div>
                </div>
              </div>
            </div>

            {/* Milestones */}
            {currentWeek.milestones && currentWeek.milestones.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Milestones</h3>
                <div className="space-y-2">
                  {currentWeek.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-center p-3 bg-gray-50 rounded-lg"
                    >
                      {milestone.isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 mr-3" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{milestone.title}</div>
                        <div className="text-sm text-gray-600">{milestone.description}</div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        milestone.isCompleted
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {milestone.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Learning Modules */}
        {roadmap.modules && roadmap.modules.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Learning Modules</h2>
            <div className="space-y-4">
              {roadmap.modules.map((module) => (
                <div key={module.id} className="border rounded-lg overflow-hidden">
                  {/* Module Header - Clickable */}
                  <div
                    onClick={() => toggleModule(module.id)}
                    className={`cursor-pointer border-l-4 pl-6 py-4 transition-colors ${
                      module.isCompleted
                        ? 'border-green-500 bg-green-50 hover:bg-green-100'
                        : roadmap.progress?.currentModule === module.id
                        ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center flex-1">
                        {module.isCompleted ? (
                          <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" />
                        ) : roadmap.progress?.currentModule === module.id ? (
                          <Circle className="w-6 h-6 text-blue-600 mr-3 animate-pulse flex-shrink-0" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400 mr-3 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">Module {module.order}: {module.title}</h3>
                          <p className="text-sm text-gray-600">{module.description}</p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-gray-900">{module.progress || 0}%</div>
                        <div className="text-xs text-gray-600">{module.weeklyTargets?.length || 0} weeks</div>
                      </div>
                    </div>
                    
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          module.isCompleted ? 'bg-green-600' : 'bg-blue-600'
                        }`}
                        style={{ width: `${module.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Weekly Targets - Expandable */}
                  {expandedModules.includes(module.id) && module.weeklyTargets && (
                    <div className="bg-white p-6 border-t">
                      <h4 className="font-semibold text-gray-900 mb-4">Weekly Targets</h4>
                      <div className="space-y-4">
                        {module.weeklyTargets.map((target) => (
                          <div
                            key={target.id}
                            className={`border rounded-lg p-4 ${
                              target.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  {target.completed ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-gray-400 mr-2" />
                                  )}
                                  <h5 className="font-semibold text-gray-900">
                                    Week {target.week || target.weekNumber}: {target.title}
                                  </h5>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 ml-7">{target.description}</p>
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {target.estimatedHours}h
                                </div>
                                {target.dueDate && (
                                  <div className="text-xs text-gray-500">
                                    {new Date(target.dueDate).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Tasks */}
                            {target.tasks && target.tasks.length > 0 && (
                              <div className="ml-7 space-y-2">
                                {target.tasks.map((task) => {
                                  const taskKey = `${module.id}-${target.id}-${task.id}`;
                                  const isUpdating = updatingTasks.has(taskKey);
                                  
                                  return (
                                    <div
                                      key={task.id}
                                      className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={task.completed}
                                        disabled={isUpdating}
                                        onChange={() => handleTaskToggle(
                                          module.id,
                                          target.id,
                                          task.id,
                                          task.completed
                                        )}
                                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer disabled:opacity-50"
                                      />
                                      <div className="flex-1">
                                        <div className={`text-sm ${
                                          task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                                        }`}>
                                          {task.title}
                                        </div>
                                        {task.description && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            {task.description}
                                          </div>
                                        )}
                                        {task.estimatedMinutes && (
                                          <div className="text-xs text-gray-400 mt-1">
                                            ~{Math.round(task.estimatedMinutes / 60)}h
                                          </div>
                                        )}
                                      </div>
                                      {task.isRequired && (
                                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                          Required
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Complete Weekly Target Button */}
                            {!target.completed && target.tasks && target.tasks.every(t => t.completed) && (
                              <div className="mt-4 ml-7">
                                <button
                                  onClick={() => handleWeeklyTargetComplete(module.id, target.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  Mark Week as Complete
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
