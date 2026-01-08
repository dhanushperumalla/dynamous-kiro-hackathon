import { 
  IQuestionResponse, 
  IQuestion, 
  IInterestProfile, 
  CareerDimension, 
  QuestionType 
} from '@/types/assessment';
import { logger } from '@/utils/logger';

/**
 * Interest Analysis Engine Service
 * Processes assessment responses using NLP and ML algorithms to generate interest profiles
 */
export class InterestAnalysisService {
  
  /**
   * Analyze assessment responses and generate interest profile
   */
  static async analyzeResponses(
    responses: IQuestionResponse[],
    questions: IQuestion[]
  ): Promise<IInterestProfile> {
    try {
      logger.info('Starting interest analysis', {
        responseCount: responses.length,
        questionCount: questions.length
      });

      // Create question lookup map
      const questionMap = new Map(questions.map(q => [q.id, q]));
      
      // Calculate dimension scores
      const dimensionScores = this.calculateDimensionScores(responses, questionMap);
      
      // Calculate confidence score
      const confidence = this.calculateConfidenceScore(responses, questions);
      
      // Calculate completeness
      const completeness = this.calculateCompleteness(responses, questions);
      
      // Identify top dimensions
      const topDimensions = this.identifyTopDimensions(dimensionScores);
      
      // Generate insights using NLP analysis
      const insights = await this.generateInsights(responses, questionMap, dimensionScores);
      
      const profile: IInterestProfile = {
        dimensions: dimensionScores,
        confidence,
        completeness,
        topDimensions,
        insights
      };

      logger.info('Interest analysis completed', {
        confidence,
        completeness,
        topDimensions: topDimensions.slice(0, 3),
        insightCount: insights.length
      });

      return profile;
    } catch (error) {
      logger.error('Error analyzing interest responses', {
        error: error instanceof Error ? error.message : 'Unknown error',
        responseCount: responses.length
      });
      throw error;
    }
  }

  /**
   * Calculate scores for each career dimension based on responses
   */
  private static calculateDimensionScores(
    responses: IQuestionResponse[],
    questionMap: Map<string, IQuestion>
  ): Record<CareerDimension, number> {
    // Initialize dimension scores
    const dimensionScores: Record<CareerDimension, number> = {} as Record<CareerDimension, number>;
    const dimensionWeights: Record<CareerDimension, number> = {} as Record<CareerDimension, number>;
    
    // Initialize all dimensions to 0
    Object.values(CareerDimension).forEach(dimension => {
      dimensionScores[dimension] = 0;
      dimensionWeights[dimension] = 0;
    });

    // Process each response
    for (const response of responses) {
      const question = questionMap.get(response.questionId);
      if (!question) continue;

      const normalizedScore = this.normalizeResponseScore(response, question);
      const weightedScore = normalizedScore * question.weight;
      
      dimensionScores[question.dimension] += weightedScore;
      dimensionWeights[question.dimension] += question.weight;
    }

    // Calculate final scores as weighted averages (0-100 scale)
    Object.values(CareerDimension).forEach(dimension => {
      if (dimensionWeights[dimension] > 0) {
        dimensionScores[dimension] = Math.round(
          (dimensionScores[dimension] / dimensionWeights[dimension]) * 100
        );
      }
    });

    return dimensionScores;
  }

