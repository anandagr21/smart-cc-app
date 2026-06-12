import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { StatusBar } from 'expo-status-bar';
import { TermsDisclaimerModal } from '@/components/TermsDisclaimerModal';
import '@/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function RootLayout() {
  const { initializeAuth, token, isLoading: isAuthLoading } = useAuthStore();
  const { initializeTheme, isHydrated: isThemeHydrated, themeMode } = useThemeStore();
  const colors = useThemeColors();
  
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    initializeAuth();
    initializeTheme();
  }, []);

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
    if (isAuthLoading || !isThemeHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, isAuthLoading, isThemeHydrated, segments, rootNavigationState?.key]);

  if (isAuthLoading || !isThemeHydrated) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(auth)/login" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="monthly-intelligence" options={{ presentation: 'modal' }} />
          <Stack.Screen name="intelligence" options={{ presentation: 'modal', animation: 'fade' }} />
        </Stack>
        <TermsDisclaimerModal />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
