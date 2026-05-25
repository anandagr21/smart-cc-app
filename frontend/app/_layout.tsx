import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../features/auth/store/authStore';
import { useThemeStore } from '../features/theme/store/themeStore';
import { useThemeColors } from '../features/theme/hooks/useThemeColors';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

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

  useEffect(() => {
    initializeAuth();
    initializeTheme();
  }, []);

  useEffect(() => {
    if (isAuthLoading || !isThemeHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, isAuthLoading, isThemeHydrated, segments]);

  if (isAuthLoading || !isThemeHydrated) {
    return null; // A proper splash screen can replace this
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={themeMode === 'light' ? 'dark' : 'light'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(auth)/login" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
