import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { MonthlySummaryResponse } from '../types/monthly_intelligence.types';

interface BehavioralHighlightsProps {
  summary: MonthlySummaryResponse;
}

export const BehavioralHighlights: React.FC<BehavioralHighlightsProps> = ({ summary }) => {
  const colors = useThemeColors();

  // Extract 2-4 key metrics. 
  // We want sentences, not just raw KPIs.
  
  const highlights = [];

  if (summary.optimization_rate > 0) {
    highlights.push({
      id: 'opt',
      title: 'Overall Optimization',
      text: summary.optimization_rate > 70 
        ? 'Most purchases were optimized effectively this month.'
        : 'There is room for optimization in your daily spending.',
      metric: `${summary.optimization_rate.toFixed(1)}%`,
    });
  }

  if (summary.strongest_category) {
    highlights.push({
      id: 'cat',
      title: 'Dominant Category',
      text: `Your ${summary.strongest_category} behavior showed the strongest optimization discipline.`,
      metric: summary.strongest_category,
    });
  }

  if (summary.improvement_delta > 0) {
    highlights.push({
      id: 'delta',
      title: 'Behavioral Shift',
      text: 'Your reward efficiency improved compared to last month.',
      metric: `+${summary.improvement_delta.toFixed(1)}%`,
    });
  } else if (summary.improvement_delta < 0) {
    highlights.push({
      id: 'delta',
      title: 'Behavioral Shift',
      text: 'Your reward efficiency saw a slight decrease.',
      metric: `${summary.improvement_delta.toFixed(1)}%`,
    });
  }

  if (highlights.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>BEHAVIORAL HIGHLIGHTS</Text>
      
      <View style={styles.grid}>
        {highlights.slice(0, 4).map((h) => (
          <View key={h.id} style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textMuted }]}>{h.title}</Text>
            <Text style={[styles.cardText, { color: colors.textPrimary }]} numberOfLines={3}>
              {h.text}
            </Text>
            <Text style={[styles.cardMetric, { color: colors.textSecondary }]}>
              {h.metric}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: tokens.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontSize: tokens.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.wide,
    marginBottom: 8,
  },
  cardText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 22,
    marginBottom: 12,
  },
  cardMetric: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
});
