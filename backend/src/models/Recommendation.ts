import mongoose, { Schema, Model } from 'mongoose';
import {
  IRecommendationDocument,
  IRecommendedDomain,
  ISkillGap,
  SkillPriority,
  RecommendationAlgorithm,
  IRecommendationFeedback,
  FeedbackType
} from '@/types/recommendation';
import { CareerDimension } from '@/types/assessment';
import { logger } from '@/utils/logger';

// Skill Gap Schema
const skillGapSchema = new Schema<ISkillGap>({
  skill: {
    type: String,
    required: [true, 'Skill name is required'],
    trim: true,
    maxlength: [100, 'Skill name cannot exceed 100 characters']
  },
  currentLevel: {
    type: Number,
    required: [true, 'Current level is required'],
    min: [0, 'Current level cannot be negative'],
    max: [10, 'Current level cannot exceed 10']
  },
  requiredLevel: {
    type: Number,
    required: [true, 'Required level is required'],
    min: [0, 'Required level cannot be negative'],
    max: [10, 'Required level cannot exceed 10']
  },
  gap: {
    type: Number,
    required: [true, 'Gap is required'],
    validate: {
      validator: function(this: ISkillGap, gap: number) {
        return gap === (this.requiredLevel - this.currentLevel);
      },
      message: 'Gap must equal required level minus current level'
    }
  },
  priority: {
    type: String,
    enum: {
      values: Object.values(SkillPriority),
      message: 'Invalid skill priority'
    },
    required: [true, 'Priority is required']
  },
  learningPath: [{
    type: String,
    trim: true,
    maxlength: [200, 'Learning path step cannot exceed 200 characters']
  }]
}, { _id: false });

// Recommended Domain Schema
const recommendedDomainSchema = new Schema<IRecommendedDomain>({
  domainId: {
    type: String,
    required: [true, 'Domain ID is required'],
    trim: true
  },
  domain: {
    type: Schema.Types.Mixed,
    required: [true, 'Domain data is required']
  },
  matchScore: {
    type: Number,
    required: [true, 'Match score is required'],
    min: [0, 'Match score cannot be negative'],
    max: [100, 'Match score cannot exceed 100']
  },
  interestAlignment: {
    type: Map,
    of: {
      type: Number,
      min: [0, 'Interest alignment score cannot be negative'],
      max: [100, 'Interest alignment score cannot exceed 100']
    },
    required: [true, 'Interest alignment is required'],
    validate: {
      validator: function(alignment: any) {
        if (!alignment || typeof alignment.keys !== 'function') return false;
        // Ensure all career dimensions are present
        const requiredDimensions = Object.values(CareerDimension);
        const providedDimensions = Array.from(alignment.keys());
        return requiredDimensions.every(dim => providedDimensions.includes(dim));
      },
      message: 'All career dimensions must be present in interest alignment'
    }
  },
  marketScore: {
    type: Number,
    required: [true, 'Market score is required'],
    min: [0, 'Market score cannot be negative'],
    max: [100, 'Market score cannot exceed 100']
  },
  skillGap: {
    type: [skillGapSchema],
    default: []
  },
  reasoning: [{
    type: String,
    trim: true,
    maxlength: [300, 'Reasoning cannot exceed 300 characters']
  }],
  confidence: {
    type: Number,
    required: [true, 'Confidence is required'],
    min: [0, 'Confidence cannot be negative'],
    max: [100, 'Confidence cannot exceed 100']
  },
  rank: {
    type: Number,
    required: [true, 'Rank is required'],
    min: [1, 'Rank must be at least 1']
  }
}, { _id: false });

// Recommendation Feedback Schema
const recommendationFeedbackSchema = new Schema<IRecommendationFeedback>({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    trim: true
  },
  recommendationId: {
    type: String,
    required: [true, 'Recommendation ID is required'],
    trim: true
  },
  domainId: {
    type: String,
    required: [true, 'Domain ID is required'],
    trim: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  feedback: {
    type: String,
    enum: {
      values: Object.values(FeedbackType),
      message: 'Invalid feedback type'
    },
    required: [true, 'Feedback type is required']
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comments cannot exceed 1000 characters']
  },
  selectedDomain: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Main Recommendation Schema
const recommendationSchema = new Schema<IRecommendationDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  domains: {
    type: [recommendedDomainSchema],
    required: [true, 'Domains are required'],
    validate: {
      validator: function(domains: IRecommendedDomain[]) {
        return domains.length > 0 && domains.length <= 10;
      },
      message: 'Must have between 1 and 10 recommended domains'
    }
  },
  generatedAt: {
    type: Date,
    required: [true, 'Generated at timestamp is required'],
    default: Date.now,
    index: true
  },
  algorithm: {
    type: String,
    enum: {
      values: Object.values(RecommendationAlgorithm),
      message: 'Invalid recommendation algorithm'
    },
    required: [true, 'Algorithm is required'],
    index: true
  },
  confidence: {
    type: Number,
    required: [true, 'Confidence is required'],
    min: [0, 'Confidence cannot be negative'],
    max: [100, 'Confidence cannot exceed 100']
  },
  reasoning: [{
    type: String,
    trim: true,
    maxlength: [500, 'Reasoning cannot exceed 500 characters']
  }],
  feedback: {
    type: recommendationFeedbackSchema,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc: any, ret: any) {
      ret['id'] = ret['_id'];
      delete ret['_id'];
      delete ret['__v'];
      
      // Convert interest alignment Maps to objects for JSON serialization
      if (ret.domains) {
        ret.domains.forEach((domain: any) => {
          if (domain.interestAlignment) {
            domain.interestAlignment = Object.fromEntries(domain.interestAlignment);
          }
        });
      }
      
      return ret;
    }
  }
});

