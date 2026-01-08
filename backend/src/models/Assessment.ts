import mongoose, { Schema, Model } from 'mongoose';
import { 
  IAssessmentResponse, 
  IQuestionResponse, 
  IInterestProfile, 
  CareerDimension,
  IAssessmentValidation 
} from '@/types/assessment';
import { logger } from '@/utils/logger';

// Question Response Schema
const questionResponseSchema = new Schema<IQuestionResponse>({
  questionId: {
    type: String,
    required: [true, 'Question ID is required'],
    trim: true
  },
  answer: {
    type: Schema.Types.Mixed,
    required: [true, 'Answer is required'],
    validate: {
      validator: function(value: any) {
        // Validate based on expected answer types
        return value !== null && value !== undefined;
      },
      message: 'Answer cannot be null or undefined'
    }
  },
  responseTime: {
    type: Number,
    required: [true, 'Response time is required'],
    min: [0, 'Response time cannot be negative'],
    max: [300000, 'Response time cannot exceed 5 minutes'] // 5 minutes max per question
  },
  confidence: {
    type: Number,
    min: [1, 'Confidence must be at least 1'],
    max: [5, 'Confidence cannot exceed 5'],
    validate: {
      validator: function(value: number) {
        return !value || Number.isInteger(value);
      },
      message: 'Confidence must be an integer'
    }
  }
}, { _id: false });

// Interest Profile Schema
const interestProfileSchema = new Schema<IInterestProfile>({
  dimensions: {
    type: Map,
    of: {
      type: Number,
      min: [0, 'Dimension score cannot be negative'],
      max: [100, 'Dimension score cannot exceed 100']
    },
    required: [true, 'Dimensions are required'],
    validate: {
      validator: function(dimensions: any) {
        if (!dimensions || typeof dimensions.keys !== 'function') return false;
        // Ensure all career dimensions are present
        const requiredDimensions = Object.values(CareerDimension);
        const providedDimensions = Array.from(dimensions.keys());
        return requiredDimensions.every(dim => providedDimensions.includes(dim));
      },
      message: 'All career dimensions must be present in the profile'
    }
  },
  confidence: {
    type: Number,
    required: [true, 'Confidence score is required'],
    min: [0, 'Confidence cannot be negative'],
    max: [100, 'Confidence cannot exceed 100']
  },
  completeness: {
    type: Number,
    required: [true, 'Completeness score is required'],
    min: [0, 'Completeness cannot be negative'],
    max: [100, 'Completeness cannot exceed 100']
  },
  topDimensions: [{
    type: String,
    enum: {
      values: Object.values(CareerDimension),
      message: 'Invalid career dimension'
    }
  }],
  insights: [{
    type: String,
    trim: true,
    maxlength: [500, 'Insight cannot exceed 500 characters']
  }]
}, { _id: false });

// Main Assessment Response Schema
const assessmentResponseSchema = new Schema<IAssessmentResponse>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  version: {
    type: String,
    required: [true, 'Assessment version is required'],
    trim: true,
    match: [/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (e.g., 1.0.0)']
  },
  responses: {
    type: [questionResponseSchema],
    default: [],
    validate: {
      validator: function(responses: IQuestionResponse[]) {
        // Check for duplicate question responses
        const questionIds = responses.map(r => r.questionId);
        return questionIds.length === new Set(questionIds).size;
      },
      message: 'Duplicate responses for the same question are not allowed'
    }
  },
  interestProfile: {
    type: interestProfileSchema,
    required: function(this: IAssessmentResponse) {
      return this.isComplete;
    }
  },
  startedAt: {
    type: Date,
    required: [true, 'Start time is required'],
    default: Date.now
  },
  completedAt: {
    type: Date,
    validate: {
      validator: function(this: IAssessmentResponse, completedAt: Date) {
        if (!completedAt) return true; // Optional field
        return completedAt >= this.startedAt;
      },
      message: 'Completion time cannot be before start time'
    }
  },
  isComplete: {
    type: Boolean,
    default: false,
    index: true
  },
  totalQuestions: {
    type: Number,
    required: [true, 'Total questions count is required'],
    min: [1, 'Total questions must be at least 1']
  },
  answeredQuestions: {
    type: Number,
    default: 0,
    min: [0, 'Answered questions cannot be negative'],
    validate: {
      validator: function(this: IAssessmentResponse, answeredQuestions: number) {
        return answeredQuestions <= this.totalQuestions;
      },
      message: 'Answered questions cannot exceed total questions'
    }
  },
  averageResponseTime: {
    type: Number,
    default: 0,
    min: [0, 'Average response time cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: { 
    transform: function(_doc: any, ret: any) {
      ret['id'] = ret['_id'];
      delete ret['_id'];
      delete ret['__v'];
      
      // Convert dimensions Map to object for JSON serialization
      if (ret.interestProfile && ret.interestProfile.dimensions) {
        ret.interestProfile.dimensions = Object.fromEntries(ret.interestProfile.dimensions);
      }
      
      return ret;
    }
  }
});

