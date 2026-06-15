import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/store/authStore';

export default function AdminLayout() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    // If auth is loaded and user is not an admin, boot them to the main tabs
    if (!isLoading && user?.role !== 'ADMIN') {
      router.replace('/(tabs)');
    }
  }, [user, isLoading]);

  // While checking auth, or if not an admin (before redirect takes effect), render nothing
  if (isLoading || user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="master-catalog" options={{ presentation: 'modal' }} />
      <Stack.Screen name="card-intelligence" />
      <Stack.Screen name="ingestion" />
      <Stack.Screen name="feedback" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
