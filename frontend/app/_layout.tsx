import React, { useEffect } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useRouter, useSegments, useNavigationContainerRef, useRootNavigationState } from 'expo-router';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import axios from 'axios';
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { StatusBar } from 'expo-status-bar';
import { TermsDisclaimerModal } from '@/components/TermsDisclaimerModal';
import { ToastOverlay } from '@/components/ui/Toast';
import { useOnboardingStore } from '@/features/onboarding/store/onboardingStore';
import { OnboardingModal } from '@/features/onboarding/components/OnboardingModal';
import { ObserveRoot } from 'expo-observe';
import '@/global.css';
const routingIntegration = Sentry.reactNavigationIntegration();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: __DEV__ ? 1.0 : 0.05,
  release: Constants.expoConfig?.version,
  environment: __DEV__ ? "development" : "production",
  integrations: [
    routingIntegration,
  ],
});

const handleQueryError = (error: any) => {
  if (axios.isAxiosError(error) && error.response) {
    const status = error.response.status;
    // Ignore expected status codes
    if ([401, 403, 404, 400, 422].includes(status)) {
      return;
    }
  }
  // Ignore cancelled requests and offline/network errors
  if (error.name === 'CanceledError' || 
      error.message?.toLowerCase().includes('network error') || 
      error.message?.toLowerCase().includes('offline')) {
    return;
  }
  Sentry.captureException(error);
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleQueryError,
  }),
  mutationCache: new MutationCache({
    onError: handleQueryError,
  }),
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// ---------------------------------------------------------------------------
// Error boundary fallback — shown when an uncaught error crashes the React tree.
// Renders a helpful message + retry button instead of a blank white screen.
// ---------------------------------------------------------------------------
function ErrorFallback({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f0f0f',
        padding: 32,
      }}
    >
      <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
        Something went wrong
      </Text>
      <Text
        style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}
      >
        {error?.message ?? 'An unexpected error occurred. Please try again.'}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          accessibilityLabel="Retry"
          accessibilityRole="button"
          style={{
            backgroundColor: '#7c3aed',
            paddingHorizontal: 28,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default Sentry.wrap(function RootLayout() {
  const { initializeAuth, token, user, isLoading: isAuthLoading } = useAuthStore();
  const { initializeTheme, isHydrated: isThemeHydrated, themeMode } = useThemeStore();
  const { hasSeenOnboarding, isLoading: isOnboardingLoading, initializeOnboarding } = useOnboardingStore();
  const colors = useThemeColors();
  
  const segments = useSegments();
  const router = useRouter();
  const ref = useNavigationContainerRef();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    initializeAuth();
    initializeTheme();
    initializeOnboarding();
  }, []);

  // Track React Navigation for Sentry
  useEffect(() => {
    if (ref) {
      routingIntegration.registerNavigationContainer(ref);
    }
  }, [ref]);

  // Load Google Identity Services script on web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (isAuthLoading || !isThemeHydrated || isOnboardingLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      Sentry.setUser(null);
      queryClient.clear();
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      if (user) {
        Sentry.setUser({ id: user.id });
      }
      queryClient.clear();
      router.replace('/(tabs)');
    } else if (token && user) {
      Sentry.setUser({ id: user.id });
    }
  }, [token, user, isAuthLoading, isThemeHydrated, isOnboardingLoading, segments]);

  if (isAuthLoading || !isThemeHydrated || isOnboardingLoading) {
    return null;
  }

  return (
    <ObserveRoot>
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <Sentry.ErrorBoundary fallback={({error, retry}) => (
        <ErrorFallback error={error} onRetry={retry} />
      )}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(auth)/login" options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
            <Stack.Screen name="monthly-intelligence" options={{ presentation: 'modal' }} />
            <Stack.Screen name="intelligence" options={{ presentation: 'modal', animation: 'fade' }} />
          </Stack>
          {token && !hasSeenOnboarding && <OnboardingModal />}
          <TermsDisclaimerModal />
          <ToastOverlay />
        </QueryClientProvider>
      </Sentry.ErrorBoundary>
    </GestureHandlerRootView>
    </ObserveRoot>
  );
});
