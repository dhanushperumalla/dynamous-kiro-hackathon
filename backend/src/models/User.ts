import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { IUser, IUserProfile, IUserPreferences, IUserSecurity, IUserOAuth, IUserStats } from '@/types/user';
import { jwtManager } from '@/config/jwt';
import { logger } from '@/utils/logger';

// User Profile Schema
const userProfileSchema = new Schema<IUserProfile>({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value: Date) {
        if (!value) return true; // Optional field
        const today = new Date();
        const age = today.getFullYear() - value.getFullYear();
        return age >= 13 && age <= 100; // Reasonable age range
      },
      message: 'Age must be between 13 and 100 years'
    }
  },
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  educationLevel: {
    type: String,
    enum: {
      values: ['high_school', 'bachelor', 'master', 'phd', 'other'],
      message: 'Invalid education level'
    }
  },
  currentStatus: {
    type: String,
    required: [true, 'Current status is required'],
    enum: {
      values: ['student', 'graduate', 'employed', 'unemployed', 'career_changer'],
      message: 'Invalid current status'
    }
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  avatar: {
    type: String,
    validate: {
      validator: function(value: string) {
        if (!value) return true; // Optional field
        return validator.isURL(value);
      },
      message: 'Avatar must be a valid URL'
    }
  },
  phoneNumber: {
    type: String,
    validate: {
      validator: function(value: string) {
        if (!value) return true; // Optional field
        return validator.isMobilePhone(value);
      },
      message: 'Invalid phone number format'
    }
  },
  linkedinProfile: {
    type: String,
    validate: {
      validator: function(value: string) {
        if (!value) return true; // Optional field
        return validator.isURL(value) && value.includes('linkedin.com');
      },
      message: 'Invalid LinkedIn profile URL'
    }
  },
  githubProfile: {
    type: String,
    validate: {
      validator: function(value: string) {
        if (!value) return true; // Optional field
        return validator.isURL(value) && value.includes('github.com');
      },
      message: 'Invalid GitHub profile URL'
    }
  }
}, { _id: false });

// User Preferences Schema
const userPreferencesSchema = new Schema<IUserPreferences>({
  notificationFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'minimal', 'none'],
    default: 'weekly'
  },
  learningPace: {
    type: String,
    enum: ['slow', 'moderate', 'fast'],
    default: 'moderate'
  },
  careerGoals: [{
    type: String,
    trim: true,
    maxlength: [100, 'Career goal cannot exceed 100 characters']
  }],
  preferredLearningStyle: {
    type: String,
    enum: ['visual', 'auditory', 'kinesthetic', 'reading', 'mixed'],
    default: 'mixed'
  },
  timeZone: {
    type: String,
    default: 'UTC'
  },
  language: {
    type: String,
    default: 'en',
    validate: {
      validator: function(value: string) {
        return /^[a-z]{2}(-[A-Z]{2})?$/.test(value); // ISO 639-1 format
      },
      message: 'Invalid language code format'
    }
  },
  emailNotifications: {
    weeklyProgress: { type: Boolean, default: true },
    milestoneAchievements: { type: Boolean, default: true },
    jobRecommendations: { type: Boolean, default: true },
    learningReminders: { type: Boolean, default: true },
    systemUpdates: { type: Boolean, default: false }
  },
  pushNotifications: {
    dailyReminders: { type: Boolean, default: true },
    weeklyTargets: { type: Boolean, default: true },
    achievements: { type: Boolean, default: true },
    jobMatches: { type: Boolean, default: true }
  }
}, { _id: false });

// User Security Schema
const userSecuritySchema = new Schema<IUserSecurity>({
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  loginAttempts: {
    type: Number,
    default: 0,
    max: 10
  },
  lockUntil: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  refreshTokens: [{
    type: String,
    maxlength: 500
  }]
}, { _id: false });

// User OAuth Schema
const userOAuthSchema = new Schema<IUserOAuth>({
  googleId: String,
  linkedinId: String,
  facebookId: String,
  providers: [{
    type: String,
    enum: ['local', 'google', 'linkedin', 'facebook']
  }]
}, { _id: false });

