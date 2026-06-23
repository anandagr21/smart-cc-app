import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { MonthlySummaryResponse } from '../types/monthly_intelligence.types';

interface BehavioralHighlightsProps {
  summary: MonthlySummaryResponse;
  onPressExplain?: (item: any) => void;
}

export const BehavioralHighlights: React.FC<BehavioralHighlightsProps> = ({ summary, onPressExplain }) => {
  const colors = useThemeColors();

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
          <TouchableOpacity
            key={h.id}
            style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            activeOpacity={onPressExplain ? 0.8 : 1}
            disabled={!onPressExplain}
            onPress={() => onPressExplain?.({
              text: h.title,
              reasoning: h.text,
              metrics: { [h.title]: h.metric }
            })}
          >
            <Text style={[styles.cardTitle, { color: colors.textMuted }]}>{h.title}</Text>
            <Text style={[styles.cardText, { color: colors.textPrimary }]} numberOfLines={3}>
              {h.text}
            </Text>
            <Text style={[styles.cardMetric, { color: colors.textSecondary }]}>
              {h.metric}
            </Text>
          </TouchableOpacity>
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
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    flexGrow: 1,
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: tokens.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.wide,
    marginBottom: 8,
  },
  cardText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 18,
    marginBottom: 16,
  },
  cardMetric: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
  },
});
