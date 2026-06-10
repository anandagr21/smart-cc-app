import * as React from 'react';
import { Platform } from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuthStore } from '@/features/auth/store/authStore';
import { googleLogin } from '@/features/auth/api/authApi';

// ---------------------------------------------------------------------------
// Native (iOS/Android) Google Sign-In using @react-native-google-signin/google-signin
// ---------------------------------------------------------------------------

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  iosClientId: IOS_CLIENT_ID,
});

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

    if (Platform.OS === 'android') {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      } catch (err) {
        setError('Google Play Services are required for Google Sign-In.');
        return;
      }
    }

    try {
      await GoogleSignin.signOut();
      const userInfo = await GoogleSignin.signIn();

      const idToken = userInfo.data?.idToken ?? (userInfo as any).idToken;
      if (!idToken) {
        setError('Google Sign-In did not return an ID token. Please try again.');
        return;
      }

      setIsLoading(true);

      const res = await googleLogin(idToken);
      login(res.access_token, res.user);
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (err.code === statusCodes.IN_PROGRESS) return;

      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError('Google Play Services are not available on this device.');
        return;
      }

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
  }, [login]);

  const clearError = React.useCallback(() => setError(null), []);

  return { signIn, isLoading, error, clearError };
}
