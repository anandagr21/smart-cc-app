import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import Animated, { FadeIn, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { UserCardResponse } from '@/features/cards/types/api';
import { OptimizerRankedCard } from '@/features/recommendations/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { formatCurrencyIN } from '@/utils/currency';
import { DynamicIcon } from '@/components/DynamicIcon';

interface WalletListRowProps {
  card: UserCardResponse;
  isActive: boolean;
  onPress: (id: string) => void;
  recommendation?: OptimizerRankedCard;
}

export const WalletListRow: React.FC<WalletListRowProps> = ({
  card,
  isActive,
  onPress,
  recommendation,
}) => {
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  
  const cardName = card.nickname || card.card_details?.card_name || 'Card';
  const bankName = card.card_details?.bank_name || 'Bank';
  
  const network = card.network_override || card.card_details?.network || 'VISA';
  const displayNetwork = network.toUpperCase() === 'NA' || network.toUpperCase() === 'N/A' ? '' : network;

  const getBadgeText = () => {
    if (!recommendation) return '';
    const strategyName = recommendation.confidence_label || 'OPTIMAL';
    const value = formatCurrencyIN(recommendation.immediate_reward_value + recommendation.fee_waiver_progress_impact);
    return `${strategyName} · ${value}`;
  };
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: withTiming(isActive ? colors.primarySoft : colors.surfaceElevated, { duration: 200 }),
      borderColor: withTiming(isActive ? colors.primary : colors.border, { duration: 200 }),
      transform: [{ scale: withSpring(isActive ? 1.02 : 1, { damping: 15, stiffness: 150 }) }]
    };
  });

  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <TouchableOpacity
        activeOpacity={card.card_status === 'ACTIVE' ? 0.8 : 1}
        onPress={() => card.card_status === 'ACTIVE' && onPress(card.id)}
      >
        <Animated.View style={[styles.cardWrap, animatedStyle, { opacity: card.card_status === 'ACTIVE' ? 1 : 0.5 }]}>
          <View style={styles.leftContent}>
            <View style={[styles.iconWrap, { backgroundColor: isActive ? colors.primarySoft : colors.surfaceElevated }]}>
              <DynamicIcon name="CreditCard" size={16} color={isActive ? colors.primary : colors.textMuted} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: isActive ? colors.primary : colors.textPrimary }]} numberOfLines={1}>
                {cardName}
              </Text>
              <Text style={[styles.bankName, { color: colors.textMuted }]} numberOfLines={1}>
                {bankName}{displayNetwork ? ` • ${displayNetwork}` : ''}
                {card.last_4_digits ? ` •••• ${card.last_4_digits}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.rightContent}>
            {recommendation && card.card_status === 'ACTIVE' && (
              <Animated.View entering={FadeIn} style={[styles.recommendationBadge, { backgroundColor: colors.primarySoft }]}>
                <DynamicIcon name="Sparkles" size={10} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.recommendationText, { color: colors.primary }]} numberOfLines={1}>
                  {getBadgeText()}
                </Text>
              </Animated.View>
            )}
            
            <View style={styles.checkCircleWrapper}>
              {isActive && card.card_status === 'ACTIVE' ? (
                <View style={[styles.checkCircle, { borderColor: colors.primary, backgroundColor: colors.primary }]}>
                  <DynamicIcon name="Check" size={12} color="#FFF" />
                </View>
              ) : card.card_status === 'ACTIVE' ? (
                <View style={[styles.checkCircle, { borderColor: colors.border, backgroundColor: 'transparent' }]} />
              ) : (
                <View style={styles.inactiveBadgeWrapper}>
                  <Text style={[styles.inactiveText, { color: colors.textMuted }]}>INACTIVE</Text>
                </View>
              )}
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
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 2,
  },
  bankName: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  recommendationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    marginRight: 12,
    maxWidth: 160,
  },
  recommendationText: {
    fontSize: 9,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
  },
  checkCircleWrapper: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveBadgeWrapper: {
    backgroundColor: 'rgba(150,150,150,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: tokens.radius.xs,
  },
  inactiveText: {
    fontSize: 9,
    fontWeight: tokens.fontWeight.medium,
  },
});
