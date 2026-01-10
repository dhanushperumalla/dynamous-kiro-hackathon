import Joi from 'joi';

// Password validation schema
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password cannot exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    'any.required': 'Password is required'
  });

// Email validation schema
const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .lowercase()
  .trim()
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  });

// Name validation schema
const nameSchema = Joi.string()
  .min(2)
  .max(50)
  .pattern(/^[a-zA-Z\s'-]+$/)
  .trim()
  .required()
  .messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name cannot exceed 50 characters',
    'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
    'any.required': 'Name is required'
  });

// User registration validation schema
export const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required'
    }),
  firstName: nameSchema.messages({
    'any.required': 'First name is required'
  }),
  lastName: nameSchema.messages({
    'any.required': 'Last name is required'
  }),
  currentStatus: Joi.string()
    .valid('student', 'graduate', 'employed', 'unemployed', 'career_changer')
    .required()
    .messages({
      'any.only': 'Current status must be one of: student, graduate, employed, unemployed, career_changer',
      'any.required': 'Current status is required'
    }),
  acceptedTerms: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'You must accept the terms and conditions',
      'any.required': 'Terms acceptance is required'
    }),
  marketingConsent: Joi.boolean().optional()
});

// User login validation schema
export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    }),
  rememberMe: Joi.boolean().optional()
});

// Password change validation schema
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: passwordSchema.messages({
    'any.required': 'New password is required'
  }),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match',
      'any.required': 'New password confirmation is required'
    })
});

// Password reset request validation schema
export const passwordResetRequestSchema = Joi.object({
  email: emailSchema
});

// Password reset confirmation validation schema
export const passwordResetConfirmSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),
  newPassword: passwordSchema.messages({
    'any.required': 'New password is required'
  }),
  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'New passwords do not match',
      'any.required': 'New password confirmation is required'
    })
});

// Email verification validation schema
export const emailVerificationSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Verification token is required'
    })
});

// Resend email verification validation schema
export const resendVerificationSchema = Joi.object({
  email: emailSchema
});

// Token refresh validation schema
export const tokenRefreshSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

// User profile update validation schema
export const updateProfileSchema = Joi.object({
  profile: Joi.object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    dateOfBirth: Joi.date()
      .max('now')
      .min('1900-01-01')
      .optional()
      .messages({
        'date.max': 'Date of birth cannot be in the future',
        'date.min': 'Date of birth must be after 1900'
      }),
    location: Joi.string()
      .max(100)
      .trim()
      .optional()
      .messages({
        'string.max': 'Location cannot exceed 100 characters'
      }),
    educationLevel: Joi.string()
      .valid('high_school', 'bachelor', 'master', 'phd', 'other')
      .optional()
      .messages({
        'any.only': 'Education level must be one of: high_school, bachelor, master, phd, other'
      }),
    currentStatus: Joi.string()
      .valid('student', 'graduate', 'employed', 'unemployed', 'career_changer')
      .optional()
      .messages({
        'any.only': 'Current status must be one of: student, graduate, employed, unemployed, career_changer'
      }),
    bio: Joi.string()
      .max(500)
      .trim()
      .optional()
      .messages({
        'string.max': 'Bio cannot exceed 500 characters'
      }),
    avatar: Joi.string()
      .uri()
      .optional()
      .messages({
        'string.uri': 'Avatar must be a valid URL'
      }),
    phoneNumber: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number'
      }),
    linkedinProfile: Joi.string()
      .uri()
      .pattern(/linkedin\.com/)
      .optional()
      .messages({
        'string.uri': 'LinkedIn profile must be a valid URL',
        'string.pattern.base': 'LinkedIn profile must be a valid LinkedIn URL'
      }),
    githubProfile: Joi.string()
      .uri()
      .pattern(/github\.com/)
      .optional()
      .messages({
        'string.uri': 'GitHub profile must be a valid URL',
        'string.pattern.base': 'GitHub profile must be a valid GitHub URL'
      })
  }).optional(),
  preferences: Joi.object({
    notificationFrequency: Joi.string()
      .valid('daily', 'weekly', 'minimal', 'none')
      .optional()
      .messages({
        'any.only': 'Notification frequency must be one of: daily, weekly, minimal, none'
      }),
    learningPace: Joi.string()
      .valid('slow', 'moderate', 'fast')
      .optional()
      .messages({
        'any.only': 'Learning pace must be one of: slow, moderate, fast'
      }),
    careerGoals: Joi.array()
      .items(Joi.string().max(100).trim())
      .max(10)
      .optional()
      .messages({
        'array.max': 'You can have a maximum of 10 career goals',
        'string.max': 'Each career goal cannot exceed 100 characters'
      }),
    preferredLearningStyle: Joi.string()
      .valid('visual', 'auditory', 'kinesthetic', 'reading', 'mixed')
      .optional()
      .messages({
        'any.only': 'Learning style must be one of: visual, auditory, kinesthetic, reading, mixed'
      }),
    timeZone: Joi.string()
      .optional(),
    language: Joi.string()
      .pattern(/^[a-z]{2}(-[A-Z]{2})?$/)
      .optional()
      .messages({
        'string.pattern.base': 'Language must be in ISO 639-1 format (e.g., en, en-US)'
      }),
    emailNotifications: Joi.object({
      weeklyProgress: Joi.boolean().optional(),
      milestoneAchievements: Joi.boolean().optional(),
      jobRecommendations: Joi.boolean().optional(),
      learningReminders: Joi.boolean().optional(),
      systemUpdates: Joi.boolean().optional()
    }).optional(),
    pushNotifications: Joi.object({
      dailyReminders: Joi.boolean().optional(),
      weeklyTargets: Joi.boolean().optional(),
      achievements: Joi.boolean().optional(),
      jobMatches: Joi.boolean().optional()
    }).optional()
  }).optional()
});

