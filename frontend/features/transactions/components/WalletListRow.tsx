import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import Animated, { FadeIn, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { UserCardResponse } from '@/features/cards/types/api';
import { OptimizerRankedCard } from '@/features/recommendations/types/api';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { formatCurrencyIN } from '@/utils/currency';

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
      transform: [{ scale: withSpring(isActive ? 1.01 : 1, { damping: 20, stiffness: 200 }) }],
      borderColor: withSpring(isActive ? colors.success : 'transparent'),
      backgroundColor: withSpring(isActive ? colors.surfaceElevated : colors.background),
      opacity: card.card_status === 'ACTIVE' ? 1 : 0.5,
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={card.card_status === 'ACTIVE' ? 0.7 : 1}
        onPress={() => onPress(card.id)}
        style={styles.touchable}
      >
        <View style={styles.leftContent}>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
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
            <Animated.View entering={FadeIn} style={styles.recommendationBadge}>
              {/* @ts-ignore */}
              <Sparkles size={10} color={colors.success} style={{ marginRight: 4 }} />
              <Text style={[styles.recommendationText, { color: colors.success }]} numberOfLines={1}>
                {getBadgeText()}
              </Text>
            </Animated.View>
          )}
          
          <View style={styles.checkCircleWrapper}>
            {isActive && card.card_status === 'ACTIVE' && (
              <Animated.View entering={FadeIn.duration(200)}>
                {/* @ts-ignore */}
                <CheckCircle2 size={18} color={colors.success} weight="fill" />
              </Animated.View>
            )}
            {card.card_status !== 'ACTIVE' && (
              <View style={styles.inactiveBadgeWrapper}>
                <Text style={[styles.inactiveText, { color: colors.textMuted }]}>INACTIVE</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.radius.md,
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  touchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 64,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)', // Subtle success tint
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    marginRight: 8,
    maxWidth: 160, // Prevent taking up the whole row
  },
  recommendationText: {
    fontSize: tokens.fontSize.micro - 1,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
  },
  checkCircleWrapper: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inactiveBadgeWrapper: {
    backgroundColor: 'rgba(150,150,150,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveText: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.medium,
  },
});
