import { Document, Types } from 'mongoose';
import { CareerDimension } from '@/types/assessment';

// Career domain interface
export interface ICareerDomain {
  id: string;
  name: string;
  title: string;
  description: string;
  detailedDescription: string;
  category: DomainCategory;
  requiredSkills: ISkill[];
  optionalSkills: ISkill[];
  careerPaths: ICareerPath[];
  marketData: IMarketData;
  learningResources: ILearningResource[];
  prerequisites: string[];
  difficulty: DifficultyLevel;
  timeToMastery: number; // in months
  isActive: boolean;
  tags: string[];
  relatedDomains: string[]; // IDs of related domains
  createdAt: Date;
  updatedAt: Date;
}

// Domain categories
export enum DomainCategory {
  TECHNOLOGY = 'technology',
  BUSINESS = 'business',
  CREATIVE = 'creative',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  FINANCE = 'finance',
  MARKETING = 'marketing',
  DESIGN = 'design',
  ENGINEERING = 'engineering',
  RESEARCH = 'research',
  CONSULTING = 'consulting',
  ENTREPRENEURSHIP = 'entrepreneurship'
}

// Difficulty levels
export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

// Skill interface
export interface ISkill {
  name: string;
  category: SkillCategory;
  importance: number; // 1-10 scale
  description: string;
  learningResources: string[];
  assessmentCriteria: string[];
}

// Skill categories
export enum SkillCategory {
  TECHNICAL = 'technical',
  SOFT_SKILLS = 'soft_skills',
  DOMAIN_SPECIFIC = 'domain_specific',
  TOOLS = 'tools',
  CERTIFICATIONS = 'certifications',
  LANGUAGES = 'languages'
}

// Career path within a domain
export interface ICareerPath {
  title: string;
  description: string;
  experienceLevel: ExperienceLevel;
  averageSalary: ISalaryRange;
  growthProjection: number; // percentage growth expected
  responsibilities: string[];
  requiredSkills: string[];
  careerProgression: string[];
}

// Experience levels
export enum ExperienceLevel {
  ENTRY_LEVEL = 'entry_level',
  MID_LEVEL = 'mid_level',
  SENIOR_LEVEL = 'senior_level',
  EXECUTIVE = 'executive'
}

// Salary range interface
export interface ISalaryRange {
  currency: string;
  min: number;
  max: number;
  median: number;
  location: string; // Geographic location for salary data
  lastUpdated: Date;
}

// Market data interface
export interface IMarketData {
  demandScore: number; // 1-100 scale
  competitionLevel: CompetitionLevel;
  jobGrowthRate: number; // percentage
  averageSalaryRange: ISalaryRange;
  topEmployers: string[];
  geographicHotspots: string[];
  industryTrends: string[];
  futureOutlook: string;
  lastUpdated: Date;
}

// Competition levels
export enum CompetitionLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

// Learning resource interface
export interface ILearningResource {
  title: string;
  type: ResourceType;
  provider: string;
  url: string;
  description: string;
  duration: number; // in hours
  difficulty: DifficultyLevel;
  cost: number; // 0 for free resources
  rating: number; // 1-5 scale
  skills: string[];
  isRecommended: boolean;
}

// Resource types
export enum ResourceType {
  COURSE = 'course',
  BOOK = 'book',
  TUTORIAL = 'tutorial',
  CERTIFICATION = 'certification',
  BOOTCAMP = 'bootcamp',
  WORKSHOP = 'workshop',
  WEBINAR = 'webinar',
  ARTICLE = 'article',
  VIDEO = 'video',
  PODCAST = 'podcast'
}

// Domain document interface for MongoDB
export interface ICareerDomainDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  title: string;
  description: string;
  detailedDescription: string;
  category: DomainCategory;
  requiredSkills: ISkill[];
  optionalSkills: ISkill[];
  careerPaths: ICareerPath[];
  marketData: IMarketData;
  learningResources: ILearningResource[];
  prerequisites: string[];
  difficulty: DifficultyLevel;
  timeToMastery: number;
  isActive: boolean;
  tags: string[];
  relatedDomains: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Recommendation interfaces
export interface IRecommendation {
  id: string;
  userId: string;
  domains: IRecommendedDomain[];
  generatedAt: Date;
  algorithm: RecommendationAlgorithm;
  confidence: number; // 0-100 scale
  reasoning: string[];
  feedback?: IRecommendationFeedback;
  isActive: boolean;
}

