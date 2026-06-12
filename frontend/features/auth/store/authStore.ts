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
  acceptTerms: () => Promise<void>;
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
    await setItemAsync('auth_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: async () => {
    await deleteItemAsync('auth_token');
    await deleteItemAsync('auth_user');
    set({ token: null, user: null });
  },
  initializeAuth: async () => {
    try {
      const token = await getItemAsync('auth_token');
      const userStr = await getItemAsync('auth_user');
      
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), isLoading: false });
      } else if (token) {
        // Fallback if we only have token
        set({ token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false });
    }
  },
  acceptTerms: async () => {
    // Need to use get() to access current state in async functions, or we can just use the destructured version
    const { user } = useAuthStore.getState();
    if (user) {
      const updatedUser = { ...user, terms_accepted: true };
      await setItemAsync('auth_user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  }
}));