  /**
   * Normalize response score to 0-1 scale based on question type
   */
  private static normalizeResponseScore(
    response: IQuestionResponse,
    question: IQuestion
  ): number {
    try {
      switch (question.type) {
        case QuestionType.RATING_SCALE:
          const numAnswer = response.answer as number;
          const min = question.minValue || 1;
          const max = question.maxValue || 5;
          return (numAnswer - min) / (max - min);

        case QuestionType.MULTIPLE_CHOICE:
          // Score based on option position (assuming options are ordered by preference)
          const mcAnswer = response.answer as string;
          const optionIndex = question.options?.indexOf(mcAnswer) || 0;
          const totalOptions = question.options?.length || 1;
          return (totalOptions - optionIndex - 1) / (totalOptions - 1);

        case QuestionType.BOOLEAN:
          return (response.answer as boolean) ? 1 : 0;

        case QuestionType.TEXT_INPUT:
          // Use NLP sentiment analysis for text responses
          return this.analyzeTextSentiment(response.answer as string);

        case QuestionType.RANKING:
          // Score based on average ranking position
          const rankingAnswer = response.answer as string[];
          if (!question.options || rankingAnswer.length === 0) return 0.5;
          
          let totalScore = 0;
          let validRankings = 0;
          
          for (let i = 0; i < rankingAnswer.length; i++) {
            const option = rankingAnswer[i];
            if (option && question.options.includes(option)) {
              // Higher positions get higher scores
              totalScore += (rankingAnswer.length - i) / rankingAnswer.length;
              validRankings++;
            }
          }
          
          return validRankings > 0 ? totalScore / validRankings : 0.5;

        default:
          return 0.5; // Neutral score for unknown types
      }
    } catch (error) {
      logger.warn('Error normalizing response score', {
        questionId: question.id,
        questionType: question.type,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0.5; // Return neutral score on error
    }
  }

  /**
   * Simple sentiment analysis for text responses
   * In a real implementation, this would use a proper NLP library
   */
  private static analyzeTextSentiment(text: string): number {
    if (!text || typeof text !== 'string') return 0.5;

    const positiveWords = [
      'love', 'enjoy', 'excited', 'passionate', 'interested', 'fascinated',
      'amazing', 'great', 'excellent', 'wonderful', 'fantastic', 'awesome',
      'like', 'prefer', 'want', 'desire', 'motivated', 'inspired'
    ];

    const negativeWords = [
      'hate', 'dislike', 'boring', 'uninterested', 'avoid', 'reluctant',
      'terrible', 'awful', 'bad', 'poor', 'worst', 'never', 'not'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) {
        positiveCount++;
      }
      if (negativeWords.some(nw => word.includes(nw))) {
        negativeCount++;
      }
    }

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) return 0.5; // Neutral

    // Calculate sentiment score (0-1 scale)
    const sentimentScore = positiveCount / totalSentimentWords;
    return Math.max(0, Math.min(1, sentimentScore));
  }

