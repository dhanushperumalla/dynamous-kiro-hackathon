import { Document, Types } from 'mongoose';

// Question types for the assessment
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  RATING_SCALE = 'rating_scale',
  TEXT_INPUT = 'text_input',
  RANKING = 'ranking',
  BOOLEAN = 'boolean'
}

// Career dimensions for interest scoring
export enum CareerDimension {
  TECHNOLOGY = 'technology',
  CREATIVE = 'creative',
  ANALYTICAL = 'analytical',
  SOCIAL = 'social',
  ENTREPRENEURIAL = 'entrepreneurial',
  LEADERSHIP = 'leadership',
  RESEARCH = 'research',
  PRACTICAL = 'practical',
  HELPING = 'helping',
  OUTDOOR = 'outdoor'
}

// Question interface
export interface IQuestion {
  id: string;
  text: string;
  type: QuestionType;
  category: string;
  dimension: CareerDimension;
  weight: number; // Importance weight for scoring (1-10)
  options?: string[]; // For multiple choice and ranking questions
  minValue?: number; // For rating scale questions
  maxValue?: number; // For rating scale questions
  required: boolean;
  order: number;
}

// Individual response to a question
export interface IQuestionResponse {
  questionId: string;
  answer: string | number | string[] | boolean;
  responseTime: number; // Time taken to answer in milliseconds
  confidence?: number; // User's confidence in their answer (1-5)
}

// Interest profile with scores across dimensions
export interface IInterestProfile {
  dimensions: Record<CareerDimension, number>; // Scores 0-100 for each dimension
  confidence: number; // Overall confidence score (0-100)
  completeness: number; // Percentage of questions answered (0-100)
  topDimensions: CareerDimension[]; // Top 3-5 dimensions sorted by score
  insights: string[]; // Generated insights about the user's interests
}

// Assessment response document
export interface IAssessmentResponse extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  version: string; // Assessment version for tracking changes
  responses: IQuestionResponse[];
  interestProfile: IInterestProfile;
  startedAt: Date;
  completedAt?: Date;
  isComplete: boolean;
  totalQuestions: number;
  answeredQuestions: number;
  averageResponseTime: number; // Average time per question in milliseconds
  createdAt: Date;
  updatedAt: Date;
}

// Questionnaire structure
export interface IQuestionnaire extends Document {
  _id: Types.ObjectId;
  version: string;
  title: string;
  description: string;
  estimatedDuration: number; // Estimated completion time in minutes
  questions: IQuestion[];
  categories: string[];
  totalQuestions: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Assessment validation result
export interface IAssessmentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number;
  missingRequired: string[];
}

// Assessment statistics
export interface IAssessmentStats {
  totalResponses: number;
  completionRate: number;
  averageCompletionTime: number;
  dimensionAverages: Record<CareerDimension, number>;
  mostCommonTopDimensions: CareerDimension[];
  responseDistribution: Record<string, number>;
}

// Assessment creation interface
export interface ICreateAssessment {
  userId: string;
  version?: string;
}

// Assessment update interface
export interface IUpdateAssessment {
  responses?: IQuestionResponse[];
  interestProfile?: Partial<IInterestProfile>;
  completedAt?: Date;
  isComplete?: boolean;
}

// Assessment response interface for API
export interface IAssessmentResponseAPI {
  id: string;
  userId: string;
  version: string;
  responses: IQuestionResponse[];
  interestProfile: IInterestProfile;
  startedAt: Date;
  completedAt?: Date;
  isComplete: boolean;
  progress: {
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
  };
  timing: {
    averageResponseTime: number;
    totalTime?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Assessment submission interface
export interface IAssessmentSubmission {
  responses: IQuestionResponse[];
  isPartial?: boolean; // Allow partial submissions for progress saving
}

// Assessment retake interface
export interface IAssessmentRetake {
  reason?: string;
  keepPreviousData?: boolean;
}

// Assessment analytics interface
export interface IAssessmentAnalytics {
  userId: string;
  assessmentId: string;
  completionTime: number;
  responsePattern: {
    quickResponses: number; // Responses under 5 seconds
    thoughtfulResponses: number; // Responses 5-30 seconds
    slowResponses: number; // Responses over 30 seconds
  };
  confidencePattern: {
    highConfidence: number; // Confidence 4-5
    mediumConfidence: number; // Confidence 3
    lowConfidence: number; // Confidence 1-2
  };
  dimensionConsistency: Record<CareerDimension, number>; // Consistency score per dimension
  overallConsistency: number;
}

// Assessment recommendation interface
export interface IAssessmentRecommendation {
  assessmentId: string;
  userId: string;
  recommendedDomains: string[];
  confidence: number;
  reasoning: string[];
  nextSteps: string[];
  generatedAt: Date;
}

// Assessment export interface
export interface IAssessmentExport {
  user: {
    id: string;
    email: string;
    name: string;
  };
  assessment: IAssessmentResponseAPI;
  questionnaire: {
    version: string;
    questions: IQuestion[];
  };
  analysis: {
    interestProfile: IInterestProfile;
    analytics: IAssessmentAnalytics;
    recommendations: IAssessmentRecommendation;
  };
  exportedAt: Date;
}