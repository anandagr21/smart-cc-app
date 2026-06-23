import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { NarrativeObservation } from '../api/evolutionApi';

import { DynamicIcon } from '@/components/DynamicIcon';

interface Props {
  reflections: NarrativeObservation[];
}

export function StrategyReflectionSurface({ reflections }: Props) {
  const colors = useThemeColors();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  if (!reflections || reflections.length === 0) {
    return (
      <Animated.View entering={reduceMotion ? FadeIn.duration(0) : FadeInDown.duration(800).delay(600)} style={styles.container}>
        <View style={styles.header}>
          <DynamicIcon name="Compass" size={16} color={colors.textMuted} />
          <Text style={[styles.title, { color: colors.textMuted }]}>STRATEGIC ALIGNMENT</Text>
        </View>
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Log more data to receive strategic alignment reflections.</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={reduceMotion ? FadeIn.duration(0) : FadeInDown.duration(800).delay(600)} style={styles.container}>
      <View style={styles.header}>
        <DynamicIcon name="Compass" size={16} color={colors.textMuted} />
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
  emptyState: {
    padding: 24,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: tokens.fontSize.body,
    textAlign: 'center',
  },
});
