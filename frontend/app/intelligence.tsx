import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { PortfolioEvolutionSurface } from '@/features/portfolio_evolution/components/PortfolioEvolutionSurface';

export default function IntelligenceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerRow, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity 
          onPress={() => router.back()}
          style={[styles.closeButton, { backgroundColor: colors.glassSurface }]}
        >
          <X size={24} color={colors.textPrimary} />
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
