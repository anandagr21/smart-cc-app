import * as React from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { googleLogin } from '@/features/auth/api/authApi';

// ---------------------------------------------------------------------------
// Web Google Sign-In using Google Identity Services (gis)
//
// This file is used on web. On native, useGoogleAuth.native.ts is used instead.
// ---------------------------------------------------------------------------

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

export interface UseGoogleAuthReturn {
  signIn: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const login = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [gisReady, setGisReady] = React.useState(false);

  // Initialize Google Identity Services
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const init = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: WEB_CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
      });
      setGisReady(true);
    };

    // GIS script might already be loaded by GoogleOAuthProvider
    if (window.google?.accounts?.id) {
      init();
    } else {
      // Poll for GIS script load (max 10 seconds)
      let attempts = 0;
      const MAX_ATTEMPTS = 50; // 50 × 200ms = 10 seconds
      const interval = setInterval(() => {
        attempts += 1;
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          init();
        } else if (attempts >= MAX_ATTEMPTS) {
          clearInterval(interval);
          console.error("Google Identity Services failed to load after 10 seconds");
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [login]);

  const handleCredential = async (response: { credential: string }) => {
    if (!response.credential) {
      setError('Google Sign-In did not return an ID token. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await googleLogin(response.credential);
      await login(res.access_token, res.user);
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot connect to server. Please check your connection.');
      } else if (err.response?.status === 429) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (err.response?.status === 401) {
        setError('Google Sign-In failed. Please try again.');
      } else {
        const detail = err.response?.data?.detail;
        const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
        setError(msg || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = React.useCallback(() => {
    setError(null);

    if (typeof window === 'undefined' || !window.google?.accounts?.id) {
      setError('Google Sign-In is not available. Please check your browser settings.');
      return;
    }

    window.google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        const reason = notification.getNotDisplayedReason() || notification.getSkippedReason();
        if (reason === 'opt_out_or_no_session' || reason === 'user_cancel') {
          return;
        }
        setError(`Google Sign-In was not available: ${reason}. Please try again.`);
      }
    });
  }, [login, gisReady]);

  const clearError = React.useCallback(() => setError(null), []);

  return { signIn, isLoading, error, clearError };
}

// Extend Window for google.accounts.id
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          prompt: (callback?: (notification: {
            isNotDisplayed: () => boolean;
            isSkippedMoment: () => boolean;
            getNotDisplayedReason: () => string;
            getSkippedReason: () => string;
          }) => void) => void;
        };
      };
    };
  }
}