// OAuth login validation schema
export const oauthLoginSchema = Joi.object({
  provider: Joi.string()
    .valid('google', 'linkedin', 'facebook')
    .required()
    .messages({
      'any.only': 'Provider must be one of: google, linkedin, facebook',
      'any.required': 'OAuth provider is required'
    }),
  accessToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Access token is required'
    }),
  profile: Joi.object({
    id: Joi.string().required(),
    email: emailSchema,
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    avatar: Joi.string().uri().optional()
  }).optional()
});

// Pagination validation schema
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'email', 'firstName', 'lastName', 'lastLoginAt')
    .default('createdAt')
    .optional(),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional()
});

// User filter validation schema
export const userFilterSchema = Joi.object({
  role: Joi.string()
    .valid('user', 'admin', 'mentor', 'moderator')
    .optional(),
  isActive: Joi.boolean().optional(),
  emailVerified: Joi.boolean().optional(),
  currentStatus: Joi.string()
    .valid('student', 'graduate', 'employed', 'unemployed', 'career_changer')
    .optional(),
  educationLevel: Joi.string()
    .valid('high_school', 'bachelor', 'master', 'phd', 'other')
    .optional(),
  location: Joi.string().optional(),
  createdAfter: Joi.date().optional(),
  createdBefore: Joi.date().optional(),
  lastActiveAfter: Joi.date().optional(),
  lastActiveBefore: Joi.date().optional()
});

// Custom validation functions
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password cannot exceed 128 characters');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

export const validateObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Assessment validation schemas
export const assessmentValidationSchemas = {
  // Question response validation
  questionResponse: Joi.object({
    questionId: Joi.string()
      .required()
      .messages({
        'any.required': 'Question ID is required'
      }),
    answer: Joi.alternatives()
      .try(
        Joi.string().max(1000),
        Joi.number(),
        Joi.boolean(),
        Joi.array().items(Joi.string().max(200))
      )
      .required()
      .messages({
        'any.required': 'Answer is required',
        'string.max': 'Text answer cannot exceed 1000 characters',
        'array.max': 'Array answers cannot have more than 10 items'
      }),
    responseTime: Joi.number()
      .integer()
      .min(0)
      .max(300000)
      .required()
      .messages({
        'number.min': 'Response time cannot be negative',
        'number.max': 'Response time cannot exceed 5 minutes',
        'any.required': 'Response time is required'
      }),
    confidence: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .optional()
      .messages({
        'number.min': 'Confidence must be at least 1',
        'number.max': 'Confidence cannot exceed 5'
      })
  }),

  // Submit responses validation
  submitResponses: Joi.object({
    responses: Joi.array()
      .items(Joi.object({
        questionId: Joi.string().required(),
        answer: Joi.alternatives().try(
          Joi.string().max(1000),
          Joi.number(),
          Joi.boolean(),
          Joi.array().items(Joi.string().max(200))
        ).required(),
        responseTime: Joi.number().integer().min(0).max(300000).required(),
        confidence: Joi.number().integer().min(1).max(5).optional()
      }))
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one response is required',
        'array.max': 'Cannot submit more than 100 responses at once',
        'any.required': 'Responses array is required'
      }),
    isPartial: Joi.boolean()
      .optional()
      .default(false)
  }),

  // Retake assessment validation
  retakeAssessment: Joi.object({
    reason: Joi.string()
      .max(500)
      .optional()
      .messages({
        'string.max': 'Reason cannot exceed 500 characters'
      }),
    keepPreviousData: Joi.boolean()
      .optional()
      .default(false)
  }),

  // Assessment creation validation
  createAssessment: Joi.object({
    userId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'User ID must be a valid ObjectId',
        'any.required': 'User ID is required'
      }),
    version: Joi.string()
      .pattern(/^\d+\.\d+\.\d+$/)
      .optional()
      .messages({
        'string.pattern.base': 'Version must follow semantic versioning (e.g., 1.0.0)'
      })
  })
};

