import React from 'react';
import { View, Text } from 'react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { AnimatedContainer } from '../../components/ui/AnimatedContainer';
import { Clock } from 'lucide-react-native';
import { colors } from '../../theme/colors';

export default function HistoryScreen() {
  return (
    <ScreenContainer className="justify-center items-center">
      <AnimatedContainer delay={100} className="items-center w-full max-w-sm">
        {/* Atmospheric Icon */}
        <View className="w-32 h-32 rounded-full bg-surfaceElevated border border-white/5 items-center justify-center mb-8 shadow-sm shadow-black/10">
          <View className="absolute inset-0 rounded-full bg-accent/5" />
          {/* @ts-ignore */}
          <Clock size={48} color={colors.textMuted} strokeWidth={1.5} />
        </View>

        {/* Editorial Typography */}
        <Text className="text-3xl font-bold text-textPrimary text-center mb-4 tracking-tight">
          No Activity Yet
        </Text>
        <Text className="text-textSecondary text-center text-lg leading-6 px-4">
          Your optimized transactions and captured rewards will appear here once you begin analyzing purchases.
        </Text>
      </AnimatedContainer>
    </ScreenContainer>
  );
}
