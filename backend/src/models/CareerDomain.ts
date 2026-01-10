import mongoose, { Schema, Model } from 'mongoose';
import {
  ICareerDomainDocument,
  DomainCategory,
  DifficultyLevel,
  ISkill,
  SkillCategory,
  ICareerPath,
  ExperienceLevel,
  ISalaryRange,
  IMarketData,
  CompetitionLevel,
  ILearningResource,
  ResourceType
} from '@/types/recommendation';
import { logger } from '@/utils/logger';

// Salary Range Schema
const salaryRangeSchema = new Schema<ISalaryRange>({
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'USD',
    uppercase: true,
    match: [/^[A-Z]{3}$/, 'Currency must be a valid 3-letter code']
  },
  min: {
    type: Number,
    required: [true, 'Minimum salary is required'],
    min: [0, 'Minimum salary cannot be negative']
  },
  max: {
    type: Number,
    required: [true, 'Maximum salary is required'],
    min: [0, 'Maximum salary cannot be negative'],
    validate: {
      validator: function(this: ISalaryRange, max: number) {
        return max >= this.min;
      },
      message: 'Maximum salary must be greater than or equal to minimum salary'
    }
  },
  median: {
    type: Number,
    required: [true, 'Median salary is required'],
    min: [0, 'Median salary cannot be negative'],
    validate: {
      validator: function(this: ISalaryRange, median: number) {
        return median >= this.min && median <= this.max;
      },
      message: 'Median salary must be between minimum and maximum salary'
    }
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Skill Schema
const skillSchema = new Schema<ISkill>({
  name: {
    type: String,
    required: [true, 'Skill name is required'],
    trim: true,
    maxlength: [100, 'Skill name cannot exceed 100 characters']
  },
  category: {
    type: String,
    enum: {
      values: Object.values(SkillCategory),
      message: 'Invalid skill category'
    },
    required: [true, 'Skill category is required']
  },
  importance: {
    type: Number,
    required: [true, 'Skill importance is required'],
    min: [1, 'Importance must be at least 1'],
    max: [10, 'Importance cannot exceed 10']
  },
  description: {
    type: String,
    required: [true, 'Skill description is required'],
    trim: true,
    maxlength: [500, 'Skill description cannot exceed 500 characters']
  },
  learningResources: [{
    type: String,
    trim: true,
    maxlength: [200, 'Learning resource cannot exceed 200 characters']
  }],
  assessmentCriteria: [{
    type: String,
    trim: true,
    maxlength: [200, 'Assessment criteria cannot exceed 200 characters']
  }]
}, { _id: false });

// Career Path Schema
const careerPathSchema = new Schema<ICareerPath>({
  title: {
    type: String,
    required: [true, 'Career path title is required'],
    trim: true,
    maxlength: [100, 'Career path title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Career path description is required'],
    trim: true,
    maxlength: [1000, 'Career path description cannot exceed 1000 characters']
  },
  experienceLevel: {
    type: String,
    enum: {
      values: Object.values(ExperienceLevel),
      message: 'Invalid experience level'
    },
    required: [true, 'Experience level is required']
  },
  averageSalary: {
    type: salaryRangeSchema,
    required: [true, 'Average salary is required']
  },
  growthProjection: {
    type: Number,
    required: [true, 'Growth projection is required'],
    min: [-50, 'Growth projection cannot be less than -50%'],
    max: [500, 'Growth projection cannot exceed 500%']
  },
  responsibilities: [{
    type: String,
    trim: true,
    maxlength: [200, 'Responsibility cannot exceed 200 characters']
  }],
  requiredSkills: [{
    type: String,
    trim: true,
    maxlength: [100, 'Required skill cannot exceed 100 characters']
  }],
  careerProgression: [{
    type: String,
    trim: true,
    maxlength: [100, 'Career progression step cannot exceed 100 characters']
  }]
}, { _id: false });

// Market Data Schema
const marketDataSchema = new Schema<IMarketData>({
  demandScore: {
    type: Number,
    required: [true, 'Demand score is required'],
    min: [1, 'Demand score must be at least 1'],
    max: [100, 'Demand score cannot exceed 100']
  },
  competitionLevel: {
    type: String,
    enum: {
      values: Object.values(CompetitionLevel),
      message: 'Invalid competition level'
    },
    required: [true, 'Competition level is required']
  },
  jobGrowthRate: {
    type: Number,
    required: [true, 'Job growth rate is required'],
    min: [-50, 'Job growth rate cannot be less than -50%'],
    max: [200, 'Job growth rate cannot exceed 200%']
  },
  averageSalaryRange: {
    type: salaryRangeSchema,
    required: [true, 'Average salary range is required']
  },
  topEmployers: [{
    type: String,
    trim: true,
    maxlength: [100, 'Employer name cannot exceed 100 characters']
  }],
  geographicHotspots: [{
    type: String,
    trim: true,
    maxlength: [100, 'Geographic hotspot cannot exceed 100 characters']
  }],
  industryTrends: [{
    type: String,
    trim: true,
    maxlength: [200, 'Industry trend cannot exceed 200 characters']
  }],
  futureOutlook: {
    type: String,
    required: [true, 'Future outlook is required'],
    trim: true,
    maxlength: [1000, 'Future outlook cannot exceed 1000 characters']
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Learning Resource Schema
const learningResourceSchema = new Schema<ILearningResource>({
  title: {
    type: String,
    required: [true, 'Learning resource title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: {
      values: Object.values(ResourceType),
      message: 'Invalid resource type'
    },
    required: [true, 'Resource type is required']
  },
  provider: {
    type: String,
    required: [true, 'Provider is required'],
    trim: true,
    maxlength: [100, 'Provider cannot exceed 100 characters']
  },
  url: {
    type: String,
    required: [true, 'URL is required'],
    trim: true,
    match: [/^https?:\/\/.+/, 'URL must be a valid HTTP/HTTPS URL']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [0, 'Duration cannot be negative']
  },
  difficulty: {
    type: String,
    enum: {
      values: Object.values(DifficultyLevel),
      message: 'Invalid difficulty level'
    },
    required: [true, 'Difficulty level is required']
  },
  cost: {
    type: Number,
    required: [true, 'Cost is required'],
    min: [0, 'Cost cannot be negative']
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: function(rating: number) {
        return !rating || (rating >= 1 && rating <= 5);
      },
      message: 'Rating must be between 1 and 5'
    }
  },
  skills: [{
    type: String,
    trim: true,
    maxlength: [100, 'Skill cannot exceed 100 characters']
  }],
  isRecommended: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Main Career Domain Schema
const careerDomainSchema = new Schema<ICareerDomainDocument>({
  name: {
    type: String,
    required: [true, 'Domain name is required'],
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: [100, 'Domain name cannot exceed 100 characters'],
    match: [/^[a-z0-9-_]+$/, 'Domain name can only contain lowercase letters, numbers, hyphens, and underscores']
  },
  title: {
    type: String,
    required: [true, 'Domain title is required'],
    trim: true,
    maxlength: [200, 'Domain title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Domain description is required'],
    trim: true,
    maxlength: [500, 'Domain description cannot exceed 500 characters']
  },
  detailedDescription: {
    type: String,
    required: [true, 'Detailed description is required'],
    trim: true,
    maxlength: [2000, 'Detailed description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    enum: {
      values: Object.values(DomainCategory),
      message: 'Invalid domain category'
    },
    required: [true, 'Domain category is required'],
    index: true
  },
  requiredSkills: {
    type: [skillSchema],
    default: [],
    validate: {
      validator: function(skills: ISkill[]) {
        return skills.length > 0;
      },
      message: 'At least one required skill must be specified'
    }
  },
  optionalSkills: {
    type: [skillSchema],
    default: []
  },
  careerPaths: {
    type: [careerPathSchema],
    default: [],
    validate: {
      validator: function(paths: ICareerPath[]) {
        return paths.length > 0;
      },
      message: 'At least one career path must be specified'
    }
  },
  marketData: {
    type: marketDataSchema,
    required: [true, 'Market data is required']
  },
  learningResources: {
    type: [learningResourceSchema],
    default: []
  },
  prerequisites: [{
    type: String,
    trim: true,
    maxlength: [200, 'Prerequisite cannot exceed 200 characters']
  }],
  difficulty: {
    type: String,
    enum: {
      values: Object.values(DifficultyLevel),
      message: 'Invalid difficulty level'
    },
    required: [true, 'Difficulty level is required'],
    index: true
  },
  timeToMastery: {
    type: Number,
    required: [true, 'Time to mastery is required'],
    min: [1, 'Time to mastery must be at least 1 month'],
    max: [120, 'Time to mastery cannot exceed 120 months']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  relatedDomains: [{
    type: Schema.Types.ObjectId,
    ref: 'CareerDomain'
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc: any, ret: any) {
      ret['id'] = ret['_id'];
      delete ret['_id'];
      delete ret['__v'];
      return ret;
    }
  }
});

// Indexes for performance
careerDomainSchema.index({ name: 1 }, { unique: true });
careerDomainSchema.index({ category: 1, isActive: 1 });
careerDomainSchema.index({ difficulty: 1, isActive: 1 });
careerDomainSchema.index({ 'marketData.demandScore': -1 });
careerDomainSchema.index({ 'marketData.jobGrowthRate': -1 });
careerDomainSchema.index({ tags: 1 });
careerDomainSchema.index({ timeToMastery: 1 });
careerDomainSchema.index({ createdAt: -1 });

// Text search index
careerDomainSchema.index({
  title: 'text',
  description: 'text',
  detailedDescription: 'text',
  tags: 'text'
});

// Virtual for average salary
careerDomainSchema.virtual('averageSalary').get(function(this: ICareerDomainDocument) {
  return this.marketData.averageSalaryRange.median;
});

// Virtual for skill count
careerDomainSchema.virtual('totalSkills').get(function(this: ICareerDomainDocument) {
  return this.requiredSkills.length + this.optionalSkills.length;
});

// Virtual for learning resource count
careerDomainSchema.virtual('resourceCount').get(function(this: ICareerDomainDocument) {
  return this.learningResources.length;
});

// Pre-save middleware
careerDomainSchema.pre('save', function(this: ICareerDomainDocument, next) {
  try {
    // Update market data timestamp
    if (this.isModified('marketData')) {
      this.marketData.lastUpdated = new Date();
    }
    
    // Ensure tags are unique and clean
    if (this.isModified('tags')) {
      this.tags = [...new Set(this.tags.filter(tag => tag.trim().length > 0))];
    }
    
    // Validate related domains don't include self
    if (this.isModified('relatedDomains')) {
      this.relatedDomains = this.relatedDomains.filter(id => !id.equals(this._id));
    }
    
    logger.debug('Career domain pre-save processing completed', {
      domainId: this._id,
      name: this.name,
      category: this.category,
      isActive: this.isActive
    });
    
    next();
  } catch (error) {
    logger.error('Error in career domain pre-save middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      domainId: this._id,
      name: this.name
    });
    next(error as Error);
  }
});

// Instance methods
careerDomainSchema.methods['getSkillsByCategory'] = function(this: ICareerDomainDocument, category: SkillCategory) {
  const allSkills = [...this.requiredSkills, ...this.optionalSkills];
  return allSkills.filter(skill => skill.category === category);
};

careerDomainSchema.methods['getCareerPathsByLevel'] = function(this: ICareerDomainDocument, level: ExperienceLevel) {
  return this.careerPaths.filter(path => path.experienceLevel === level);
};

careerDomainSchema.methods['getResourcesByType'] = function(this: ICareerDomainDocument, type: ResourceType) {
  return this.learningResources.filter(resource => resource.type === type);
};

careerDomainSchema.methods['calculateMarketScore'] = function(this: ICareerDomainDocument): number {
  const demandWeight = 0.4;
  const growthWeight = 0.3;
  const salaryWeight = 0.2;
  const competitionWeight = 0.1;
  
  const demandScore = this.marketData.demandScore;
  const growthScore = Math.min(100, Math.max(0, (this.marketData.jobGrowthRate + 10) * 5)); // Normalize growth rate
  const salaryScore = Math.min(100, this.marketData.averageSalaryRange.median / 2000); // Normalize salary
  
  const competitionScores = {
    [CompetitionLevel.LOW]: 100,
    [CompetitionLevel.MODERATE]: 75,
    [CompetitionLevel.HIGH]: 50,
    [CompetitionLevel.VERY_HIGH]: 25
  };
  const competitionScore = competitionScores[this.marketData.competitionLevel];
  
  return Math.round(
    demandScore * demandWeight +
    growthScore * growthWeight +
    salaryScore * salaryWeight +
    competitionScore * competitionWeight
  );
};

// Static methods
careerDomainSchema.statics['findByCategory'] = function(category: DomainCategory, activeOnly: boolean = true) {
  const query: any = { category };
  if (activeOnly) query.isActive = true;
  return this.find(query);
};

careerDomainSchema.statics['findByDifficulty'] = function(difficulty: DifficultyLevel, activeOnly: boolean = true) {
  const query: any = { difficulty };
  if (activeOnly) query.isActive = true;
  return this.find(query);
};

careerDomainSchema.statics['searchDomains'] = function(searchTerm: string, activeOnly: boolean = true) {
  const query: any = {
    $text: { $search: searchTerm }
  };
  if (activeOnly) query.isActive = true;
  return this.find(query, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
};

careerDomainSchema.statics['findByTags'] = function(tags: string[], activeOnly: boolean = true) {
  const query: any = { tags: { $in: tags } };
  if (activeOnly) query.isActive = true;
  return this.find(query);
};

careerDomainSchema.statics['getTopDemandDomains'] = function(limit: number = 10) {
  return this.find({ isActive: true })
    .sort({ 'marketData.demandScore': -1 })
    .limit(limit);
};

careerDomainSchema.statics['getHighGrowthDomains'] = function(limit: number = 10) {
  return this.find({ isActive: true })
    .sort({ 'marketData.jobGrowthRate': -1 })
    .limit(limit);
};

careerDomainSchema.statics['getDomainStatistics'] = async function() {
  try {
    const stats = await this.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalDomains: { $sum: 1 },
          averageDemandScore: { $avg: '$marketData.demandScore' },
          averageGrowthRate: { $avg: '$marketData.jobGrowthRate' },
          averageTimeToMastery: { $avg: '$timeToMastery' },
          categoryDistribution: {
            $push: '$category'
          },
          difficultyDistribution: {
            $push: '$difficulty'
          }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return {
        totalDomains: 0,
        averageDemandScore: 0,
        averageGrowthRate: 0,
        averageTimeToMastery: 0,
        categoryDistribution: {},
        difficultyDistribution: {}
      };
    }
    
    const result = stats[0];
    
    // Count category distribution
    const categoryCount: Record<string, number> = {};
    result.categoryDistribution.forEach((cat: string) => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    
    // Count difficulty distribution
    const difficultyCount: Record<string, number> = {};
    result.difficultyDistribution.forEach((diff: string) => {
      difficultyCount[diff] = (difficultyCount[diff] || 0) + 1;
    });
    
    return {
      totalDomains: result.totalDomains,
      averageDemandScore: Math.round(result.averageDemandScore || 0),
      averageGrowthRate: Math.round(result.averageGrowthRate || 0),
      averageTimeToMastery: Math.round(result.averageTimeToMastery || 0),
      categoryDistribution: categoryCount,
      difficultyDistribution: difficultyCount
    };
  } catch (error) {
    logger.error('Error calculating domain statistics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

// Create and export the model with proper typing
interface ICareerDomainModel extends Model<ICareerDomainDocument> {
  findByCategory(category: DomainCategory, activeOnly?: boolean): Promise<ICareerDomainDocument[]>;
  findByDifficulty(difficulty: DifficultyLevel, activeOnly?: boolean): Promise<ICareerDomainDocument[]>;
  searchDomains(searchTerm: string, activeOnly?: boolean): Promise<ICareerDomainDocument[]>;
  findByTags(tags: string[], activeOnly?: boolean): Promise<ICareerDomainDocument[]>;
  getTopDemandDomains(limit?: number): Promise<ICareerDomainDocument[]>;
  getHighGrowthDomains(limit?: number): Promise<ICareerDomainDocument[]>;
  getDomainStatistics(): Promise<{
    totalDomains: number;
    averageDemandScore: number;
    averageGrowthRate: number;
    averageTimeToMastery: number;
    categoryDistribution: Record<string, number>;
    difficultyDistribution: Record<string, number>;
  }>;
}

export const CareerDomain: ICareerDomainModel = mongoose.model<ICareerDomainDocument, ICareerDomainModel>(
  'CareerDomain',
  careerDomainSchema
);