// Indexes for performance
recommendationSchema.index({ userId: 1, isActive: 1 });
recommendationSchema.index({ userId: 1, generatedAt: -1 });
recommendationSchema.index({ algorithm: 1, generatedAt: -1 });
recommendationSchema.index({ confidence: -1 });
recommendationSchema.index({ 'feedback.rating': 1 });
recommendationSchema.index({ 'feedback.feedback': 1 });
recommendationSchema.index({ createdAt: -1 });

// Virtual for average match score
recommendationSchema.virtual('averageMatchScore').get(function(this: IRecommendationDocument) {
  if (this.domains.length === 0) return 0;
  const totalScore = this.domains.reduce((sum, domain) => sum + domain.matchScore, 0);
  return Math.round(totalScore / this.domains.length);
});

// Virtual for top domain
recommendationSchema.virtual('topDomain').get(function(this: IRecommendationDocument) {
  if (this.domains.length === 0) return null;
  return this.domains.find(domain => domain.rank === 1) || this.domains[0];
});

// Virtual for has feedback
recommendationSchema.virtual('hasFeedback').get(function(this: IRecommendationDocument) {
  return this.feedback !== null && this.feedback !== undefined;
});

// Pre-save middleware
recommendationSchema.pre('save', function(this: IRecommendationDocument, next) {
  try {
    // Sort domains by rank
    if (this.isModified('domains')) {
      this.domains.sort((a, b) => a.rank - b.rank);
      
      // Validate rank sequence
      for (let i = 0; i < this.domains.length; i++) {
        const domain = this.domains[i];
        if (domain && domain.rank !== i + 1) {
          throw new Error(`Invalid rank sequence: expected ${i + 1}, got ${domain.rank}`);
        }
      }
    }
    
    // Calculate overall confidence if not set
    if (!this.confidence && this.domains.length > 0) {
      const totalConfidence = this.domains.reduce((sum, domain) => sum + domain.confidence, 0);
      this.confidence = Math.round(totalConfidence / this.domains.length);
    }
    
    // Deactivate previous recommendations for the same user
    if (this.isNew && this.isActive) {
      // This will be handled in the service layer to avoid circular dependencies
    }
    
    logger.debug('Recommendation pre-save processing completed', {
      recommendationId: this._id,
      userId: this.userId,
      algorithm: this.algorithm,
      domainCount: this.domains.length,
      confidence: this.confidence
    });
    
    next();
  } catch (error) {
    logger.error('Error in recommendation pre-save middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendationId: this._id,
      userId: this.userId
    });
    next(error as Error);
  }
});

// Instance methods
recommendationSchema.methods['addFeedback'] = async function(
  this: IRecommendationDocument,
  feedbackData: Omit<IRecommendationFeedback, 'userId' | 'recommendationId' | 'submittedAt'>
): Promise<void> {
  try {
    this.feedback = {
      ...feedbackData,
      userId: this.userId.toString(),
      recommendationId: this._id.toString(),
      submittedAt: new Date()
    } as IRecommendationFeedback;
    
    await (this as any).save();
    
    logger.debug('Feedback added to recommendation', {
      recommendationId: this._id,
      userId: this.userId,
      rating: feedbackData.rating,
      feedbackType: feedbackData.feedback
    });
  } catch (error) {
    logger.error('Error adding feedback to recommendation', {
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendationId: this._id,
      userId: this.userId
    });
    throw error;
  }
};

recommendationSchema.methods['getDomainByRank'] = function(this: IRecommendationDocument, rank: number): IRecommendedDomain | null {
  return this.domains.find(domain => domain.rank === rank) || null;
};

recommendationSchema.methods['getDomainById'] = function(this: IRecommendationDocument, domainId: string): IRecommendedDomain | null {
  return this.domains.find(domain => domain.domainId === domainId) || null;
};