  /**
   * Calculate overall confidence score based on response patterns
   */
  private static calculateConfidenceScore(
    responses: IQuestionResponse[],
    questions: IQuestion[]
  ): number {
    if (responses.length === 0) return 0;

    let totalConfidence = 0;
    let confidenceCount = 0;
    let consistencyScore = 0;
    let responseTimeScore = 0;

    // Calculate average explicit confidence
    for (const response of responses) {
      if (response.confidence !== undefined) {
        totalConfidence += response.confidence;
        confidenceCount++;
      }
    }

    const avgExplicitConfidence = confidenceCount > 0 ? 
      (totalConfidence / confidenceCount) / 5 : 0.6; // Default to 60% if no confidence scores

    // Calculate response time consistency (more consistent = higher confidence)
    const responseTimes = responses.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const timeVariance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgResponseTime, 2), 0) / responseTimes.length;
    const timeStdDev = Math.sqrt(timeVariance);
    
    // Lower variance indicates more consistent, thoughtful responses
    responseTimeScore = Math.max(0, Math.min(1, 1 - (timeStdDev / avgResponseTime)));

    // Calculate response pattern consistency
    consistencyScore = this.calculateResponseConsistency(responses, questions);

    // Combine factors (weighted average)
    const finalConfidence = (
      avgExplicitConfidence * 0.5 +
      responseTimeScore * 0.2 +
      consistencyScore * 0.3
    ) * 100;

    return Math.round(Math.max(0, Math.min(100, finalConfidence)));
  }

  /**
   * Calculate response consistency across similar questions
   */
  private static calculateResponseConsistency(
    responses: IQuestionResponse[],
    questions: IQuestion[]
  ): number {
    const questionMap = new Map(questions.map(q => [q.id, q]));
    const dimensionResponses: Record<CareerDimension, number[]> = {} as Record<CareerDimension, number[]>;

    // Group normalized scores by dimension
    Object.values(CareerDimension).forEach(dimension => {
      dimensionResponses[dimension] = [];
    });

    for (const response of responses) {
      const question = questionMap.get(response.questionId);
      if (!question) continue;

      const normalizedScore = this.normalizeResponseScore(response, question);
      dimensionResponses[question.dimension].push(normalizedScore);
    }

    // Calculate consistency within each dimension
    let totalConsistency = 0;
    let dimensionCount = 0;

    Object.values(CareerDimension).forEach(dimension => {
      const scores = dimensionResponses[dimension];
      if (scores.length < 2) return; // Need at least 2 responses to measure consistency

      const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
      const consistency = Math.max(0, 1 - variance); // Lower variance = higher consistency

      totalConsistency += consistency;
      dimensionCount++;
    });

    return dimensionCount > 0 ? totalConsistency / dimensionCount : 0.5;
  }

  /**
   * Calculate assessment completeness percentage
   */
  private static calculateCompleteness(
    responses: IQuestionResponse[],
    questions: IQuestion[]
  ): number {
    if (questions.length === 0) return 100;
    
    const completeness = (responses.length / questions.length) * 100;
    return Math.round(Math.max(0, Math.min(100, completeness)));
  }

  /**
   * Identify top career dimensions based on scores
   */
  private static identifyTopDimensions(
    dimensionScores: Record<CareerDimension, number>
  ): CareerDimension[] {
    return Object.entries(dimensionScores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, 5) // Top 5 dimensions
      .map(([dimension]) => dimension as CareerDimension);
  }

  /**
   * Generate insights using NLP analysis of responses and dimension scores
   */
  private static async generateInsights(
    responses: IQuestionResponse[],
    questionMap: Map<string, IQuestion>,
    dimensionScores: Record<CareerDimension, number>
  ): Promise<string[]> {
    const insights: string[] = [];

    try {
      // Analyze top dimensions
      const sortedDimensions = Object.entries(dimensionScores)
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

      const topDimension = sortedDimensions[0];
      const secondDimension = sortedDimensions[1];

      if (topDimension && topDimension[1] > 70) {
        insights.push(this.getDimensionInsight(topDimension[0] as CareerDimension, 'strong'));
      } else if (topDimension && topDimension[1] > 50) {
        insights.push(this.getDimensionInsight(topDimension[0] as CareerDimension, 'moderate'));
      }

      // Check for balanced interests
      const highScores = sortedDimensions.filter(([, score]) => score > 60);
      if (highScores.length >= 3) {
        insights.push('You show balanced interests across multiple career areas, which suggests versatility and adaptability in your career choices.');
      }

      // Analyze response patterns
      const textResponses = responses.filter(r => {
        const question = questionMap.get(r.questionId);
        return question?.type === QuestionType.TEXT_INPUT;
      });

      if (textResponses.length > 0) {
        const textInsight = this.analyzeTextResponses(textResponses);
        if (textInsight) insights.push(textInsight);
      }

      // Check for clear preferences
      const topScore = topDimension?.[1] || 0;
      const bottomScore = sortedDimensions[sortedDimensions.length - 1]?.[1] || 0;
      const scoreRange = topScore - bottomScore;

      if (scoreRange > 40) {
        insights.push('You have clear preferences and strong distinctions between different career areas.');
      } else if (scoreRange < 20) {
        insights.push('Your interests are fairly evenly distributed, suggesting you might thrive in interdisciplinary roles.');
      }

      // Provide career guidance based on top dimensions
      if (topDimension && secondDimension) {
        const combinationInsight = this.getCombinationInsight(
          topDimension[0] as CareerDimension,
          secondDimension[0] as CareerDimension
        );
        if (combinationInsight) insights.push(combinationInsight);
      }

    } catch (error) {
      logger.error('Error generating insights', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      insights.push('Your responses show a unique pattern of interests that would benefit from further exploration.');
    }

    return insights.slice(0, 5); // Limit to 5 insights
  }

  /**
   * Get insight text for a specific dimension
   */
  private static getDimensionInsight(dimension: CareerDimension, strength: 'strong' | 'moderate'): string {
    const strengthText = strength === 'strong' ? 'strong' : 'moderate';
    
    const insights: Record<CareerDimension, string> = {
      [CareerDimension.TECHNOLOGY]: `You show ${strengthText} interest in technology and digital innovation, suggesting careers in software development, data science, or IT consulting.`,
      [CareerDimension.CREATIVE]: `Your ${strengthText} creative interests indicate potential in design, content creation, marketing, or artistic fields.`,
      [CareerDimension.ANALYTICAL]: `You demonstrate ${strengthText} analytical thinking, which aligns well with careers in research, finance, consulting, or data analysis.`,
      [CareerDimension.SOCIAL]: `Your ${strengthText} social orientation suggests success in people-focused roles like HR, counseling, teaching, or customer relations.`,
      [CareerDimension.ENTREPRENEURIAL]: `You show ${strengthText} entrepreneurial drive, indicating potential for business leadership, startups, or innovation roles.`,
      [CareerDimension.LEADERSHIP]: `Your ${strengthText} leadership interests suggest management, project leadership, or executive roles would suit you well.`,
      [CareerDimension.RESEARCH]: `You demonstrate ${strengthText} research interests, pointing toward academic, scientific, or investigative career paths.`,
      [CareerDimension.PRACTICAL]: `Your ${strengthText} practical orientation indicates success in hands-on roles like engineering, manufacturing, or skilled trades.`,
      [CareerDimension.HELPING]: `You show ${strengthText} desire to help others, suggesting careers in healthcare, social work, education, or non-profit sectors.`,
      [CareerDimension.OUTDOOR]: `Your ${strengthText} outdoor interests indicate potential in environmental science, agriculture, or outdoor recreation industries.`
    };

    return insights[dimension];
  }

  /**
   * Get insight for combination of top two dimensions
   */
  private static getCombinationInsight(
    primary: CareerDimension,
    secondary: CareerDimension
  ): string | null {
    const combinations: Record<string, string> = {
      [`${CareerDimension.TECHNOLOGY}_${CareerDimension.CREATIVE}`]: 'Your combination of technology and creative interests suggests roles in UX/UI design, game development, or digital media.',
      [`${CareerDimension.TECHNOLOGY}_${CareerDimension.ANALYTICAL}`]: 'Technology and analytical skills point toward data science, software architecture, or systems analysis.',
      [`${CareerDimension.CREATIVE}_${CareerDimension.SOCIAL}`]: 'Creative and social interests align well with marketing, public relations, or community engagement roles.',
      [`${CareerDimension.ANALYTICAL}_${CareerDimension.RESEARCH}`]: 'Your analytical and research interests suggest academic research, market analysis, or scientific consulting.',
      [`${CareerDimension.LEADERSHIP}_${CareerDimension.ENTREPRENEURIAL}`]: 'Leadership and entrepreneurial interests indicate strong potential for executive roles or starting your own business.',
      [`${CareerDimension.HELPING}_${CareerDimension.SOCIAL}`]: 'Your helping and social orientation suggests careers in counseling, social work, or community health.',
      [`${CareerDimension.PRACTICAL}_${CareerDimension.TECHNOLOGY}`]: 'Practical and technology interests point toward engineering, technical support, or systems implementation.',
      [`${CareerDimension.OUTDOOR}_${CareerDimension.RESEARCH}`]: 'Outdoor and research interests suggest environmental science, field research, or conservation work.'
    };

    return combinations[`${primary}_${secondary}`] || combinations[`${secondary}_${primary}`] || null;
  }

  /**
   * Analyze text responses for additional insights
   */
  private static analyzeTextResponses(
    textResponses: IQuestionResponse[]
  ): string | null {
    if (textResponses.length === 0) return null;

    let totalLength = 0;
    let detailCount = 0;

    for (const response of textResponses) {
      const text = response.answer as string;
      totalLength += text.length;
      
      // Count detailed responses (longer than 50 characters)
      if (text.length > 50) {
        detailCount++;
      }
    }

    const avgLength = totalLength / textResponses.length;
    const detailRatio = detailCount / textResponses.length;

    if (avgLength > 100 && detailRatio > 0.5) {
      return 'Your detailed responses show thoughtful self-reflection and strong communication skills, valuable in many career paths.';
    } else if (avgLength < 30) {
      return 'Consider exploring your interests more deeply to gain clearer insights into your career preferences.';
    }

    return null;
  }

  /**
   * Update interest profile with new responses (for retaking assessments)
   */
  static async updateProfile(
    existingProfile: IInterestProfile,
    newResponses: IQuestionResponse[],
    questions: IQuestion[],
    blendRatio: number = 0.7 // How much to weight new responses vs existing
  ): Promise<IInterestProfile> {
    try {
      // Generate new profile from new responses
      const newProfile = await this.analyzeResponses(newResponses, questions);
      
      // Blend dimension scores
      const blendedDimensions: Record<CareerDimension, number> = {} as Record<CareerDimension, number>;
      
      Object.values(CareerDimension).forEach(dimension => {
        const existingScore = existingProfile.dimensions[dimension] || 0;
        const newScore = newProfile.dimensions[dimension] || 0;
        blendedDimensions[dimension] = Math.round(
          existingScore * (1 - blendRatio) + newScore * blendRatio
        );
      });

      // Update other metrics
      const blendedProfile: IInterestProfile = {
        dimensions: blendedDimensions,
        confidence: Math.round(
          existingProfile.confidence * (1 - blendRatio) + newProfile.confidence * blendRatio
        ),
        completeness: newProfile.completeness, // Use new completeness
        topDimensions: this.identifyTopDimensions(blendedDimensions),
        insights: [...newProfile.insights, ...existingProfile.insights.slice(0, 2)].slice(0, 5)
      };

      logger.info('Interest profile updated', {
        blendRatio,
        newConfidence: blendedProfile.confidence,
        newTopDimensions: blendedProfile.topDimensions.slice(0, 3)
      });

      return blendedProfile;
    } catch (error) {
      logger.error('Error updating interest profile', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}