import { AuthTokens } from '@/types/auth';

// Local storage keys
const ACCESS_TOKEN_KEY = 'ai-sikshak-access-token';
const REFRESH_TOKEN_KEY = 'ai-sikshak-refresh-token';
const USER_KEY = 'ai-sikshak-user';

// Token storage utilities
export const storeTokens = (tokens: AuthTokens): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const getStoredTokens = (): AuthTokens | null => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresIn: 0, // Will be set by the API response
  };
};

export const clearStoredTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// JWT token utilities
export const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const currentTime = Date.now() / 1000;
  return decoded.exp < currentTime;
};

export const getTokenExpirationTime = (token: string): Date | null => {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return null;
  }

  return new Date(decoded.exp * 1000);
};

export const getTokenTimeRemaining = (token: string): number => {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) {
    return 0;
  }

  const currentTime = new Date().getTime();
  const timeRemaining = expirationTime.getTime() - currentTime;
  
  return Math.max(0, timeRemaining);
};

// Password validation utilities
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const getPasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
} => {
  let score = 0;

  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

  // Common patterns penalty
  if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters
  if (/123|abc|qwe/i.test(password)) score -= 1; // Sequential patterns

  score = Math.max(0, Math.min(5, score));

  const strengthMap = {
    0: { label: 'Very Weak', color: '#ef4444' },
    1: { label: 'Weak', color: '#f97316' },
    2: { label: 'Fair', color: '#eab308' },
    3: { label: 'Good', color: '#22c55e' },
    4: { label: 'Strong', color: '#16a34a' },
    5: { label: 'Very Strong', color: '#15803d' },
  };

  return {
    score,
    ...strengthMap[score as keyof typeof strengthMap],
  };
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Form validation utilities
export const validateLoginForm = (email: string, password: string): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateRegisterForm = (
  email: string,
  password: string,
  confirmPassword: string,
  firstName: string,
  lastName: string,
  acceptedTerms: boolean
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  if (!email) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (!firstName) {
    errors.firstName = 'First name is required';
  } else if (firstName.length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  }

  if (!lastName) {
    errors.lastName = 'Last name is required';
  } else if (lastName.length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  }

  if (!acceptedTerms) {
    errors.acceptedTerms = 'You must accept the terms and conditions';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Route protection utilities
export const getRedirectPath = (userRole: string, intendedPath?: string): string => {
  // Default redirect paths based on role
  const defaultPaths = {
    student: '/dashboard',
    mentor: '/mentor-dashboard',
    admin: '/admin-dashboard',
  };

  // If there's an intended path and it's allowed for the user, use it
  if (intendedPath && intendedPath !== '/login' && intendedPath !== '/register') {
    return intendedPath;
  }

  // Otherwise, use the default path for the user's role
  return defaultPaths[userRole as keyof typeof defaultPaths] || '/dashboard';
};

// OAuth utilities
export const generateOAuthState = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const storeOAuthState = (state: string): void => {
  sessionStorage.setItem('oauth-state', state);
};

export const getStoredOAuthState = (): string | null => {
  return sessionStorage.getItem('oauth-state');
};

export const clearOAuthState = (): void => {
  sessionStorage.removeItem('oauth-state');
};

// Session management
export const isSessionActive = (): boolean => {
  const tokens = getStoredTokens();
  if (!tokens) return false;

  return !isTokenExpired(tokens.accessToken);
};

export const getSessionTimeRemaining = (): number => {
  const tokens = getStoredTokens();
  if (!tokens) return 0;

  return getTokenTimeRemaining(tokens.accessToken);
};

// Error handling utilities
export const getAuthErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  if (error?.message) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};