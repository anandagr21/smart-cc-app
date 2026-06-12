import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { ShoppingCart, Utensils, Plane, Film, Zap, Home, Coffee, HelpCircle, LucideIcon } from 'lucide-react-native';
import { TransactionResponse } from '../types/transaction.types';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { formatCurrencyIN } from '@/utils/currency';

interface CategoryRewardsChartProps {
  transactions: TransactionResponse[];
}

const getCategoryIcon = (category: string): LucideIcon => {
  const normalized = category.toLowerCase();
  if (normalized.includes('grocer') || normalized.includes('supermarket')) return ShoppingCart;
  if (normalized.includes('din') || normalized.includes('restaurant') || normalized.includes('food')) return Utensils;
  if (normalized.includes('travel') || normalized.includes('flight') || normalized.includes('hotel')) return Plane;
  if (normalized.includes('movie') || normalized.includes('entertain')) return Film;
  if (normalized.includes('util') || normalized.includes('bill')) return Zap;
  if (normalized.includes('home') || normalized.includes('rent')) return Home;
  if (normalized.includes('coffee') || normalized.includes('cafe')) return Coffee;
  return HelpCircle;
};

const AnimatedProgressBar = ({ progress, color }: { progress: number, color: string }) => {
  const widthAnim = useSharedValue(0);

  useEffect(() => {
    widthAnim.value = withTiming(progress, { duration: 1000, easing: Easing.out(Easing.exp) });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthAnim.value}%`,
  }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, animatedStyle, { backgroundColor: color }]} />
    </View>
  );
};

export const CategoryRewardsChart: React.FC<CategoryRewardsChartProps> = ({ transactions }) => {
  const colors = useThemeColors();

  const categoryData = useMemo(() => {
    const categoryMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.reward_earned && tx.category) {
        const reward = typeof tx.reward_earned === 'string' ? parseFloat(tx.reward_earned) : tx.reward_earned;
        if (!isNaN(reward) && reward > 0) {
          categoryMap[tx.category] = (categoryMap[tx.category] || 0) + reward;
        }
      }
    });

    const sortedCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 categories

    if (sortedCategories.length === 0) return [];

    const maxValue = sortedCategories[0][1];

    return sortedCategories.map(([category, value]) => ({
      name: category,
      value,
      progress: (value / maxValue) * 100, // Relative to the top category
      Icon: getCategoryIcon(category),
    }));
  }, [transactions]);

  if (categoryData.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>REWARDS BY CATEGORY</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {categoryData.map((item, index) => (
          <View key={item.name} style={[styles.row, index > 0 && { marginTop: 20 }]}>
            <View style={styles.headerRow}>
              <View style={styles.categoryInfo}>
                <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <item.Icon size={14} color={colors.textPrimary} />
                </View>
                <Text style={[styles.categoryName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <Text style={[styles.rewardValue, { color: colors.primary }]}>
                {formatCurrencyIN(Math.round(item.value))}
              </Text>
            </View>
            <AnimatedProgressBar progress={item.progress} color={colors.primary} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 16,
  },
  card: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoryName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    textTransform: 'capitalize',
  },
  rewardValue: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
