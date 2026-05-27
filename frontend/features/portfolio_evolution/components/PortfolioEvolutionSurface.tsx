import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeIn, Layout, FadeOut } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { usePortfolioEvolution } from '../api/evolutionApi';
import { ActivityIndicator } from 'react-native';
import { Layers, Activity, Maximize, Zap, ChevronDown, ChevronUp } from 'lucide-react-native';

import { PortfolioEvolutionTimeline } from './PortfolioEvolutionTimeline';
import { PortfolioTopologySurface } from './PortfolioTopologySurface';
import { StrategyReflectionSurface } from './StrategyReflectionSurface';

export function PortfolioEvolutionSurface() {
  const colors = useThemeColors();
  const { data, isLoading } = usePortfolioEvolution();
  const [showMetrics, setShowMetrics] = useState(false);

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
            <Text style={[styles.metricLabel, { color: colors.textPrimary }]}>{label}</Text>
            <Text style={[styles.metricDesc, { color: colors.textMuted }]}>{desc}</Text>
          </View>
        </View>
        <Text style={[styles.metricScore, { color: colors.textPrimary }]}>{score.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    <Animated.ScrollView 
      entering={FadeIn.duration(600)}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(800).delay(100)} style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Portfolio Cognition</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Longitudinal analysis of your wallet's strategic evolution.
        </Text>
      </Animated.View>

      {/* Hero Narrative */}
      {data.primary_narrative && (
        <Animated.View entering={FadeInDown.duration(800).delay(300)} style={styles.heroSection}>
          <Text style={[styles.heroNarrative, { color: colors.textPrimary }]}>
            {data.primary_narrative}
          </Text>
        </Animated.View>
      )}

      {/* Composed Intelligence Surfaces */}
      <PortfolioEvolutionTimeline observations={data.evolution_observations || []} />
      <PortfolioTopologySurface insights={data.topology_insights || []} />
      <StrategyReflectionSurface reflections={data.strategy_reflections || []} />

      {/* Progressive Disclosure for Raw Metrics */}
      <Animated.View layout={Layout.springify().damping(20)} style={styles.metricsDisclosure}>
        <TouchableOpacity 
          onPress={() => setShowMetrics(!showMetrics)}
          style={[styles.disclosureButton, { borderTopColor: colors.border }]}
        >
          <Text style={[styles.disclosureText, { color: colors.textMuted }]}>
            {showMetrics ? "Hide Strategic Metrics" : "View Strategic Metrics"}
          </Text>
          {showMetrics ? 
            <ChevronUp size={16} color={colors.textMuted} /> : 
            <ChevronDown size={16} color={colors.textMuted} />
          }
        </TouchableOpacity>

        {showMetrics && (
          <Animated.View 
            entering={FadeInDown.duration(400)} 
            exiting={FadeOut.duration(300)}
            style={styles.metricsContainer}
          >
            {renderMetric(Layers, "Cognitive Complexity", data.complexity_score, "Fragmentation of optimization paths")}
            {renderMetric(Maximize, "Portfolio Redundancy", data.redundancy_score, "Overlap in strategic category coverage")}
            {renderMetric(Zap, "Value Density", data.value_density, "Realized value vs. annual fee burden")}
            {renderMetric(Activity, "Strategic Alignment", data.strategic_alignment_score, "Alignment with longitudinal goals")}
          </Animated.View>
        )}
      </Animated.View>

    </Animated.ScrollView>
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
    paddingTop: 16, // Reduced from 40 for more immersive feel from header
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: tokens.fontSize.body,
    lineHeight: 20,
    maxWidth: '85%',
  },
  heroSection: {
    marginBottom: 56,
  },
  heroNarrative: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: tokens.fontWeight.regular,
    letterSpacing: -0.5,
  },
  metricsDisclosure: {
    marginTop: 24,
  },
  disclosureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  disclosureText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
  metricsContainer: {
    gap: 0,
    paddingBottom: 24,
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
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: 2,
  },
  metricDesc: {
    fontSize: tokens.fontSize.caption,
  },
  metricScore: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: -0.5,
  },
});
