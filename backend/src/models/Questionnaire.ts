import mongoose, { Schema, Model } from 'mongoose';
import { 
  IQuestionnaire, 
  IQuestion, 
  QuestionType, 
  CareerDimension 
} from '@/types/assessment';
import { logger } from '@/utils/logger';

// Question Schema
const questionSchema = new Schema<IQuestion>({
  id: {
    type: String,
    required: [true, 'Question ID is required'],
    unique: true,
    trim: true,
    match: [/^[a-zA-Z0-9_-]+$/, 'Question ID must contain only alphanumeric characters, hyphens, and underscores']
  },
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    minlength: [10, 'Question text must be at least 10 characters'],
    maxlength: [500, 'Question text cannot exceed 500 characters']
  },
  type: {
    type: String,
    required: [true, 'Question type is required'],
    enum: {
      values: Object.values(QuestionType),
      message: 'Invalid question type'
    }
  },
  category: {
    type: String,
    required: [true, 'Question category is required'],
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  dimension: {
    type: String,
    required: [true, 'Career dimension is required'],
    enum: {
      values: Object.values(CareerDimension),
      message: 'Invalid career dimension'
    }
  },
  weight: {
    type: Number,
    required: [true, 'Question weight is required'],
    min: [1, 'Weight must be at least 1'],
    max: [10, 'Weight cannot exceed 10'],
    validate: {
      validator: function(value: number) {
        return Number.isInteger(value);
      },
      message: 'Weight must be an integer'
    }
  },
  options: [{
    type: String,
    trim: true,
    maxlength: [200, 'Option cannot exceed 200 characters']
  }],
  minValue: {
    type: Number,
    validate: {
      validator: function(this: IQuestion, minValue: number) {
        if (this.type !== QuestionType.RATING_SCALE) return true;
        return minValue !== undefined && minValue !== null;
      },
      message: 'Min value is required for rating scale questions'
    }
  },
  maxValue: {
    type: Number,
    validate: {
      validator: function(this: IQuestion, maxValue: number) {
        if (this.type !== QuestionType.RATING_SCALE) return true;
        return maxValue !== undefined && maxValue !== null && maxValue > (this.minValue || 0);
      },
      message: 'Max value is required for rating scale questions and must be greater than min value'
    }
  },
  required: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    required: [true, 'Question order is required'],
    min: [1, 'Order must be at least 1']
  }
}, { _id: false });

