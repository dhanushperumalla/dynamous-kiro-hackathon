 import { CareerDomainService } from '@/services/careerDomainService';
import { Recommendation } from '@/models/Recommendation';
import { geminiService } from '@/services/geminiService';
import {
  IRecommendationDocument,
  IRecommendedDomain,
  ISkillGap,
  SkillPriority,
  RecommendationAlgorithm,
  ICareerDomainDocument,
  DomainCategory
} from '@/types/recommendation';
import { IInterestProfile, CareerDimension } from '@/types/assessment';
import { logger } from '@/utils/logger';

/**
 * AI-powered recommendation service that generates career domain suggestions
 * based on user interest profiles using multiple algorithms
 */
export class RecommendationService {
  
  /**
   * Generate career recommendations for a user based on their interest profile
   */
  static async generateRecommendations(
    userId: string,
    interestProfile: IInterestProfile,
    algorithm: RecommendationAlgorithm = RecommendationAlgorithm.HYBRID,
    maxRecommendations: number = 5
  ): Promise<IRecommendationDocument> {
    try {
      logger.info('Generating career recommendations', {
        userId,
        algorithm,
        maxRecommendations,
        topDimensions: interestProfile.topDimensions
      });

      // Deactivate previous recommendations for this user
      await (Recommendation as any).deactivateUserRecommendations(userId);

      // Get all active domains
      const allDomains = await CareerDomainService.getAllDomains(true);
      
      if (allDomains.length === 0) {
        throw new Error('No active career domains found');
      }

      // Try to enhance with Gemini AI if available
      let aiEnhancedRecommendations: any = null;
      if (geminiService.isAvailable()) {
        try {
          logger.info('Enhancing recommendations with Gemini AI', { userId });
          aiEnhancedRecommendations = await geminiService.generateCareerRecommendations({
            dimensions: interestProfile.dimensions,
            topInterests: interestProfile.topDimensions.map(d => d.toString()),
            skills: interestProfile.topDimensions.map(d => d.toString()),
            experience: 'beginner'
          });
          logger.info('Gemini AI recommendations generated', {
            userId,
            aiRecommendationCount: aiEnhancedRecommendations.recommendations?.length || 0
          });
        } catch (error) {
          logger.warn('Gemini AI enhancement failed, using traditional algorithm', {
            userId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Generate recommendations based on selected algorithm
      let recommendedDomains: IRecommendedDomain[];
      let overallConfidence: number;
      let reasoning: string[];

      switch (algorithm) {
        case RecommendationAlgorithm.COLLABORATIVE_FILTERING:
          ({ domains: recommendedDomains, confidence: overallConfidence, reasoning } = 
            await this.collaborativeFiltering(userId, interestProfile, allDomains, maxRecommendations));
          break;
        
        case RecommendationAlgorithm.CONTENT_BASED:
          ({ domains: recommendedDomains, confidence: overallConfidence, reasoning } = 
            await this.contentBasedFiltering(interestProfile, allDomains, maxRecommendations));
          break;
        
        case RecommendationAlgorithm.MARKET_WEIGHTED:
          ({ domains: recommendedDomains, confidence: overallConfidence, reasoning } = 
            await this.marketWeightedRecommendation(interestProfile, allDomains, maxRecommendations));
          break;
        
        case RecommendationAlgorithm.HYBRID:
        default:
          ({ domains: recommendedDomains, confidence: overallConfidence, reasoning } = 
            await this.hybridRecommendation(userId, interestProfile, allDomains, maxRecommendations));
          break;
      }

      // Enhance recommendations with AI insights if available
      if (aiEnhancedRecommendations?.recommendations) {
        recommendedDomains = this.mergeAIRecommendations(
          recommendedDomains,
          aiEnhancedRecommendations.recommendations,
          allDomains
        );
        
        // Add AI analysis to reasoning
        if (aiEnhancedRecommendations.analysis) {
          reasoning.unshift(`AI Analysis: ${aiEnhancedRecommendations.analysis}`);
        }
      }

      // Create and save recommendation document
      const recommendation = new Recommendation({
        userId,
        domains: recommendedDomains,
        algorithm,
        confidence: overallConfidence,
        reasoning,
        generatedAt: new Date(),
        isActive: true
      });

      await recommendation.save();

      logger.info('Career recommendations generated successfully', {
        userId,
        recommendationId: recommendation._id,
        algorithm,
        domainCount: recommendedDomains.length,
        confidence: overallConfidence,
        aiEnhanced: !!aiEnhancedRecommendations
      });

      return recommendation;
    } catch (error) {
      logger.error('Error generating career recommendations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        algorithm
      });
      throw error;
    }
  }

  /**
   * Collaborative filtering algorithm - recommends based on similar users' choices
   */
  private static async collaborativeFiltering(
    userId: string,
    interestProfile: IInterestProfile,
    allDomains: ICareerDomainDocument[],
    maxRecommendations: number
  ): Promise<{ domains: IRecommendedDomain[]; confidence: number; reasoning: string[] }> {
    
    // Find users with similar interest profiles
    const similarUsers = await this.findSimilarUsers(userId, interestProfile);
    
    // Get domains selected by similar users
    const domainPreferences = await this.getDomainPreferencesFromSimilarUsers(similarUsers);
    
    // Score domains based on collaborative filtering
    const scoredDomains = allDomains.map(domain => {
      const collaborativeScore = domainPreferences[domain._id.toString()] || 0;
      const interestAlignment = this.calculateInterestAlignment(interestProfile, domain);
      const marketScore = this.calculateMarketScore(domain);
      
      // Weighted combination: 60% collaborative, 25% interest, 15% market
      const matchScore = Math.round(
        collaborativeScore * 0.6 + 
        this.getAverageAlignment(interestAlignment) * 0.25 + 
        marketScore * 0.15
      );

      return {
        domain,
        matchScore,
        interestAlignment,
        marketScore,
        collaborativeScore
      };
    });

    // Sort and select top recommendations
    scoredDomains.sort((a, b) => b.matchScore - a.matchScore);
    const topDomains = scoredDomains.slice(0, maxRecommendations);

    const recommendedDomains: IRecommendedDomain[] = topDomains.map((item, index) => ({
      domainId: item.domain._id.toString(),
      domain: item.domain.toJSON(),
      matchScore: item.matchScore,
      interestAlignment: item.interestAlignment,
      marketScore: item.marketScore,
      skillGap: this.calculateSkillGap(item.domain),
      reasoning: [
        `Based on preferences of ${similarUsers.length} similar users`,
        `Strong collaborative signal (${Math.round(item.collaborativeScore)}/100)`,
        `Interest alignment: ${Math.round(this.getAverageAlignment(item.interestAlignment))}%`
      ],
      confidence: Math.min(95, Math.max(60, item.matchScore + (similarUsers.length * 2))),
      rank: index + 1
    }));

    const confidence = Math.round(
      recommendedDomains.reduce((sum, domain) => sum + domain.confidence, 0) / recommendedDomains.length
    );

    const reasoning = [
      `Used collaborative filtering based on ${similarUsers.length} similar users`,
      `Analyzed preferences from users with similar interest profiles`,
      `Combined collaborative signals with interest alignment and market data`
    ];

    return { domains: recommendedDomains, confidence, reasoning };
  }

  /**
   * Content-based filtering algorithm - recommends based on domain characteristics
   */
  private static async contentBasedFiltering(
    interestProfile: IInterestProfile,
    allDomains: ICareerDomainDocument[],
    maxRecommendations: number
  ): Promise<{ domains: IRecommendedDomain[]; confidence: number; reasoning: string[] }> {
    
    const scoredDomains = allDomains.map(domain => {
      const interestAlignment = this.calculateInterestAlignment(interestProfile, domain);
      const marketScore = this.calculateMarketScore(domain);
      const difficultyScore = this.calculateDifficultyScore(domain, interestProfile);
      
      // Weighted combination: 70% interest, 20% market, 10% difficulty
      const matchScore = Math.round(
        this.getAverageAlignment(interestAlignment) * 0.7 + 
        marketScore * 0.2 + 
        difficultyScore * 0.1
      );

      return {
        domain,
        matchScore,
        interestAlignment,
        marketScore,
        difficultyScore
      };
    });

    // Sort and select top recommendations
    scoredDomains.sort((a, b) => b.matchScore - a.matchScore);
    const topDomains = scoredDomains.slice(0, maxRecommendations);

    const recommendedDomains: IRecommendedDomain[] = topDomains.map((item, index) => ({
      domainId: item.domain._id.toString(),
      domain: item.domain.toJSON(),
      matchScore: item.matchScore,
      interestAlignment: item.interestAlignment,
      marketScore: item.marketScore,
      skillGap: this.calculateSkillGap(item.domain),
      reasoning: [
        `Strong interest alignment with your top dimensions: ${interestProfile.topDimensions.slice(0, 3).join(', ')}`,
        `Market score: ${Math.round(item.marketScore)}/100`,
        `Difficulty matches your profile confidence level`
      ],
      confidence: Math.min(95, Math.max(65, item.matchScore + 10)),
      rank: index + 1
    }));

    const confidence = Math.round(
      recommendedDomains.reduce((sum, domain) => sum + domain.confidence, 0) / recommendedDomains.length
    );

    const reasoning = [
      `Used content-based filtering focused on your interest profile`,
      `Analyzed alignment with your top dimensions: ${interestProfile.topDimensions.slice(0, 3).join(', ')}`,
      `Considered market demand and difficulty appropriateness`
    ];

    return { domains: recommendedDomains, confidence, reasoning };
  }

  /**
   * Market-weighted recommendation algorithm - emphasizes job market factors
   */
  private static async marketWeightedRecommendation(
    interestProfile: IInterestProfile,
    allDomains: ICareerDomainDocument[],
    maxRecommendations: number
  ): Promise<{ domains: IRecommendedDomain[]; confidence: number; reasoning: string[] }> {
    
    const scoredDomains = allDomains.map(domain => {
      const interestAlignment = this.calculateInterestAlignment(interestProfile, domain);
      const marketScore = this.calculateMarketScore(domain);
      const demandScore = domain.marketData.demandScore;
      const growthScore = Math.min(100, Math.max(0, (domain.marketData.jobGrowthRate + 10) * 2));
      
      // Weighted combination: 40% market, 30% demand, 20% growth, 10% interest
      const matchScore = Math.round(
        marketScore * 0.4 + 
        demandScore * 0.3 + 
        growthScore * 0.2 + 
        this.getAverageAlignment(interestAlignment) * 0.1
      );

      return {
        domain,
        matchScore,
        interestAlignment,
        marketScore,
        demandScore,
        growthScore
      };
    });

    // Sort and select top recommendations
    scoredDomains.sort((a, b) => b.matchScore - a.matchScore);
    const topDomains = scoredDomains.slice(0, maxRecommendations);

    const recommendedDomains: IRecommendedDomain[] = topDomains.map((item, index) => ({
      domainId: item.domain._id.toString(),
      domain: item.domain.toJSON(),
      matchScore: item.matchScore,
      interestAlignment: item.interestAlignment,
      marketScore: item.marketScore,
      skillGap: this.calculateSkillGap(item.domain),
      reasoning: [
        `High market demand (${Math.round(item.demandScore)}/100)`,
        `Strong job growth projection (${item.domain.marketData.jobGrowthRate}%)`,
        `Excellent salary potential ($${item.domain.marketData.averageSalaryRange.median.toLocaleString()})`
      ],
      confidence: Math.min(90, Math.max(70, item.matchScore)),
      rank: index + 1
    }));

    const confidence = Math.round(
      recommendedDomains.reduce((sum, domain) => sum + domain.confidence, 0) / recommendedDomains.length
    );

    const reasoning = [
      `Used market-weighted algorithm prioritizing job market factors`,
      `Emphasized high-demand domains with strong growth potential`,
      `Balanced market opportunities with your interest alignment`
    ];

    return { domains: recommendedDomains, confidence, reasoning };
  }

  /**
   * Hybrid recommendation algorithm - combines multiple approaches
   */
  private static async hybridRecommendation(
    userId: string,
    interestProfile: IInterestProfile,
    allDomains: ICareerDomainDocument[],
    maxRecommendations: number
  ): Promise<{ domains: IRecommendedDomain[]; confidence: number; reasoning: string[] }> {
    
    // Get recommendations from each algorithm
    const contentBased = await this.contentBasedFiltering(interestProfile, allDomains, maxRecommendations * 2);
    const marketWeighted = await this.marketWeightedRecommendation(interestProfile, allDomains, maxRecommendations * 2);
    
    // Try collaborative filtering, but handle case where no similar users exist
    let collaborative: { domains: IRecommendedDomain[]; confidence: number; reasoning: string[] } | null = null;
    try {
      collaborative = await this.collaborativeFiltering(userId, interestProfile, allDomains, maxRecommendations * 2);
    } catch (error) {
      logger.warn('Collaborative filtering failed, using content-based and market-weighted only', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Combine and re-score domains
    const domainScores = new Map<string, {
      domain: ICareerDomainDocument;
      scores: number[];
      alignments: Record<CareerDimension, number>[];
      marketScores: number[];
      reasoning: string[][];
    }>();

    // Add content-based scores
    contentBased.domains.forEach(rec => {
      const domainId = rec.domainId;
      if (!domainScores.has(domainId)) {
        const domain = allDomains.find(d => d._id.toString() === domainId)!;
        domainScores.set(domainId, {
          domain,
          scores: [],
          alignments: [],
          marketScores: [],
          reasoning: []
        });
      }
      const entry = domainScores.get(domainId)!;
      entry.scores.push(rec.matchScore);
      entry.alignments.push(rec.interestAlignment);
      entry.marketScores.push(rec.marketScore);
      entry.reasoning.push(rec.reasoning);
    });

    // Add market-weighted scores
    marketWeighted.domains.forEach(rec => {
      const domainId = rec.domainId;
      if (!domainScores.has(domainId)) {
        const domain = allDomains.find(d => d._id.toString() === domainId)!;
        domainScores.set(domainId, {
          domain,
          scores: [],
          alignments: [],
          marketScores: [],
          reasoning: []
        });
      }
      const entry = domainScores.get(domainId)!;
      entry.scores.push(rec.matchScore);
      entry.alignments.push(rec.interestAlignment);
      entry.marketScores.push(rec.marketScore);
      entry.reasoning.push(rec.reasoning);
    });

    // Add collaborative scores if available
    if (collaborative) {
      collaborative.domains.forEach(rec => {
        const domainId = rec.domainId;
        if (!domainScores.has(domainId)) {
          const domain = allDomains.find(d => d._id.toString() === domainId)!;
          domainScores.set(domainId, {
            domain,
            scores: [],
            alignments: [],
            marketScores: [],
            reasoning: []
          });
        }
        const entry = domainScores.get(domainId)!;
        entry.scores.push(rec.matchScore);
        entry.alignments.push(rec.interestAlignment);
        entry.marketScores.push(rec.marketScore);
        entry.reasoning.push(rec.reasoning);
      });
    }

    // Calculate hybrid scores
    const hybridScores = Array.from(domainScores.entries()).map(([domainId, data]) => {
      const avgScore = data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length;
      const avgMarketScore = data.marketScores.reduce((sum, score) => sum + score, 0) / data.marketScores.length;
      
      // Merge interest alignments
      const mergedAlignment: Record<CareerDimension, number> = {} as Record<CareerDimension, number>;
      Object.values(CareerDimension).forEach(dim => {
        const scores = data.alignments.map(alignment => alignment[dim]).filter(score => score !== undefined);
        mergedAlignment[dim] = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      });

      // Boost score based on algorithm consensus
      const consensusBoost = Math.min(10, (data.scores.length - 1) * 5);
      const finalScore = Math.min(100, Math.round(avgScore + consensusBoost));

      return {
        domainId,
        domain: data.domain,
        matchScore: finalScore,
        interestAlignment: mergedAlignment,
        marketScore: avgMarketScore,
        reasoning: data.reasoning.flat().slice(0, 3), // Take top 3 reasons
        algorithmCount: data.scores.length
      };
    });

    // Sort and select top recommendations
    hybridScores.sort((a, b) => b.matchScore - a.matchScore);
    const topDomains = hybridScores.slice(0, maxRecommendations);

    const recommendedDomains: IRecommendedDomain[] = topDomains.map((item, index) => ({
      domainId: item.domainId,
      domain: item.domain.toJSON(),
      matchScore: item.matchScore,
      interestAlignment: item.interestAlignment,
      marketScore: item.marketScore,
      skillGap: this.calculateSkillGap(item.domain),
      reasoning: [
        ...item.reasoning,
        `Consensus from ${item.algorithmCount} recommendation algorithms`
      ],
      confidence: Math.min(95, Math.max(75, item.matchScore + (item.algorithmCount * 3))),
      rank: index + 1
    }));

    const confidence = Math.round(
      recommendedDomains.reduce((sum, domain) => sum + domain.confidence, 0) / recommendedDomains.length
    );

    const algorithmCount = collaborative ? 3 : 2;
    const reasoning = [
      `Used hybrid approach combining ${algorithmCount} recommendation algorithms`,
      `Balanced interest alignment, market demand, and user behavior patterns`,
      `Applied consensus scoring for higher confidence recommendations`
    ];

    return { domains: recommendedDomains, confidence, reasoning };
  }

  /**
   * Calculate interest alignment between user profile and domain
   */
  private static calculateInterestAlignment(
    interestProfile: IInterestProfile,
    domain: ICareerDomainDocument
  ): Record<CareerDimension, number> {
    const alignment: Record<CareerDimension, number> = {} as Record<CareerDimension, number>;
    
    // Define domain-dimension mappings based on domain characteristics
    const domainDimensionWeights = this.getDomainDimensionWeights(domain);
    
    Object.values(CareerDimension).forEach(dimension => {
      const userScore = interestProfile.dimensions[dimension] || 0;
      const domainWeight = domainDimensionWeights[dimension] || 0;
      
      // Calculate alignment score (0-100)
      alignment[dimension] = Math.round((userScore * domainWeight) / 100);
    });
    
    return alignment;
  }

  /**
   * Get dimension weights for a domain based on its characteristics
   */
  private static getDomainDimensionWeights(domain: ICareerDomainDocument): Record<CareerDimension, number> {
    const weights: Record<CareerDimension, number> = {} as Record<CareerDimension, number>;
    
    // Initialize all dimensions to 0
    Object.values(CareerDimension).forEach(dim => {
      weights[dim] = 0;
    });
    
    // Set weights based on domain category and characteristics
    switch (domain.category) {
      case DomainCategory.TECHNOLOGY:
        weights[CareerDimension.TECHNOLOGY] = 90;
        weights[CareerDimension.ANALYTICAL] = 80;
        weights[CareerDimension.RESEARCH] = 60;
        weights[CareerDimension.PRACTICAL] = 70;
        break;
        
      case DomainCategory.CREATIVE:
      case DomainCategory.DESIGN:
        weights[CareerDimension.CREATIVE] = 95;
        weights[CareerDimension.TECHNOLOGY] = 40;
        weights[CareerDimension.ANALYTICAL] = 30;
        break;
        
      case DomainCategory.BUSINESS:
      case DomainCategory.FINANCE:
        weights[CareerDimension.ANALYTICAL] = 85;
        weights[CareerDimension.LEADERSHIP] = 75;
        weights[CareerDimension.ENTREPRENEURIAL] = 70;
        weights[CareerDimension.SOCIAL] = 60;
        break;
        
      case DomainCategory.MARKETING:
        weights[CareerDimension.CREATIVE] = 70;
        weights[CareerDimension.SOCIAL] = 80;
        weights[CareerDimension.ANALYTICAL] = 60;
        weights[CareerDimension.ENTREPRENEURIAL] = 65;
        break;
        
      case DomainCategory.HEALTHCARE:
        weights[CareerDimension.HELPING] = 90;
        weights[CareerDimension.ANALYTICAL] = 70;
        weights[CareerDimension.SOCIAL] = 75;
        weights[CareerDimension.RESEARCH] = 60;
        break;
        
      case DomainCategory.EDUCATION:
        weights[CareerDimension.HELPING] = 85;
        weights[CareerDimension.SOCIAL] = 90;
        weights[CareerDimension.LEADERSHIP] = 70;
        weights[CareerDimension.CREATIVE] = 50;
        break;
        
      case DomainCategory.RESEARCH:
        weights[CareerDimension.RESEARCH] = 95;
        weights[CareerDimension.ANALYTICAL] = 90;
        weights[CareerDimension.TECHNOLOGY] = 60;
        break;
        
      case DomainCategory.ENGINEERING:
        weights[CareerDimension.TECHNOLOGY] = 85;
        weights[CareerDimension.ANALYTICAL] = 90;
        weights[CareerDimension.PRACTICAL] = 95;
        weights[CareerDimension.RESEARCH] = 70;
        break;
        
      case DomainCategory.CONSULTING:
        weights[CareerDimension.ANALYTICAL] = 85;
        weights[CareerDimension.SOCIAL] = 80;
        weights[CareerDimension.LEADERSHIP] = 75;
        weights[CareerDimension.ENTREPRENEURIAL] = 70;
        break;
        
      case DomainCategory.ENTREPRENEURSHIP:
        weights[CareerDimension.ENTREPRENEURIAL] = 95;
        weights[CareerDimension.LEADERSHIP] = 85;
        weights[CareerDimension.CREATIVE] = 70;
        weights[CareerDimension.SOCIAL] = 65;
        break;
        
      default:
        // Default balanced weights
        Object.values(CareerDimension).forEach(dim => {
          weights[dim] = 50;
        });
    }
    
    return weights;
  }

  /**
   * Calculate market score for a domain
   */
  private static calculateMarketScore(domain: ICareerDomainDocument): number {
    return CareerDomainService.calculateMarketScore(domain);
  }

  /**
   * Calculate difficulty appropriateness score
   */
  private static calculateDifficultyScore(domain: ICareerDomainDocument, interestProfile: IInterestProfile): number {
    // Higher confidence users can handle more difficult domains
    const confidenceThreshold = interestProfile.confidence;
    
    const difficultyScores = {
      'beginner': confidenceThreshold >= 60 ? 100 : 80,
      'intermediate': confidenceThreshold >= 70 ? 100 : confidenceThreshold >= 50 ? 90 : 70,
      'advanced': confidenceThreshold >= 80 ? 100 : confidenceThreshold >= 60 ? 80 : 50,
      'expert': confidenceThreshold >= 90 ? 100 : confidenceThreshold >= 70 ? 70 : 30
    };
    
    return difficultyScores[domain.difficulty] || 50;
  }

  /**
   * Calculate skill gap analysis for a domain
   */
  private static calculateSkillGap(domain: ICareerDomainDocument): ISkillGap[] {
    const skillGaps: ISkillGap[] = [];
    
    // Analyze required skills (assuming user starts with basic knowledge)
    domain.requiredSkills.forEach(skill => {
      const currentLevel = 2; // Assume basic level for new users
      const requiredLevel = Math.min(10, skill.importance);
      const gap = Math.max(0, requiredLevel - currentLevel);
      
      if (gap > 0) {
        skillGaps.push({
          skill: skill.name,
          currentLevel,
          requiredLevel,
          gap,
          priority: gap >= 6 ? SkillPriority.CRITICAL : 
                   gap >= 4 ? SkillPriority.HIGH :
                   gap >= 2 ? SkillPriority.MEDIUM : SkillPriority.LOW,
          learningPath: skill.learningResources.slice(0, 3)
        });
      }
    });
    
    return skillGaps.sort((a, b) => b.gap - a.gap);
  }

  /**
   * Get average alignment score across all dimensions
   */
  private static getAverageAlignment(alignment: Record<CareerDimension, number>): number {
    const scores = Object.values(alignment);
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }

  /**
   * Find users with similar interest profiles (placeholder for collaborative filtering)
   */
  private static async findSimilarUsers(userId: string, _interestProfile: IInterestProfile): Promise<string[]> {
    // This is a simplified implementation
    // In a real system, you would analyze user assessment data to find similar profiles
    
    try {
      // For now, return a small set of mock similar users
      // In production, this would query the assessment database
      const mockSimilarUsers = ['user1', 'user2', 'user3'];
      
      logger.debug('Found similar users for collaborative filtering', {
        userId,
        similarUserCount: mockSimilarUsers.length
      });
      
      return mockSimilarUsers;
    } catch (error) {
      logger.warn('Could not find similar users, returning empty array', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Get domain preferences from similar users (placeholder for collaborative filtering)
   */
  private static async getDomainPreferencesFromSimilarUsers(similarUsers: string[]): Promise<Record<string, number>> {
    // This is a simplified implementation
    // In a real system, you would analyze recommendation feedback and selections
    
    const preferences: Record<string, number> = {};
    
    // Mock preferences based on similar users
    // In production, this would aggregate actual user feedback and selections
    if (similarUsers.length > 0) {
      // Simulate some domain preferences
      preferences['software-development'] = 85;
      preferences['data-science'] = 78;
      preferences['digital-marketing'] = 65;
      preferences['ux-ui-design'] = 72;
    }
    
    return preferences;
  }

  /**
   * Get latest recommendation for a user
   */
  static async getLatestRecommendation(userId: string): Promise<IRecommendationDocument | null> {
    try {
      const recommendation = await (Recommendation as any).findLatestByUser(userId);
      
      if (recommendation) {
        logger.debug('Retrieved latest recommendation for user', {
          userId,
          recommendationId: recommendation._id,
          algorithm: recommendation.algorithm,
          domainCount: recommendation.domains.length
        });
      }
      
      return recommendation;
    } catch (error) {
      logger.error('Error retrieving latest recommendation', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Get all recommendations for a user
   */
  static async getUserRecommendations(userId: string, activeOnly: boolean = true): Promise<IRecommendationDocument[]> {
    try {
      const recommendations = await (Recommendation as any).findByUser(userId, activeOnly);
      
      logger.debug('Retrieved user recommendations', {
        userId,
        count: recommendations.length,
        activeOnly
      });
      
      return recommendations;
    } catch (error) {
      logger.error('Error retrieving user recommendations', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  /**
   * Add feedback to a recommendation
   */
  static async addRecommendationFeedback(
    recommendationId: string,
    domainId: string,
    rating: number,
    feedback: string,
    comments?: string,
    selectedDomain?: string,
    rejectionReason?: string
  ): Promise<void> {
    try {
      const recommendation = await Recommendation.findById(recommendationId);
      
      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      await (recommendation as any).addFeedback({
        domainId,
        rating,
        feedback,
        comments,
        selectedDomain,
        rejectionReason
      });

      logger.info('Feedback added to recommendation', {
        recommendationId,
        domainId,
        rating,
        feedback
      });
    } catch (error) {
      logger.error('Error adding recommendation feedback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendationId,
        domainId
      });
      throw error;
    }
  }

  /**
   * Merge AI recommendations with traditional algorithm recommendations
   */
  private static mergeAIRecommendations(
    traditionalRecs: IRecommendedDomain[],
    aiRecs: Array<{
      domain: string;
      matchScore: number;
      reasoning: string[];
      keySkills: string[];
      careerPaths: string[];
    }>,
    allDomains: ICareerDomainDocument[]
  ): IRecommendedDomain[] {
    // Create a map of domain names to domain documents
    const domainMap = new Map<string, ICareerDomainDocument>();
    allDomains.forEach(domain => {
      domainMap.set(domain.title.toLowerCase(), domain);
    });

    // Boost scores for domains recommended by AI
    const aiDomainNames = new Set(aiRecs.map(r => r.domain.toLowerCase()));
    
    const enhancedRecs = traditionalRecs.map(rec => {
      const domain = allDomains.find(d => d._id.toString() === rec.domainId);
      if (domain && aiDomainNames.has(domain.title.toLowerCase())) {
        const aiRec = aiRecs.find(r => r.domain.toLowerCase() === domain.title.toLowerCase());
        if (aiRec) {
          // Boost match score by averaging with AI score
          const boostedScore = (rec.matchScore + aiRec.matchScore) / 2;
          
          // Add AI reasoning
          const enhancedReasoning = [
            ...rec.reasoning,
            ...aiRec.reasoning.map(r => `AI Insight: ${r}`)
          ];
          
          return {
            ...rec,
            matchScore: Math.min(100, boostedScore),
            reasoning: enhancedReasoning.slice(0, 5) // Keep top 5 reasons
          };
        }
      }
      return rec;
    });

    // Sort by match score
    return enhancedRecs.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Get recommendation statistics
   */
  static async getRecommendationStatistics(): Promise<any> {
    try {
      const stats = await (Recommendation as any).getRecommendationStatistics();
      
      logger.debug('Retrieved recommendation statistics', stats);
      
      return stats;
    } catch (error) {
      logger.error('Error retrieving recommendation statistics', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}