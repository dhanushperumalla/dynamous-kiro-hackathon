import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshToken,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  clearError,
  updateUser,
} from '@/store/slices/authSlice';
import { setTokens, clearTokens, isTokenExpired } from '@/services/authApi';
import {
  LoginCredentials,
  RegisterCredentials,
  ProfileUpdate,
} from '@/types/auth';
import * as authApi from '@/services/authApi';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, tokens, isAuthenticated, isLoading, error } = useAppSelector(
    (state) => state.auth
  );

  // Initialize tokens on mount and when they change
  useEffect(() => {
    console.log('useAuth: Tokens changed:', tokens ? 'present' : 'null');
    if (tokens) {
      console.log('useAuth: Setting tokens in authApi service');
      setTokens(tokens);
    } else {
      console.log('useAuth: Clearing tokens from authApi service');
      clearTokens();
    }
  }, [tokens]);

  // Initialize user profile on app rehydration
  useEffect(() => {
    // If we have tokens but no user (likely app rehydration), get user profile
    if (tokens?.accessToken && !user && !isLoading && !isTokenExpired(tokens.accessToken)) {
      console.log('useAuth: App rehydration detected, fetching user profile');
      refreshUserProfile();
    }
  }, [tokens?.accessToken, user, isLoading]);

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (!tokens?.accessToken || !isAuthenticated) return;

    const checkTokenExpiration = () => {
      if (isTokenExpired(tokens.accessToken)) {
        dispatch(refreshToken());
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Check every 5 minutes
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [tokens?.accessToken, isAuthenticated, dispatch]);

  // Authentication methods
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const result = await dispatch(loginUser(credentials));
      return result;
    },
    [dispatch]
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      const result = await dispatch(registerUser(credentials));
      return result;
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await dispatch(logoutUser());
    clearTokens();
  }, [dispatch]);

  const verifyUserEmail = useCallback(
    async (token: string) => {
      const result = await dispatch(verifyEmail(token));
      return result;
    },
    [dispatch]
  );

  const requestPasswordResetEmail = useCallback(
    async (email: string) => {
      const result = await dispatch(requestPasswordReset(email));
      return result;
    },
    [dispatch]
  );

  const resetUserPassword = useCallback(
    async (token: string, newPassword: string) => {
      const result = await dispatch(resetPassword({ token, newPassword }));
      return result;
    },
    [dispatch]
  );

  const updateProfile = useCallback(
    async (updates: ProfileUpdate) => {
      try {
        const response = await authApi.updateProfile(updates);
        dispatch(updateUser(response.data.user));
        return { success: true, data: response.data.user };
      } catch (error: any) {
        return {
          success: false,
          error: error.response?.data?.error?.message || 'Profile update failed',
        };
      }
    },
    [dispatch]
  );

  const refreshUserProfile = useCallback(async () => {
    try {
      const response = await authApi.getProfile();
      dispatch(updateUser(response.data.user));
      return { success: true, data: response.data.user };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Failed to fetch profile',
      };
    }
  }, [dispatch]);

  const deleteAccount = useCallback(async () => {
    try {
      await authApi.deleteAccount();
      await dispatch(logoutUser());
      clearTokens();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || 'Account deletion failed',
      };
    }
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Utility methods
  const isEmailVerified = user?.isEmailVerified ?? false;
  const userRole = user?.role ?? 'student';
  const userName = user ? `${user.firstName} ${user.lastName}` : '';

  const hasPermission = useCallback(
    (requiredRole: 'student' | 'admin' | 'mentor' | 'moderator') => {
      if (!user) return false;
      
      const roleHierarchy = { student: 0, mentor: 1, moderator: 2, admin: 3 };
      const userRoleLevel = roleHierarchy[user.role];
      const requiredRoleLevel = roleHierarchy[requiredRole];
      
      return userRoleLevel >= requiredRoleLevel;
    },
    [user]
  );

  return {
    // State
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    isEmailVerified,
    userRole,
    userName,

    // Methods
    login,
    register,
    logout,
    verifyUserEmail,
    requestPasswordResetEmail,
    resetUserPassword,
    updateProfile,
    refreshUserProfile,
    deleteAccount,
    clearAuthError,
    hasPermission,
  };
};