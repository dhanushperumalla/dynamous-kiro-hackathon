import { Document, Types, Model } from 'mongoose';

// Learning path interfaces
export interface ILearningPath {
  id: string;
  userId: string;
  domainId: string;
  title: string;
  description: string;
  estimatedDuration: number; // in weeks
  difficulty: DifficultyLevel;
  modules: ILearningModule[];
  progress: ILearningProgress;
  personalization: IPersonalizationSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Learning module interface
export interface ILearningModule {
  id: string;
  title: string;
  description: string;
  order: number;
  prerequisites: string[]; // Module IDs that must be completed first
  estimatedHours: number;
  difficulty: DifficultyLevel;
  weeklyTargets: IWeeklyTarget[];
  resources: IResource[];
  skills: string[]; // Skills learned in this module
  assessments: IModuleAssessment[];
  isOptional: boolean;
  completionCriteria: ICompletionCriteria;
}

// Weekly target interface
export interface IWeeklyTarget {
  id: string;
  moduleId: string;
  week: number;
  title: string;
  description: string;
  tasks: ITask[];
  estimatedHours: number;
  dueDate: Date;
  priority: TaskPriority;
  skills: string[]; // Skills practiced in this target
  resources: string[]; // Resource IDs for this target
  completed: boolean;
  completedAt?: Date;
  completionNotes?: string;
  actualHours?: number;
}

// Task interface
export interface ITask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  estimatedMinutes: number;
  isRequired: boolean;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
  resources: string[]; // Resource IDs for this task
}

// Resource interface
export interface IResource {
  id: string;
  title: string;
  type: ResourceType;
  provider: string;
  url?: string;
  description: string;
  duration: number; // in minutes
  difficulty: DifficultyLevel;
  cost: number; // 0 for free resources
  rating?: number; // 1-5 scale
  tags: string[];
  isRequired: boolean;
  format: ResourceFormat;
  language: string;
  lastUpdated: Date;
}

// Learning progress interface
export interface ILearningProgress {
  completedModules: string[]; // Module IDs
  currentModule: string; // Current module ID
  overallProgress: number; // 0-100 percentage
  weeklyTargetsMet: number;
  totalWeeklyTargets: number;
  totalHoursSpent: number;
  averageWeeklyHours: number;
  streakWeeks: number; // Consecutive weeks with targets met
  lastActivityDate: Date;
  milestones: IMilestone[];
  skillsAcquired: string[];
  certificationsEarned: string[];
}

// Milestone interface
export interface IMilestone {
  id: string;
  title: string;
  description: string;
  type: MilestoneType;
  achievedAt: Date;
  moduleId?: string;
  weekNumber?: number;
  badge?: string;
  points: number;
}

// Module assessment interface
export interface IModuleAssessment {
  id: string;
  title: string;
  type: AssessmentType;
  description: string;
  questions: IAssessmentQuestion[];
  passingScore: number; // 0-100 percentage
  timeLimit?: number; // in minutes
  maxAttempts: number;
  isRequired: boolean;
}

// Assessment question interface
export interface IAssessmentQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[]; // For multiple choice
  correctAnswer: string | string[];
  explanation: string;
  points: number;
  difficulty: DifficultyLevel;
}

// Completion criteria interface
export interface ICompletionCriteria {
  requiredTasks: number; // Minimum number of tasks to complete
  requiredHours: number; // Minimum hours to spend
  requiredAssessments: string[]; // Assessment IDs that must be passed
  requiredSkillLevel: number; // 1-10 scale
  customCriteria?: string[]; // Additional custom requirements
}

// Personalization settings interface
export interface IPersonalizationSettings {
  learningPace: LearningPace;
  preferredLearningStyle: LearningStyle;
  availableHoursPerWeek: number;
  preferredSchedule: ISchedulePreference;
  skillLevel: SkillLevel;
  focusAreas: string[]; // Specific areas of interest within the domain
  excludedTopics: string[]; // Topics to skip or minimize
  adaptiveSettings: IAdaptiveSettings;
}

