import mongoose, { Schema, Model } from 'mongoose';
import { 
  IJobMatchDocument, 
  ISalaryRange,
  JobSource,
  ApplicationStatus,
  JobType,
  ExperienceLevel,
  SalaryPeriod
} from '@/types/job';
import { logger } from '@/utils/logger';

// Skill Alignment Schema
const skillAlignmentSchema = new Schema({
  required: {
    type: Boolean,
    required: [true, 'Required flag is mandatory']
  },
  userLevel: {
    type: Number,
    required: [true, 'User level is required'],
    min: [0, 'User level cannot be negative'],
    max: [10, 'User level cannot exceed 10']
  },
  requiredLevel: {
    type: Number,
    required: [true, 'Required level is required'],
    min: [0, 'Required level cannot be negative'],
    max: [10, 'Required level cannot exceed 10']
  },
  gap: {
    type: Number,
    required: [true, 'Gap is required']
  },
  weight: {
    type: Number,
    required: [true, 'Weight is required'],
    min: [0, 'Weight cannot be negative'],
    max: [1, 'Weight cannot exceed 1']
  }
}, { _id: false });

// Salary Range Schema
const salaryRangeSchema = new Schema<ISalaryRange>({
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    uppercase: true,
    match: [/^[A-Z]{3}$/, 'Currency must be a valid 3-letter ISO code']
  },
  min: {
    type: Number,
    min: [0, 'Minimum salary cannot be negative']
  },
  max: {
    type: Number,
    min: [0, 'Maximum salary cannot be negative'],
    validate: {
      validator: function(this: ISalaryRange, max: number) {
        return !this.min || !max || max >= this.min;
      },
      message: 'Maximum salary must be greater than or equal to minimum salary'
    }
  },
  median: {
    type: Number,
    min: [0, 'Median salary cannot be negative']
  },
  period: {
    type: String,
    required: [true, 'Salary period is required'],
    enum: {
      values: Object.values(SalaryPeriod),
      message: 'Invalid salary period'
    }
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  negotiable: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Main Job Match Schema
const jobMatchSchema = new Schema<IJobMatchDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  jobId: {
    type: String,
    required: [true, 'Job ID is required'],
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [200, 'Job title cannot exceed 200 characters'],
    index: true
  },
  company: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters'],
    index: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    maxlength: [5000, 'Job description cannot exceed 5000 characters']
  },
  requirements: [{
    type: String,
    trim: true,
    maxlength: [500, 'Requirement cannot exceed 500 characters']
  }],
  matchScore: {
    type: Number,
    required: [true, 'Match score is required'],
    min: [0, 'Match score cannot be negative'],
    max: [100, 'Match score cannot exceed 100'],
    index: true
  },
  skillAlignment: {
    type: Map,
    of: skillAlignmentSchema,
    required: [true, 'Skill alignment is required'],
    validate: {
      validator: function(skillAlignment: Map<string, any>) {
        return skillAlignment && skillAlignment.size > 0;
      },
      message: 'At least one skill alignment is required'
    }
  },
  source: {
    type: String,
    required: [true, 'Job source is required'],
    enum: {
      values: Object.values(JobSource),
      message: 'Invalid job source'
    },
    index: true
  },
  applicationStatus: {
    type: String,
    required: [true, 'Application status is required'],
    enum: {
      values: Object.values(ApplicationStatus),
      message: 'Invalid application status'
    },
    default: ApplicationStatus.NOT_APPLIED,
    index: true
  },
  salaryRange: {
    type: salaryRangeSchema,
    required: false
  },
  jobType: {
    type: String,
    required: [true, 'Job type is required'],
    enum: {
      values: Object.values(JobType),
      message: 'Invalid job type'
    },
    index: true
  },
  experienceLevel: {
    type: String,
    required: [true, 'Experience level is required'],
    enum: {
      values: Object.values(ExperienceLevel),
      message: 'Invalid experience level'
    },
    index: true
  },
  postedDate: {
    type: Date,
    required: [true, 'Posted date is required'],
    index: true
  },
  expiryDate: {
    type: Date,
    validate: {
      validator: function(this: IJobMatchDocument, expiryDate: Date) {
        return !expiryDate || expiryDate > this.postedDate;
      },
      message: 'Expiry date must be after posted date'
    }
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
      
      // Convert skillAlignment Map to object for JSON serialization
      if (ret.skillAlignment) {
        ret.skillAlignment = Object.fromEntries(ret.skillAlignment);
      }
      
      return ret;
    }
  }
});

// Indexes for performance
jobMatchSchema.index({ userId: 1, matchScore: -1 });
jobMatchSchema.index({ userId: 1, applicationStatus: 1 });
jobMatchSchema.index({ userId: 1, isActive: 1, matchScore: -1 });
jobMatchSchema.index({ jobId: 1, source: 1 }, { unique: true });
jobMatchSchema.index({ company: 1, title: 1 });
jobMatchSchema.index({ location: 1, jobType: 1 });
jobMatchSchema.index({ postedDate: -1 });
jobMatchSchema.index({ expiryDate: 1 }, { sparse: true });
jobMatchSchema.index({ 'salaryRange.min': 1, 'salaryRange.max': 1 }, { sparse: true });

