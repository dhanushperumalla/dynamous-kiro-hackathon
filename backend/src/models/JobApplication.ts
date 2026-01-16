import mongoose, { Schema, Model } from 'mongoose';
import { 
  IJobApplicationDocument,
  IDocument,
  IApplicationTimeline,
  IApplicationFeedback,
  ApplicationStatus,
  DocumentType,
  TimelineSource
} from '@/types/job';
import { logger } from '@/utils/logger';

// Document Schema
const documentSchema = new Schema<IDocument>({
  id: {
    type: String,
    required: [true, 'Document ID is required']
  },
  name: {
    type: String,
    required: [true, 'Document name is required'],
    trim: true,
    maxlength: [200, 'Document name cannot exceed 200 characters']
  },
  type: {
    type: String,
    required: [true, 'Document type is required'],
    enum: {
      values: Object.values(DocumentType),
      message: 'Invalid document type'
    }
  },
  url: {
    type: String,
    required: [true, 'Document URL is required'],
    trim: true,
    validate: {
      validator: function(url: string) {
        // Basic URL validation
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid document URL'
    }
  },
  size: {
    type: Number,
    required: [true, 'Document size is required'],
    min: [0, 'Document size cannot be negative'],
    max: [50 * 1024 * 1024, 'Document size cannot exceed 50MB'] // 50MB limit
  },
  uploadedAt: {
    type: Date,
    required: [true, 'Upload date is required'],
    default: Date.now
  }
}, { _id: false });

// Application Timeline Schema
const applicationTimelineSchema = new Schema<IApplicationTimeline>({
  id: {
    type: String,
    required: [true, 'Timeline ID is required']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: Object.values(ApplicationStatus),
      message: 'Invalid application status'
    }
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  source: {
    type: String,
    required: [true, 'Source is required'],
    enum: {
      values: Object.values(TimelineSource),
      message: 'Invalid timeline source'
    }
  },
  details: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

// Application Feedback Schema
const applicationFeedbackSchema = new Schema<IApplicationFeedback>({
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: function(rating: number) {
        return Number.isInteger(rating);
      },
      message: 'Rating must be an integer'
    }
  },
  comments: {
    type: String,
    trim: true,
    maxlength: [2000, 'Comments cannot exceed 2000 characters']
  },
  interviewExperience: {
    type: String,
    trim: true,
    maxlength: [2000, 'Interview experience cannot exceed 2000 characters']
  },
  companyRating: {
    type: Number,
    min: [1, 'Company rating must be at least 1'],
    max: [5, 'Company rating cannot exceed 5'],
    validate: {
      validator: function(rating: number) {
        return !rating || Number.isInteger(rating);
      },
      message: 'Company rating must be an integer'
    }
  },
  wouldRecommend: {
    type: Boolean,
    required: [true, 'Would recommend flag is required']
  },
  submittedAt: {
    type: Date,
    required: [true, 'Submission date is required'],
    default: Date.now
  }
}, { _id: false });

// Main Job Application Schema
const jobApplicationSchema = new Schema<IJobApplicationDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  jobMatchId: {
    type: Schema.Types.ObjectId,
    ref: 'JobMatch',
    required: [true, 'Job match ID is required'],
    index: true
  },
  applicationDate: {
    type: Date,
    required: [true, 'Application date is required'],
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    required: [true, 'Application status is required'],
    enum: {
      values: Object.values(ApplicationStatus),
      message: 'Invalid application status'
    },
    default: ApplicationStatus.APPLIED,
    index: true
  },
  coverLetter: {
    type: String,
    trim: true,
    maxlength: [5000, 'Cover letter cannot exceed 5000 characters']
  },
  resume: {
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        if (!url) return true; // Optional field
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid resume URL'
    }
  },
  additionalDocuments: {
    type: [documentSchema],
    default: [],
    validate: {
      validator: function(documents: IDocument[]) {
        return documents.length <= 10; // Maximum 10 additional documents
      },
      message: 'Cannot have more than 10 additional documents'
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  timeline: {
    type: [applicationTimelineSchema],
    default: [],
    validate: {
      validator: function(timeline: IApplicationTimeline[]) {
        // Ensure timeline entries are in chronological order
        for (let i = 1; i < timeline.length; i++) {
          const current = timeline[i];
          const previous = timeline[i - 1];
          if (current && previous && current.date < previous.date) {
            return false;
          }
        }
        return true;
      },
      message: 'Timeline entries must be in chronological order'
    }
  },
  feedback: {
    type: applicationFeedbackSchema,
    required: false
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
      return ret;
    }
  }
});

