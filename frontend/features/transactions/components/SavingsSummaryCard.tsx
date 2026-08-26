import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { TransactionResponse } from '@/features/transactions/types/transaction.types';
import { DynamicIcon } from '@/components/DynamicIcon';

const AnimatedText = Animated.createAnimatedComponent(TextInput);

interface SavingsSummaryCardProps {
  transactions: TransactionResponse[];
}

export function SavingsSummaryCard({ transactions }: SavingsSummaryCardProps) {
  const colors = useThemeColors();
  const isDark = colors.isDark;
  const animatedValue = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const totalRewards = transactions.reduce((sum, tx) => {
    const val = typeof tx.reward_earned === 'number' ? tx.reward_earned : parseFloat(tx.reward_earned as any) || 0;
    return sum + val;
  }, 0);

  const categoryTotals = transactions.reduce((acc, tx) => {
    const cat = tx.category || 'OTHER';
    const val = typeof tx.reward_earned === 'number' ? tx.reward_earned : parseFloat(tx.reward_earned as any) || 0;
    acc[cat] = (acc[cat] || 0) + val;
    return acc;
  }, {} as Record<string, number>);

  let bestCategory = '';
  let maxCategoryReward = 0;
  Object.entries(categoryTotals).forEach(([cat, val]) => {
    if (val > maxCategoryReward) {
      maxCategoryReward = val;
      bestCategory = cat;
    }
  });

  useEffect(() => {
    if (reduceMotion) {
      animatedValue.value = totalRewards;
    } else {
      animatedValue.value = withTiming(totalRewards, {
        duration: tokens.duration.slow,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [totalRewards, reduceMotion]);

  const animatedProps = useAnimatedProps(() => {
    const val = Math.round(animatedValue.value);
    return {
      text: `₹${val.toLocaleString('en-IN')}`,
      defaultValue: `₹${val.toLocaleString('en-IN')}`,
    };
  });

  return (
    <Animated.View
      entering={reduceMotion ? FadeInDown.duration(0) : FadeInDown.delay(50).springify()}
      style={styles.container}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* Top subtle highlight */}
        <View
          style={[
            styles.topEdge,
            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.8)' },
          ]}
          pointerEvents="none"
        />

        {/* Header row */}
        <View style={styles.header}>
          <View style={[styles.trophyWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <DynamicIcon name="Sparkles" size={15} color="#10B981" strokeWidth={2.2} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
            PORTFOLIO REWARD TOTAL
          </Text>
        </View>

        {/* Hero value */}
        <View style={styles.valueSection}>
          <AnimatedText
            editable={false}
            animatedProps={animatedProps}
            style={[
              styles.valueText,
              { color: colors.textPrimary },
            ]}
            numberOfLines={1}
          />
        </View>

        {/* Best category pill */}
        {maxCategoryReward > 0 && (
          <View
            style={[
              styles.bestCategoryPill,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: colors.border,
              },
            ]}
          >
            <DynamicIcon name="TrendingUp" size={13} color="#10B981" style={styles.trendIcon} strokeWidth={2.4} />
            <Text style={[styles.bestCategoryText, { color: colors.textSecondary }]} numberOfLines={1}>
              Top optimization: <Text style={[styles.bestCategoryBold, { color: colors.textPrimary }]}>{bestCategory}</Text>
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  card: {
    borderRadius: tokens.radius.card,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  topEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  trophyWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 1.2,
  },
  valueSection: {
    marginBottom: 14,
  },
  valueText: {
    fontSize: 34,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -1,
    padding: 0,
    margin: 0,
  },
  bestCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  trendIcon: {
    marginRight: 6,
  },
  bestCategoryText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  bestCategoryBold: {
    fontWeight: tokens.fontWeight.bold,
  },
});
