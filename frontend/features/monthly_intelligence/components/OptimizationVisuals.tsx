import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { MonthlySummaryResponse } from '../types/monthly_intelligence.types';
import { formatCurrencyIN } from '@/utils/currency';

interface OptimizationVisualsProps {
  summary: MonthlySummaryResponse;
}

export const OptimizationVisuals: React.FC<OptimizationVisualsProps> = ({ summary }) => {
  const colors = useThemeColors();

  const captured = summary.total_rewards_optimized || 0;
  const missed = summary.missed_opportunity_value || 0;
  
  if (captured === 0 && missed === 0) return null;

  const pieData = [
    {
      value: captured,
      color: colors.success,
      focused: true,
    },
    {
      value: missed,
      color: colors.danger,
    },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>OPTIMIZATION BREAKDOWN</Text>
      
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.chartContainer}>
          <PieChart
            donut
            innerRadius={60}
            radius={80}
            data={pieData}
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={[styles.scoreText, { color: colors.textPrimary }]}>
                  {Math.round(summary.optimization_rate)}%
                </Text>
                <Text style={[styles.scoreSubtext, { color: colors.textSecondary }]}>
                  Score
                </Text>
              </View>
            )}
            animationDuration={1000}
            isAnimated
          />
        </View>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <View>
              <Text style={[styles.legendValue, { color: colors.textPrimary }]}>
                {formatCurrencyIN(captured)}
              </Text>
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                Captured
              </Text>
            </View>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.danger }]} />
            <View>
              <Text style={[styles.legendValue, { color: colors.textPrimary }]}>
                {formatCurrencyIN(missed)}
              </Text>
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                Missed
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
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
  card: {
    padding: 24,
    borderRadius: tokens.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.heavy,
  },
  scoreSubtext: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    marginTop: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  legendValue: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
  },
  legendLabel: {
    fontSize: tokens.fontSize.caption,
    marginTop: 2,
  },
});