// Recommended domain with scoring
export interface IRecommendedDomain {
  domainId: string;
  domain: ICareerDomain;
  matchScore: number; // 0-100 scale
  interestAlignment: Record<CareerDimension, number>;
  marketScore: number; // Based on demand, growth, salary
  skillGap: ISkillGap[];
  reasoning: string[];
  confidence: number;
  rank: number;
}

// Skill gap analysis
export interface ISkillGap {
  skill: string;
  currentLevel: number; // 0-10 scale
  requiredLevel: number; // 0-10 scale
  gap: number; // requiredLevel - currentLevel
  priority: SkillPriority;
  learningPath: string[];
}

// Skill priority levels
export enum SkillPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Recommendation algorithms
export enum RecommendationAlgorithm {
  COLLABORATIVE_FILTERING = 'collaborative_filtering',
  CONTENT_BASED = 'content_based',
  HYBRID = 'hybrid',
  MARKET_WEIGHTED = 'market_weighted'
}

// Recommendation feedback
export interface IRecommendationFeedback {
  userId: string;
  recommendationId: string;
  domainId: string;
  rating: number; // 1-5 scale
  feedback: FeedbackType;
  comments?: string;
  selectedDomain?: string;
  rejectionReason?: string;
  submittedAt: Date;
}

// Feedback types
export enum FeedbackType {
  VERY_RELEVANT = 'very_relevant',
  RELEVANT = 'relevant',
  SOMEWHAT_RELEVANT = 'somewhat_relevant',
  NOT_RELEVANT = 'not_relevant',
  ALREADY_PURSUING = 'already_pursuing',
  NOT_INTERESTED = 'not_interested'
}

// Recommendation document for MongoDB
export interface IRecommendationDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  domains: IRecommendedDomain[];
  generatedAt: Date;
  algorithm: RecommendationAlgorithm;
  confidence: number;
  reasoning: string[];
  feedback?: IRecommendationFeedback;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API interfaces
export interface IRecommendationRequest {
  userId: string;
  algorithm?: RecommendationAlgorithm;
  maxRecommendations?: number;
  includeMarketData?: boolean;
  filterByCategory?: DomainCategory[];
}

export interface IRecommendationResponse {
  success: boolean;
  data: {
    recommendations: IRecommendedDomain[];
    metadata: {
      algorithm: RecommendationAlgorithm;
      confidence: number;
      generatedAt: Date;
      totalDomains: number;
    };
  };
  message?: string;
}

export interface IDomainDetailsResponse {
  success: boolean;
  data: {
    domain: ICareerDomain;
    relatedDomains: ICareerDomain[];
    skillGap?: ISkillGap[];
  };
  message?: string;
}

// Domain search and filtering
export interface IDomainSearchQuery {
  query?: string;
  category?: DomainCategory;
  difficulty?: DifficultyLevel;
  minSalary?: number;
  maxSalary?: number;
  skills?: string[];
  tags?: string[];
  sortBy?: DomainSortBy;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export enum DomainSortBy {
  NAME = 'name',
  DEMAND_SCORE = 'demandScore',
  SALARY = 'salary',
  GROWTH_RATE = 'growthRate',
  DIFFICULTY = 'difficulty',
  TIME_TO_MASTERY = 'timeToMastery',
  CREATED_AT = 'createdAt'
}

// Analytics interfaces
export interface IDomainAnalytics {
  domainId: string;
  totalRecommendations: number;
  averageMatchScore: number;
  selectionRate: number; // percentage of users who selected this domain
  feedbackDistribution: Record<FeedbackType, number>;
  averageRating: number;
  trendingScore: number;
  lastUpdated: Date;
}

export interface IRecommendationAnalytics {
  totalRecommendations: number;
  averageConfidence: number;
  algorithmPerformance: Record<RecommendationAlgorithm, {
    usage: number;
    averageRating: number;
    selectionRate: number;
  }>;
  topDomains: {
    domainId: string;
    domainName: string;
    recommendationCount: number;
    selectionRate: number;
  }[];
  userSatisfaction: {
    averageRating: number;
    feedbackDistribution: Record<FeedbackType, number>;
  };
}