// Main Questionnaire Schema
const questionnaireSchema = new Schema<IQuestionnaire>({
  version: {
    type: String,
    required: [true, 'Version is required'],
    unique: true,
    trim: true,
    match: [/^\d+\.\d+\.\d+$/, 'Version must follow semantic versioning (e.g., 1.0.0)'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [5, 'Title must be at least 5 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [20, 'Description must be at least 20 characters'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  estimatedDuration: {
    type: Number,
    required: [true, 'Estimated duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [120, 'Duration cannot exceed 120 minutes']
  },
  questions: {
    type: [questionSchema],
    required: [true, 'Questions are required'],
    validate: {
      validator: function(questions: IQuestion[]) {
        if (questions.length === 0) return false;
        
        // Check for unique question IDs
        const ids = questions.map(q => q.id);
        if (ids.length !== new Set(ids).size) return false;
        
        // Check for unique order values
        const orders = questions.map(q => q.order);
        if (orders.length !== new Set(orders).size) return false;
        
        // Validate question type-specific requirements
        for (const question of questions) {
          if (question.type === QuestionType.MULTIPLE_CHOICE || question.type === QuestionType.RANKING) {
            if (!question.options || question.options.length < 2) return false;
          }
          if (question.type === QuestionType.RATING_SCALE) {
            if (question.minValue === undefined || question.maxValue === undefined) return false;
            if (question.maxValue <= question.minValue) return false;
          }
        }
        
        return true;
      },
      message: 'Questions validation failed: ensure unique IDs and orders, and proper type-specific requirements'
    }
  },
  categories: [{
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  }],
  totalQuestions: {
    type: Number,
    required: [true, 'Total questions count is required'],
    min: [1, 'Must have at least 1 question']
  },
  isActive: {
    type: Boolean,
    default: false,
    index: true
  }
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
questionnaireSchema.index({ version: 1, isActive: 1 });
questionnaireSchema.index({ isActive: 1, createdAt: -1 });
questionnaireSchema.index({ 'questions.dimension': 1 });
questionnaireSchema.index({ 'questions.category': 1 });

// Pre-save middleware to update calculated fields
questionnaireSchema.pre('save', function(this: IQuestionnaire, next) {
  try {
    // Update total questions count
    this.totalQuestions = this.questions.length;
    
    // Extract unique categories from questions
    const questionCategories = [...new Set(this.questions.map(q => q.category))];
    this.categories = questionCategories;
    
    // Sort questions by order
    this.questions.sort((a, b) => a.order - b.order);
    
    logger.debug('Questionnaire pre-save processing completed', {
      questionnaireId: this._id,
      version: this.version,
      totalQuestions: this.totalQuestions,
      categories: this.categories.length
    });
    
    next();
  } catch (error) {
    logger.error('Error in questionnaire pre-save middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      questionnaireId: this._id,
      version: this.version
    });
    next(error as Error);
  }
});

// Instance method to get questions by category
questionnaireSchema.methods['getQuestionsByCategory'] = function(this: IQuestionnaire, category: string): IQuestion[] {
  return this.questions.filter(q => q.category === category);
};

// Instance method to get questions by dimension
questionnaireSchema.methods['getQuestionsByDimension'] = function(this: IQuestionnaire, dimension: CareerDimension): IQuestion[] {
  return this.questions.filter(q => q.dimension === dimension);
};

// Instance method to get required questions
questionnaireSchema.methods['getRequiredQuestions'] = function(this: IQuestionnaire): IQuestion[] {
  return this.questions.filter(q => q.required);
};

// Instance method to validate question structure
questionnaireSchema.methods['validateQuestions'] = function(this: IQuestionnaire): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    // Check dimension coverage
    const dimensions = new Set(this.questions.map(q => q.dimension));
    const allDimensions = new Set(Object.values(CareerDimension));
    
    for (const dimension of allDimensions) {
      if (!dimensions.has(dimension)) {
        errors.push(`Missing questions for dimension: ${dimension}`);
      }
    }
    
    // Check minimum questions per dimension
    for (const dimension of dimensions) {
      const dimensionQuestions = this.questions.filter(q => q.dimension === dimension);
      if (dimensionQuestions.length < 2) {
        errors.push(`Dimension ${dimension} has fewer than 2 questions`);
      }
    }
    
    // Check weight distribution
    const totalWeight = this.questions.reduce((sum, q) => sum + q.weight, 0);
    if (totalWeight === 0) {
      errors.push('Total question weight cannot be zero');
    }
    
    // Check for reasonable question distribution
    if (this.questions.length < 10) {
      errors.push('Questionnaire should have at least 10 questions for reliable assessment');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    logger.error('Error validating questionnaire questions', {
      error: error instanceof Error ? error.message : 'Unknown error',
      questionnaireId: this._id,
      version: this.version
    });
    
    return {
      isValid: false,
      errors: ['Validation error occurred']
    };
  }
};

// Instance method to activate questionnaire
questionnaireSchema.methods['activate'] = async function(this: IQuestionnaire): Promise<void> {
  try {
    // Deactivate all other questionnaires first
    await (this.constructor as Model<IQuestionnaire>).updateMany(
      { _id: { $ne: this._id } },
      { isActive: false }
    );
    
    // Activate this questionnaire
    this.isActive = true;
    await (this as any).save();
    
    logger.info('Questionnaire activated', {
      questionnaireId: this._id,
      version: this.version
    });
  } catch (error) {
    logger.error('Error activating questionnaire', {
      error: error instanceof Error ? error.message : 'Unknown error',
      questionnaireId: this._id,
      version: this.version
    });
    throw error;
  }
};

// Static method to get active questionnaire
questionnaireSchema.statics['getActive'] = function() {
  return this.findOne({ isActive: true });
};

// Static method to get latest version
questionnaireSchema.statics['getLatestVersion'] = function() {
  return this.findOne().sort({ createdAt: -1 });
};

// Static method to get by version
questionnaireSchema.statics['getByVersion'] = function(version: string) {
  return this.findOne({ version });
};

// Static method to get dimension statistics
questionnaireSchema.statics['getDimensionStats'] = async function() {
  try {
    const stats = await this.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$questions' },
      {
        $group: {
          _id: '$questions.dimension',
          questionCount: { $sum: 1 },
          averageWeight: { $avg: '$questions.weight' },
          totalWeight: { $sum: '$questions.weight' }
        }
      },
      { $sort: { questionCount: -1 } }
    ]);
    
    return stats.reduce((acc, stat) => {
      acc[stat._id] = {
        questionCount: stat.questionCount,
        averageWeight: Math.round(stat.averageWeight * 100) / 100,
        totalWeight: stat.totalWeight
      };
      return acc;
    }, {} as Record<CareerDimension, any>);
  } catch (error) {
    logger.error('Error calculating dimension statistics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

// Create and export the model
export const Questionnaire: Model<IQuestionnaire> = mongoose.model<IQuestionnaire>(
  'Questionnaire', 
  questionnaireSchema
);