// Indexes for performance
assessmentResponseSchema.index({ userId: 1, version: 1 });
assessmentResponseSchema.index({ userId: 1, isComplete: 1 });
assessmentResponseSchema.index({ createdAt: -1 });
assessmentResponseSchema.index({ completedAt: -1 });
assessmentResponseSchema.index({ version: 1, isComplete: 1 });

// Virtual for completion percentage
assessmentResponseSchema.virtual('completionPercentage').get(function(this: IAssessmentResponse) {
  if (this.totalQuestions === 0) return 0;
  return Math.round((this.answeredQuestions / this.totalQuestions) * 100);
});

// Virtual for total completion time
assessmentResponseSchema.virtual('totalCompletionTime').get(function(this: IAssessmentResponse) {
  if (!this.completedAt || !this.startedAt) return null;
  return this.completedAt.getTime() - this.startedAt.getTime();
});

// Pre-save middleware to update calculated fields
assessmentResponseSchema.pre('save', function(this: IAssessmentResponse, next) {
  try {
    // Update answered questions count
    this.answeredQuestions = this.responses.length;
    
    // Calculate average response time
    if (this.responses.length > 0) {
      const totalTime = this.responses.reduce((sum, response) => sum + response.responseTime, 0);
      this.averageResponseTime = Math.round(totalTime / this.responses.length);
    }
    
    // Set completion status and time
    if (this.answeredQuestions === this.totalQuestions && !this.completedAt) {
      this.isComplete = true;
      this.completedAt = new Date();
    }
    
    logger.debug('Assessment pre-save processing completed', {
      assessmentId: this._id,
      userId: this.userId,
      answeredQuestions: this.answeredQuestions,
      totalQuestions: this.totalQuestions,
      isComplete: this.isComplete
    });
    
    next();
  } catch (error) {
    logger.error('Error in assessment pre-save middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      assessmentId: this._id,
      userId: this.userId
    });
    next(error as Error);
  }
});

