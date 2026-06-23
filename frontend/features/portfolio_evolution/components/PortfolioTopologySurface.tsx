import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { NarrativeObservation } from '../api/evolutionApi';

import { DynamicIcon } from '@/components/DynamicIcon';

interface Props {
  insights: NarrativeObservation[];
}

export function PortfolioTopologySurface({ insights }: Props) {
  const colors = useThemeColors();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  if (!insights || insights.length === 0) {
    return (
      <Animated.View entering={reduceMotion ? FadeIn.duration(0) : FadeInDown.duration(800).delay(500)} style={styles.container}>
        <View style={styles.header}>
          <DynamicIcon name="Network" size={16} color={colors.textMuted} />
          <Text style={[styles.title, { color: colors.textMuted }]}>PORTFOLIO TOPOLOGY</Text>
        </View>
        <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Add more diverse transactions to map your portfolio topology.</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={reduceMotion ? FadeIn.duration(0) : FadeInDown.duration(800).delay(500)} style={styles.container}>
      <View style={styles.header}>
        <DynamicIcon name="Network" size={16} color={colors.textMuted} />
        <Text style={[styles.title, { color: colors.textMuted }]}>PORTFOLIO TOPOLOGY</Text>
      </View>
      <View style={[styles.visualMap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {/* Abstract Ambient Visualization */}
        <View style={styles.blurLayer}>
           <View style={[styles.node, { backgroundColor: colors.primarySoft, top: '20%', left: '30%' }]} />
           <View style={[styles.node, { backgroundColor: colors.successSoft, top: '50%', left: '60%' }]} />
           <View style={[styles.node, { backgroundColor: colors.warningSoft, top: '70%', left: '40%' }]} />
           <View style={[styles.connector, { backgroundColor: colors.borderHighlight, top: '40%', left: '40%', transform: [{ rotate: '45deg' }] }]} />
        </View>
      </View>

      <View style={styles.insights}>
        {insights.map((obs) => (
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
  visualMap: {
    height: 140,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  node: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.8,
  },
  connector: {
    position: 'absolute',
    width: 80,
    height: 2,
    opacity: 0.5,
  },
  insights: {
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
