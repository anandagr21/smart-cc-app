import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  themeMode: ThemeMode;
  isHydrated: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = 'app_theme_mode';

// Helper for cross-platform secure storage
const setItemAsync = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

const getItemAsync = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'system',
  isHydrated: false,

  setThemeMode: async (mode: ThemeMode) => {
    try {
      await setItemAsync(THEME_STORAGE_KEY, mode);
      set({ themeMode: mode });
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      // Fallback update even if persistence fails
      set({ themeMode: mode });
    }
  },

  initializeTheme: async () => {
    try {
      const storedTheme = await getItemAsync(THEME_STORAGE_KEY);
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
        set({ themeMode: storedTheme as ThemeMode, isHydrated: true });
      } else {
        set({ isHydrated: true });
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
      set({ isHydrated: true });
    }
  },
}));
