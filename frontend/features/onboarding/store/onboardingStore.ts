import { create } from 'zustand';
import { Platform } from 'react-native';

import { apiClient } from '@/services/api/client';
import {
  OptimizationPersonality,
} from '@/features/personality/api/personalityApi';

// ── Cross-platform persistence helpers ────────────────────────────────────

const STORAGE_KEY = 'smartcc_onboarding_complete';
const PERSONA_KEY = 'smartcc_onboarding_persona';

const getItem = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
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

// ── Mapping: onboarding persona → OptimizationPersonality ─────────────────

/**
 * Translates the onboarding slide's persona values (which match the
 * per-transaction OptimizationIntent) into the backend's
 * OptimizationPersonality enum used for recommendation scoring.
 */
function mapOnboardingPersonaToBackend(
  onboardingValue: string,
): OptimizationPersonality {
  switch (onboardingValue) {
    case 'SIMPLIFY_DECISIONS':
      return OptimizationPersonality.WALLET_SIMPLICITY;
    case 'MAX_REWARDS':
      return OptimizationPersonality.MAXIMIZE_REWARDS;
    case 'SAVE_FEE_WAIVER':
      return OptimizationPersonality.FEE_MINIMIZATION;
    default:
      return OptimizationPersonality.BALANCED_INTELLIGENCE;
  }
}

// ── Store ─────────────────────────────────────────────────────────────────

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
    // Persist persona locally (fast, works offline)
    if (persona) {
      await setPersonaItem(persona);
      set({ persona });
    }

    // Send persona to backend so it actually affects recommendations
    if (persona) {
      try {
        const backendPersonality = mapOnboardingPersonaToBackend(persona);
        await apiClient.put('/personality/', {
          personality: backendPersonality,
        });
      } catch {
        // Silently fail — the persona is still stored locally.
        // The user can update it later via the personality sheet.
      }
    }

    await setItem(true);
    set({ hasSeenOnboarding: true });
  },

  initializeOnboarding: async () => {
    const [seen, persona] = await Promise.all([getItem(), getPersona()]);
    set({ hasSeenOnboarding: seen, isLoading: false, persona });
  },
}));
