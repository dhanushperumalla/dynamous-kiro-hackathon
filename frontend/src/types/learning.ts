// Learning roadmap and progress tracking types
export interface LearningModule {
  id: string;
  title: string;
  description: string;
  type?: 'video' | 'article' | 'exercise' | 'project' | 'quiz' | 'external';
  order: number;
  prerequisites: string[];
  estimatedHours: number;
  duration?: number; // in minutes (for compatibility)
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  weeklyTargets: WeeklyTarget[];
  resources: LearningResource[];
  skills: string[];
  assessments?: any[];
  isOptional: boolean;
  completionCriteria?: {
    requiredTasks: number;
    requiredHours: number;
    requiredAssessments: any[];
    requiredSkillLevel: number;
    customCriteria?: string[];
  };
  isCompleted?: boolean;
  completedAt?: string;
  progress?: number; // 0-100
}

export interface LearningResource {
  id: string;
  title: string;
  type: 'video' | 'article' | 'book' | 'course' | 'tool' | 'documentation';
  url: string;
  description?: string;
  duration?: number;
  isFree: boolean;
  rating?: number;
  provider?: string;
}

export interface WeeklyTarget {
  id: string;
  moduleId?: string;
  week?: number;
  weekNumber?: number; // For compatibility
  title: string;
  description: string;
  tasks?: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    estimatedMinutes?: number;
    isRequired: boolean;
    completed: boolean;
    completedAt?: Date;
    notes?: string;
    resources: string[];
  }>;
  modules?: string[]; // Module IDs (for compatibility)
  estimatedHours: number;
  dueDate?: string;
  deadline?: string; // For compatibility
  priority?: string;
  skills?: string[];
  resources?: string[];
  completed: boolean;
  isCompleted?: boolean; // For compatibility
  completedAt?: string | Date;
  completionNotes?: string;
  actualHours?: number;
  progress?: number; // 0-100
  milestones?: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  type: 'skill' | 'project' | 'certification' | 'assessment';
  isCompleted: boolean;
  completedAt?: string;
  evidence?: string; // URL to project, certificate, etc.
}

export interface LearningRoadmap {
  id: string;
  userId: string;
  domainId: string;
  domain?: {
    _id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
  };
  domainName?: string;
  title: string;
  description: string;
  totalDuration?: number; // in weeks
  estimatedDuration?: number; // in weeks (backend field name)
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  modules?: LearningModule[]; // Added modules array
  weeklyTargets?: WeeklyTarget[];
  totalModules?: number;
  completedModules?: number;
  progress?: {
    completedModules: string[];
    currentModule: string;
    overallProgress: number;
    weeklyTargetsMet: number;
    totalWeeklyTargets: number;
    totalHoursSpent: number;
    averageWeeklyHours: number;
    streakWeeks: number;
    lastActivityDate: Date;
    milestones: any[];
    skillsAcquired: string[];
    certificationsEarned: string[];
  };
  personalization?: any;
  startedAt?: string;
  estimatedCompletionDate?: string;
  actualCompletionDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LearningProgress {
  userId: string;
  roadmapId: string;
  currentWeek: number;
  totalWeeks: number;
  completedModules: number;
  totalModules: number;
  hoursSpent: number;
  estimatedHoursRemaining: number;
  streakDays: number;
  lastActivityAt: string;
  weeklyStats: WeeklyStats[];
}

export interface WeeklyStats {
  weekNumber: number;
  hoursSpent: number;
  modulesCompleted: number;
  targetProgress: number;
  actualProgress: number;
  isOnTrack: boolean;
}

export interface StudySession {
  id: string;
  userId: string;
  roadmapId: string;
  moduleId: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  type: 'study' | 'practice' | 'review';
  notes?: string;
  rating?: number; // 1-5 how helpful was the session
}

export interface LearningPreferences {
  preferredLearningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  dailyStudyHours: number;
  preferredStudyTimes: string[]; // e.g., ['morning', 'evening']
  reminderSettings: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'custom';
    time: string; // HH:MM format
    methods: ('email' | 'push' | 'sms')[];
  };
  difficultyPreference: 'gradual' | 'challenging';
  focusAreas: string[]; // Specific skills to emphasize
}