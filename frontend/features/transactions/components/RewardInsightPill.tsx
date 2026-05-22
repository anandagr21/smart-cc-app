import React from 'react';
import { View, Text } from 'react-native';
import { Sparkles, ArrowUpRight } from 'lucide-react-native';

interface RewardInsightPillProps {
  rewardEarned?: number | null;
  rewardType?: string | null;
  missedSavings?: number | null;
}

export function RewardInsightPill({ rewardEarned, rewardType, missedSavings }: RewardInsightPillProps) {
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
      <View className="flex-row items-center bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
        <Sparkles size={10} color="#34d399" className="mr-1" />
        <Text className="text-emerald-400 text-xs font-semibold">{formattedReward}</Text>
      </View>
      
      {hasMissedSavings ? (
        <View className="flex-row items-center ml-2 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
          <ArrowUpRight size={10} color="#9ca3af" className="mr-1" />
          <Text className="text-textMuted text-[10px] font-medium">could have earned ₹{(numericReward + numericMissed).toFixed(0)}</Text>
        </View>
      ) : null}
    </View>
  );
}
