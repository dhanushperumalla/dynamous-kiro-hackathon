import { Document, Types } from 'mongoose';

export interface IUserProfile {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  location?: string;
  educationLevel?: 'high_school' | 'bachelor' | 'master' | 'phd' | 'other';
  currentStatus: 'student' | 'graduate' | 'employed' | 'unemployed' | 'career_changer';
  bio?: string;
  avatar?: string;
  phoneNumber?: string;
  linkedinProfile?: string;
  githubProfile?: string;
}

export interface IUserPreferences {
  notificationFrequency: 'daily' | 'weekly' | 'minimal' | 'none';
  learningPace: 'slow' | 'moderate' | 'fast';
  careerGoals: string[];
  preferredLearningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading' | 'mixed';
  timeZone?: string;
  language: string;
  deviceTokens?: string[]; // FCM device tokens for push notifications
  emailNotifications: {
    weeklyProgress: boolean;
    milestoneAchievements: boolean;
    jobRecommendations: boolean;
    learningReminders: boolean;
    systemUpdates: boolean;
  };
  pushNotifications: {
    dailyReminders: boolean;
    weeklyTargets: boolean;
    achievements: boolean;
    jobMatches: boolean;
  };
}

export interface IUserSecurity {
  passwordHash: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastPasswordChange: Date;
  loginAttempts: number;
  lockUntil?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  refreshTokens: string[];
}

export interface IUserOAuth {
  googleId?: string;
  linkedinId?: string;
  facebookId?: string;
  providers: ('local' | 'google' | 'linkedin' | 'facebook')[];
}

export interface IUserStats {
  totalLearningHours: number;
  completedModules: number;
  achievementsEarned: number;
  streakDays: number;
  lastActiveDate: Date;
  joinDate: Date;
  assessmentCompleted: boolean;
  currentLearningPath?: Types.ObjectId;
  skillsAcquired: string[];
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  role: 'student' | 'admin' | 'mentor' | 'moderator';
  profile: IUserProfile;
  preferences: IUserPreferences;
  security: IUserSecurity;
  oauth: IUserOAuth;
  stats: IUserStats;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;

  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
  isEmailVerificationTokenValid(token: string): boolean;
  isPasswordResetTokenValid(token: string): boolean;
  incrementLoginAttempts(): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  isAccountLocked(): boolean;
  updateLastLogin(): Promise<void>;
  addRefreshToken(token: string): Promise<void>;
  removeRefreshToken(token: string): Promise<void>;
  clearAllRefreshTokens(): Promise<void>;
  toJSON(): Partial<IUser>;
}

// User creation interface (for registration)
export interface ICreateUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  currentStatus: IUserProfile['currentStatus'];
  acceptedTerms: boolean;
}

// User update interface (for profile updates)
export interface IUpdateUser {
  profile?: Partial<IUserProfile>;
  preferences?: Partial<IUserPreferences>;
}

// User response interface (for API responses)
export interface IUserResponse {
  id: string;
  email: string;
  role: string;
  profile: IUserProfile;
  preferences: IUserPreferences;
  stats: IUserStats;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt?: Date;
}

// User login interface
export interface IUserLogin {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Password reset interfaces
export interface IPasswordResetRequest {
  email: string;
}

export interface IPasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

// Email verification interface
export interface IEmailVerification {
  token: string;
}

// User search/filter interface
export interface IUserFilter {
  role?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  currentStatus?: string;
  educationLevel?: string;
  location?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  lastActiveAfter?: Date;
  lastActiveBefore?: Date;
}

// Pagination interface
export interface IPagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// User list response interface
export interface IUserListResponse {
  users: IUserResponse[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalUsers: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}