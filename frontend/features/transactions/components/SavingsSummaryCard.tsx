import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';

import Animated, {
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withSequence,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';
import { TextInput } from 'react-native';
import { TransactionResponse } from '../types/transaction.types';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

const AnimatedText = Animated.createAnimatedComponent(TextInput);

interface SavingsSummaryCardProps {
  transactions: TransactionResponse[];
}

export function SavingsSummaryCard({ transactions }: SavingsSummaryCardProps) {
  const colors = useThemeColors();
  const animatedValue = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Pulse ring for the "Reward Pulse" signature element
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const totalRewards = (transactions || []).reduce((sum, tx) => {
    if (!tx) return sum;
    const reward = typeof tx.reward_earned === 'string' ? parseFloat(tx.reward_earned) : (tx.reward_earned || 0);
    return sum + (isNaN(reward) ? 0 : reward);
  }, 0);

  useEffect(() => {
    animatedValue.value = withTiming(totalRewards, { duration: reduceMotion ? 0 : 1500 });
  }, [totalRewards]);

  // Pulse animation for the ring — runs once on mount
  useEffect(() => {
    if (reduceMotion || totalRewards === 0) return;
    pulseScale.value = withSequence(
      withTiming(1.6, { duration: 1200, easing: Easing.out(Easing.exp) }),
      withTiming(1.6, { duration: 400 }),
      withTiming(1, { duration: 0 }),
    );
    pulseOpacity.value = withSequence(
      withTiming(0.3, { duration: 800, easing: Easing.out(Easing.exp) }),
      withTiming(0, { duration: 800 }),
      withTiming(0, { duration: 0 }),
    );
  }, [totalRewards]);

  const animatedProps = useAnimatedProps(() => {
    const val = Math.round(animatedValue.value);
    return {
      text: `₹${val.toLocaleString('en-IN')}`,
      defaultValue: `₹${val.toLocaleString('en-IN')}`,
    } as any;
  });

  const pulseAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

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
      {/* Pulse ring — the signature "Reward Pulse" */}
      <Animated.View
        style={[
          styles.pulseRing,
          { borderColor: colors.success },
          pulseAnimStyle,
        ]}
        pointerEvents="none"
      />

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Top gradient glow */}
        <View style={[styles.glowBar, { backgroundColor: colors.success }]} />

        {/* Header row */}
        <View style={styles.header}>
          <View style={[styles.trophyWrap, { backgroundColor: colors.successSoft }]}>
            <DynamicIcon name="Trophy" size={14} color={colors.success} strokeWidth={2} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.success }]}>Optimization Summary</Text>
        </View>

        {/* Hero value — the centerpiece */}
        <View style={styles.valueSection}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>You optimized</Text>
          <View style={styles.valueRow}>
            <AnimatedText
              editable={false}
              animatedProps={animatedProps}
              style={[styles.valueText, { color: colors.textPrimary }]}
              numberOfLines={1}
            />
          </View>
        </View>

        {/* Best category pill */}
        {maxCategoryReward > 0 && (
          <View style={[styles.bestCategoryPill, { backgroundColor: colors.successSoft, borderColor: colors.success + '40' }]}>
            <DynamicIcon name="TrendingUp" size={12} color={colors.success} style={styles.trendIcon} />
            <Text style={[styles.bestCategoryText, { color: colors.success }]} numberOfLines={1}>
              Best optimization:{' '}
              <Text style={styles.bestCategoryBold}>{bestCategory}</Text>
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginBottom: 24,
    position: 'relative',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: -12,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    zIndex: 0,
  },
  card: {
    width: '100%',
    borderRadius: tokens.radius.card,
    padding: 24,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  glowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.wide,
  },
  valueSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: tokens.fontSize.bodyLg,
    marginBottom: 4,
  },
  valueRow: {
    overflow: 'hidden',
  },
  valueText: {
    fontSize: tokens.fontSize.hero,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    padding: 0,
    width: '100%',
  },
  bestCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    maxWidth: '100%',
  },
  trendIcon: {
    marginRight: 6,
    flexShrink: 0,
  },
  bestCategoryText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    flexShrink: 1,
  },
  bestCategoryBold: {
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'capitalize',
  },
});
