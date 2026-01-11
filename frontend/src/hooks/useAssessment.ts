import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  loadAssessmentData,
  startAssessment,
  submitAssessmentResponses,
  retakeAssessment,
  getAssessmentResults,
  clearError,
  clearAssessment,
} from '@/store/slices/assessmentSlice';
import { AssessmentSubmission, AssessmentRetake } from '@/services/assessmentService';

export const useAssessment = () => {
  const dispatch = useAppDispatch();
  const { currentAssessment, isLoading, error, lastUpdated } = useAppSelector(
    (state) => state.assessment
  );

  // Load assessment data
  const loadAssessment = useCallback(async () => {
    try {
      const result = await dispatch(loadAssessmentData()).unwrap();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error };
    }
  }, [dispatch]);

  // Start new assessment
  const startNewAssessment = useCallback(async () => {
    try {
      const result = await dispatch(startAssessment()).unwrap();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error };
    }
  }, [dispatch]);

  // Submit assessment responses
  const submitResponses = useCallback(async (submission: AssessmentSubmission) => {
    try {
      const result = await dispatch(submitAssessmentResponses(submission)).unwrap();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error };
    }
  }, [dispatch]);

  // Retake assessment
  const retakeCurrentAssessment = useCallback(async (retakeData?: AssessmentRetake) => {
    try {
      const result = await dispatch(retakeAssessment(retakeData)).unwrap();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error };
    }
  }, [dispatch]);

  // Get assessment results
  const getResults = useCallback(async () => {
    try {
      const result = await dispatch(getAssessmentResults()).unwrap();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error };
    }
  }, [dispatch]);

  // Clear error
  const clearAssessmentError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Clear assessment
  const clearCurrentAssessment = useCallback(() => {
    dispatch(clearAssessment());
  }, [dispatch]);

  // Force refresh assessment data
  const refreshAssessment = useCallback(async () => {
    try {
      const result = await dispatch(loadAssessmentData()).unwrap();
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error };
    }
  }, [dispatch]);

  // Utility methods
  const isAssessmentComplete = currentAssessment?.isComplete ?? false;
  const hasAssessment = currentAssessment !== null;
  const assessmentProgress = currentAssessment?.progress;

  return {
    // State
    currentAssessment,
    isLoading,
    error,
    lastUpdated,
    isAssessmentComplete,
    hasAssessment,
    assessmentProgress,

    // Methods
    loadAssessment,
    startNewAssessment,
    submitResponses,
    retakeCurrentAssessment,
    getResults,
    clearAssessmentError,
    clearCurrentAssessment,
    refreshAssessment,
  };
};