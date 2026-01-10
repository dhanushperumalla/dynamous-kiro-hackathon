import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { LearningRoadmap, LearningProgress, WeeklyTarget, StudySession, LearningPreferences } from '@/types/learning';
import { learningService } from '@/services/learningService';

interface LearningState {
  currentRoadmap: LearningRoadmap | null;
  allRoadmaps: LearningRoadmap[];
  progress: LearningProgress | null;
  currentWeekTargets: WeeklyTarget | null;
  activeSession: StudySession | null;
  preferences: LearningPreferences | null;
  recentSessions: StudySession[];
  isLoading: boolean;
  error: string | null;
}

const initialState: LearningState = {
  currentRoadmap: null,
  allRoadmaps: [],
  progress: null,
  currentWeekTargets: null,
  activeSession: null,
  preferences: null,
  recentSessions: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const startRoadmap = createAsyncThunk(
  'learning/startRoadmap',
  async ({ domainId, preferences }: { domainId: string; preferences?: Partial<LearningPreferences> }, { rejectWithValue }) => {
    try {
      const roadmap = await learningService.startRoadmap(domainId, preferences);
      return roadmap;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to start roadmap');
    }
  }
);

export const fetchRoadmap = createAsyncThunk(
  'learning/fetchRoadmap',
  async (roadmapId: string, { rejectWithValue }) => {
    try {
      const roadmap = await learningService.getRoadmap(roadmapId);
      return roadmap;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch roadmap');
    }
  }
);

export const fetchAllRoadmaps = createAsyncThunk(
  'learning/fetchAllRoadmaps',
  async (_, { rejectWithValue }) => {
    try {
      const roadmaps = await learningService.getAllRoadmaps();
      return roadmaps;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch roadmaps');
    }
  }
);

export const fetchProgress = createAsyncThunk(
  'learning/fetchProgress',
  async (roadmapId: string, { rejectWithValue }) => {
    try {
      const progress = await learningService.getProgress(roadmapId);
      return progress;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch progress');
    }
  }
);

export const fetchCurrentWeekTargets = createAsyncThunk(
  'learning/fetchCurrentWeekTargets',
  async (roadmapId: string, { rejectWithValue }) => {
    try {
      const targets = await learningService.getCurrentWeekTargets(roadmapId);
      return targets;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch week targets');
    }
  }
);

export const completeModule = createAsyncThunk(
  'learning/completeModule',
  async ({ roadmapId, moduleId, notes }: { roadmapId: string; moduleId: string; notes?: string }, { rejectWithValue }) => {
    try {
      const result = await learningService.completeModule(roadmapId, moduleId, notes);
      return { moduleId, progress: result.progress };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to complete module');
    }
  }
);

export const updateModuleProgress = createAsyncThunk(
  'learning/updateModuleProgress',
  async ({ roadmapId, moduleId, progress }: { roadmapId: string; moduleId: string; progress: number }, { rejectWithValue }) => {
    try {
      await learningService.updateModuleProgress(roadmapId, moduleId, progress);
      return { moduleId, progress };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update progress');
    }
  }
);

export const startStudySession = createAsyncThunk(
  'learning/startStudySession',
  async ({ roadmapId, moduleId, type }: { roadmapId: string; moduleId: string; type: StudySession['type'] }, { rejectWithValue }) => {
    try {
      const session = await learningService.startStudySession(roadmapId, moduleId, type);
      return session;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to start study session');
    }
  }
);

export const endStudySession = createAsyncThunk(
  'learning/endStudySession',
  async ({ sessionId, notes, rating }: { sessionId: string; notes?: string; rating?: number }, { rejectWithValue }) => {
    try {
      const session = await learningService.endStudySession(sessionId, notes, rating);
      return session;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to end study session');
    }
  }
);

export const fetchPreferences = createAsyncThunk(
  'learning/fetchPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const preferences = await learningService.getPreferences();
      return preferences;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch preferences');
    }
  }
);

