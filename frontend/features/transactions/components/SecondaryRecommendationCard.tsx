import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { UserCardResponse } from '@/features/cards/types/api';
import { OptimizerRankedCard } from '@/features/recommendations/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { formatCurrencyIN } from '@/utils/currency';
import { Info } from 'lucide-react-native';

interface SecondaryRecommendationCardProps {
  card: UserCardResponse;
  recommendation: OptimizerRankedCard;
  isActive: boolean;
  onPress: () => void;
  onInfoPress?: () => void;
}

export const SecondaryRecommendationCard: React.FC<SecondaryRecommendationCardProps> = ({
  card,
  recommendation,
  isActive,
  onPress,
  onInfoPress,
}) => {
  const colors = useThemeColors();

  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const estimatedRewardValue = recommendation.immediate_reward_value + recommendation.fee_waiver_progress_impact;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isActive ? 1.02 : 1, { damping: 20, stiffness: 200 }) }],
      borderColor: withSpring(isActive ? colors.primary : colors.border),
      backgroundColor: withSpring(isActive ? colors.primarySoft : colors.surfaceElevated),
    };
  });

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.container, animatedStyle]}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.touchable}>
        <View style={styles.cardContent}>
          
          {/* Strategy Tag */}
          <View style={styles.strategyRow}>
            <Text style={[styles.strategyText, { color: isActive ? colors.primary : colors.textMuted }]} numberOfLines={1}>
              {recommendation.confidence_label?.toUpperCase() || 'ALTERNATIVE'}
            </Text>
            {onInfoPress && (
              <TouchableOpacity hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} onPress={onInfoPress}>
                {/* @ts-ignore */}
                <Info size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Card Name */}
          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={2}>
            {cardName}
          </Text>

          {/* Value */}
          <View style={[styles.valueRow, { flexDirection: 'row', alignItems: 'baseline' }]}>
            <Text style={[styles.rewardAmount, { color: colors.success }]} numberOfLines={1}>
              {formatCurrencyIN(recommendation.immediate_reward_value)}
            </Text>
            {recommendation.fee_waiver_progress_impact > 0 && (
              <Text style={[styles.rewardAmount, { fontSize: tokens.fontSize.micro, marginLeft: 4, color: colors.primary }]} numberOfLines={1}>
                + {formatCurrencyIN(recommendation.fee_waiver_progress_impact)}
              </Text>
            )}
          </View>

        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    width: 140, // More compact
    height: 106, // Increased height to fit 2 lines of text cleanly
    marginRight: 12,
    overflow: 'hidden',
  },
  touchable: {
    flex: 1,
    padding: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  strategyRow: {
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strategyText: {
    flex: 1,
    fontSize: tokens.fontSize.micro - 1,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  cardName: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    lineHeight: 16,
    marginBottom: 4,
  },
  valueRow: {
    marginTop: 'auto',
    alignItems: 'flex-start',
  },
  rewardAmount: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.heavy,
  },
});
