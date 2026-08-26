import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AccessibilityInfo } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TransactionResponse } from '../types/transaction.types';
import { getCategoryAccent } from '../utils/categoryAccents';
import { useCards } from '@/features/cards/hooks/useCards';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { RewardInsightPill } from './RewardInsightPill';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

interface TransactionRowProps {
  transaction: TransactionResponse;
  onPress: (transaction: TransactionResponse) => void;
  index?: number;
}

function formatAmount(amt: number): string {
  return `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const TransactionRow: React.FC<TransactionRowProps> = React.memo(({
  transaction,
  onPress,
  index = 0,
}) => {
  const colors = useThemeColors();
  const isDark = colors.isDark;
  const { data: cards } = useCards();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: tokens.duration.fast });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: tokens.duration.fast });
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const matchedCard = cards?.find((c) => c.id === transaction.user_card_id);
  const cardName = matchedCard?.nickname || matchedCard?.card_details?.card_name || 'Card';

  const categoryAccent = getCategoryAccent(transaction.category || 'OTHER');
  const iconName = categoryAccent.iconName;

  const isDifferent =
    transaction.normalized_merchant &&
    transaction.merchant_name &&
    transaction.normalized_merchant.toLowerCase() !== transaction.merchant_name.toLowerCase();

  return (
    <Animated.View entering={reduceMotion ? FadeInDown.duration(0) : FadeInDown.delay(index * 35).springify()}>
      <TouchableOpacity
        onPress={() => onPress(transaction)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        delayPressIn={50}
      >
        <Animated.View
          style={[
            styles.row,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            animStyle,
          ]}
        >
          {/* Circular Merchant Icon */}
          <View
            style={[
              styles.merchantAvatar,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 82, 255, 0.06)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <DynamicIcon
              name={iconName}
              size={18}
              color={isDark ? '#FFFFFF' : colors.primary}
              strokeWidth={2}
            />
          </View>

          {/* Merchant & Metadata */}
          <View style={styles.leftContent}>
            <Text style={[styles.merchantName, { color: colors.textPrimary }]} numberOfLines={1}>
              {transaction.normalized_merchant || transaction.merchant_name || 'Transaction'}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {cardName}
              </Text>
              {isDifferent && (
                <Text style={[styles.rawMerchantText, { color: colors.textMuted }]} numberOfLines={1}>
                  • {transaction.merchant_name}
                </Text>
              )}
            </View>
            <RewardInsightPill
              rewardEarned={transaction.reward_earned}
              rewardType={transaction.reward_type}
              missedSavings={transaction.missed_savings}
            />
          </View>

          {/* Transaction Amount */}
          <View style={styles.amountWrap}>
            <Text style={[styles.amountText, { color: colors.textPrimary }]}>
              {formatAmount(transaction.amount)}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  merchantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 14,
  },
  leftContent: {
    flex: 1,
    marginRight: 12,
  },
  merchantName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  rawMerchantText: {
    fontSize: tokens.fontSize.caption,
    marginLeft: 4,
  },
  amountWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: -0.4,
  },
});
