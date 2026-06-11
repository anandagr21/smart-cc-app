import * as React from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { googleLogin } from '@/features/auth/api/authApi';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// ---------------------------------------------------------------------------
// Native (iOS/Android) Google Sign-In using @react-native-google-signin
// ---------------------------------------------------------------------------

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

// Initialize Google Sign-In
// This only needs to be called once, so we can do it at module level or in a hook
try {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    offlineAccess: false,
  });
} catch (error) {
  console.warn('GoogleSignin.configure failed', error);
}

export interface UseGoogleAuthReturn {
  signIn: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const login = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const signIn = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Ensure Google Play Services are available (Android only)
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (!idToken) {
        setError('Google Sign-In did not return an ID token. Please try again.');
        setIsLoading(false);
        return;
      }

      // Send the idToken to the backend
      const res = await googleLogin(idToken);
      await login(res.access_token, res.user);

    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow, don't show an error
        setError(null);
      } else if (err.code === statusCodes.IN_PROGRESS) {
        setError('Sign in is already in progress.');
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services not available or outdated.');
      } else if (!err.response) {
        // API or network error
        setError(err.message || 'Cannot connect to server. Please check your connection.');
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
  }, [login]);

  const clearError = React.useCallback(() => setError(null), []);

  return { signIn, isLoading, error, clearError };
}
