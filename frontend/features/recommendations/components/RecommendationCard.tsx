import React from 'react';
import { View, Text } from 'react-native';
import { Zap, AlertCircle } from 'lucide-react-native';
import { RankedCardResponse } from '../types/api';
import { colors } from '../../../theme/colors';
import { AnimatedContainer } from '../../../components/ui/AnimatedContainer';

interface RecommendationCardProps {
  card: RankedCardResponse;
  index: number;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ card, index }) => {
  const isTopRank = card.rank === 1;

  // Stagger the entrance based on rank index
  const animationDelay = 100 + index * 100;

  if (isTopRank) {
    return (
      <AnimatedContainer delay={animationDelay}>
        <View className="flex-row items-center mb-4 mt-2">
          {/* @ts-ignore */}
          <Zap size={20} color={colors.accent} />
          <Text className="text-lg font-bold text-textPrimary ml-2">Best Match</Text>
        </View>

        <View className="bg-card rounded-2xl border border-accent overflow-hidden shadow-lg shadow-accent/20">
          <View className="p-5 bg-[#10B98110]">
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-1 pr-4">
                <Text className="text-textPrimary font-bold text-xl">{card.card_name}</Text>
                <Text className="text-textSecondary mt-1 leading-5">{card.recommendation_reason}</Text>
              </View>
              <View className="bg-accent/20 px-3 py-1 rounded-full border border-accent/30">
                <Text className="text-accent font-bold">Rank 1</Text>
              </View>
            </View>
            
            <View className="bg-background rounded-xl p-5 mt-2 border border-border/50">
              <Text className="text-textSecondary text-sm mb-1 uppercase tracking-wider font-semibold">
                Estimated Value
              </Text>
              <View className="flex-row items-baseline">
                <Text className="text-accent font-bold text-4xl">₹{card.effective_reward_value}</Text>
                <Text className="text-textSecondary ml-2 font-medium">via {card.reward_type}</Text>
              </View>
            </View>

            {card.warnings.length > 0 && (
              <View className="mt-4 flex-row bg-[#F59E0B15] p-3 rounded-lg border border-[#F59E0B30]">
                {/* @ts-ignore */}
                <AlertCircle size={16} color={colors.warning} style={{ marginTop: 2 }} />
                <View className="ml-2 flex-1">
                  {card.warnings.map((warning, i) => (
                    <Text key={i} className="text-[#F59E0B] text-sm">{warning}</Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </AnimatedContainer>
    );
  }

  return (
    <AnimatedContainer delay={animationDelay}>
      <View className="bg-card rounded-2xl border border-border p-4 mb-3 flex-row justify-between items-center opacity-80">
        <View className="flex-1 pr-4">
          <Text className="text-textPrimary font-bold text-lg">{card.card_name}</Text>
          <Text className="text-textSecondary text-xs mt-1" numberOfLines={1}>
            {card.recommendation_reason}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-textPrimary font-bold text-xl">₹{card.effective_reward_value}</Text>
          <Text className="text-textSecondary text-xs">Rank {card.rank}</Text>
        </View>
      </View>
    </AnimatedContainer>
  );
};
