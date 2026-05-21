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

  // Smoother staggered entrance
  const animationDelay = 150 + index * 150;

  if (isTopRank) {
    return (
      <AnimatedContainer delay={animationDelay}>
        <View className="flex-row items-center mb-5 mt-2">
          {/* @ts-ignore */}
          <Zap size={20} color={colors.accent} />
          <Text className="text-xl font-bold text-textPrimary ml-2 tracking-tight">Best Match</Text>
        </View>

        <View className="rounded-3xl border border-white/10 overflow-hidden shadow-glow bg-surface">
          {/* Glassy top header */}
          <View className="px-6 py-5 bg-accent/10 border-b border-white/5 flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-textPrimary font-bold text-2xl tracking-tight">{card.card_name}</Text>
            </View>
            <View className="bg-accent px-4 py-1.5 rounded-full shadow-sm shadow-accent/40">
              <Text className="text-[#09090B] font-bold tracking-wide">Rank 1</Text>
            </View>
          </View>
          
          {/* Huge Reward Value Content */}
          <View className="px-6 py-8 items-center bg-gradient-to-b from-transparent to-black/20">
            <Text className="text-textMuted text-sm mb-2 uppercase tracking-widest font-semibold">
              Estimated Value
            </Text>
            <View className="flex-row items-baseline mb-4">
              <Text className="text-accent font-bold text-6xl tracking-tighter shadow-sm shadow-accent/20">
                ₹{card.effective_reward_value}
              </Text>
            </View>
            <Text className="text-textSecondary text-center leading-6 max-w-[90%]">
              {card.recommendation_reason}
            </Text>
            <View className="mt-4 px-4 py-1.5 rounded-full border border-white/5 bg-white/5">
              <Text className="text-textSecondary font-medium">Earned via {card.reward_type}</Text>
            </View>
          </View>

          {/* Warnings Section */}
          {card.warnings.length > 0 && (
            <View className="bg-[#F59E0B10] px-6 py-4 border-t border-[#F59E0B20] flex-row items-start">
              {/* @ts-ignore */}
              <AlertCircle size={18} color={colors.warning} style={{ marginTop: 2 }} />
              <View className="ml-3 flex-1">
                {card.warnings.map((warning, i) => (
                  <Text key={i} className="text-[#F59E0B] text-sm leading-5 font-medium">{warning}</Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </AnimatedContainer>
    );
  }

  return (
    <AnimatedContainer delay={animationDelay}>
      <View className="bg-surfaceElevated rounded-2xl border border-white/5 p-5 mb-4 flex-row justify-between items-center opacity-90 shadow-lg shadow-black/20">
        <View className="flex-1 pr-6">
          <Text className="text-textPrimary font-bold text-xl tracking-tight mb-1">{card.card_name}</Text>
          <Text className="text-textMuted text-sm leading-5" numberOfLines={2}>
            {card.recommendation_reason}
          </Text>
        </View>
        <View className="items-end pl-4 border-l border-white/5">
          <Text className="text-textPrimary font-bold text-3xl tracking-tight">₹{card.effective_reward_value}</Text>
          <Text className="text-textMuted text-xs font-semibold mt-1">RANK {card.rank}</Text>
        </View>
      </View>
    </AnimatedContainer>
  );
};
