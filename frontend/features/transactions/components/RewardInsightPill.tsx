import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

interface RewardInsightPillProps {
  rewardEarned?: number | null;
  rewardType?: string | null;
  missedSavings?: number | null;
}

export function RewardInsightPill({ rewardEarned, rewardType, missedSavings }: RewardInsightPillProps) {
  const colors = useThemeColors();

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
      <View style={[styles.pill, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
        <DynamicIcon name="Sparkles" size={10} color={colors.success} style={styles.icon} strokeWidth={2.5} />
        <Text style={[styles.text, { color: colors.success }]}>{formattedReward}</Text>
      </View>
      
      {hasMissedSavings ? (
        <View style={[styles.pill, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight, marginLeft: 6 }]}>
          <DynamicIcon name="ArrowUpRight" size={10} color={colors.textMuted} style={styles.icon} strokeWidth={2.5} />
          <Text style={[styles.text, { color: colors.textMuted }]}>
            could be ₹{(numericReward + numericMissed).toFixed(0)}
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.2,
  },
});
