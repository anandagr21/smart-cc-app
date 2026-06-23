import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AccessibilityInfo } from 'react-native';
import Animated, { FadeInDown, FadeIn, Layout, FadeOut } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { usePortfolioEvolution } from '../api/evolutionApi';
import { ActivityIndicator } from 'react-native';


import { PortfolioEvolutionTimeline } from './PortfolioEvolutionTimeline';
import { PortfolioTopologySurface } from './PortfolioTopologySurface';
import { StrategyReflectionSurface } from './StrategyReflectionSurface';
import { DynamicIcon } from '@/components/DynamicIcon';

export function PortfolioEvolutionSurface() {
  const colors = useThemeColors();
  const { data, isLoading, error } = usePortfolioEvolution();
  const [showMetrics, setShowMetrics] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  if (isLoading || !data) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={styles.skeletonHeader} />
        <View style={styles.skeletonBody} />
        <View style={styles.skeletonBody} />
        <View style={styles.skeletonBody} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.error }}>Failed to load portfolio insights.</Text>
      </View>
    );
  }

  const renderMetric = (iconName: string, label: string, score: number, desc: string) => {
    const percentage = Math.min(100, Math.max(0, score));
    return (
      <View style={[styles.metricRow, { borderBottomColor: colors.glassBorder }]}>
        <View style={styles.metricLeft}>
          <View style={[styles.iconWrapper, { backgroundColor: colors.glassSurface }]}>
            <DynamicIcon name={iconName} size={16} color={colors.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.metricLabel, { color: colors.textPrimary }]}>{label}</Text>
            <Text style={[styles.metricDesc, { color: colors.textMuted }]}>{desc}</Text>
            
            {/* Visual Encoding */}
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, { backgroundColor: colors.primary, width: `${percentage}%` }]} />
            </View>
          </View>
        </View>
        <Text style={[styles.metricScore, { color: colors.textPrimary }]}>{score.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    <Animated.ScrollView 
      entering={reduceMotion ? FadeIn.duration(0) : FadeIn.duration(600)}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={reduceMotion ? FadeInDown.duration(0) : FadeInDown.duration(800).delay(100)} style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Portfolio Cognition</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Longitudinal analysis of your wallet's strategic evolution.
        </Text>
      </Animated.View>

      {/* Hero Narrative — prefers AI-synthesized text when available, silently falls back to deterministic */}
      {(data.ai_narrative || data.primary_narrative) && (
        <Animated.View entering={reduceMotion ? FadeInDown.duration(0) : FadeInDown.duration(800).delay(300)} style={styles.heroSection}>
          <Text style={[styles.heroNarrative, { color: colors.textPrimary }]}>
            {data.ai_narrative ?? data.primary_narrative}
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
            <DynamicIcon name="ChevronUp" size={16} color={colors.textMuted} /> : 
            <DynamicIcon name="ChevronDown" size={16} color={colors.textMuted} />
          }
        </TouchableOpacity>

        {showMetrics && (
          <Animated.View 
            entering={reduceMotion ? FadeInDown.duration(0) : FadeInDown.duration(400)} 
            exiting={FadeOut.duration(300)}
            style={styles.metricsContainer}
          >
            {renderMetric("Layers", "Cognitive Complexity", data.complexity_score || 0, "Fragmentation of optimization paths")}
            {renderMetric("Maximize", "Portfolio Redundancy", data.redundancy_score || 0, "Overlap in strategic category coverage")}
            {renderMetric("Zap", "Value Density", data.value_density || 0, "Realized value vs. annual fee burden")}
            {renderMetric("Activity", "Strategic Alignment", data.strategic_alignment_score || 0, "Alignment with longitudinal goals")}
          </Animated.View>
        )}
      </Animated.View>

    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  skeletonHeader: {
    height: 32,
    width: 200,
    backgroundColor: '#333',
    borderRadius: 8,
    marginBottom: 40,
    opacity: 0.5,
  },
  skeletonBody: {
    height: 100,
    width: '100%',
    backgroundColor: '#333',
    borderRadius: 16,
    marginBottom: 16,
    opacity: 0.5,
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
    fontWeight: tokens.fontWeight.heavy,
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
    fontSize: tokens.fontSize.display,
    lineHeight: tokens.fontSize.display * 1.3,
    fontWeight: tokens.fontWeight.heavy,
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
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.5,
  },
  barTrack: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
});