// Instance method to validate assessment responses
assessmentResponseSchema.methods['validateResponses'] = function(this: IAssessmentResponse): IAssessmentValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingRequired: string[] = [];
  
  try {
    // Check for duplicate question IDs
    const questionIds = this.responses.map(r => r.questionId);
    const duplicates = questionIds.filter((id, index) => questionIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate responses found for questions: ${duplicates.join(', ')}`);
    }
    
    // Check response times for anomalies
    const suspiciouslyFast = this.responses.filter(r => r.responseTime < 1000); // Less than 1 second
    const suspiciouslySlow = this.responses.filter(r => r.responseTime > 120000); // More than 2 minutes
    
    if (suspiciouslyFast.length > this.responses.length * 0.3) {
      warnings.push('Many responses were answered very quickly (< 1 second)');
    }
    
    if (suspiciouslySlow.length > 0) {
      warnings.push(`${suspiciouslySlow.length} responses took longer than 2 minutes`);
    }
    
    // Check for missing confidence scores
    const missingConfidence = this.responses.filter(r => !r.confidence);
    if (missingConfidence.length > 0) {
      warnings.push(`${missingConfidence.length} responses missing confidence scores`);
    }
    
    const completeness = this.totalQuestions > 0 ? (this.answeredQuestions / this.totalQuestions) * 100 : 0;
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      completeness,
      missingRequired
    };
  } catch (error) {
    logger.error('Error validating assessment responses', {
      error: error instanceof Error ? error.message : 'Unknown error',
      assessmentId: this._id,
      userId: this.userId
    });
    
    return {
      isValid: false,
      errors: ['Validation error occurred'],
      warnings: [],
      completeness: 0,
      missingRequired: []
    };
  }
};

// Instance method to add response
assessmentResponseSchema.methods['addResponse'] = async function(
  this: IAssessmentResponse, 
  response: IQuestionResponse
): Promise<void> {
  try {
    // Remove existing response for the same question if it exists
    this.responses = this.responses.filter(r => r.questionId !== response.questionId);
    
    // Add new response
    this.responses.push(response);
    
    // Save the document (triggers pre-save middleware)
    await (this as any).save();
    
    logger.debug('Response added to assessment', {
      assessmentId: this._id,
      userId: this.userId,
      questionId: response.questionId,
      totalResponses: this.responses.length
    });
  } catch (error) {
    logger.error('Error adding response to assessment', {
      error: error instanceof Error ? error.message : 'Unknown error',
      assessmentId: this._id,
      userId: this.userId,
      questionId: response.questionId
    });
    throw error;
  }
};

// Instance method to calculate progress
assessmentResponseSchema.methods['getProgress'] = function(this: IAssessmentResponse) {
  const completionPercentage = this.totalQuestions > 0 ? 
    Math.round((this.answeredQuestions / this.totalQuestions) * 100) : 0;
  
  return {
    totalQuestions: this.totalQuestions,
    answeredQuestions: this.answeredQuestions,
    completionPercentage: completionPercentage,
    isComplete: this.isComplete,
    averageResponseTime: this.averageResponseTime
  };
};

// Static method to find by user and version
assessmentResponseSchema.statics['findByUserAndVersion'] = function(userId: string, version: string) {
  return this.findOne({ userId, version });
};

// Static method to find latest assessment for user
assessmentResponseSchema.statics['findLatestByUser'] = function(userId: string) {
  return this.findOne({ userId }).sort({ createdAt: -1 });
};

// Static method to find completed assessments
assessmentResponseSchema.statics['findCompleted'] = function() {
  return this.find({ isComplete: true });
};

// Static method to get assessment statistics
assessmentResponseSchema.statics['getStatistics'] = async function() {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalResponses: { $sum: 1 },
          completedResponses: { 
            $sum: { $cond: [{ $eq: ['$isComplete', true] }, 1, 0] } 
          },
          averageCompletionTime: { 
            $avg: { 
              $cond: [
                { $and: ['$completedAt', '$startedAt'] },
                { $subtract: ['$completedAt', '$startedAt'] },
                null
              ]
            }
          },
          averageResponseTime: { $avg: '$averageResponseTime' }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return {
        totalResponses: 0,
        completionRate: 0,
        averageCompletionTime: 0,
        averageResponseTime: 0
      };
    }
    
    const result = stats[0];
    return {
      totalResponses: result.totalResponses,
      completionRate: result.totalResponses > 0 ? 
        (result.completedResponses / result.totalResponses) * 100 : 0,
      averageCompletionTime: result.averageCompletionTime || 0,
      averageResponseTime: result.averageResponseTime || 0
    };
  } catch (error) {
    logger.error('Error calculating assessment statistics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

// Create and export the model
export const AssessmentResponse: Model<IAssessmentResponse> = mongoose.model<IAssessmentResponse>(
  'AssessmentResponse', 
  assessmentResponseSchema
);