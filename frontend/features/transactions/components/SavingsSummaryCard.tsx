import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';

import Animated, { FadeInDown, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { TextInput } from 'react-native';
import { TransactionResponse } from '../types/transaction.types';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { DynamicIcon } from '@/components/DynamicIcon';

const AnimatedText = Animated.createAnimatedComponent(TextInput);

interface SavingsSummaryCardProps {
  transactions: TransactionResponse[];
}

export function SavingsSummaryCard({ transactions }: SavingsSummaryCardProps) {
  const colors = useThemeColors();
  const animatedValue = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const totalRewards = (transactions || []).reduce((sum, tx) => {
    if (!tx) return sum;
    const reward = typeof tx.reward_earned === 'string' ? parseFloat(tx.reward_earned) : (tx.reward_earned || 0);
    return sum + (isNaN(reward) ? 0 : reward);
  }, 0);

  useEffect(() => {
    animatedValue.value = withTiming(totalRewards, { duration: 1500 });
  }, [totalRewards]);

  const animatedProps = useAnimatedProps(() => {
    return {
      text: `₹${Math.round(animatedValue.value).toString()}`,
      // Workaround for Android/iOS text input behavior
      defaultValue: `₹${Math.round(animatedValue.value).toString()}`,
    } as any;
  });

  if (!transactions || transactions.length === 0 || totalRewards === 0) return null;

  const categoryRewards = transactions.reduce((acc, tx) => {
    if (tx && tx.reward_earned && tx.category) {
      const reward = typeof tx.reward_earned === 'string' ? parseFloat(tx.reward_earned) : tx.reward_earned;
      acc[tx.category] = (acc[tx.category] || 0) + reward;
    }
    return acc;
  }, {} as Record<string, number>);

  let bestCategory = 'None';
  let maxCategoryReward = 0;
  for (const [cat, amt] of Object.entries(categoryRewards)) {
    if (amt > maxCategoryReward) {
      maxCategoryReward = amt;
      bestCategory = cat;
    }
  }

  return (
    <Animated.View entering={reduceMotion ? FadeInDown.duration(0) : FadeInDown.delay(50).springify()} style={styles.container}>
      <LinearGradient
        colors={[colors.surfaceElevated, colors.surface]}
        style={[styles.card, { borderColor: colors.border }]}
      >
        {/* Top Highlight */}
        <View style={[styles.topHighlight, { backgroundColor: colors.glassHighlight }]} />

        <View style={styles.header}>
          <DynamicIcon name="Trophy" size={16} color={colors.warning} style={styles.icon} />
          <Text style={[styles.eyebrow, { color: colors.warning }]}>
            Optimization Summary
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          You optimized
        </Text>
        
        <AnimatedText
          editable={false}
          animatedProps={animatedProps}
          style={[styles.valueText, { color: colors.textPrimary }]}
        />

        {maxCategoryReward > 0 && (
          <View style={[styles.bestCategoryPill, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
            <DynamicIcon name="TrendingUp" size={12} color={colors.success} style={styles.trendIcon} />
            <Text style={[styles.bestCategoryText, { color: colors.success }]}>
              Best optimization: <Text style={styles.bestCategoryBold}>{bestCategory}</Text>
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  card: {
    borderRadius: tokens.radius.card,
    padding: 24,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    marginRight: 8,
  },
  eyebrow: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
  },
  label: {
    fontSize: tokens.fontSize.bodyLg,
    marginBottom: 4,
  },
  valueText: {
    fontSize: tokens.fontSize.hero,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    marginBottom: 20,
    padding: 0,
  },
  bestCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
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
    textTransform: 'capitalize',
  },
});
