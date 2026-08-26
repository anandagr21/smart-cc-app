import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

interface RewardInsightPillProps {
  rewardEarned?: number | string | null;
  rewardType?: string | null;
  missedSavings?: number | string | null;
}

export function RewardInsightPill({ rewardEarned, rewardType, missedSavings }: RewardInsightPillProps) {
  const colors = useThemeColors();
  const isDark = colors.isDark;

  if (rewardEarned === undefined || rewardEarned === null) {
    return null;
  }

  const numericReward = typeof rewardEarned === 'string' ? parseFloat(rewardEarned) : rewardEarned;
  const numericMissed = typeof missedSavings === 'string' ? parseFloat(missedSavings) : missedSavings;

  const isPoints = rewardType?.toLowerCase().includes('point');
  const formattedReward = isPoints
    ? `+${Math.round(numericReward)} pts`
    : `+₹${numericReward.toFixed(0)}`;

  const hasMissedSavings = numericMissed && numericMissed > 0;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.10)',
            borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.20)',
          },
        ]}
      >
        <DynamicIcon name="Sparkles" size={10} color="#10B981" style={styles.icon} strokeWidth={2.4} />
        <Text style={styles.rewardText}>{formattedReward}</Text>
      </View>

      {hasMissedSavings ? (
        <View
          style={[
            styles.pill,
            {
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.10)' : 'rgba(245, 158, 11, 0.08)',
              borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.20)',
              marginLeft: 6,
            },
          ]}
        >
          <DynamicIcon name="ArrowUpRight" size={10} color="#F59E0B" style={styles.icon} strokeWidth={2.4} />
          <Text style={styles.missedText} numberOfLines={1}>
            opt. ₹{(numericReward + numericMissed).toFixed(0)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
  rewardText: {
    color: '#10B981',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
  },
  missedText: {
    color: '#F59E0B',
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.semibold,
  },
});
