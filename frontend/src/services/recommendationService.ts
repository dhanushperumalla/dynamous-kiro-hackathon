import apiClient from './authApi';
import {
  DomainRecommendation,
  DomainSelection,
  RecommendationResponse,
  CareerDomain,
} from '@/types/recommendations';

class RecommendationService {
  /**
   * Generate domain recommendations based on user's interest profile
   */
  async generateRecommendations(
    userId: string, 
    _interestProfile: any, // Not used, backend fetches from database
    algorithm: 'collaborative_filtering' | 'content_based' | 'market_weighted' | 'hybrid' = 'hybrid',
    maxRecommendations: number = 5
  ): Promise<DomainRecommendation> {
    const response = await apiClient.post<RecommendationResponse>(
      '/recommendations/generate',
      {
        algorithm,
        maxRecommendations
      }
    );
    
    // The backend returns recommendations array, but we need to structure it as a DomainRecommendation
    const backendData = response.data.data;
    
    return {
      id: backendData.metadata.recommendationId,
      userId: userId,
      domains: backendData.recommendations,
      algorithm: backendData.metadata.algorithm as any,
      confidence: backendData.metadata.confidence,
      reasoning: backendData.metadata.reasoning,
      generatedAt: backendData.metadata.generatedAt,
      isActive: true
    };
  }

  /**
   * Get latest recommendation for a user
   */
  async getLatestRecommendation(): Promise<DomainRecommendation | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: { recommendation: DomainRecommendation | null } }>(
        '/recommendations/latest'
      );
      return response.data.data.recommendation;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all recommendations for the current user
   */
  async getUserRecommendations(activeOnly: boolean = true): Promise<DomainRecommendation[]> {
    const response = await apiClient.get<{ success: boolean; data: { recommendations: DomainRecommendation[] } }>(
      `/recommendations?activeOnly=${activeOnly}`
    );
    return response.data.data.recommendations;
  }

  /**
   * Add feedback to a recommendation
   */
  async addRecommendationFeedback(
    recommendationId: string,
    feedback: DomainSelection
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(
      `/recommendations/${recommendationId}/feedback`,
      feedback
    );
    return response.data;
  }

  /**
   * Get recommendation statistics
   */
  async getRecommendationStatistics(): Promise<{
    totalRecommendations: number;
    averageConfidence: number;
    feedbackRate: number;
    averageRating: number;
    algorithmDistribution: Record<string, number>;
  }> {
    const response = await apiClient.get('/recommendations/statistics');
    return response.data.data.statistics;
  }

  /**
   * Get detailed information about a specific domain
   */
  async getDomainDetails(domainId: string): Promise<CareerDomain> {
    const response = await apiClient.get(`/domains/${domainId}`);
    return response.data.data.domain;
  }

  /**
   * Get all available domains with filtering
   */
  async getDomains(filters?: {
    category?: string;
    difficulty?: string;
    activeOnly?: boolean;
    search?: string;
  }): Promise<CareerDomain[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get(`/domains?${params.toString()}`);
    return response.data.data.domains;
  }

  /**
   * Get domain categories
   */
  async getDomainCategories(): Promise<Array<{
    category: string;
    count: number;
    averageSalary: number;
    averageGrowthRate: number;
  }>> {
    const response = await apiClient.get('/domains/categories');
    return response.data.data.categories;
  }
}

export const recommendationService = new RecommendationService();