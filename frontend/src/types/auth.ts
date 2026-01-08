// Authentication types for frontend
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  currentStatus: 'student' | 'graduate' | 'employed' | 'unemployed' | 'career_changer';
  acceptedTerms: boolean;
  marketingConsent?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'admin' | 'mentor' | 'moderator';
  isEmailVerified: boolean;
  profilePicture?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: AuthUser;
    tokens: AuthTokens;
  };
  message: string;
}

export interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface EmailVerification {
  token: string;
}

export interface ProfileUpdate {
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  preferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyDigest: boolean;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError['error'];
}

// Form validation types
export interface FormErrors {
  [key: string]: string | undefined;
}

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  currentStatus: 'student' | 'graduate' | 'employed' | 'unemployed' | 'career_changer';
  acceptedTerms: boolean;
  marketingConsent?: boolean;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
  preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyDigest: boolean;
  };
}

// OAuth types
export interface OAuthProvider {
  name: 'google' | 'github' | 'linkedin';
  displayName: string;
  icon: string;
  authUrl: string;
}

export interface OAuthResponse {
  success: boolean;
  data: {
    user: AuthUser;
    tokens: AuthTokens;
    isNewUser: boolean;
  };
  message: string;
}