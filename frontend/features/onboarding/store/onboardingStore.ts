import { create } from 'zustand';
import { Platform } from 'react-native';

const STORAGE_KEY = 'smartcc_onboarding_complete';

// Cross-platform persistence helper
const getItem = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    // On native, we use expo-secure-store via dynamic import to avoid web issues
    const { getItemAsync } = require('expo-secure-store');
    const val = await getItemAsync(STORAGE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
};

const setItem = async (value: boolean): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEY, String(value));
      return;
    }
    const { setItemAsync } = require('expo-secure-store');
    await setItemAsync(STORAGE_KEY, String(value));
  } catch {
    // Silently fail — onboarding will show again next time
  }
};

interface OnboardingState {
  hasSeenOnboarding: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  initializeOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: false,
  isLoading: true,

  completeOnboarding: async () => {
    await setItem(true);
    set({ hasSeenOnboarding: true });
  },

  initializeOnboarding: async () => {
    const seen = await getItem();
    set({ hasSeenOnboarding: seen, isLoading: false });
  },
}));
