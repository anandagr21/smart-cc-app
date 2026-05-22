import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles, ArrowUpRight } from 'lucide-react-native';
import { useThemeColors } from '../../theme/hooks/useThemeColors';

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

  // Backend might serialize Decimal as string, ensure it's a number
  const numericReward = typeof rewardEarned === 'string' ? parseFloat(rewardEarned) : rewardEarned;
  const numericMissed = typeof missedSavings === 'string' ? parseFloat(missedSavings) : missedSavings;

  const isPoints = rewardType?.toLowerCase().includes('point');
  const formattedReward = isPoints 
    ? `+${Math.round(numericReward)} pts`
    : `+₹${numericReward.toFixed(0)}`;

  const hasMissedSavings = numericMissed && numericMissed > 0;

  return (
    <View className="flex-row items-center mt-1">
      <View 
        style={{ backgroundColor: `${colors.success}1A`, borderColor: `${colors.success}33`, borderWidth: StyleSheet.hairlineWidth }} 
        className="flex-row items-center px-2 py-0.5 rounded-full"
      >
        <Sparkles size={10} color={colors.success} className="mr-1" />
        <Text style={{ color: colors.success }} className="text-[10px] font-bold uppercase tracking-widest">{formattedReward}</Text>
      </View>
      
      {hasMissedSavings ? (
        <View 
          style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight, borderWidth: StyleSheet.hairlineWidth }} 
          className="flex-row items-center ml-2 px-2 py-0.5 rounded-full"
        >
          <ArrowUpRight size={10} color={colors.textMuted} className="mr-1" />
          <Text style={{ color: colors.textMuted }} className="text-[10px] font-bold uppercase tracking-widest">could be ₹{(numericReward + numericMissed).toFixed(0)}</Text>
        </View>
      ) : null}
    </View>
  );
}