// Recommendation validation schemas
export const recommendationValidationSchemas = {
  // Generate recommendations validation
  generateRecommendations: Joi.object({
    algorithm: Joi.string()
      .valid('collaborative_filtering', 'content_based', 'hybrid', 'market_weighted')
      .optional()
      .default('hybrid')
      .messages({
        'any.only': 'Algorithm must be one of: collaborative_filtering, content_based, hybrid, market_weighted'
      }),
    maxRecommendations: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .optional()
      .default(5)
      .messages({
        'number.min': 'Maximum recommendations must be at least 1',
        'number.max': 'Maximum recommendations cannot exceed 10'
      }),
    includeMarketData: Joi.boolean()
      .optional()
      .default(true),
    filterByCategory: Joi.array()
      .items(Joi.string().valid(
        'technology', 'business', 'creative', 'healthcare', 'education',
        'finance', 'marketing', 'design', 'engineering', 'research',
        'consulting', 'entrepreneurship'
      ))
      .optional()
      .messages({
        'array.includes': 'Invalid category in filter'
      })
  }),

  // Get recommendations validation
  getRecommendations: Joi.object({
    includeInactive: Joi.boolean()
      .optional()
      .default(false)
  }),

  // Submit feedback validation
  submitFeedback: Joi.object({
    recommendationId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Recommendation ID must be a valid ObjectId',
        'any.required': 'Recommendation ID is required'
      }),
    domainId: Joi.string()
      .required()
      .messages({
        'any.required': 'Domain ID is required'
      }),
    rating: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.min': 'Rating must be at least 1',
        'number.max': 'Rating cannot exceed 5',
        'any.required': 'Rating is required'
      }),
    feedback: Joi.string()
      .valid(
        'very_relevant', 'relevant', 'somewhat_relevant', 'not_relevant',
        'already_pursuing', 'not_interested'
      )
      .required()
      .messages({
        'any.only': 'Feedback must be one of: very_relevant, relevant, somewhat_relevant, not_relevant, already_pursuing, not_interested',
        'any.required': 'Feedback is required'
      }),
    comments: Joi.string()
      .max(1000)
      .trim()
      .optional()
      .messages({
        'string.max': 'Comments cannot exceed 1000 characters'
      }),
    selectedDomain: Joi.string()
      .optional(),
    rejectionReason: Joi.string()
      .max(500)
      .trim()
      .optional()
      .messages({
        'string.max': 'Rejection reason cannot exceed 500 characters'
      })
  }),

  // Get all domains validation
  getAllDomains: Joi.object({
    category: Joi.string()
      .valid(
        'technology', 'business', 'creative', 'healthcare', 'education',
        'finance', 'marketing', 'design', 'engineering', 'research',
        'consulting', 'entrepreneurship'
      )
      .optional(),
    difficulty: Joi.string()
      .valid('beginner', 'intermediate', 'advanced', 'expert')
      .optional(),
    search: Joi.string()
      .max(100)
      .trim()
      .optional()
      .messages({
        'string.max': 'Search query cannot exceed 100 characters'
      }),
    tags: Joi.alternatives()
      .try(
        Joi.string(),
        Joi.array().items(Joi.string().max(50))
      )
      .optional(),
    minSalary: Joi.number()
      .integer()
      .min(0)
      .optional()
      .messages({
        'number.min': 'Minimum salary cannot be negative'
      }),
    maxSalary: Joi.number()
      .integer()
      .min(0)
      .optional()
      .messages({
        'number.min': 'Maximum salary cannot be negative'
      }),
    sortBy: Joi.string()
      .valid('name', 'demandScore', 'salary', 'growthRate', 'difficulty', 'timeToMastery', 'createdAt')
      .optional()
      .default('name'),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .optional()
      .default('asc'),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .messages({
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    offset: Joi.number()
      .integer()
      .min(0)
      .optional()
      .default(0)
      .messages({
        'number.min': 'Offset cannot be negative'
      })
  }),

  // Get domain details validation
  getDomainDetails: Joi.object({
    includeRelated: Joi.boolean()
      .optional()
      .default(true),
    includeSkillGap: Joi.boolean()
      .optional()
      .default(false)
  })
};