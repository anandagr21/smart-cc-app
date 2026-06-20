import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const getDefaultBaseUrl = () => {
  // Always prioritize the explicit environment variable if set
  if (process.env.EXPO_PUBLIC_API_URL) {
    const url = process.env.EXPO_PUBLIC_API_URL;
    // Enforce HTTPS in production builds
    if (!__DEV__ && !url.startsWith('https://')) {
      throw new Error(
        'EXPO_PUBLIC_API_URL must use HTTPS in production. Got: ' + url,
      );
    }
    return url;
  }

  // Guards: fallback URLs are only safe in development
  if (!__DEV__) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not set. It must be configured for production builds.',
    );
  }

  // Try to use the Metro server IP so physical devices work without hardcoding local IPs
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:8000/api/v1`;
    }
  }

  // Fallbacks for local development only
  return Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1';
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


import * as Sentry from '@sentry/react-native';

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle unauthorized by logging the user out
    if (error.response?.status === 401) {
      console.warn('API returned 401 Unauthorized. Logging out.');
      useAuthStore.getState().logout();
    }
    
    // Sentry Error Tracking for unhandled/unexpected errors
    if (error.response) {
      const status = error.response.status;
      // Do not capture expected client errors (401, 403, 404, 400, 422)
      if (![401, 403, 404, 400, 422].includes(status)) {
        Sentry.captureException(error);
      }
    } else if (error.request) {
      // Network error, timeout, offline - maybe we capture timeout specifically
      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        Sentry.captureException(error);
      }
    } else {
      // Something happened in setting up the request that triggered an Error
      if (error.name !== 'CanceledError') {
        Sentry.captureException(error);
      }
    }

    return Promise.reject(error);
  }
);
