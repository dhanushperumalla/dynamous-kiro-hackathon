import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/utils/logger';

/**
 * Gemini AI Service
 * Handles all interactions with Google's Gemini AI API
 */
class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private isEnabled: boolean = false;

  constructor() {
    const apiKey = process.env['GEMINI_API_KEY'];
    const modelName = process.env['GEMINI_MODEL'] || 'gemini-1.5-pro';

    if (apiKey && !apiKey.startsWith('dummy-')) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: modelName });
        this.isEnabled = true;
        logger.info('Gemini AI service initialized', { model: modelName });
      } catch (error) {
        logger.error('Failed to initialize Gemini AI service', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        this.isEnabled = false;
      }
    } else {
      logger.warn('Gemini API key not configured. AI features will be limited.');
      this.isEnabled = false;
    }
  }

  /**
   * Check if Gemini service is available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.model !== null;
  }

  /**
   * Generate career recommendations based on user interests
   */
  async generateCareerRecommendations(interestProfile: {
    dimensions: Record<string, number>;
    topInterests: string[];
    skills?: string[];
    experience?: string;
  }): Promise<{
    recommendations: Array<{
      domain: string;
      matchScore: number;
      reasoning: string[];
      keySkills: string[];
      careerPaths: string[];
    }>;
    analysis: string;
  }> {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available');
    }

    try {
      const prompt = `You are a career counselor AI. Analyze the following user interest profile and recommend the top 5 career domains that best match their interests and skills.

User Interest Profile:
- Interest Dimensions: ${JSON.stringify(interestProfile.dimensions, null, 2)}
- Top Interests: ${interestProfile.topInterests.join(', ')}
${interestProfile.skills ? `- Skills: ${interestProfile.skills.join(', ')}` : ''}
${interestProfile.experience ? `- Experience Level: ${interestProfile.experience}` : ''}

Please provide:
1. Top 5 career domain recommendations with match scores (0-100)
2. Detailed reasoning for each recommendation
3. Key skills needed for each domain
4. Potential career paths within each domain
5. Overall analysis of the user's profile

Format your response as JSON with this structure:
{
  "recommendations": [
    {
      "domain": "Domain Name",
      "matchScore": 85,
      "reasoning": ["reason 1", "reason 2", "reason 3"],
      "keySkills": ["skill1", "skill2", "skill3"],
      "careerPaths": ["path1", "path2", "path3"]
    }
  ],
  "analysis": "Overall analysis of the user's profile and career potential"
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      logger.info('Career recommendations generated via Gemini', {
        recommendationCount: parsed.recommendations?.length || 0
      });

      return parsed;
    } catch (error) {
      logger.error('Failed to generate career recommendations', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate a personalized learning roadmap
   */
  async generateLearningRoadmap(params: {
    domain: string;
    skillLevel: string;
    availableHoursPerWeek: number;
    learningPace: string;
    focusAreas?: string[];
    currentSkills?: string[];
  }): Promise<{
    modules: Array<{
      title: string;
      description: string;
      duration: string;
      topics: string[];
      resources: Array<{
        title: string;
        type: string;
        url?: string;
      }>;
      weeklyTargets: Array<{
        week: number;
        title: string;
        tasks: string[];
        estimatedHours: number;
      }>;
    }>;
    totalDuration: string;
    milestones: string[];
    tips: string[];
  }> {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available');
    }

    try {
      const prompt = `You are an expert learning path designer. Create a comprehensive, personalized learning roadmap for the following requirements:

Domain: ${params.domain}
Skill Level: ${params.skillLevel}
Available Hours Per Week: ${params.availableHoursPerWeek}
Learning Pace: ${params.learningPace}
${params.focusAreas ? `Focus Areas: ${params.focusAreas.join(', ')}` : ''}
${params.currentSkills ? `Current Skills: ${params.currentSkills.join(', ')}` : ''}

Create a detailed learning roadmap with:
1. 6-8 learning modules covering the domain comprehensively
2. Each module should have a clear title, description, duration, and topics
3. Recommended resources for each module (courses, books, tutorials)
4. Weekly targets with specific tasks and estimated hours
5. Key milestones to track progress
6. Learning tips and best practices

Format your response as JSON with this structure:
{
  "modules": [
    {
      "title": "Module Title",
      "description": "Module description",
      "duration": "4 weeks",
      "topics": ["topic1", "topic2"],
      "resources": [
        {"title": "Resource name", "type": "course/book/tutorial", "url": "optional"}
      ],
      "weeklyTargets": [
        {
          "week": 1,
          "title": "Week title",
          "tasks": ["task1", "task2"],
          "estimatedHours": 10
        }
      ]
    }
  ],
  "totalDuration": "6 months",
  "milestones": ["milestone1", "milestone2"],
  "tips": ["tip1", "tip2"]
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      logger.info('Learning roadmap generated via Gemini', {
        domain: params.domain,
        moduleCount: parsed.modules?.length || 0
      });

      return parsed;
    } catch (error) {
      logger.error('Failed to generate learning roadmap', {
        error: error instanceof Error ? error.message : 'Unknown error',
        domain: params.domain
      });
      throw error;
    }
  }

  /**
   * Analyze assessment responses and provide insights
   */
  async analyzeAssessment(responses: Array<{
    question: string;
    answer: any;
    category?: string;
  }>): Promise<{
    insights: string[];
    strengths: string[];
    areasForGrowth: string[];
    recommendedDomains: string[];
    personalityTraits: string[];
  }> {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available');
    }

    try {
      const prompt = `You are a career assessment analyst. Analyze the following assessment responses and provide detailed insights:

Assessment Responses:
${JSON.stringify(responses, null, 2)}

Provide:
1. Key insights about the user's interests and preferences
2. Identified strengths
3. Areas for growth and development
4. Recommended career domains
5. Personality traits that influence career choices

Format your response as JSON with this structure:
{
  "insights": ["insight1", "insight2"],
  "strengths": ["strength1", "strength2"],
  "areasForGrowth": ["area1", "area2"],
  "recommendedDomains": ["domain1", "domain2"],
  "personalityTraits": ["trait1", "trait2"]
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      logger.info('Assessment analyzed via Gemini');

      return parsed;
    } catch (error) {
      logger.error('Failed to analyze assessment', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate personalized study tips and recommendations
   */
  async generateStudyTips(params: {
    domain: string;
    currentProgress: number;
    strugglingAreas?: string[];
    learningStyle?: string;
  }): Promise<{
    tips: string[];
    resources: Array<{
      title: string;
      description: string;
      type: string;
    }>;
    motivationalMessage: string;
  }> {
    if (!this.isAvailable()) {
      throw new Error('Gemini AI service is not available');
    }

    try {
      const prompt = `You are a learning coach. Provide personalized study tips and recommendations:

Domain: ${params.domain}
Current Progress: ${params.currentProgress}%
${params.strugglingAreas ? `Struggling Areas: ${params.strugglingAreas.join(', ')}` : ''}
${params.learningStyle ? `Learning Style: ${params.learningStyle}` : ''}

Provide:
1. 5-7 actionable study tips
2. Recommended resources to overcome challenges
3. A motivational message

Format as JSON:
{
  "tips": ["tip1", "tip2"],
  "resources": [{"title": "Resource", "description": "Description", "type": "article/video/course"}],
  "motivationalMessage": "Motivational message"
}`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse AI response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to generate study tips', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Export singleton instance
export const geminiService = new GeminiService();