// Virtual for job age in days
jobMatchSchema.virtual('jobAgeInDays').get(function(this: IJobMatchDocument) {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.postedDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for days until expiry
jobMatchSchema.virtual('daysUntilExpiry').get(function(this: IJobMatchDocument) {
  if (!this.expiryDate) return null;
  const now = new Date();
  const diffTime = this.expiryDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for overall skill match percentage
jobMatchSchema.virtual('skillMatchPercentage').get(function(this: IJobMatchDocument) {
  const skillMap = this.skillAlignment as unknown as Map<string, any>;
  if (!skillMap || skillMap.size === 0) return 0;
  
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const [, alignment] of skillMap.entries()) {
    totalWeight += alignment.weight;
    const skillScore = Math.max(0, 100 - (alignment.gap * 10)); // Convert gap to percentage
    weightedScore += skillScore * alignment.weight;
  }
  
  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
});

// Pre-save middleware to calculate match score
jobMatchSchema.pre('save', function(this: IJobMatchDocument, next) {
  try {
    // Calculate match score based on skill alignment if not already set
    if (this.isModified('skillAlignment') || this.isNew) {
      this.matchScore = (this as any).calculateMatchScore();
    }
    
    // Set expiry date if not provided (default to 30 days from posted date)
    if (!this.expiryDate && this.postedDate) {
      this.expiryDate = new Date(this.postedDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    }
    
    // Deactivate if expired
    if (this.expiryDate && this.expiryDate < new Date()) {
      this.isActive = false;
    }
    
    logger.debug('Job match pre-save processing completed', {
      jobMatchId: this._id,
      userId: this.userId,
      jobId: this.jobId,
      matchScore: this.matchScore,
      isActive: this.isActive
    });
    
    next();
  } catch (error) {
    logger.error('Error in job match pre-save middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      jobMatchId: this._id,
      userId: this.userId,
      jobId: this.jobId
    });
    next(error as Error);
  }
});

// Instance method to calculate match score
jobMatchSchema.methods['calculateMatchScore'] = function(this: IJobMatchDocument): number {
  const skillMap = this.skillAlignment as unknown as Map<string, any>;
  if (!skillMap || skillMap.size === 0) return 0;
  
  let totalWeight = 0;
  let weightedScore = 0;
  let criticalSkillsMet = 0;
  let totalCriticalSkills = 0;
  
  for (const [, alignment] of skillMap.entries()) {
    totalWeight += alignment.weight;
    
    // Calculate skill score (0-100) based on gap
    let skillScore = 100;
    if (alignment.gap > 0) {
      skillScore = Math.max(0, 100 - (alignment.gap * 15)); // 15% penalty per gap point
    }
    
    weightedScore += skillScore * alignment.weight;
    
    // Track critical skills (required skills with high weight)
    if (alignment.required && alignment.weight > 0.7) {
      totalCriticalSkills++;
      if (alignment.gap <= 1) { // Allow small gap for critical skills
        criticalSkillsMet++;
      }
    }
  }
  
  let baseScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
  
  // Apply penalty if critical skills are not met
  if (totalCriticalSkills > 0) {
    const criticalSkillsRatio = criticalSkillsMet / totalCriticalSkills;
    if (criticalSkillsRatio < 0.8) { // Less than 80% of critical skills met
      baseScore *= criticalSkillsRatio;
    }
  }
  
  return Math.round(Math.max(0, Math.min(100, baseScore)));
};

// Instance method to update match score with new user skills
jobMatchSchema.methods['updateMatchScore'] = async function(
  this: IJobMatchDocument, 
  userSkills: Record<string, number>
): Promise<number> {
  try {
    const skillMap = this.skillAlignment as unknown as Map<string, any>;
    
    // Update skill alignment based on new user skills
    for (const [skillName, alignment] of skillMap.entries()) {
      const userLevel = userSkills[skillName] || 0;
      alignment.userLevel = userLevel;
      alignment.gap = Math.max(0, alignment.requiredLevel - userLevel);
    }
    
    // Recalculate match score
    this.matchScore = (this as any).calculateMatchScore();
    
    // Save the updated document
    await (this as any).save();
    
    logger.debug('Match score updated', {
      jobMatchId: this._id,
      userId: this.userId,
      newMatchScore: this.matchScore
    });
    
    return this.matchScore;
  } catch (error) {
    logger.error('Error updating match score', {
      error: error instanceof Error ? error.message : 'Unknown error',
      jobMatchId: this._id,
      userId: this.userId
    });
    throw error;
  }
};

// Instance method to check if user can apply
jobMatchSchema.methods['canApply'] = function(this: IJobMatchDocument): { canApply: boolean; reason?: string } {
  // Check if job is active
  if (!this.isActive) {
    return { canApply: false, reason: 'Job is no longer active' };
  }
  
  // Check if job has expired
  if (this.expiryDate && this.expiryDate < new Date()) {
    return { canApply: false, reason: 'Job posting has expired' };
  }
  
  // Check if already applied
  if (this.applicationStatus !== ApplicationStatus.NOT_APPLIED) {
    return { canApply: false, reason: 'Already applied to this job' };
  }
  
  // Check minimum match score (configurable threshold)
  const minimumMatchScore = 30; // Can be made configurable
  if (this.matchScore < minimumMatchScore) {
    return { 
      canApply: false, 
      reason: `Match score (${this.matchScore}%) is below minimum threshold (${minimumMatchScore}%)` 
    };
  }
  
  return { canApply: true };
};

// Instance method to get skill gaps
jobMatchSchema.methods['getSkillGaps'] = function(this: IJobMatchDocument) {
  const gaps = [];
  const skillMap = this.skillAlignment as unknown as Map<string, any>;
  
  for (const [skillName, alignment] of skillMap.entries()) {
    if (alignment.gap > 0) {
      gaps.push({
        skill: skillName,
        currentLevel: alignment.userLevel,
        requiredLevel: alignment.requiredLevel,
        gap: alignment.gap,
        isRequired: alignment.required,
        weight: alignment.weight,
        priority: alignment.required && alignment.weight > 0.7 ? 'critical' :
                 alignment.gap > 3 ? 'high' :
                 alignment.gap > 1 ? 'medium' : 'low'
      });
    }
  }
  
  return gaps.sort((a, b) => {
    // Sort by priority: critical > high > medium > low
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority as keyof typeof priorityOrder] - 
           priorityOrder[a.priority as keyof typeof priorityOrder];
  });
};

// Static method to find matches for user
jobMatchSchema.statics['findByUser'] = function(userId: string, options: any = {}) {
  const query: any = { userId, isActive: true };
  
  if (options.minMatchScore) {
    query.matchScore = { $gte: options.minMatchScore };
  }
  
  if (options.applicationStatus) {
    query.applicationStatus = options.applicationStatus;
  }
  
  if (options.jobType) {
    query.jobType = options.jobType;
  }
  
  if (options.location) {
    query.location = new RegExp(options.location, 'i');
  }
  
  return this.find(query)
    .sort({ matchScore: -1, postedDate: -1 })
    .limit(options.limit || 50);
};

// Static method to find expired jobs
jobMatchSchema.statics['findExpired'] = function() {
  return this.find({
    isActive: true,
    expiryDate: { $lt: new Date() }
  });
};

// Static method to get match statistics
jobMatchSchema.statics['getMatchStatistics'] = async function(userId?: string) {
  try {
    const matchCondition = userId ? { userId: new mongoose.Types.ObjectId(userId) } : {};
    
    const stats = await this.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalMatches: { $sum: 1 },
          averageMatchScore: { $avg: '$matchScore' },
          activeMatches: { 
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } 
          },
          appliedMatches: { 
            $sum: { $cond: [{ $ne: ['$applicationStatus', 'not_applied'] }, 1, 0] } 
          },
          highQualityMatches: { 
            $sum: { $cond: [{ $gte: ['$matchScore', 70] }, 1, 0] } 
          },
          jobTypeDistribution: {
            $push: '$jobType'
          },
          experienceLevelDistribution: {
            $push: '$experienceLevel'
          }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return {
        totalMatches: 0,
        averageMatchScore: 0,
        activeMatches: 0,
        applicationRate: 0,
        highQualityMatchRate: 0,
        jobTypeDistribution: {},
        experienceLevelDistribution: {}
      };
    }
    
    const result = stats[0];
    
    // Calculate distributions
    const jobTypeDistribution = result.jobTypeDistribution.reduce((acc: any, type: string) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    const experienceLevelDistribution = result.experienceLevelDistribution.reduce((acc: any, level: string) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalMatches: result.totalMatches,
      averageMatchScore: Math.round(result.averageMatchScore || 0),
      activeMatches: result.activeMatches,
      applicationRate: result.totalMatches > 0 ? 
        Math.round((result.appliedMatches / result.totalMatches) * 100) : 0,
      highQualityMatchRate: result.totalMatches > 0 ? 
        Math.round((result.highQualityMatches / result.totalMatches) * 100) : 0,
      jobTypeDistribution,
      experienceLevelDistribution
    };
  } catch (error) {
    logger.error('Error calculating match statistics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId
    });
    throw error;
  }
};

// Create and export the model
export const JobMatch: Model<IJobMatchDocument> = mongoose.model<IJobMatchDocument>(
  'JobMatch', 
  jobMatchSchema
);