export const updatePreferences = createAsyncThunk(
  'learning/updatePreferences',
  async (preferences: Partial<LearningPreferences>, { rejectWithValue }) => {
    try {
      const updatedPreferences = await learningService.updatePreferences(preferences);
      return updatedPreferences;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update preferences');
    }
  }
);

export const fetchRecentSessions = createAsyncThunk(
  'learning/fetchRecentSessions',
  async ({ roadmapId, limit }: { roadmapId?: string; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const sessions = await learningService.getStudySessions(roadmapId, limit);
      return sessions;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch sessions');
    }
  }
);

const learningSlice = createSlice({
  name: 'learning',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearLearningData: (state) => {
      state.currentRoadmap = null;
      state.progress = null;
      state.currentWeekTargets = null;
      state.activeSession = null;
    },
    setActiveRoadmap: (state, action: PayloadAction<LearningRoadmap>) => {
      state.currentRoadmap = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Start roadmap
    builder
      .addCase(startRoadmap.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startRoadmap.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoadmap = action.payload;
        state.allRoadmaps.push(action.payload);
        state.error = null;
      })
      .addCase(startRoadmap.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch roadmap
    builder
      .addCase(fetchRoadmap.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRoadmap.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRoadmap = action.payload;
        state.error = null;
      })
      .addCase(fetchRoadmap.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch all roadmaps
    builder
      .addCase(fetchAllRoadmaps.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllRoadmaps.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allRoadmaps = action.payload;
        state.error = null;
      })
      .addCase(fetchAllRoadmaps.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch progress
    builder
      .addCase(fetchProgress.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProgress.fulfilled, (state, action) => {
        state.isLoading = false;
        state.progress = action.payload;
        state.error = null;
      })
      .addCase(fetchProgress.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch current week targets
    builder
      .addCase(fetchCurrentWeekTargets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentWeekTargets.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentWeekTargets = action.payload;
        state.error = null;
      })
      .addCase(fetchCurrentWeekTargets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Complete module
    builder
      .addCase(completeModule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completeModule.fulfilled, (state, action) => {
        state.isLoading = false;
        state.progress = action.payload.progress;
        
        // Update module completion in current roadmap
        if (state.currentRoadmap) {
          state.currentRoadmap.completedModules += 1;
          state.currentRoadmap.progress = (state.currentRoadmap.completedModules / state.currentRoadmap.totalModules) * 100;
        }
        
        state.error = null;
      })
      .addCase(completeModule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update module progress
    builder
      .addCase(updateModuleProgress.fulfilled, (state, action) => {
        // Update progress in current week targets if applicable
        if (state.currentWeekTargets) {
          const moduleIndex = state.currentWeekTargets.modules.indexOf(action.payload.moduleId);
          if (moduleIndex !== -1) {
            // Update overall week progress based on module progress
            const totalModules = state.currentWeekTargets.modules.length;
            const completedProgress = action.payload.progress;
            state.currentWeekTargets.progress = Math.min(100, state.currentWeekTargets.progress + (completedProgress / totalModules));
          }
        }
      });

    // Start study session
    builder
      .addCase(startStudySession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startStudySession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeSession = action.payload;
        state.error = null;
      })
      .addCase(startStudySession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // End study session
    builder
      .addCase(endStudySession.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(endStudySession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeSession = null;
        state.recentSessions.unshift(action.payload);
        // Keep only the 10 most recent sessions
        state.recentSessions = state.recentSessions.slice(0, 10);
        state.error = null;
      })
      .addCase(endStudySession.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch preferences
    builder
      .addCase(fetchPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      });

    // Update preferences
    builder
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      });

    // Fetch recent sessions
    builder
      .addCase(fetchRecentSessions.fulfilled, (state, action) => {
        state.recentSessions = action.payload;
      });
  },
});

export const { clearError, clearLearningData, setActiveRoadmap } = learningSlice.actions;
export default learningSlice.reducer;