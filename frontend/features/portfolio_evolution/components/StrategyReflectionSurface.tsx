import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { NarrativeObservation } from '../api/evolutionApi';
import { Compass } from 'lucide-react-native';

interface Props {
  reflections: NarrativeObservation[];
}

export function StrategyReflectionSurface({ reflections }: Props) {
  const colors = useThemeColors();

  if (!reflections || reflections.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(800).delay(600)} style={styles.container}>
      <View style={styles.header}>
        <Compass size={16} color={colors.textMuted} />
        <Text style={[styles.title, { color: colors.textMuted }]}>STRATEGIC ALIGNMENT</Text>
      </View>

      <View style={styles.reflections}>
        {reflections.map((obs) => (
          <Text key={obs.id} style={[styles.narrative, { color: colors.textPrimary }]}>
            {obs.narrative}
          </Text>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  title: {
    fontSize: tokens.fontSize.label,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: 1,
  },
  reflections: {
    gap: 16,
  },
  narrative: {
    fontSize: tokens.fontSize.bodyLg,
    lineHeight: 24,
  },
});