// Indexes for performance
jobApplicationSchema.index({ userId: 1, status: 1 });
jobApplicationSchema.index({ userId: 1, applicationDate: -1 });
jobApplicationSchema.index({ jobMatchId: 1 }, { unique: true }); // One application per job match
jobApplicationSchema.index({ status: 1, applicationDate: -1 });
jobApplicationSchema.index({ isActive: 1, status: 1 });

// Virtual for application age in days
jobApplicationSchema.virtual('applicationAgeInDays').get(function(this: IJobApplicationDocument) {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.applicationDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for current timeline entry
jobApplicationSchema.virtual('currentTimelineEntry').get(function(this: IJobApplicationDocument) {
  if (this.timeline.length === 0) return null;
  return this.timeline[this.timeline.length - 1];
});

// Virtual for days in current status
jobApplicationSchema.virtual('daysInCurrentStatus').get(function(this: IJobApplicationDocument) {
  const currentEntry = this.timeline && this.timeline.length > 0 ? 
    this.timeline[this.timeline.length - 1] : null;
  if (!currentEntry) return 0;
  
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - currentEntry.date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to manage timeline
jobApplicationSchema.pre('save', function(this: IJobApplicationDocument, next) {
  try {
    // Add initial timeline entry if this is a new application
    if (this.isNew && this.timeline.length === 0) {
      this.timeline.push({
        id: new mongoose.Types.ObjectId().toString(),
        status: this.status,
        date: this.applicationDate,
        source: TimelineSource.USER,
        notes: 'Application submitted'
      });
    }
    
    // Add timeline entry if status changed
    if (this.isModified('status') && !this.isNew) {
      const existingEntry = this.timeline.find(entry => entry.status === this.status);
      if (!existingEntry) {
        this.timeline.push({
          id: new mongoose.Types.ObjectId().toString(),
          status: this.status,
          date: new Date(),
          source: TimelineSource.SYSTEM,
          notes: `Status changed to ${this.status}`
        });
      }
    }
    
    // Sort timeline by date
    this.timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    logger.debug('Job application pre-save processing completed', {
      applicationId: this._id,
      userId: this.userId,
      jobMatchId: this.jobMatchId,
      status: this.status,
      timelineEntries: this.timeline.length
    });
    
    next();
  } catch (error) {
    logger.error('Error in job application pre-save middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      applicationId: this._id,
      userId: this.userId,
      jobMatchId: this.jobMatchId
    });
    next(error as Error);
  }
});

// Instance method to update status
jobApplicationSchema.methods['updateStatus'] = async function(
  this: IJobApplicationDocument, 
  status: ApplicationStatus, 
  notes?: string
): Promise<void> {
  try {
    // Don't update if status is the same
    if (this.status === status) {
      return;
    }
    
    // Validate status transition
    const validTransitions = getValidStatusTransitions(this.status);
    if (!validTransitions.includes(status)) {
      throw new Error(`Invalid status transition from ${this.status} to ${status}`);
    }
    
    this.status = status;
    
    // The timeline entry will be added automatically in pre-save middleware
    // But we can update the notes if provided
    if (notes) {
      const lastEntry = this.timeline[this.timeline.length - 1];
      if (lastEntry && lastEntry.status === status) {
        lastEntry.notes = notes;
      }
    }
    
    await (this as any).save();
    
    logger.info('Application status updated', {
      applicationId: this._id,
      userId: this.userId,
      oldStatus: this.status,
      newStatus: status,
      notes
    });
  } catch (error) {
    logger.error('Error updating application status', {
      error: error instanceof Error ? error.message : 'Unknown error',
      applicationId: this._id,
      userId: this.userId,
      status
    });
    throw error;
  }
};

// Helper function to get valid status transitions
function getValidStatusTransitions(currentStatus: ApplicationStatus): ApplicationStatus[] {
  const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    [ApplicationStatus.NOT_APPLIED]: [ApplicationStatus.APPLIED],
    [ApplicationStatus.APPLIED]: [
      ApplicationStatus.UNDER_REVIEW, 
      ApplicationStatus.REJECTED, 
      ApplicationStatus.WITHDRAWN
    ],
    [ApplicationStatus.UNDER_REVIEW]: [
      ApplicationStatus.INTERVIEWING, 
      ApplicationStatus.REJECTED, 
      ApplicationStatus.WITHDRAWN
    ],
    [ApplicationStatus.INTERVIEWING]: [
      ApplicationStatus.OFFER_RECEIVED, 
      ApplicationStatus.REJECTED, 
      ApplicationStatus.WITHDRAWN
    ],
    [ApplicationStatus.OFFER_RECEIVED]: [
      ApplicationStatus.ACCEPTED, 
      ApplicationStatus.REJECTED, 
      ApplicationStatus.WITHDRAWN
    ],
    [ApplicationStatus.REJECTED]: [], // Terminal state
    [ApplicationStatus.WITHDRAWN]: [], // Terminal state
    [ApplicationStatus.ACCEPTED]: [] // Terminal state
  };
  
  return transitions[currentStatus] || [];
}

// Instance method to add timeline entry
jobApplicationSchema.methods['addTimelineEntry'] = async function(
  this: IJobApplicationDocument, 
  entry: Omit<IApplicationTimeline, 'id'>
): Promise<void> {
  try {
    const timelineEntry: IApplicationTimeline = {
      id: new mongoose.Types.ObjectId().toString(),
      ...entry
    };
    
    this.timeline.push(timelineEntry);
    
    // Update status if different
    if (entry.status !== this.status) {
      this.status = entry.status;
    }
    
    await (this as any).save();
    
    logger.debug('Timeline entry added', {
      applicationId: this._id,
      userId: this.userId,
      status: entry.status,
      source: entry.source
    });
  } catch (error) {
    logger.error('Error adding timeline entry', {
      error: error instanceof Error ? error.message : 'Unknown error',
      applicationId: this._id,
      userId: this.userId
    });
    throw error;
  }
};

// Instance method to get valid status transitions
jobApplicationSchema.methods['getValidStatusTransitions'] = function(this: IJobApplicationDocument): ApplicationStatus[] {
  return getValidStatusTransitions(this.status);
};

// Instance method to check if application is in terminal state
jobApplicationSchema.methods['isInTerminalState'] = function(this: IJobApplicationDocument): boolean {
  const terminalStates = [
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
    ApplicationStatus.ACCEPTED
  ];
  
  return terminalStates.includes(this.status);
};

// Instance method to get application summary
jobApplicationSchema.methods['getSummary'] = function(this: IJobApplicationDocument) {
  const daysInCurrentStatus = this.timeline && this.timeline.length > 0 ? 
    (() => {
      const currentEntry = this.timeline[this.timeline.length - 1];
      if (!currentEntry) return 0;
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - currentEntry.date.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    })() : 0;

  const applicationAgeInDays = (() => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.applicationDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  })();

  const terminalStates = [
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
    ApplicationStatus.ACCEPTED
  ];

  return {
    id: this._id,
    status: this.status,
    applicationDate: this.applicationDate,
    daysInCurrentStatus,
    applicationAgeInDays,
    hasDocuments: (this.additionalDocuments?.length || 0) > 0,
    hasFeedback: !!this.feedback,
    timelineLength: this.timeline.length,
    isTerminal: terminalStates.includes(this.status)
  };
};

// Static method to find applications by user
jobApplicationSchema.statics['findByUser'] = function(userId: string, options: any = {}) {
  const query: any = { userId, isActive: true };
  
  if (options.status) {
    if (Array.isArray(options.status)) {
      query.status = { $in: options.status };
    } else {
      query.status = options.status;
    }
  }
  
  if (options.dateFrom) {
    query.applicationDate = { $gte: options.dateFrom };
  }
  
  if (options.dateTo) {
    query.applicationDate = { ...query.applicationDate, $lte: options.dateTo };
  }
  
  return this.find(query)
    .populate('jobMatchId')
    .sort({ applicationDate: -1 })
    .limit(options.limit || 50);
};

// Static method to get application statistics
jobApplicationSchema.statics['getApplicationStatistics'] = async function(userId?: string) {
  try {
    const matchCondition = userId ? { userId: new mongoose.Types.ObjectId(userId) } : {};
    
    const stats = await this.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalApplications: { $sum: 1 },
          statusDistribution: {
            $push: '$status'
          },
          averageTimeInStatus: {
            $avg: {
              $divide: [
                { $subtract: [new Date(), '$applicationDate'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          },
          applicationsWithFeedback: {
            $sum: { $cond: [{ $ne: ['$feedback', null] }, 1, 0] }
          },
          applicationsWithDocuments: {
            $sum: { $cond: [{ $gt: [{ $size: '$additionalDocuments' }, 0] }, 1, 0] }
          }
        }
      }
    ]);
    
    if (stats.length === 0) {
      return {
        totalApplications: 0,
        statusDistribution: {},
        averageTimeInStatus: 0,
        feedbackRate: 0,
        documentAttachmentRate: 0,
        responseRate: 0,
        interviewRate: 0,
        offerRate: 0
      };
    }
    
    const result = stats[0];
    
    // Calculate status distribution
    const statusDistribution = result.statusDistribution.reduce((acc: any, status: string) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    // Calculate rates
    const total = result.totalApplications;
    const responded = (statusDistribution[ApplicationStatus.UNDER_REVIEW] || 0) +
                     (statusDistribution[ApplicationStatus.INTERVIEWING] || 0) +
                     (statusDistribution[ApplicationStatus.OFFER_RECEIVED] || 0) +
                     (statusDistribution[ApplicationStatus.ACCEPTED] || 0);
    
    const interviewed = (statusDistribution[ApplicationStatus.INTERVIEWING] || 0) +
                       (statusDistribution[ApplicationStatus.OFFER_RECEIVED] || 0) +
                       (statusDistribution[ApplicationStatus.ACCEPTED] || 0);
    
    const offered = (statusDistribution[ApplicationStatus.OFFER_RECEIVED] || 0) +
                   (statusDistribution[ApplicationStatus.ACCEPTED] || 0);
    
    return {
      totalApplications: total,
      statusDistribution,
      averageTimeInStatus: Math.round(result.averageTimeInStatus || 0),
      feedbackRate: total > 0 ? Math.round((result.applicationsWithFeedback / total) * 100) : 0,
      documentAttachmentRate: total > 0 ? Math.round((result.applicationsWithDocuments / total) * 100) : 0,
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      interviewRate: total > 0 ? Math.round((interviewed / total) * 100) : 0,
      offerRate: total > 0 ? Math.round((offered / total) * 100) : 0
    };
  } catch (error) {
    logger.error('Error calculating application statistics', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId
    });
    throw error;
  }
};

// Create and export the model
export const JobApplication: Model<IJobApplicationDocument> = mongoose.model<IJobApplicationDocument>(
  'JobApplication', 
  jobApplicationSchema
);