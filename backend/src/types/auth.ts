import { Request } from 'express';
import { JwtPayload } from '@/config/jwt';
import { IUser } from './user';

// Extend Express Request interface to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: IUser;
  token?: string;
  tokenPayload?: JwtPayload;
}

// Authentication response interfaces
export interface IAuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      emailVerified: boolean;
      profileComplete: boolean;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
}

export interface ITokenRefreshResponse {
  success: boolean;
  message: string;
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// Registration request interface
export interface IRegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  currentStatus: 'student' | 'graduate' | 'employed' | 'unemployed' | 'career_changer';
  acceptedTerms: boolean;
  marketingConsent?: boolean;
}

// Login request interface
export interface ILoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// OAuth login request interface
export interface IOAuthLoginRequest {
  provider: 'google' | 'linkedin' | 'facebook';
  accessToken: string;
  profile?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}

// Password change request interface
export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

// Password reset request interface
export interface IPasswordResetRequest {
  email: string;
}

// Password reset confirmation interface
export interface IPasswordResetConfirmRequest {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}

// Email verification request interface
export interface IEmailVerificationRequest {
  token: string;
}

// Resend email verification interface
export interface IResendVerificationRequest {
  email: string;
}

// Token refresh request interface
export interface ITokenRefreshRequest {
  refreshToken: string;
}

// Logout request interface
export interface ILogoutRequest {
  refreshToken?: string;
  logoutFromAllDevices?: boolean;
}

// Authentication error types
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  OAUTH_ERROR = 'OAUTH_ERROR',
  TERMS_NOT_ACCEPTED = 'TERMS_NOT_ACCEPTED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED'
}

// Authentication error interface
export interface IAuthError {
  type: AuthErrorType;
  message: string;
  details?: Record<string, any>;
  statusCode: number;
}

// Session information interface
export interface ISessionInfo {
  userId: string;
  email: string;
  role: string;
  loginTime: Date;
  lastActivity: Date;
  ipAddress: string;
  userAgent: string;
  deviceInfo?: {
    browser: string;
    os: string;
    device: string;
  };
}

// Rate limiting interface
export interface IRateLimitInfo {
  windowMs: number;
  maxRequests: number;
  currentRequests: number;
  resetTime: Date;
  blocked: boolean;
}

// Security event types
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  OAUTH_LOGIN = 'OAUTH_LOGIN',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

// Security event interface
export interface ISecurityEvent {
  type: SecurityEventType;
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  details?: Record<string, any>;
  riskScore?: number;
}

// Authentication middleware options
export interface IAuthMiddlewareOptions {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
  skipEmailVerification?: boolean;
  allowInactive?: boolean;
}

// JWT token validation result
export interface ITokenValidationResult {
  valid: boolean;
  payload?: JwtPayload;
  error?: string;
  expired?: boolean;
}

// OAuth provider configuration
export interface IOAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  enabled: boolean;
}

// OAuth providers configuration
export interface IOAuthConfig {
  google: IOAuthProviderConfig;
  linkedin: IOAuthProviderConfig;
  facebook: IOAuthProviderConfig;
}

// Authentication service configuration
export interface IAuthConfig {
  jwt: {
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    emailVerificationExpiry: string;
    passwordResetExpiry: string;
  };
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    saltRounds: number;
  };
  security: {
    maxLoginAttempts: number;
    lockoutDuration: number;
    sessionTimeout: number;
    requireEmailVerification: boolean;
    enableTwoFactor: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  oauth: IOAuthConfig;
}