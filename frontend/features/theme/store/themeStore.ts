import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  themeMode: ThemeMode;
  isHydrated: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = 'app_theme_mode';

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'system',
  isHydrated: false,

  setThemeMode: async (mode: ThemeMode) => {
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
      set({ themeMode: mode });
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      // Fallback update even if persistence fails
      set({ themeMode: mode });
    }
  },

  initializeTheme: async () => {
    try {
      const storedTheme = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
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
