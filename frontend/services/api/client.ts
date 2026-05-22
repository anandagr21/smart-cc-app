import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { Platform } from 'react-native';

const getDefaultBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  // Android emulator needs 10.0.2.2 to access host machine's localhost
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000/api/v1' : 'http://localhost:8000/api/v1';
};

export const apiClient = axios.create({
  baseURL: getDefaultBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

import { useAuthStore } from '../../features/auth/store/authStore';

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle unauthorized by logging the user out
    if (error.response?.status === 401) {
      console.warn('API returned 401 Unauthorized. Logging out.');
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);