// User Stats Schema
const userStatsSchema = new Schema<IUserStats>({
  totalLearningHours: {
    type: Number,
    default: 0,
    min: 0
  },
  completedModules: {
    type: Number,
    default: 0,
    min: 0
  },
  achievementsEarned: {
    type: Number,
    default: 0,
    min: 0
  },
  streakDays: {
    type: Number,
    default: 0,
    min: 0
  },
  lastActiveDate: {
    type: Date,
    default: Date.now
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  assessmentCompleted: {
    type: Boolean,
    default: false
  },
  currentLearningPath: {
    type: Schema.Types.ObjectId,
    ref: 'LearningPath'
  },
  skillsAcquired: [{
    type: String,
    trim: true
  }]
}, { _id: false });

// Main User Schema
const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (email: string) => validator.isEmail(email),
      message: 'Invalid email format'
    },
    index: true
  },
  role: {
    type: String,
    enum: ['student', 'admin', 'mentor', 'moderator'],
    default: 'student'
  },
  profile: {
    type: userProfileSchema,
    required: true
  },
  preferences: {
    type: userPreferencesSchema,
    default: () => ({})
  },
  security: {
    type: userSecuritySchema,
    required: true
  },
  oauth: {
    type: userOAuthSchema,
    default: () => ({ providers: ['local'] })
  },
  stats: {
    type: userStatsSchema,
    default: () => ({})
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: Date
}, {
  timestamps: true,
  toJSON: { 
    transform: function(_doc: any, ret: any) {
      ret['id'] = ret['_id'];
      delete ret['_id'];
      delete ret['__v'];
      delete ret['security']['passwordHash'];
      delete ret['security']['emailVerificationToken'];
      delete ret['security']['passwordResetToken'];
      delete ret['security']['twoFactorSecret'];
      delete ret['security']['refreshTokens'];
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'profile.currentStatus': 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'stats.lastActiveDate': -1 });

// Virtual for account lock status
userSchema.virtual('security.isLocked').get(function(this: IUser) {
  return !!(this.security.lockUntil && this.security.lockUntil > new Date());
});

// Pre-save middleware for password hashing
userSchema.pre('save', async function(this: IUser, next) {
  // Only hash password if it's modified and not already hashed
  if (!this.isModified('security.passwordHash')) {
    return next();
  }

  try {
    // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (this.security.passwordHash.match(/^\$2[aby]\$/)) {
      return next();
    }

    const saltRounds = 12;
    this.security.passwordHash = await bcrypt.hash(this.security.passwordHash, saltRounds);
    
    logger.debug('Password hashed for user', { 
      userId: this._id,
      email: this.email 
    });
    
    next();
  } catch (error) {
    logger.error('Error hashing password', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: this._id,
      email: this.email
    });
    next(error as Error);
  }
});

// Instance method to compare password
userSchema.methods['comparePassword'] = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.security.passwordHash);
  } catch (error) {
    logger.error('Error comparing password', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: this._id,
      email: this.email
    });
    return false;
  }
};

// Instance method to generate email verification token
userSchema.methods['generateEmailVerificationToken'] = function(this: IUser): string {
  const token = jwtManager.generateEmailVerificationToken(this._id.toString(), this.email);
  this.security.emailVerificationToken = token;
  this.security.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

// Instance method to generate password reset token
userSchema.methods['generatePasswordResetToken'] = function(this: IUser): string {
  const token = jwtManager.generatePasswordResetToken(this._id.toString(), this.email);
  this.security.passwordResetToken = token;
  this.security.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token;
};

// Instance method to validate email verification token
userSchema.methods['isEmailVerificationTokenValid'] = function(this: IUser, token: string): boolean {
  try {
    const payload = jwtManager.verifyEmailVerificationToken(token);
    return payload.userId === this._id.toString() && 
           payload.email === this.email &&
           this.security.emailVerificationToken === token &&
           (!this.security.emailVerificationExpires || this.security.emailVerificationExpires > new Date());
  } catch (error) {
    return false;
  }
};

// Instance method to validate password reset token
userSchema.methods['isPasswordResetTokenValid'] = function(this: IUser, token: string): boolean {
  try {
    const payload = jwtManager.verifyPasswordResetToken(token);
    return payload.userId === this._id.toString() && 
           payload.email === this.email &&
           this.security.passwordResetToken === token &&
           (!this.security.passwordResetExpires || this.security.passwordResetExpires > new Date());
  } catch (error) {
    return false;
  }
};

// Instance method to increment login attempts
userSchema.methods['incrementLoginAttempts'] = async function(this: IUser): Promise<void> {
  // If we have a previous lock that has expired, restart at 1
  if (this.security.lockUntil && this.security.lockUntil < new Date()) {
    return (this as any).updateOne({
      $unset: { 'security.lockUntil': 1 },
      $set: { 'security.loginAttempts': 1 }
    });
  }

  const updates: any = { $inc: { 'security.loginAttempts': 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.security.loginAttempts + 1 >= 5 && !this.security.lockUntil) {
    updates.$set = { 'security.lockUntil': new Date(Date.now() + 2 * 60 * 60 * 1000) };
  }

  return (this as any).updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods['resetLoginAttempts'] = async function(this: IUser): Promise<void> {
  return (this as any).updateOne({
    $unset: { 
      'security.loginAttempts': 1,
      'security.lockUntil': 1
    }
  });
};

// Instance method to check if account is locked
userSchema.methods['isAccountLocked'] = function(this: IUser): boolean {
  return !!(this.security.lockUntil && this.security.lockUntil > new Date());
};

// Instance method to update last login
userSchema.methods['updateLastLogin'] = async function(this: IUser): Promise<void> {
  this.lastLoginAt = new Date();
  this.stats.lastActiveDate = new Date();
  await (this as any).save();
};

// Instance method to add refresh token
userSchema.methods['addRefreshToken'] = async function(this: IUser, token: string): Promise<void> {
  // Keep only the last 5 refresh tokens per user
  if (this.security.refreshTokens.length >= 5) {
    this.security.refreshTokens.shift();
  }
  this.security.refreshTokens.push(token);
  await (this as any).save();
};

// Instance method to remove refresh token
userSchema.methods['removeRefreshToken'] = async function(this: IUser, token: string): Promise<void> {
  this.security.refreshTokens = this.security.refreshTokens.filter((t: string) => t !== token);
  await (this as any).save();
};

// Instance method to clear all refresh tokens
userSchema.methods['clearAllRefreshTokens'] = async function(this: IUser): Promise<void> {
  this.security.refreshTokens = [];
  await (this as any).save();
};

// Static method to find by email
userSchema.statics['findByEmail'] = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics['findActiveUsers'] = function() {
  return this.find({ isActive: true });
};

// Create and export the model
export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);