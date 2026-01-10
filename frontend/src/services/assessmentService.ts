import apiClient from './authApi';

export interface Question {
  id: string;
  text: string;
  type: 'rating_scale' | 'multiple_choice' | 'text' | 'text_input' | 'boolean';
  category: string;
  dimension: string;
  weight: number;
  required: boolean;
  order: number;
  options?: string[];
  minValue?: number;
  maxValue?: number;
}

export interface Questionnaire {
  id: string;
  version: string;
  title: string;
  description: string;
  estimatedDuration: number;
  questions: Question[];
  categories: string[];
  totalQuestions: number;
}

export interface QuestionResponse {
  questionId: string;
  answer: any;
  responseTime: number;
  confidence?: number;
}

export interface AssessmentSubmission {
  responses: QuestionResponse[];
  isPartial?: boolean;
}

export interface InterestProfile {
  dimensions: Record<string, number>;
  confidence: number;
  completeness: number;
  topDimensions: string[];
  insights: string[];
}

export interface Assessment {
  id: string;
  version: string;
  startedAt: string;
  completedAt?: string;
  isComplete: boolean;
  progress: {
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
    isComplete: boolean;
    averageResponseTime: number;
  };
  interestProfile?: InterestProfile;
  totalCompletionTime?: number;
}

export interface AssessmentRetake {
  reason?: string;
  keepPreviousData?: boolean;
}

class AssessmentService {
  /**
   * Get the active assessment questionnaire
   */
  async getQuestionnaire(): Promise<Questionnaire> {
    const response = await apiClient.get('/assessment/questionnaire');
    return response.data.data.questionnaire;
  }

  /**
   * Start a new assessment
   */
  async startAssessment(): Promise<Assessment> {
    const response = await apiClient.post('/assessment/start');
    return response.data.data.assessment;
  }

  /**
   * Submit assessment responses
   */
  async submitResponses(submission: AssessmentSubmission): Promise<{
    assessment: Assessment;
    validation: {
      isValid: boolean;
      warnings: string[];
      completeness: number;
    };
  }> {
    const response = await apiClient.post('/assessment/submit', submission);
    return response.data.data;
  }

  /**
   * Get assessment results
   */
  async getResults(): Promise<Assessment> {
    const response = await apiClient.get('/assessment/results');
    return response.data.data.assessment;
  }

  /**
   * Get assessment progress
   */
  async getProgress(): Promise<{
    progress: Assessment['progress'];
    assessment: Pick<Assessment, 'id' | 'version' | 'startedAt' | 'completedAt' | 'isComplete'>;
  }> {
    const response = await apiClient.get('/assessment/progress');
    return response.data.data;
  }

  /**
   * Retake assessment
   */
  async retakeAssessment(retakeData?: AssessmentRetake): Promise<{
    assessment: Assessment;
    previousAssessment?: Pick<Assessment, 'id' | 'completedAt' | 'interestProfile'>;
  }> {
    const response = await apiClient.post('/assessment/retake', retakeData || {});
    return response.data.data;
  }
}

export const assessmentService = new AssessmentService();