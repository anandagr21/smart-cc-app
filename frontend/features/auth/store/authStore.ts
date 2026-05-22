import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface AuthState {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

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

const deleteItemAsync = async (key: string) => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  login: async (token, user) => {
    await setItemAsync('auth_token', token);
    set({ token, user });
  },
  logout: async () => {
    await deleteItemAsync('auth_token');
    set({ token: null, user: null });
  },
  initializeAuth: async () => {
    try {
      const token = await getItemAsync('auth_token');
      if (token) {
        // Here you would typically fetch user details if needed
        set({ token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false });
    }
  }
}));
