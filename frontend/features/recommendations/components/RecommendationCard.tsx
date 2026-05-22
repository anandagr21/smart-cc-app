import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sparkles, AlertCircle } from 'lucide-react-native';
import { RankedCardResponse } from '../types/api';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { AnimatedContainer } from '../../../components/ui/AnimatedContainer';
import { Card } from '../../../components/ui/Card';

interface RecommendationCardProps {
  card: RankedCardResponse;
  index: number;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ card, index }) => {
  const isTopRank = card.rank === 1;
  const colors = useThemeColors();
  const animationDelay = 150 + index * 150;

  if (isTopRank) {
    return (
      <AnimatedContainer delay={animationDelay}>
        <View className="flex-row items-center mb-6 mt-2">
          {/* @ts-ignore */}
          <Sparkles size={24} color={colors.success} strokeWidth={2.5} />
          <Text style={{ color: colors.textPrimary }} className="text-2xl font-bold ml-3 tracking-tight">Optimal Strategy</Text>
        </View>

        <Card variant="elevated" padded={false} className="mb-8">
          {/* Top header */}
          <View 
            style={{ backgroundColor: `${colors.success}1A`, borderBottomColor: colors.borderHighlight, borderBottomWidth: StyleSheet.hairlineWidth }} 
            className="px-6 py-5 flex-row justify-between items-center"
          >
            <View className="flex-1 pr-4">
              <Text style={{ color: colors.textPrimary }} className="font-bold text-2xl tracking-tight">{card.card_name}</Text>
            </View>
            <View style={{ backgroundColor: colors.success }} className="px-4 py-1.5 rounded-full shadow-sm">
              <Text style={{ color: '#FFFFFF' }} className="font-bold tracking-wide">Rank 1</Text>
            </View>
          </View>
          
          {/* Huge Reward Value Content */}
          <View className="px-6 py-10 items-center">
            <Text style={{ color: colors.textMuted }} className="text-xs mb-3 uppercase tracking-widest font-bold">
              Maximum Value Found
            </Text>
            <View className="flex-row items-baseline mb-6">
              <Text style={{ color: colors.success }} className="font-bold text-7xl tracking-tighter">
                ₹{card.effective_reward_value}
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary }} className="text-center leading-7 text-base max-w-[90%] font-medium">
              {card.recommendation_reason}
            </Text>
            <View style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }} className="mt-6 px-5 py-2 rounded-full">
              <Text style={{ color: colors.textSecondary }} className="font-bold text-sm">Earned via {card.reward_type}</Text>
            </View>
          </View>

          {/* Warnings Section */}
          {card.warnings.length > 0 && (
            <View 
              style={{ backgroundColor: `${colors.warning}1A`, borderTopColor: `${colors.warning}33`, borderTopWidth: StyleSheet.hairlineWidth }} 
              className="px-6 py-5 flex-row items-start"
            >
              {/* @ts-ignore */}
              <AlertCircle size={20} color={colors.warning} style={{ marginTop: 2 }} />
              <View className="ml-4 flex-1">
                {card.warnings.map((warning, i) => (
                  <Text key={i} style={{ color: colors.warning }} className="text-sm leading-6 font-medium mb-1">{warning}</Text>
                ))}
              </View>
            </View>
          )}
        </Card>
      </AnimatedContainer>
    );
  }

  return (
    <AnimatedContainer delay={animationDelay}>
      <Card variant="solid" className="mb-4 flex-row justify-between items-center opacity-90 p-5">
        <View className="flex-1 pr-6">
          <Text style={{ color: colors.textPrimary }} className="font-bold text-xl tracking-tight mb-2">{card.card_name}</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm leading-5 font-medium" numberOfLines={2}>
            {card.recommendation_reason}
          </Text>
        </View>
        <View style={{ borderLeftColor: colors.border, borderLeftWidth: StyleSheet.hairlineWidth }} className="items-end pl-5">
          <Text style={{ color: colors.textPrimary }} className="font-bold text-3xl tracking-tight">₹{card.effective_reward_value}</Text>
          <Text style={{ color: colors.textMuted }} className="text-[10px] font-bold mt-1 uppercase tracking-widest">RANK {card.rank}</Text>
        </View>
      </Card>
    </AnimatedContainer>
  );
};