recommendationSchema.methods['getHighConfidenceDomains'] = function(this: IRecommendationDocument, threshold: number = 70): IRecommendedDomain[] {
  return this.domains.filter(domain => domain.confidence >= threshold);
};

recommendationSchema.methods['getSkillGaps'] = function(this: IRecommendationDocument): ISkillGap[] {
  const allSkillGaps: ISkillGap[] = [];
  this.domains.forEach(domain => {
    allSkillGaps.push(...domain.skillGap);
  });
  return allSkillGaps;
};

recommendationSchema.methods['getCriticalSkillGaps'] = function(this: IRecommendationDocument): ISkillGap[] {
  const skillGaps = (this as any).getSkillGaps();
  return skillGaps.filter((gap: ISkillGap) => gap.priority === SkillPriority.CRITICAL);
};

// Static methods
recommendationSchema.statics['findByUser'] = function(userId: string, activeOnly: boolean = true) {
  const query: any = { userId };
  if (activeOnly) query.isActive = true;
  return this.find(query).sort({ generatedAt: -1 });
};

recommendationSchema.statics['findLatestByUser'] = function(userId: string) {
  return this.findOne({ userId, isActive: true }).sort({ generatedAt: -1 });
};

recommendationSchema.statics['findByAlgorithm'] = function(algorithm: RecommendationAlgorithm, activeOnly: boolean = true) {
  const query: any = { algorithm };
  if (activeOnly) query.isActive = true;
  return this.find(query).sort({ generatedAt: -1 });
};

recommendationSchema.statics['findWithFeedback'] = function() {
  return this.find({ 
    feedback: { $ne: null },
    isActive: true 
  }).sort({ 'feedback.submittedAt': -1 });
};

recommendationSchema.statics['findHighConfidence'] = function(threshold: number = 80) {
  return this.find({ 
    confidence: { $gte: threshold },
    isActive: true 
  }).sort({ confidence: -1 });
};

recommendationSchema.statics['getRecommendationStatistics'] = async function() {
  try {
    const stats = await this.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalRecommendations: { $sum: 1 },
          averageConfidence: { $avg: '$confidence' },
          algorithmDistribution: {
            $push: '$algorithm'
          },
          withFeedback: {
            $sum: { $cond: [{ $ne: ['$feedback', null] }, 1, 0] }
          },
          averageRating: {
            $avg: { $cond: [{ $ne: ['$feedback', null] }, '$feedback.rating', null] }
          }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return {
        totalRecommendations: 0,
        averageConfidence: 0,
        feedbackRate: 0,
        averageRating: 0,
        algorithmDistribution: {}
      };
    }
    
    const result = stats[0];
    
    // Count algorithm distribution
    const algorithmCount: Record<string, number> = {};
    result.algorithmDistribution.forEach((alg: string) => {
      algorithmCount[alg] = (algorithmCount[alg] || 0) + 1;
    });
    
    return {
      totalRecommendations: result.totalRecommendations,
      averageConfidence: Math.round(result.averageConfidence || 0),
      feedbackRate: result.totalRecommendations > 0 ? 
        Math.round((result.withFeedback / result.totalRecommendations) * 100) : 0,
      averageRating: Math.round((result.averageRating || 0) * 10) / 10,
      algorithmDistribution: algorithmCount
    };
  } catch (error) {
    logger.error('Error calculating recommendation statistics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

recommendationSchema.statics['getFeedbackAnalytics'] = async function() {
  try {
    const analytics = await this.aggregate([
      { 
        $match: { 
          isActive: true,
          feedback: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$feedback.feedback',
          count: { $sum: 1 },
          averageRating: { $avg: '$feedback.rating' },
          averageConfidence: { $avg: '$confidence' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    const feedbackDistribution: Record<string, any> = {};
    analytics.forEach(item => {
      feedbackDistribution[item._id] = {
        count: item.count,
        averageRating: Math.round(item.averageRating * 10) / 10,
        averageConfidence: Math.round(item.averageConfidence)
      };
    });
    
    return feedbackDistribution;
  } catch (error) {
    logger.error('Error calculating feedback analytics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

recommendationSchema.statics['deactivateUserRecommendations'] = async function(userId: string, excludeId?: string) {
  try {
    const query: any = { 
      userId,
      isActive: true
    };
    
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const result = await this.updateMany(query, { isActive: false });
    
    logger.debug('Deactivated user recommendations', {
      userId,
      excludeId,
      deactivatedCount: result.modifiedCount
    });
    
    return result.modifiedCount;
  } catch (error) {
    logger.error('Error deactivating user recommendations', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      excludeId
    });
    throw error;
  }
};

// Create and export the model
export const Recommendation: Model<IRecommendationDocument> = mongoose.model<IRecommendationDocument>(
  'Recommendation',
  recommendationSchema
);