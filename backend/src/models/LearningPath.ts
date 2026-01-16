import mongoose, { Schema } from 'mongoose';
import {
  ILearningPathDocument,
  ILearningPathModel,
  ILearningModule,
  IWeeklyTarget,
  ITask,
  IResource,
  ILearningProgress,
  IMilestone,
  IModuleAssessment,
  IAssessmentQuestion,
  ICompletionCriteria,
  IPersonalizationSettings,
  ISchedulePreference,
  IReminderSettings,
  IAdaptiveSettings,
  DifficultyLevel,
  TaskPriority,
  TaskType,
  ResourceType,
  ResourceFormat,
  LearningPace,
  LearningStyle,
  SkillLevel,
  WeekDay,
  TimeSlot,
  ReminderFrequency,
  NotificationChannel,
  MilestoneType,
  AssessmentType,
  QuestionType
} from '../types/learning';

// Task Schema
const taskSchema = new Schema<ITask>({
  id: {
    type: String,
    required: [true, 'Task ID is required'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true,
    maxlength: [1000, 'Task description cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: {
      values: Object.values(TaskType),
      message: 'Invalid task type'
    },
    required: [true, 'Task type is required']
  },
  estimatedMinutes: {
    type: Number,
    required: [true, 'Estimated minutes is required'],
    min: [1, 'Estimated minutes must be at least 1'],
    max: [480, 'Estimated minutes cannot exceed 8 hours']
  },
  isRequired: {
    type: Boolean,
    default: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  resources: [{
    type: String,
    trim: true
  }]
}, { _id: false });

// Resource Schema
const resourceSchema = new Schema<IResource>({
  id: {
    type: String,
    required: [true, 'Resource ID is required'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Resource title is required'],
    trim: true,
    maxlength: [200, 'Resource title cannot exceed 200 characters']
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
    required: [true, 'Resource provider is required'],
    trim: true,
    maxlength: [100, 'Provider cannot exceed 100 characters']
  },
  url: {
    type: String,
    trim: true,
    validate: {
      validator: function(url: string) {
        if (!url) return true; // Optional field
        return /^https?:\/\/.+/.test(url);
      },
      message: 'URL must be a valid HTTP/HTTPS URL'
    }
  },
  description: {
    type: String,
    required: [true, 'Resource description is required'],
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
    default: 0,
    min: [0, 'Cost cannot be negative']
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  tags: [{
    type: String,
    trim: true
  }],
  isRequired: {
    type: Boolean,
    default: false
  },
  format: {
    type: String,
    enum: {
      values: Object.values(ResourceFormat),
      message: 'Invalid resource format'
    },
    required: [true, 'Resource format is required']
  },
  language: {
    type: String,
    default: 'en',
    trim: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Assessment Question Schema
const assessmentQuestionSchema = new Schema<IAssessmentQuestion>({
  id: {
    type: String,
    required: [true, 'Question ID is required'],
    trim: true
  },
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: [1000, 'Question cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: {
      values: Object.values(QuestionType),
      message: 'Invalid question type'
    },
    required: [true, 'Question type is required']
  },
  options: [{
    type: String,
    trim: true
  }],
  correctAnswer: {
    type: Schema.Types.Mixed,
    required: [true, 'Correct answer is required']
  },
  explanation: {
    type: String,
    required: [true, 'Explanation is required'],
    trim: true,
    maxlength: [500, 'Explanation cannot exceed 500 characters']
  },
  points: {
    type: Number,
    required: [true, 'Points are required'],
    min: [1, 'Points must be at least 1']
  },
  difficulty: {
    type: String,
    enum: {
      values: Object.values(DifficultyLevel),
      message: 'Invalid difficulty level'
    },
    required: [true, 'Difficulty level is required']
  }
}, { _id: false });

// Module Assessment Schema
const moduleAssessmentSchema = new Schema<IModuleAssessment>({
  id: {
    type: String,
    required: [true, 'Assessment ID is required'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Assessment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  type: {
    type: String,
    enum: {
      values: Object.values(AssessmentType),
      message: 'Invalid assessment type'
    },
    required: [true, 'Assessment type is required']
  },
  description: {
    type: String,
    required: [true, 'Assessment description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  questions: [assessmentQuestionSchema],
  passingScore: {
    type: Number,
    required: [true, 'Passing score is required'],
    min: [0, 'Passing score cannot be negative'],
    max: [100, 'Passing score cannot exceed 100']
  },
  timeLimit: {
    type: Number,
    min: [1, 'Time limit must be at least 1 minute']
  },
  maxAttempts: {
    type: Number,
    required: [true, 'Max attempts is required'],
    min: [1, 'Max attempts must be at least 1'],
    default: 3
  },
  isRequired: {
    type: Boolean,
    default: true
  }
}, { _id: false });

// Completion Criteria Schema
const completionCriteriaSchema = new Schema<ICompletionCriteria>({
  requiredTasks: {
    type: Number,
    required: [true, 'Required tasks count is required'],
    min: [0, 'Required tasks cannot be negative']
  },
  requiredHours: {
    type: Number,
    required: [true, 'Required hours is required'],
    min: [0, 'Required hours cannot be negative']
  },
  requiredAssessments: [{
    type: String,
    trim: true
  }],
  requiredSkillLevel: {
    type: Number,
    required: [true, 'Required skill level is required'],
    min: [1, 'Skill level must be at least 1'],
    max: [10, 'Skill level cannot exceed 10']
  },
  customCriteria: [{
    type: String,
    trim: true
  }]
}, { _id: false });

// Weekly Target Schema
const weeklyTargetSchema = new Schema<IWeeklyTarget>({
  id: {
    type: String,
    required: [true, 'Weekly target ID is required'],
    trim: true
  },
  moduleId: {
    type: String,
    required: [true, 'Module ID is required'],
    trim: true
  },
  week: {
    type: Number,
    required: [true, 'Week number is required'],
    min: [1, 'Week must be at least 1']
  },
  title: {
    type: String,
    required: [true, 'Weekly target title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Weekly target description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  tasks: [taskSchema],
  estimatedHours: {
    type: Number,
    required: [true, 'Estimated hours is required'],
    min: [0.5, 'Estimated hours must be at least 0.5'],
    max: [40, 'Estimated hours cannot exceed 40 per week']
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  priority: {
    type: String,
    enum: {
      values: Object.values(TaskPriority),
      message: 'Invalid task priority'
    },
    default: TaskPriority.MEDIUM
  },
  skills: [{
    type: String,
    trim: true
  }],
  resources: [{
    type: String,
    trim: true
  }],
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  completionNotes: {
    type: String,
    trim: true,
    maxlength: [500, 'Completion notes cannot exceed 500 characters']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative']
  }
}, { _id: false });

// Learning Module Schema
const learningModuleSchema = new Schema<ILearningModule>({
  id: {
    type: String,
    required: [true, 'Module ID is required'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Module title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Module description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  order: {
    type: Number,
    required: [true, 'Module order is required'],
    min: [1, 'Order must be at least 1']
  },
  prerequisites: [{
    type: String,
    trim: true
  }],
  estimatedHours: {
    type: Number,
    required: [true, 'Estimated hours is required'],
    min: [0.5, 'Estimated hours must be at least 0.5']
  },
  difficulty: {
    type: String,
    enum: {
      values: Object.values(DifficultyLevel),
      message: 'Invalid difficulty level'
    },
    required: [true, 'Difficulty level is required']
  },
  weeklyTargets: [weeklyTargetSchema],
  resources: [resourceSchema],
  skills: [{
    type: String,
    trim: true
  }],
  assessments: [moduleAssessmentSchema],
  isOptional: {
    type: Boolean,
    default: false
  },
  completionCriteria: {
    type: completionCriteriaSchema,
    required: [true, 'Completion criteria is required']
  }
}, { _id: false });

// Milestone Schema
const milestoneSchema = new Schema<IMilestone>({
  id: {
    type: String,
    required: [true, 'Milestone ID is required'],
    trim: true
  },
  title: {
    type: String,
    required: [true, 'Milestone title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Milestone description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: {
      values: Object.values(MilestoneType),
      message: 'Invalid milestone type'
    },
    required: [true, 'Milestone type is required']
  },
  achievedAt: {
    type: Date,
    required: [true, 'Achievement date is required']
  },
  moduleId: {
    type: String,
    trim: true
  },
  weekNumber: {
    type: Number,
    min: [1, 'Week number must be at least 1']
  },
  badge: {
    type: String,
    trim: true
  },
  points: {
    type: Number,
    required: [true, 'Points are required'],
    min: [0, 'Points cannot be negative'],
    default: 0
  }
}, { _id: false });

// Learning Progress Schema
const learningProgressSchema = new Schema<ILearningProgress>({
  completedModules: [{
    type: String,
    trim: true
  }],
  currentModule: {
    type: String,
    trim: true
  },
  overallProgress: {
    type: Number,
    required: [true, 'Overall progress is required'],
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100'],
    default: 0
  },
  weeklyTargetsMet: {
    type: Number,
    required: [true, 'Weekly targets met is required'],
    min: [0, 'Weekly targets met cannot be negative'],
    default: 0
  },
  totalWeeklyTargets: {
    type: Number,
    required: [true, 'Total weekly targets is required'],
    min: [0, 'Total weekly targets cannot be negative'],
    default: 0
  },
  totalHoursSpent: {
    type: Number,
    required: [true, 'Total hours spent is required'],
    min: [0, 'Hours spent cannot be negative'],
    default: 0
  },
  averageWeeklyHours: {
    type: Number,
    required: [true, 'Average weekly hours is required'],
    min: [0, 'Average hours cannot be negative'],
    default: 0
  },
  streakWeeks: {
    type: Number,
    required: [true, 'Streak weeks is required'],
    min: [0, 'Streak weeks cannot be negative'],
    default: 0
  },
  lastActivityDate: {
    type: Date,
    default: Date.now
  },
  milestones: [milestoneSchema],
  skillsAcquired: [{
    type: String,
    trim: true
  }],
  certificationsEarned: [{
    type: String,
    trim: true
  }]
}, { _id: false });

// Reminder Settings Schema
const reminderSettingsSchema = new Schema<IReminderSettings>({
  enabled: {
    type: Boolean,
    default: true
  },
  frequency: {
    type: String,
    enum: {
      values: Object.values(ReminderFrequency),
      message: 'Invalid reminder frequency'
    },
    default: ReminderFrequency.WEEKLY
  },
  preferredTime: {
    type: String,
    required: [true, 'Preferred time is required'],
    validate: {
      validator: function(time: string) {
        return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
      },
      message: 'Time must be in HH:MM format'
    }
  },
  channels: [{
    type: String,
    enum: {
      values: Object.values(NotificationChannel),
      message: 'Invalid notification channel'
    }
  }],
  customMessage: {
    type: String,
    trim: true,
    maxlength: [200, 'Custom message cannot exceed 200 characters']
  }
}, { _id: false });

// Schedule Preference Schema
const schedulePreferenceSchema = new Schema<ISchedulePreference>({
  preferredDays: [{
    type: String,
    enum: {
      values: Object.values(WeekDay),
      message: 'Invalid week day'
    }
  }],
  preferredTimeSlots: [{
    type: String,
    enum: {
      values: Object.values(TimeSlot),
      message: 'Invalid time slot'
    }
  }],
  timezone: {
    type: String,
    required: [true, 'Timezone is required'],
    default: 'UTC'
  },
  flexibleSchedule: {
    type: Boolean,
    default: true
  },
  reminderSettings: {
    type: reminderSettingsSchema,
    required: [true, 'Reminder settings are required']
  }
}, { _id: false });

// Adaptive Settings Schema
const adaptiveSettingsSchema = new Schema<IAdaptiveSettings>({
  enabled: {
    type: Boolean,
    default: true
  },
  difficultyAdjustment: {
    type: Boolean,
    default: true
  },
  paceAdjustment: {
    type: Boolean,
    default: true
  },
  contentRecommendation: {
    type: Boolean,
    default: true
  },
  pathOptimization: {
    type: Boolean,
    default: true
  }
}, { _id: false });

// Personalization Settings Schema
const personalizationSettingsSchema = new Schema<IPersonalizationSettings>({
  learningPace: {
    type: String,
    enum: {
      values: Object.values(LearningPace),
      message: 'Invalid learning pace'
    },
    default: LearningPace.MODERATE
  },
  preferredLearningStyle: {
    type: String,
    enum: {
      values: Object.values(LearningStyle),
      message: 'Invalid learning style'
    },
    default: LearningStyle.MIXED
  },
  availableHoursPerWeek: {
    type: Number,
    required: [true, 'Available hours per week is required'],
    min: [1, 'Available hours must be at least 1'],
    max: [40, 'Available hours cannot exceed 40 per week'],
    default: 10
  },
  preferredSchedule: {
    type: schedulePreferenceSchema,
    required: [true, 'Preferred schedule is required']
  },
  skillLevel: {
    type: String,
    enum: {
      values: Object.values(SkillLevel),
      message: 'Invalid skill level'
    },
    default: SkillLevel.BEGINNER
  },
  focusAreas: [{
    type: String,
    trim: true
  }],
  excludedTopics: [{
    type: String,
    trim: true
  }],
  adaptiveSettings: {
    type: adaptiveSettingsSchema,
    required: [true, 'Adaptive settings are required']
  }
}, { _id: false });

// Main Learning Path Schema
const learningPathSchema = new Schema<ILearningPathDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  domainId: {
    type: Schema.Types.ObjectId,
    ref: 'CareerDomain',
    required: [true, 'Domain ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Learning path title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Learning path description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  estimatedDuration: {
    type: Number,
    required: [true, 'Estimated duration is required'],
    min: [1, 'Duration must be at least 1 week'],
    max: [104, 'Duration cannot exceed 2 years']
  },
  difficulty: {
    type: String,
    enum: {
      values: Object.values(DifficultyLevel),
      message: 'Invalid difficulty level'
    },
    required: [true, 'Difficulty level is required']
  },
  modules: {
    type: [learningModuleSchema],
    required: [true, 'Modules are required'],
    validate: {
      validator: function(modules: ILearningModule[]) {
        return modules.length > 0;
      },
      message: 'At least one module is required'
    }
  },
  progress: {
    type: learningProgressSchema,
    required: [true, 'Progress tracking is required']
  },
  personalization: {
    type: personalizationSettingsSchema,
    required: [true, 'Personalization settings are required']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
learningPathSchema.index({ userId: 1, isActive: 1 });
learningPathSchema.index({ domainId: 1, difficulty: 1 });
learningPathSchema.index({ 'progress.overallProgress': 1 });
learningPathSchema.index({ createdAt: -1 });

// Virtual for completion percentage
learningPathSchema.virtual('completionPercentage').get(function() {
  return this.progress.overallProgress;
});

// Virtual for current week
learningPathSchema.virtual('currentWeek').get(function() {
  const startDate = this.createdAt;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - startDate.getTime());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return Math.min(diffWeeks, this.estimatedDuration);
});

// Pre-save middleware for validation
learningPathSchema.pre('save', function(next) {
  // Validate module order sequence
  const orders = this.modules.map(m => m.order).sort((a, b) => a - b);
  
  // Debug logging
  console.log('Module validation - Total modules:', this.modules.length);
  console.log('Module orders (sorted):', orders);
  console.log('Module details:', this.modules.map(m => ({ id: m.id, title: m.title, order: m.order })));
  
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) {
      console.error(`Order validation failed at index ${i}: expected ${i + 1}, got ${orders[i]}`);
      return next(new Error('Module orders must be sequential starting from 1'));
    }
  }

  // Validate prerequisites exist
  const moduleIds = this.modules.map(m => m.id);
  for (const module of this.modules) {
    for (const prereq of module.prerequisites) {
      if (!moduleIds.includes(prereq)) {
        return next(new Error(`Prerequisite module ${prereq} not found in path`));
      }
    }
  }

  // Update total weekly targets
  let totalTargets = 0;
  for (const module of this.modules) {
    totalTargets += module.weeklyTargets.length;
  }
  this.progress.totalWeeklyTargets = totalTargets;

  next();
});

// Static methods
learningPathSchema.statics['findByUser'] = function(userId: string) {
  return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

learningPathSchema.statics['findByDomain'] = function(domainId: string) {
  return this.find({ domainId, isActive: true }).sort({ createdAt: -1 });
};

// Instance methods
learningPathSchema.methods['updateProgress'] = function(this: ILearningPathDocument, moduleId: string, weeklyTargetId?: string) {
  const module = this.modules.find((m: ILearningModule) => m.id === moduleId);
  if (!module) {
    throw new Error('Module not found');
  }

  if (weeklyTargetId) {
    const target = module.weeklyTargets.find((t: IWeeklyTarget) => t.id === weeklyTargetId);
    if (target && target.completed) {
      this.progress.weeklyTargetsMet += 1;
    }
  }

  // Check if module is completed
  const completedTargets = module.weeklyTargets.filter((t: IWeeklyTarget) => t.completed).length;
  const totalTargets = module.weeklyTargets.length;
  
  if (completedTargets === totalTargets && !this.progress.completedModules.includes(moduleId)) {
    this.progress.completedModules.push(moduleId);
  }

  // Update overall progress
  const totalModules = this.modules.length;
  const completedModules = this.progress.completedModules.length;
  this.progress.overallProgress = Math.round((completedModules / totalModules) * 100);

  // Update current module
  if (completedModules < totalModules) {
    const nextModule = this.modules.find((m: ILearningModule) => 
      !this.progress.completedModules.includes(m.id)
    );
    if (nextModule) {
      this.progress.currentModule = nextModule.id;
    }
  }

  this.progress.lastActivityDate = new Date();
  return this.save();
};

learningPathSchema.methods['canStartModule'] = function(this: ILearningPathDocument, moduleId: string) {
  const module = this.modules.find((m: ILearningModule) => m.id === moduleId);
  if (!module) {
    return { canStart: false, reason: 'Module not found' };
  }

  // Check prerequisites
  for (const prereqId of module.prerequisites) {
    if (!this.progress.completedModules.includes(prereqId)) {
      return { canStart: false, reason: `Prerequisite module ${prereqId} not completed` };
    }
  }

  return { canStart: true };
};

// Create and export the model
const LearningPath: ILearningPathModel = mongoose.model<ILearningPathDocument, ILearningPathModel>('LearningPath', learningPathSchema);

export default LearningPath;