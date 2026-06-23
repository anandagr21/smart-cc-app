import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { PortfolioEvolutionSurface } from '@/features/portfolio_evolution/components/PortfolioEvolutionSurface';
import { DynamicIcon } from '@/components/DynamicIcon';

export default function IntelligenceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: colors.glassSurface, marginRight: 12 }]}
          accessibilityLabel="Filter insights"
          accessibilityRole="button"
        >
          <DynamicIcon name="Filter" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: colors.glassSurface }]}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <DynamicIcon name="X" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <PortfolioEvolutionSurface />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
