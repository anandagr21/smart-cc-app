import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { UserCardResponse } from '@/features/cards/types/api';
import { RankedCardResponse } from '@/features/recommendations/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { formatCurrencyIN } from '@/utils/currency';

interface SecondaryRecommendationCardProps {
  card: UserCardResponse;
  recommendation: RankedCardResponse;
  isActive: boolean;
  onPress: () => void;
}

export const SecondaryRecommendationCard: React.FC<SecondaryRecommendationCardProps> = ({
  card,
  recommendation,
  isActive,
  onPress,
}) => {
  const colors = useThemeColors();

  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const estimatedRewardValue = recommendation.total_projected_value || recommendation.portfolio_score;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: withSpring(isActive ? 1.02 : 1, { damping: 20, stiffness: 200 }) }],
      borderColor: withSpring(isActive ? '#10B981' : colors.glassBorder),
      backgroundColor: withSpring(isActive ? 'rgba(16, 185, 129, 0.05)' : colors.surfaceElevated),
    };
  });

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.container, animatedStyle]}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.touchable}>
        <View style={styles.cardContent}>
          
          {/* Strategy Tag */}
          <View style={styles.strategyRow}>
            <Text style={[styles.strategyText, { color: isActive ? '#10B981' : colors.textMuted }]} numberOfLines={1}>
              {recommendation.primary_strategy?.toUpperCase() || 'ALTERNATIVE'}
            </Text>
          </View>
          
          {/* Card Name */}
          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
            {cardName}
          </Text>

          {/* Value */}
          <View style={styles.valueRow}>
            <Text style={styles.rewardAmount} numberOfLines={1}>
              {formatCurrencyIN(estimatedRewardValue)}
            </Text>
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
    height: 90,
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
  },
  strategyText: {
    fontSize: tokens.fontSize.micro - 1,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
  },
  cardName: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
  valueRow: {
    marginTop: 'auto',
    alignItems: 'flex-start',
  },
  rewardAmount: {
    color: '#10B981',
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.heavy,
  },
});
