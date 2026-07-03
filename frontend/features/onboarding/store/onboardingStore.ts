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

const PERSONA_KEY = 'smartcc_onboarding_persona';

const getPersona = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(PERSONA_KEY);
    }
    const { getItemAsync } = require('expo-secure-store');
    return await getItemAsync(PERSONA_KEY);
  } catch {
    return null;
  }
};

const setPersonaItem = async (value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(PERSONA_KEY, value);
      return;
    }
    const { setItemAsync } = require('expo-secure-store');
    await setItemAsync(PERSONA_KEY, value);
  } catch {
    // Silently fail
  }
};

interface OnboardingState {
  hasSeenOnboarding: boolean;
  isLoading: boolean;
  persona: string | null;
  completeOnboarding: (persona?: string) => Promise<void>;
  initializeOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: false,
  isLoading: true,
  persona: null,

  completeOnboarding: async (persona?: string) => {
    if (persona) {
      await setPersonaItem(persona);
      set({ persona });
    }
    await setItem(true);
    set({ hasSeenOnboarding: true });
  },

  initializeOnboarding: async () => {
    const [seen, persona] = await Promise.all([getItem(), getPersona()]);
    set({ hasSeenOnboarding: seen, isLoading: false, persona });
  },
}));