// Schedule preference interface
export interface ISchedulePreference {
  preferredDays: WeekDay[];
  preferredTimeSlots: TimeSlot[];
  timezone: string;
  flexibleSchedule: boolean;
  reminderSettings: IReminderSettings;
}

// Reminder settings interface
export interface IReminderSettings {
  enabled: boolean;
  frequency: ReminderFrequency;
  preferredTime: string; // HH:MM format
  channels: NotificationChannel[];
  customMessage?: string;
}

// Adaptive settings interface
export interface IAdaptiveSettings {
  enabled: boolean;
  difficultyAdjustment: boolean; // Auto-adjust difficulty based on performance
  paceAdjustment: boolean; // Auto-adjust pace based on progress
  contentRecommendation: boolean; // Recommend additional resources
  pathOptimization: boolean; // Optimize path based on learning patterns
}

// Enums
export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TaskType {
  READING = 'reading',
  VIDEO = 'video',
  EXERCISE = 'exercise',
  PROJECT = 'project',
  QUIZ = 'quiz',
  DISCUSSION = 'discussion',
  RESEARCH = 'research',
  PRACTICE = 'practice',
  REFLECTION = 'reflection'
}

export enum ResourceType {
  ARTICLE = 'article',
  VIDEO = 'video',
  COURSE = 'course',
  BOOK = 'book',
  TUTORIAL = 'tutorial',
  DOCUMENTATION = 'documentation',
  TOOL = 'tool',
  TEMPLATE = 'template',
  EXERCISE = 'exercise',
  QUIZ = 'quiz',
  PROJECT = 'project',
  CERTIFICATION = 'certification'
}

export enum ResourceFormat {
  TEXT = 'text',
  VIDEO = 'video',
  AUDIO = 'audio',
  INTERACTIVE = 'interactive',
  DOWNLOADABLE = 'downloadable',
  ONLINE = 'online',
  OFFLINE = 'offline'
}

export enum LearningPace {
  SLOW = 'slow',
  MODERATE = 'moderate',
  FAST = 'fast',
  INTENSIVE = 'intensive'
}

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING = 'reading',
  MIXED = 'mixed'
}

export enum SkillLevel {
  ABSOLUTE_BEGINNER = 'absolute_beginner',
  BEGINNER = 'beginner',
  SOME_EXPERIENCE = 'some_experience',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum WeekDay {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday'
}

export enum TimeSlot {
  EARLY_MORNING = 'early_morning', // 6-9 AM
  MORNING = 'morning', // 9-12 PM
  AFTERNOON = 'afternoon', // 12-5 PM
  EVENING = 'evening', // 5-8 PM
  NIGHT = 'night' // 8-11 PM
}

export enum ReminderFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BI_WEEKLY = 'bi_weekly',
  CUSTOM = 'custom'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export enum MilestoneType {
  MODULE_COMPLETION = 'module_completion',
  WEEKLY_TARGET = 'weekly_target',
  SKILL_MASTERY = 'skill_mastery',
  TIME_MILESTONE = 'time_milestone',
  STREAK_ACHIEVEMENT = 'streak_achievement',
  ASSESSMENT_PASSED = 'assessment_passed',
  PROJECT_COMPLETED = 'project_completed',
  CERTIFICATION_EARNED = 'certification_earned'
}

export enum AssessmentType {
  QUIZ = 'quiz',
  PROJECT = 'project',
  PRACTICAL = 'practical',
  PEER_REVIEW = 'peer_review',
  SELF_ASSESSMENT = 'self_assessment'
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  CODE = 'code',
  PRACTICAL = 'practical'
}

// Document interfaces for MongoDB
export interface ILearningPathDocument extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  domainId: Types.ObjectId;
  title: string;
  description: string;
  estimatedDuration: number;
  difficulty: DifficultyLevel;
  modules: ILearningModule[];
  progress: ILearningProgress;
  personalization: IPersonalizationSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  updateProgress(moduleId: string, weeklyTargetId?: string): Promise<ILearningPathDocument>;
  canStartModule(moduleId: string): { canStart: boolean; reason?: string };
}

