import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Assessment, AssessmentSubmission, AssessmentRetake } from '@/services/assessmentService';
import * as assessmentService from '@/services/assessmentService';

interface AssessmentState {
  currentAssessment: Assessment | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: AssessmentState = {
  currentAssessment: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const loadAssessmentData = createAsyncThunk(
  'assessment/loadData',
  async (_, { rejectWithValue }) => {
    try {
      console.log('loadAssessmentData: Starting to load assessment data');
      
      // First, try to get completed assessment results
      try {
        console.log('loadAssessmentData: Trying to get results');
        const resultsData = await assessmentService.assessmentService.getResults();
        console.log('loadAssessmentData: Results loaded successfully:', {
          id: resultsData.id,
          isComplete: resultsData.isComplete,
          hasInterestProfile: !!resultsData.interestProfile
        });
        return resultsData;
      } catch (resultsError: any) {
        console.log('loadAssessmentData: Results failed, trying progress:', resultsError.response?.status);
        
        // If no completed assessment (404), try to get progress
        if (resultsError.response?.status === 404) {
          try {
            console.log('loadAssessmentData: Trying to get progress');
            const progressData = await assessmentService.assessmentService.getProgress();
            console.log('loadAssessmentData: Progress loaded:', {
              assessmentComplete: progressData.assessment.isComplete,
              progressComplete: progressData.progress.isComplete,
              completionPercentage: progressData.progress.completionPercentage
            });
            
            // If progress shows assessment is complete, try results again
            if (progressData.progress.isComplete || progressData.assessment.isComplete) {
              console.log('loadAssessmentData: Progress shows complete, retrying results');
              try {
                const resultsData = await assessmentService.assessmentService.getResults();
                console.log('loadAssessmentData: Results loaded on retry:', {
                  id: resultsData.id,
                  isComplete: resultsData.isComplete,
                  hasInterestProfile: !!resultsData.interestProfile
                });
                return resultsData;
              } catch (retryError) {
                console.log('loadAssessmentData: Results retry failed, using progress data');
              }
            }
            
            // Create assessment object from progress data
            const fullAssessment: Assessment = {
              ...progressData.assessment,
              progress: progressData.progress,
              isComplete: progressData.progress.isComplete || progressData.assessment.isComplete,
              interestProfile: undefined,
              totalCompletionTime: undefined
            };
            
            console.log('loadAssessmentData: Returning progress-based assessment:', {
              id: fullAssessment.id,
              isComplete: fullAssessment.isComplete,
              progressComplete: progressData.progress.isComplete,
              assessmentComplete: progressData.assessment.isComplete
            });
            return fullAssessment;
          } catch (progressError: any) {
            console.log('loadAssessmentData: Progress also failed:', progressError.response?.status);
            if (progressError.response?.status === 404) {
              return null; // No assessment exists
            }
            throw progressError;
          }
        }
        throw resultsError;
      }
    } catch (error: any) {
      console.error('loadAssessmentData: Error loading assessment data:', error);
      if (error.response?.status === 404) {
        return null; // No assessment exists
      }
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to load assessment data');
    }
  }
);

export const startAssessment = createAsyncThunk(
  'assessment/start',
  async (_, { rejectWithValue }) => {
    try {
      const assessment = await assessmentService.assessmentService.startAssessment();
      return assessment;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to start assessment');
    }
  }
);

export const submitAssessmentResponses = createAsyncThunk(
  'assessment/submit',
  async (submission: AssessmentSubmission, { rejectWithValue }) => {
    try {
      console.log('submitAssessmentResponses: Submitting responses:', {
        responseCount: submission.responses.length,
        isPartial: submission.isPartial
      });
      
      const result = await assessmentService.assessmentService.submitResponses(submission);
      
      console.log('submitAssessmentResponses: Submission result:', {
        hasAssessment: !!result.assessment,
        isComplete: result.assessment?.isComplete,
        hasInterestProfile: !!result.assessment?.interestProfile,
        hasValidation: !!result.validation
      });
      
      return result.assessment;
    } catch (error: any) {
      console.error('submitAssessmentResponses: Error:', error);
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to submit assessment');
    }
  }
);

export const retakeAssessment = createAsyncThunk(
  'assessment/retake',
  async (retakeData: AssessmentRetake | undefined, { rejectWithValue }) => {
    try {
      const result = await assessmentService.assessmentService.retakeAssessment(retakeData);
      return result.assessment;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to retake assessment');
    }
  }
);

export const getAssessmentResults = createAsyncThunk(
  'assessment/getResults',
  async (_, { rejectWithValue }) => {
    try {
      const results = await assessmentService.assessmentService.getResults();
      return results;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to get assessment results');
    }
  }
);

// Assessment slice
const assessmentSlice = createSlice({
  name: 'assessment',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearAssessment: (state) => {
      state.currentAssessment = null;
      state.error = null;
      state.lastUpdated = null;
    },
    updateAssessment: (state, action: PayloadAction<Partial<Assessment>>) => {
      if (state.currentAssessment) {
        state.currentAssessment = { ...state.currentAssessment, ...action.payload };
        state.lastUpdated = new Date().toISOString();
      }
    },
  },
  extraReducers: (builder) => {
    // Load assessment data
    builder
      .addCase(loadAssessmentData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadAssessmentData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentAssessment = action.payload;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(loadAssessmentData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Start assessment
    builder
      .addCase(startAssessment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startAssessment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentAssessment = action.payload;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(startAssessment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Submit assessment
    builder
      .addCase(submitAssessmentResponses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitAssessmentResponses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentAssessment = action.payload;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(submitAssessmentResponses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Retake assessment
    builder
      .addCase(retakeAssessment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(retakeAssessment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentAssessment = action.payload;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(retakeAssessment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Get results
    builder
      .addCase(getAssessmentResults.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getAssessmentResults.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentAssessment = action.payload;
        state.error = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(getAssessmentResults.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearAssessment, updateAssessment } = assessmentSlice.actions;
export default assessmentSlice.reducer;