// Domain and career recommendation types matching backend structure
export interface CareerDomain {
  id: string;
  name: string;
  title: string;
  description: string;
  detailedDescription: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  timeToMastery: number; // in months
  requiredSkills: Array<{
    name: string;
    category: string;
    importance: number;
    description: string;
    learningResources: string[];
  }>;
  careerPaths: Array<{
    title: string;
    description: string;
    experienceLevel: string;
    averageSalary: {
      min: number;
      max: number;
      median: number;
      currency: string;
      location: string;
    };
    growthProjection: number;
    responsibilities: string[];
  }>;
  marketData: {
    demandScore: number;
    competitionLevel: 'low' | 'moderate' | 'high' | 'very_high';
    jobGrowthRate: number;
    averageSalaryRange: {
      min: number;
      max: number;
      median: number;
      currency: string;
      location: string;
    };
    topEmployers: string[];
    geographicHotspots: string[];
    industryTrends: string[];
    futureOutlook: string;
  };
  tags: string[];
  isActive: boolean;
}

export interface RecommendedDomain {
  domainId: string;
  domain: CareerDomain;
  matchScore: number;
  interestAlignment: Record<string, number>;
  marketScore: number;
  skillGap: Array<{
    skill: string;
    currentLevel: number;
    requiredLevel: number;
    gap: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    learningPath: string[];
  }>;
  reasoning: string[];
  confidence: number;
  rank: number;
}

export interface DomainRecommendation {
  id: string;
  userId: string;
  domains: RecommendedDomain[];
  algorithm: 'collaborative_filtering' | 'content_based' | 'market_weighted' | 'hybrid';
  confidence: number;
  reasoning: string[];
  generatedAt: string;
  isActive: boolean;
}

export interface DomainSelection {
  domainId: string;
  rating: number; // 1-5
  feedback: 'helpful' | 'not_helpful' | 'partially_helpful';
  comments?: string;
  selectedDomain?: string;
  rejectionReason?: string;
}

export interface RecommendationFilters {
  categories?: string[];
  difficulty?: ('beginner' | 'intermediate' | 'advanced' | 'expert')[];
  minSalary?: number;
  maxSalary?: number;
  jobGrowthMin?: number;
  sortBy?: 'matchScore' | 'salary' | 'jobGrowth' | 'name' | 'confidence';
  sortOrder?: 'asc' | 'desc';
  algorithm?: 'collaborative_filtering' | 'content_based' | 'market_weighted' | 'hybrid';
  maxRecommendations?: number;
}

export interface RecommendationResponse {
  success: boolean;
  data: {
    recommendations: RecommendedDomain[];
    metadata: {
      recommendationId: string;
      algorithm: string;
      confidence: number;
      generatedAt: string;
      totalDomains: number;
      reasoning: string[];
      includeMarketData: boolean;
    };
  };
  message?: string;
}