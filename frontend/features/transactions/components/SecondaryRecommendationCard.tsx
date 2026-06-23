import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { UserCardResponse } from '@/features/cards/types/api';
import { OptimizerRankedCard } from '@/features/recommendations/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { formatCurrencyIN } from '@/utils/currency';

import { DynamicIcon } from '@/components/DynamicIcon';

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
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(isActive ? colors.primarySoft : colors.surfaceElevated, { duration: 200 }),
      borderColor: withTiming(isActive ? colors.primary : colors.border, { duration: 200 }),
      transform: [{ scale: withSpring(isActive ? 1.02 : 1, { damping: 15, stiffness: 150 }) }]
    };
  });

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        <Animated.View style={[styles.cardWrap, animatedStyle]}>
          <View style={styles.leftContent}>
            <View style={[styles.iconWrap, { backgroundColor: isActive ? colors.primarySoft : colors.surfaceElevated }]}>
              <DynamicIcon name="CreditCard" size={16} color={isActive ? colors.primary : colors.textMuted} />
            </View>
            <View style={styles.textStack}>
              <Text style={[styles.strategyText, { color: isActive ? colors.primary : colors.textMuted }]} numberOfLines={1}>
                {recommendation.confidence_label?.toUpperCase() || 'ALTERNATIVE'}
              </Text>
              <Text style={[styles.cardName, { color: isActive ? colors.primary : colors.textPrimary }]} numberOfLines={1}>
                {cardName}
              </Text>
            </View>
          </View>

          <View style={styles.rightContent}>
            <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
              <Text style={[styles.rewardAmount, { color: colors.success }]} numberOfLines={1}>
                {formatCurrencyIN(recommendation.immediate_reward_value)}
              </Text>
              {recommendation.fee_waiver_progress_impact > 0 && (
                <Text style={[styles.feeAmount, { color: colors.primary }]} numberOfLines={1}>
                  + {formatCurrencyIN(recommendation.fee_waiver_progress_impact)}
                </Text>
              )}
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {onInfoPress && (
                <TouchableOpacity hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }} onPress={onInfoPress} style={{ marginRight: 12 }}>
                  <DynamicIcon name="Info" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              <View style={[styles.checkCircle, { borderColor: isActive ? colors.primary : colors.border, backgroundColor: isActive ? colors.primary : 'transparent' }]}>
                {isActive && <DynamicIcon name="Check" size={12} color="#FFF" />}
              </View>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textStack: {
    flex: 1,
  },
  strategyText: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  cardName: {
    fontSize: 14,
    fontWeight: tokens.fontWeight.bold,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: tokens.fontWeight.heavy,
  },
  feeAmount: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.bold,
    marginTop: 2,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
