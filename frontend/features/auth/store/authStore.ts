import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  user: any | null;
  isLoading: boolean;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  login: async (token, user) => {
    await SecureStore.setItemAsync('auth_token', token);
    set({ token, user });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ token: null, user: null });
  },
  initializeAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
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
