import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { NarrativeObservation } from '../api/evolutionApi';

import { DynamicIcon } from '@/components/DynamicIcon';

interface Props {
  observations: NarrativeObservation[];
}

export function PortfolioEvolutionTimeline({ observations }: Props) {
  const colors = useThemeColors();

  if (!observations || observations.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(800).delay(400)} style={styles.container}>
      <View style={styles.header}>
        <DynamicIcon name="Clock" size={16} color={colors.textMuted} />
        <Text style={[styles.title, { color: colors.textMuted }]}>EVOLUTION TIMELINE</Text>
      </View>
      
      {observations.map((obs, idx) => (
        <View key={obs.id} style={styles.timelineItem}>
          <View style={styles.indicatorContainer}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            {idx < observations.length - 1 && (
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            )}
          </View>
          <View style={styles.content}>
            <Text style={[styles.narrative, { color: colors.textPrimary }]}>
              {obs.narrative}
            </Text>
          </View>
        </View>
      ))}
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
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  indicatorContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingBottom: 24,
  },
  narrative: {
    fontSize: tokens.fontSize.bodyLg,
    lineHeight: 24,
  },
});
