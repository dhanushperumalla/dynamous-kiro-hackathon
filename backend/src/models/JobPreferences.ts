import mongoose, { Schema, Model } from 'mongoose';
import { 
  IJobPreferencesDocument,
  ISalaryExpectation,
  IBenefitImportance,
  ICommutePreference,
  IAvailability,
  IWorkingHours,
  RemoteWorkPreference,
  JobType,
  ExperienceLevel,
  CompanySize,
  SalaryPeriod,
  ImportanceLevel,
  TransportMethod,
  CommuteFlexibility,
  ScheduleFlexibility
} from '@/types/job';
import { logger } from '@/utils/logger';

// Benefit Importance Schema
const benefitImportanceSchema = new Schema<IBenefitImportance>({
  benefit: {
    type: String,
    required: [true, 'Benefit name is required'],
    trim: true,
    maxlength: [100, 'Benefit name cannot exceed 100 characters']
  },
  importance: {
    type: String,
    required: [true, 'Importance level is required'],
    enum: {
      values: Object.values(ImportanceLevel),
      message: 'Invalid importance level'
    }
  }
}, { _id: false });

// Salary Expectation Schema
const salaryExpectationSchema = new Schema<ISalaryExpectation>({
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    uppercase: true,
    match: [/^[A-Z]{3}$/, 'Currency must be a valid 3-letter ISO code']
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
      validator: function(this: ISalaryExpectation, max: number) {
        return max >= this.min;
      },
      message: 'Maximum salary must be greater than or equal to minimum salary'
    }
  },
  period: {
    type: String,
    required: [true, 'Salary period is required'],
    enum: {
      values: Object.values(SalaryPeriod),
      message: 'Invalid salary period'
    }
  },
  negotiable: {
    type: Boolean,
    default: true
  },
  benefits: {
    type: [benefitImportanceSchema],
    default: []
  }
}, { _id: false });

// Commute Preference Schema
const commutePreferenceSchema = new Schema<ICommutePreference>({
  maxDistance: {
    type: Number,
    required: [true, 'Maximum distance is required'],
    min: [0, 'Maximum distance cannot be negative'],
    max: [500, 'Maximum distance cannot exceed 500 km']
  },
  maxDuration: {
    type: Number,
    required: [true, 'Maximum duration is required'],
    min: [0, 'Maximum duration cannot be negative'],
    max: [300, 'Maximum duration cannot exceed 300 minutes']
  },
  transportMethods: [{
    type: String,
    enum: {
      values: Object.values(TransportMethod),
      message: 'Invalid transport method'
    }
  }],
  flexibility: {
    type: String,
    required: [true, 'Commute flexibility is required'],
    enum: {
      values: Object.values(CommuteFlexibility),
      message: 'Invalid commute flexibility'
    }
  }
}, { _id: false });

