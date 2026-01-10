import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DomainRecommendation, CareerDomain, DomainSelection } from '@/types/recommendations';
import { recommendationService } from '@/services/recommendationService';

interface RecommendationState {
  currentRecommendation: DomainRecommendation | null;
  selectedDomain: CareerDomain | null;
  domainDetails: CareerDomain | null;
  categories: Array<{ category: string; count: number; averageSalary: number; averageGrowthRate: number }>;
  isLoading: boolean;
  error: string | null;
}

const initialState: RecommendationState = {
  currentRecommendation: null,
  selectedDomain: null,
  domainDetails: null,
  categories: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const generateRecommendations = createAsyncThunk(
  'recommendations/generateRecommendations',
  async ({ 
    userId, 
    interestProfile, 
    algorithm = 'hybrid', 
    maxRecommendations = 5 
  }: { 
    userId: string; 
    interestProfile: any; 
    algorithm?: 'collaborative_filtering' | 'content_based' | 'market_weighted' | 'hybrid';
    maxRecommendations?: number;
  }, { rejectWithValue }) => {
    try {
      const recommendation = await recommendationService.generateRecommendations(
        userId, 
        interestProfile, 
        algorithm, 
        maxRecommendations
      );
      return recommendation;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to generate recommendations');
    }
  }
);

export const fetchLatestRecommendation = createAsyncThunk(
  'recommendations/fetchLatestRecommendation',
  async (_, { rejectWithValue }) => {
    try {
      const recommendation = await recommendationService.getLatestRecommendation();
      return recommendation;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch latest recommendation');
    }
  }
);

export const addRecommendationFeedback = createAsyncThunk(
  'recommendations/addRecommendationFeedback',
  async ({ 
    recommendationId, 
    feedback 
  }: { 
    recommendationId: string; 
    feedback: DomainSelection;
  }, { rejectWithValue }) => {
    try {
      const result = await recommendationService.addRecommendationFeedback(recommendationId, feedback);
      return { domainId: feedback.domainId, feedback, result };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to add feedback');
    }
  }
);

export const fetchDomainDetails = createAsyncThunk(
  'recommendations/fetchDomainDetails',
  async (domainId: string, { rejectWithValue }) => {
    try {
      const domainDetails = await recommendationService.getDomainDetails(domainId);
      return domainDetails;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch domain details');
    }
  }
);

export const fetchDomainCategories = createAsyncThunk(
  'recommendations/fetchDomainCategories',
  async (_, { rejectWithValue }) => {
    try {
      const categories = await recommendationService.getDomainCategories();
      return categories;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch categories');
    }
  }
);

const recommendationSlice = createSlice({
  name: 'recommendations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearRecommendations: (state) => {
      state.currentRecommendation = null;
      state.selectedDomain = null;
      state.domainDetails = null;
    },
    setSelectedDomain: (state, action: PayloadAction<CareerDomain>) => {
      state.selectedDomain = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Generate recommendations
    builder
      .addCase(generateRecommendations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(generateRecommendations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRecommendation = action.payload;
        state.error = null;
      })
      .addCase(generateRecommendations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch latest recommendation
    builder
      .addCase(fetchLatestRecommendation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLatestRecommendation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentRecommendation = action.payload;
        state.error = null;
      })
      .addCase(fetchLatestRecommendation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Add recommendation feedback
    builder
      .addCase(addRecommendationFeedback.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addRecommendationFeedback.fulfilled, (state, action) => {
        state.isLoading = false;
        // Update the domain with feedback if needed
        if (state.currentRecommendation) {
          const domain = state.currentRecommendation.domains.find(d => d.domainId === action.payload.domainId);
          if (domain) {
            // Mark domain as having feedback
            // You could add a feedback property to the domain type if needed
          }
        }
        state.error = null;
      })
      .addCase(addRecommendationFeedback.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch domain details
    builder
      .addCase(fetchDomainDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDomainDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.domainDetails = action.payload;
        state.error = null;
      })
      .addCase(fetchDomainDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch domain categories
    builder
      .addCase(fetchDomainCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDomainCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchDomainCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearRecommendations, setSelectedDomain } = recommendationSlice.actions;
export default recommendationSlice.reducer;