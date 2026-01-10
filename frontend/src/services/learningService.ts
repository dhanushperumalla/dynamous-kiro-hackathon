import apiClient from './authApi';
import {
  LearningRoadmap,
  LearningProgress,
  WeeklyTarget,
  StudySession,
  LearningPreferences,
  LearningModule,
  WeeklyStats,
} from '@/types/learning';

class LearningService {
  /**
   * Get user's learning roadmap
   */
  async getRoadmap(roadmapId?: string): Promise<LearningRoadmap> {
    const url = roadmapId ? `/learning/roadmap/${roadmapId}` : '/learning/roadmap';
    const response = await apiClient.get(url);
    return response.data.data.roadmap;
  }

  /**
   * Get all user's roadmaps
   */
  async getAllRoadmaps(): Promise<LearningRoadmap[]> {
    const response = await apiClient.get('/learning/roadmaps');
    return response.data.data.roadmaps;
  }

  /**
   * Start a new learning roadmap for selected domain
   */
  async startRoadmap(domainId: string, preferences?: Partial<LearningPreferences>): Promise<LearningRoadmap> {
    const response = await apiClient.post('/learning/roadmap/start', {
      domainId,
      preferences,
    });
    return response.data.data.roadmap;
  }

  /**
   * Get learning progress
   */
  async getProgress(roadmapId?: string): Promise<LearningProgress> {
    const url = roadmapId ? `/learning/progress/${roadmapId}` : '/learning/progress';
    const response = await apiClient.get(url);
    return response.data.data.progress;
  }

  /**
   * Get current week's targets
   */
  async getCurrentWeekTargets(roadmapId: string): Promise<WeeklyTarget> {
    const response = await apiClient.get(`/learning/roadmap/${roadmapId}/current-week`);
    return response.data.data.weeklyTarget;
  }

  /**
   * Get specific week's targets
   */
  async getWeekTargets(roadmapId: string, weekNumber: number): Promise<WeeklyTarget> {
    const response = await apiClient.get(`/learning/roadmap/${roadmapId}/week/${weekNumber}`);
    return response.data.data.weeklyTarget;
  }

  /**
   * Mark module as completed
   */
  async completeModule(roadmapId: string, moduleId: string, notes?: string): Promise<{
    success: boolean;
    progress: LearningProgress;
    message: string;
  }> {
    const response = await apiClient.post(`/learning/roadmap/${roadmapId}/module/${moduleId}/complete`, {
      notes,
      completedAt: new Date().toISOString(),
    });
    return response.data;
  }

  /**
   * Update module progress
   */
  async updateModuleProgress(roadmapId: string, moduleId: string, progress: number): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await apiClient.put(`/learning/roadmap/${roadmapId}/module/${moduleId}/progress`, {
      progress: Math.max(0, Math.min(100, progress)),
    });
    return response.data;
  }

  /**
   * Start a study session
   */
  async startStudySession(roadmapId: string, moduleId: string, type: StudySession['type']): Promise<StudySession> {
    const response = await apiClient.post('/learning/study-session/start', {
      roadmapId,
      moduleId,
      type,
      startTime: new Date().toISOString(),
    });
    return response.data.data.session;
  }

  /**
   * End a study session
   */
  async endStudySession(sessionId: string, notes?: string, rating?: number): Promise<StudySession> {
    const response = await apiClient.put(`/learning/study-session/${sessionId}/end`, {
      endTime: new Date().toISOString(),
      notes,
      rating,
    });
    return response.data.data.session;
  }

  /**
   * Get study sessions history
   */
  async getStudySessions(roadmapId?: string, limit: number = 50): Promise<StudySession[]> {
    const params = new URLSearchParams();
    if (roadmapId) params.append('roadmapId', roadmapId);
    params.append('limit', limit.toString());

    const response = await apiClient.get(`/learning/study-sessions?${params.toString()}`);
    return response.data.data.sessions;
  }

  /**
   * Get learning preferences
   */
  async getPreferences(): Promise<LearningPreferences> {
    const response = await apiClient.get('/learning/preferences');
    return response.data.data.preferences;
  }

  /**
   * Update learning preferences
   */
  async updatePreferences(preferences: Partial<LearningPreferences>): Promise<LearningPreferences> {
    const response = await apiClient.put('/learning/preferences', preferences);
    return response.data.data.preferences;
  }

  /**
   * Get weekly statistics
   */
  async getWeeklyStats(roadmapId: string, weeks?: number): Promise<WeeklyStats[]> {
    const params = new URLSearchParams();
    if (weeks) params.append('weeks', weeks.toString());

    const response = await apiClient.get(`/learning/roadmap/${roadmapId}/stats?${params.toString()}`);
    return response.data.data.stats;
  }

  /**
   * Get learning analytics
   */
  async getAnalytics(roadmapId?: string): Promise<{
    totalHoursSpent: number;
    averageSessionDuration: number;
    streakDays: number;
    completionRate: number;
    weeklyProgress: WeeklyStats[];
    topPerformingDays: string[];
    strugglingAreas: string[];
    recommendations: string[];
  }> {
    const url = roadmapId ? `/learning/analytics/${roadmapId}` : '/learning/analytics';
    const response = await apiClient.get(url);
    return response.data.data.analytics;
  }

  /**
   * Pause/Resume roadmap
   */
  async toggleRoadmapStatus(roadmapId: string, isActive: boolean): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await apiClient.put(`/learning/roadmap/${roadmapId}/status`, {
      isActive,
    });
    return response.data;
  }

  /**
   * Get module details
   */
  async getModuleDetails(roadmapId: string, moduleId: string): Promise<LearningModule> {
    const response = await apiClient.get(`/learning/roadmap/${roadmapId}/module/${moduleId}`);
    return response.data.data.module;
  }

  /**
   * Search learning resources
   */
  async searchResources(query: string, type?: string, isFree?: boolean): Promise<Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    url: string;
    provider: string;
    rating: number;
    duration?: number;
    isFree: boolean;
    relevanceScore: number;
  }>> {
    const params = new URLSearchParams();
    params.append('query', query);
    if (type) params.append('type', type);
    if (isFree !== undefined) params.append('isFree', isFree.toString());

    const response = await apiClient.get(`/learning/resources/search?${params.toString()}`);
    return response.data.data.resources;
  }

  /**
   * Get personalized recommendations for next steps
   */
  async getNextStepRecommendations(roadmapId: string): Promise<{
    suggestedModules: LearningModule[];
    skillGaps: string[];
    recommendations: string[];
    estimatedTimeToComplete: number;
  }> {
    const response = await apiClient.get(`/learning/roadmap/${roadmapId}/recommendations`);
    return response.data.data;
  }
}

export const learningService = new LearningService();