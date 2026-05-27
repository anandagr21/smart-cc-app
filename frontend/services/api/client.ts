import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getDefaultBaseUrl = () => {
  // Try to use the Metro server IP so physical devices work without hardcoding
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:8000/api/v1`;
    }
  }

  if (process.env.EXPO_PUBLIC_API_URL && !process.env.EXPO_PUBLIC_API_URL.includes('localhost')) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Fallbacks
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000/api/v1' : 'http://localhost:8000/api/v1';
};

export const apiClient = axios.create({
  baseURL: getDefaultBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

import { useAuthStore } from '@/features/auth/store/authStore';

apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = useAuthStore.getState().token;
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