// Model interface for static methods
export interface ILearningPathModel extends Model<ILearningPathDocument> {
  findByUser(userId: string): Promise<ILearningPathDocument[]>;
  findByDomain(domainId: string): Promise<ILearningPathDocument[]>;
}

// API interfaces
export interface ICreateLearningPath {
  userId: string;
  domainId: string;
  personalization?: Partial<IPersonalizationSettings>;
  customizations?: IPathCustomization;
}

export interface IPathCustomization {
  excludeModules?: string[];
  prioritizeSkills?: string[];
  timeConstraints?: {
    totalWeeks: number;
    hoursPerWeek: number;
  };
  focusAreas?: string[];
}

export interface IUpdateLearningPath {
  title?: string;
  description?: string;
  personalization?: Partial<IPersonalizationSettings>;
  isActive?: boolean;
}

export interface ILearningPathResponse {
  success: boolean;
  data: {
    learningPath: ILearningPath;
    recommendations?: IPathRecommendation[];
  };
  message?: string;
}

export interface IPathRecommendation {
  type: RecommendationType;
  title: string;
  description: string;
  action: string;
  priority: TaskPriority;
  resourceId?: string;
  moduleId?: string;
}

export enum RecommendationType {
  ADDITIONAL_RESOURCE = 'additional_resource',
  SKILL_REINFORCEMENT = 'skill_reinforcement',
  PACE_ADJUSTMENT = 'pace_adjustment',
  DIFFICULTY_ADJUSTMENT = 'difficulty_adjustment',
  SCHEDULE_OPTIMIZATION = 'schedule_optimization'
}

// Progress tracking interfaces
export interface IProgressUpdate {
  moduleId?: string;
  weeklyTargetId?: string;
  taskId?: string;
  completed: boolean;
  hoursSpent?: number;
  notes?: string;
  skillsAcquired?: string[];
}

export interface IProgressAnalytics {
  userId: string;
  pathId: string;
  overallProgress: number;
  weeklyProgress: IWeeklyProgress[];
  skillProgress: ISkillProgress[];
  timeAnalytics: ITimeAnalytics;
  performanceMetrics: IPerformanceMetrics;
  recommendations: IPathRecommendation[];
}

export interface IWeeklyProgress {
  week: number;
  targetsCompleted: number;
  totalTargets: number;
  hoursSpent: number;
  plannedHours: number;
  efficiency: number; // hoursSpent / plannedHours
  skillsAcquired: string[];
}

export interface ISkillProgress {
  skill: string;
  currentLevel: number; // 1-10 scale
  targetLevel: number;
  progress: number; // 0-100 percentage
  modulesContributing: string[];
  lastPracticed: Date;
}

export interface ITimeAnalytics {
  totalHoursSpent: number;
  averageWeeklyHours: number;
  mostProductiveTimeSlot: TimeSlot;
  mostProductiveDay: WeekDay;
  learningVelocity: number; // hours per skill point gained
  timeDistribution: Record<ResourceType, number>;
}

export interface IPerformanceMetrics {
  completionRate: number; // 0-100 percentage
  onTimeCompletion: number; // percentage of targets completed on time
  qualityScore: number; // based on assessment scores
  engagementScore: number; // based on activity patterns
  retentionScore: number; // based on skill retention assessments
  streakDays: number;
  milestoneCount: number;
}

// Search and filtering interfaces
export interface ILearningPathQuery {
  userId?: string;
  domainId?: string;
  difficulty?: DifficultyLevel;
  isActive?: boolean;
  minDuration?: number;
  maxDuration?: number;
  skills?: string[];
  sortBy?: PathSortBy;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export enum PathSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  PROGRESS = 'progress',
  DURATION = 'duration',
  DIFFICULTY = 'difficulty',
  TITLE = 'title'
}

// Validation interfaces
export interface IPathValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface IPrerequisiteValidation {
  moduleId: string;
  canStart: boolean;
  missingPrerequisites: string[];
  recommendedOrder: string[];
}