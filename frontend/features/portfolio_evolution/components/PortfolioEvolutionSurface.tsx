import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { tokens } from '../../../theme/tokens';
import { usePortfolioEvolution } from '../api/evolutionApi';
import { ActivityIndicator } from 'react-native';
import { Layers, Activity, Maximize, Zap, Sparkles } from 'lucide-react-native';

export function PortfolioEvolutionSurface() {
  const colors = useThemeColors();
  const { data, isLoading } = usePortfolioEvolution();

  if (isLoading || !data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const renderMetric = (icon: any, label: string, score: number, desc: string) => {
    const Icon = icon;
    return (
      <View style={[styles.metricRow, { borderBottomColor: colors.glassBorder }]}>
        <View style={styles.metricLeft}>
          <View style={[styles.iconWrapper, { backgroundColor: colors.glassSurface }]}>
            <Icon size={16} color={colors.primary} strokeWidth={2} />
          </View>
          <View>
            <Text style={[styles.metricLabel, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.metricDesc, { color: colors.textMuted }]}>{desc}</Text>
          </View>
        </View>
        <Text style={[styles.metricScore, { color: colors.text }]}>{score.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    <Animated.View 
      entering={FadeIn.duration(600)}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View entering={FadeInDown.duration(800).delay(100)} style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Portfolio Cognition</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Longitudinal analysis of your wallet's strategic evolution.
        </Text>
      </Animated.View>

      {data.primary_narrative && (
        <Animated.View 
          entering={FadeInDown.duration(800).delay(300)} 
          style={[styles.narrativeCard, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}
        >
          <Sparkles size={18} color={colors.primary} style={styles.narrativeIcon} strokeWidth={2} />
          <Text style={[styles.narrativeText, { color: colors.text }]}>
            {data.primary_narrative}
          </Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.duration(800).delay(500)} style={styles.metricsContainer}>
        {renderMetric(Layers, "Cognitive Complexity", data.complexity_score, "Fragmentation of optimization paths")}
        {renderMetric(Maximize, "Portfolio Redundancy", data.redundancy_score, "Overlap in strategic category coverage")}
        {renderMetric(Zap, "Value Density", data.value_density, "Realized value vs. annual fee burden")}
        {renderMetric(Activity, "Strategic Alignment", data.strategic_alignment_score, "Alignment with longitudinal goals")}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    lineHeight: 20,
    maxWidth: '85%',
  },
  narrativeCard: {
    padding: 24,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    marginBottom: 48,
  },
  narrativeIcon: {
    marginBottom: 16,
  },
  narrativeText: {
    fontSize: tokens.fontSize.md,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  metricsContainer: {
    gap: 0,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: 2,
  },
  metricDesc: {
    fontSize: tokens.fontSize.xs,
  },
  metricScore: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: -0.5,
  },
});
