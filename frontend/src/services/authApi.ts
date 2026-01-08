import axios, { AxiosResponse } from 'axios';
import {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  ApiResponse,
  AuthTokens,
  AuthUser,
  ProfileUpdate,
} from '@/types/auth';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
let accessToken: string | null = null;
let refreshTokenValue: string | null = null;

export const setTokens = (tokens: AuthTokens) => {
  accessToken = tokens.accessToken;
  refreshTokenValue = tokens.refreshToken;
};

export const clearTokens = () => {
  accessToken = null;
  refreshTokenValue = null;
};

export const getAccessToken = () => accessToken;

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (refreshTokenValue) {
        try {
          const response = await refreshToken(refreshTokenValue);
          const newTokens = response.data.tokens;
          
          setTokens(newTokens);
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API functions
export const login = async (credentials: LoginCredentials): Promise<AxiosResponse<AuthResponse>> => {
  const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
  
  if (response.data.success && response.data.data.tokens) {
    setTokens(response.data.data.tokens);
  }
  
  return response;
};

export const register = async (credentials: RegisterCredentials): Promise<AxiosResponse<AuthResponse>> => {
  // Send all fields including confirmPassword for backend validation
  const response = await apiClient.post<AuthResponse>('/auth/register', credentials);
  
  if (response.data.success && response.data.data.tokens) {
    setTokens(response.data.data.tokens);
  }
  
  return response;
};

export const refreshToken = async (token: string): Promise<AxiosResponse<{ tokens: AuthTokens; user?: AuthUser }>> => {
  const response = await apiClient.post<{ tokens: AuthTokens; user?: AuthUser }>('/auth/refresh', {
    refreshToken: token,
  });
  
  if (response.data.tokens) {
    setTokens(response.data.tokens);
  }
  
  return response;
};

export const logout = async (token: string): Promise<AxiosResponse<ApiResponse>> => {
  const response = await apiClient.post<ApiResponse>('/auth/logout', {
    refreshToken: token,
  });
  
  clearTokens();
  return response;
};

export const verifyEmail = async (token: string): Promise<AxiosResponse<ApiResponse>> => {
  return apiClient.post<ApiResponse>('/auth/verify-email', { token });
};

export const requestPasswordReset = async (email: string): Promise<AxiosResponse<ApiResponse>> => {
  return apiClient.post<ApiResponse>('/auth/forgot-password', { email });
};

export const resetPassword = async (token: string, newPassword: string): Promise<AxiosResponse<ApiResponse>> => {
  return apiClient.post<ApiResponse>('/auth/reset-password', {
    token,
    newPassword,
  });
};

// User profile API functions
export const getProfile = async (): Promise<AxiosResponse<{ user: AuthUser }>> => {
  return apiClient.get<{ user: AuthUser }>('/user/profile');
};

export const updateProfile = async (updates: ProfileUpdate): Promise<AxiosResponse<{ user: AuthUser }>> => {
  return apiClient.put<{ user: AuthUser }>('/user/profile', updates);
};

export const deleteAccount = async (): Promise<AxiosResponse<ApiResponse>> => {
  const response = await apiClient.delete<ApiResponse>('/user/profile');
  clearTokens();
  return response;
};

// OAuth functions
export const getGoogleAuthUrl = (): string => {
  return `${API_BASE_URL}/auth/google`;
};

export const handleOAuthCallback = async (code: string, state?: string): Promise<AxiosResponse<AuthResponse>> => {
  const response = await apiClient.post<AuthResponse>('/auth/google/callback', {
    code,
    state,
  });
  
  if (response.data.success && response.data.data.tokens) {
    setTokens(response.data.data.tokens);
  }
  
  return response;
};

// Utility functions
export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    return true;
  }
};

export const getTokenExpirationTime = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch {
    return null;
  }
};

export default apiClient;