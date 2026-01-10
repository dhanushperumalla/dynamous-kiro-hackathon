import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authSlice from './slices/authSlice';
import recommendationSlice from './slices/recommendationSlice';
import learningSlice from './slices/learningSlice';

// Persist configuration
const persistConfig = {
  key: 'ai-sikshak-root',
  storage,
  whitelist: ['auth', 'recommendations', 'learning'], // Persist auth, recommendations, and learning state
  version: 1,
};

// Root reducer
const rootReducer = combineReducers({
  auth: authSlice,
  recommendations: recommendationSlice,
  learning: learningSlice,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
          'persist/FLUSH',
        ],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export { useAppDispatch, useAppSelector } from './hooks';