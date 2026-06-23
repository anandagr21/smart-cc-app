import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AccessibilityInfo } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TransactionResponse } from '../types/transaction.types';
import { getCategoryAccent } from '../utils/categoryAccents';
import { useCards } from '@/features/cards/hooks/useCards';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { RewardInsightPill } from './RewardInsightPill';
import { tokens } from '@/theme/tokens';
import { getNetworkGradient } from '@/theme/colors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { DynamicIcon } from '@/components/DynamicIcon';

interface TransactionRowProps {
  transaction: TransactionResponse;
  onPress: (transaction: TransactionResponse) => void;
  index: number;
}

export const TransactionRow = React.memo(({ transaction, onPress, index }: TransactionRowProps) => {
  const { data: cardsData } = useCards();
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const [reduceMotion, setReduceMotion] = useState(false);
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const card = cardsData?.find((c) => c.id === transaction.user_card_id);
  const cardName = card?.nickname || card?.card_details?.card_name || 'Card';
  const network = card?.card_details?.network || 'default';
  const isDifferent = transaction.normalized_merchant !== transaction.merchant_name;
  
  const accent = getCategoryAccent(transaction.category);
  const iconName = accent.iconName || 'Receipt';

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: transaction.currency || 'INR',
      minimumFractionDigits: 0,
    }).format(amt);
  };

  const pressOpacity = useSharedValue(1);
  const handlePressIn = () => { pressOpacity.value = withTiming(0.6, { duration: 150 }); };
  const handlePressOut = () => { pressOpacity.value = withTiming(1, { duration: 250 }); };
  
  const animStyle = useAnimatedStyle(() => ({
    opacity: pressOpacity.value,
  }));

  const gradient = getNetworkGradient(network, isDark);

  return (
    <Animated.View entering={reduceMotion ? FadeInDown.duration(0) : FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity
        onPress={() => onPress(transaction)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        delayPressIn={100}
      >
        <Animated.View
          style={[
            styles.row,
            { backgroundColor: colors.surface, borderColor: colors.border },
            animStyle
          ]}
        >
          {/* Card Network Indicator */}
          <View style={[styles.networkStripe, { backgroundColor: gradient[0] }]} />

          <View style={styles.leftContent}>
            {/* Category Icon */}
            <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <DynamicIcon name={iconName} size={20} color={colors.textSecondary} strokeWidth={1.5} />
            </View>

            {/* Merchant Info */}
            <View style={styles.merchantInfo}>
              <Text style={[styles.merchantName, { color: colors.textPrimary }]} numberOfLines={1}>
                {transaction.normalized_merchant}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>{cardName}</Text>
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
          </View>

          {/* Amount */}
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
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingRight: 20,
    paddingLeft: 16,
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  networkStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // allow flex shrink below content size
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
  merchantInfo: {
    flex: 1,
    minWidth: 0,
  },
  merchantName: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: 0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
    minWidth: 0,
  },
  metaText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    flexShrink: 1,
  },
  rawMerchantText: {
    fontSize: tokens.fontSize.caption,
    marginLeft: 4,
    flexShrink: 1,
  },
  amountWrap: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingLeft: 8,
    flexShrink: 0,
    maxWidth: '35%',
  },
  amountText: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
});