// Working Hours Schema
const workingHoursSchema = new Schema<IWorkingHours>({
  preferredStart: {
    type: String,
    required: [true, 'Preferred start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)']
  },
  preferredEnd: {
    type: String,
    required: [true, 'Preferred end time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'],
    validate: {
      validator: function(this: any, endTime: string) {
        const timeToMinutes = (time: string): number => {
          const [hours, minutes] = time.split(':').map(Number);
          return (hours || 0) * 60 + (minutes || 0);
        };
        const startMinutes = timeToMinutes(this.preferredStart);
        const endMinutes = timeToMinutes(endTime);
        return endMinutes > startMinutes;
      },
      message: 'End time must be after start time'
    }
  },
  flexibleHours: {
    type: Boolean,
    default: false
  },
  weekends: {
    type: Boolean,
    default: false
  },
  overtime: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Availability Schema
const availabilitySchema = new Schema<IAvailability>({
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    validate: {
      validator: function(startDate: Date) {
        // Start date should not be more than 1 year in the future
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        return startDate <= oneYearFromNow;
      },
      message: 'Start date cannot be more than 1 year in the future'
    }
  },
  noticePeriod: {
    type: Number,
    required: [true, 'Notice period is required'],
    min: [0, 'Notice period cannot be negative'],
    max: [365, 'Notice period cannot exceed 365 days']
  },
  workingHours: {
    type: workingHoursSchema,
    required: [true, 'Working hours are required']
  },
  timeZone: {
    type: String,
    required: [true, 'Time zone is required'],
    trim: true,
    maxlength: [50, 'Time zone cannot exceed 50 characters']
  },
  flexibility: {
    type: String,
    required: [true, 'Schedule flexibility is required'],
    enum: {
      values: Object.values(ScheduleFlexibility),
      message: 'Invalid schedule flexibility'
    }
  }
}, { _id: false });

// Main Job Preferences Schema
const jobPreferencesSchema = new Schema<IJobPreferencesDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true,
    index: true
  },
  locations: [{
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  }],
  remoteWork: {
    type: String,
    required: [true, 'Remote work preference is required'],
    enum: {
      values: Object.values(RemoteWorkPreference),
      message: 'Invalid remote work preference'
    }
  },
  jobTypes: [{
    type: String,
    enum: {
      values: Object.values(JobType),
      message: 'Invalid job type'
    }
  }],
  experienceLevels: [{
    type: String,
    enum: {
      values: Object.values(ExperienceLevel),
      message: 'Invalid experience level'
    }
  }],
  salaryExpectations: {
    type: salaryExpectationSchema,
    required: [true, 'Salary expectations are required']
  },
  industries: [{
    type: String,
    trim: true,
    maxlength: [100, 'Industry cannot exceed 100 characters']
  }],
  companySize: [{
    type: String,
    enum: {
      values: Object.values(CompanySize),
      message: 'Invalid company size'
    }
  }],
  benefits: [{
    type: String,
    trim: true,
    maxlength: [100, 'Benefit cannot exceed 100 characters']
  }],
  workCulture: [{
    type: String,
    trim: true,
    maxlength: [100, 'Work culture preference cannot exceed 100 characters']
  }],
  commute: {
    type: commutePreferenceSchema,
    required: function(this: IJobPreferencesDocument) {
      return this.remoteWork !== RemoteWorkPreference.REMOTE_ONLY;
    }
  },
  availability: {
    type: availabilitySchema,
    required: [true, 'Availability is required']
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
jobPreferencesSchema.index({ userId: 1 }, { unique: true });
jobPreferencesSchema.index({ locations: 1 });
jobPreferencesSchema.index({ remoteWork: 1 });
jobPreferencesSchema.index({ jobTypes: 1 });
jobPreferencesSchema.index({ experienceLevels: 1 });
jobPreferencesSchema.index({ industries: 1 });
jobPreferencesSchema.index({ updatedAt: -1 });

// Virtual for salary range display
jobPreferencesSchema.virtual('salaryRangeDisplay').get(function(this: IJobPreferencesDocument) {
  const { min, max, currency, period } = this.salaryExpectations;
  return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()} per ${period}`;
});

// Virtual for location preference display
jobPreferencesSchema.virtual('locationDisplay').get(function(this: IJobPreferencesDocument) {
  if (this.remoteWork === RemoteWorkPreference.REMOTE_ONLY) {
    return 'Remote Only';
  }
  
  if (this.locations.length === 0) {
    return 'Any Location';
  }
  
  if (this.locations.length === 1) {
    return this.locations[0];
  }
  
  return `${this.locations.length} locations`;
});

// Pre-save middleware for validation and defaults
jobPreferencesSchema.pre('save', function(this: IJobPreferencesDocument, next) {
  try {
    // Set default job types if none specified
    if (this.jobTypes.length === 0) {
      this.jobTypes = [JobType.FULL_TIME];
    }
    
    // Set default experience levels if none specified
    if (this.experienceLevels.length === 0) {
      this.experienceLevels = [ExperienceLevel.ENTRY_LEVEL, ExperienceLevel.JUNIOR];
    }
    
    // Remove commute preferences if remote only
    if (this.remoteWork === RemoteWorkPreference.REMOTE_ONLY) {
      (this as any).commute = undefined;
    }
    
    // Validate salary expectations
    if (this.salaryExpectations.min > this.salaryExpectations.max) {
      throw new Error('Minimum salary cannot be greater than maximum salary');
    }
    
    // Set updated timestamp
    this.updatedAt = new Date();
    
    logger.debug('Job preferences pre-save processing completed', {
      preferencesId: this._id,
      userId: this.userId,
      remoteWork: this.remoteWork,
      locationsCount: this.locations.length,
      jobTypesCount: this.jobTypes.length
    });
    
    next();
  } catch (error) {
    logger.error('Error in job preferences pre-save middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      preferencesId: this._id,
      userId: this.userId
    });
    next(error as Error);
  }
});

// Instance method to check if preferences are complete
jobPreferencesSchema.methods['isComplete'] = function(this: IJobPreferencesDocument): boolean {
  const requiredFields = [
    this.remoteWork,
    this.jobTypes.length > 0,
    this.experienceLevels.length > 0,
    this.salaryExpectations,
    this.availability
  ];
  
  // Check commute preferences if not remote only
  if (this.remoteWork !== RemoteWorkPreference.REMOTE_ONLY) {
    requiredFields.push(!!this.commute);
  }
  
  return requiredFields.every(field => !!field);
};

// Instance method to get preference score for a job
jobPreferencesSchema.methods['getJobMatchScore'] = function(
  this: IJobPreferencesDocument, 
  job: any
): number {
  let score = 0;
  let totalWeight = 0;
  
  // Location match (weight: 20%)
  const locationWeight = 20;
  totalWeight += locationWeight;
  if (this.remoteWork === RemoteWorkPreference.REMOTE_ONLY) {
    score += job.jobType === JobType.REMOTE ? locationWeight : 0;
  } else if (this.locations.length === 0) {
    score += locationWeight; // Any location is acceptable
  } else {
    const locationMatch = this.locations.some(loc => 
      job.location.toLowerCase().includes(loc.toLowerCase())
    );
    score += locationMatch ? locationWeight : 0;
  }
  
  // Job type match (weight: 15%)
  const jobTypeWeight = 15;
  totalWeight += jobTypeWeight;
  if (this.jobTypes.includes(job.jobType)) {
    score += jobTypeWeight;
  }
  
  // Experience level match (weight: 15%)
  const experienceWeight = 15;
  totalWeight += experienceWeight;
  if (this.experienceLevels.includes(job.experienceLevel)) {
    score += experienceWeight;
  }
  
  // Salary match (weight: 25%)
  const salaryWeight = 25;
  totalWeight += salaryWeight;
  if (job.salaryRange) {
    const jobMin = job.salaryRange.min || 0;
    const jobMax = job.salaryRange.max || job.salaryRange.min || 0;
    const prefMin = this.salaryExpectations.min;
    const prefMax = this.salaryExpectations.max;
    
    // Check for overlap
    if (jobMax >= prefMin && jobMin <= prefMax) {
      const overlapMin = Math.max(jobMin, prefMin);
      const overlapMax = Math.min(jobMax, prefMax);
      const overlapRatio = (overlapMax - overlapMin) / (prefMax - prefMin);
      score += salaryWeight * Math.max(0, overlapRatio);
    }
  }
  
  // Industry match (weight: 10%)
  const industryWeight = 10;
  totalWeight += industryWeight;
  if (this.industries.length === 0 || this.industries.includes(job.industry)) {
    score += industryWeight;
  }
  
  // Company size match (weight: 5%)
  const companySizeWeight = 5;
  totalWeight += companySizeWeight;
  if (this.companySize.length === 0 || this.companySize.includes(job.companySize)) {
    score += companySizeWeight;
  }
  
  // Benefits match (weight: 10%)
  const benefitsWeight = 10;
  totalWeight += benefitsWeight;
  if (job.benefits && this.benefits.length > 0) {
    const matchingBenefits = this.benefits.filter(benefit =>
      job.benefits.some((jobBenefit: string) =>
        jobBenefit.toLowerCase().includes(benefit.toLowerCase())
      )
    );
    const benefitsRatio = matchingBenefits.length / this.benefits.length;
    score += benefitsWeight * benefitsRatio;
  } else if (this.benefits.length === 0) {
    score += benefitsWeight; // No specific benefit requirements
  }
  
  return totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
};

// Instance method to get missing preferences
jobPreferencesSchema.methods['getMissingPreferences'] = function(this: IJobPreferencesDocument): string[] {
  const missing: string[] = [];
  
  if (!this.remoteWork) {
    missing.push('Remote work preference');
  }
  
  if (this.jobTypes.length === 0) {
    missing.push('Job types');
  }
  
  if (this.experienceLevels.length === 0) {
    missing.push('Experience levels');
  }
  
  if (!this.salaryExpectations) {
    missing.push('Salary expectations');
  }
  
  if (!this.availability) {
    missing.push('Availability');
  }
  
  if (this.remoteWork !== RemoteWorkPreference.REMOTE_ONLY && !this.commute) {
    missing.push('Commute preferences');
  }
  
  return missing;
};

// Instance method to update preferences
jobPreferencesSchema.methods['updatePreferences'] = async function(
  this: IJobPreferencesDocument, 
  updates: Partial<IJobPreferencesDocument>
): Promise<void> {
  try {
    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== 'userId' && key !== '_id' && updates[key as keyof typeof updates] !== undefined) {
        (this as any)[key] = updates[key as keyof typeof updates];
      }
    });
    
    await (this as any).save();
    
    logger.info('Job preferences updated', {
      preferencesId: this._id,
      userId: this.userId,
      updatedFields: Object.keys(updates)
    });
  } catch (error) {
    logger.error('Error updating job preferences', {
      error: error instanceof Error ? error.message : 'Unknown error',
      preferencesId: this._id,
      userId: this.userId
    });
    throw error;
  }
};

// Static method to find by user
jobPreferencesSchema.statics['findByUser'] = function(userId: string) {
  return this.findOne({ userId });
};

// Static method to create default preferences
jobPreferencesSchema.statics['createDefault'] = function(userId: string) {
  return this.create({
    userId,
    locations: [],
    remoteWork: RemoteWorkPreference.FLEXIBLE,
    jobTypes: [JobType.FULL_TIME],
    experienceLevels: [ExperienceLevel.ENTRY_LEVEL, ExperienceLevel.JUNIOR],
    salaryExpectations: {
      currency: 'USD',
      min: 40000,
      max: 80000,
      period: SalaryPeriod.YEARLY,
      negotiable: true,
      benefits: []
    },
    industries: [],
    companySize: [],
    benefits: [],
    workCulture: [],
    availability: {
      startDate: new Date(),
      noticePeriod: 14,
      workingHours: {
        preferredStart: '09:00',
        preferredEnd: '17:00',
        flexibleHours: true,
        weekends: false,
        overtime: false
      },
      timeZone: 'UTC',
      flexibility: ScheduleFlexibility.FLEXIBLE
    }
  });
};

// Static method to get preferences statistics
jobPreferencesSchema.statics['getPreferencesStatistics'] = async function() {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          totalPreferences: { $sum: 1 },
          remoteWorkDistribution: { $push: '$remoteWork' },
          jobTypeDistribution: { $push: '$jobTypes' },
          experienceLevelDistribution: { $push: '$experienceLevels' },
          averageSalaryMin: { $avg: '$salaryExpectations.min' },
          averageSalaryMax: { $avg: '$salaryExpectations.max' },
          topIndustries: { $push: '$industries' },
          topLocations: { $push: '$locations' }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return {
        totalPreferences: 0,
        remoteWorkDistribution: {},
        jobTypeDistribution: {},
        experienceLevelDistribution: {},
        averageSalaryRange: { min: 0, max: 0 },
        topIndustries: [],
        topLocations: []
      };
    }
    
    const result = stats[0];
    
    // Process distributions
    const remoteWorkDistribution = result.remoteWorkDistribution.reduce((acc: any, pref: string) => {
      acc[pref] = (acc[pref] || 0) + 1;
      return acc;
    }, {});
    
    const jobTypeDistribution = result.jobTypeDistribution.flat().reduce((acc: any, type: string) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    const experienceLevelDistribution = result.experienceLevelDistribution.flat().reduce((acc: any, level: string) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
    
    return {
      totalPreferences: result.totalPreferences,
      remoteWorkDistribution,
      jobTypeDistribution,
      experienceLevelDistribution,
      averageSalaryRange: {
        min: Math.round(result.averageSalaryMin || 0),
        max: Math.round(result.averageSalaryMax || 0)
      },
      topIndustries: result.topIndustries.flat().slice(0, 10),
      topLocations: result.topLocations.flat().slice(0, 10)
    };
  } catch (error) {
    logger.error('Error calculating preferences statistics', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

// Create and export the model
export const JobPreferences: Model<IJobPreferencesDocument> = mongoose.model<IJobPreferencesDocument>(
  'JobPreferences', 
  jobPreferencesSchema
);