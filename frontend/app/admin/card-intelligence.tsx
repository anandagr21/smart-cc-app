import React from 'react';
import { CardIntelligenceDashboard } from '@/features/card_intelligence/screens/CardIntelligenceDashboard';
import { Stack } from 'expo-router';

export default function CardIntelligenceAdminScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <CardIntelligenceDashboard />
    </>
  );
}
