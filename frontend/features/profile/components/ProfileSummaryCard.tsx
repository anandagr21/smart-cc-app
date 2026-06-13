import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Trophy, TrendingUp, Target } from 'lucide-react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { Card } from '@/components/ui/Card';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { useCards } from '@/features/cards/hooks/useCards';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { useMonthlyIntelligence } from '@/features/monthly_intelligence/hooks/useMonthlyIntelligence';

interface SummaryRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
  isLoading?: boolean;
}

const SummaryRow: React.FC<SummaryRowProps> = ({
  icon: Icon,
  label,
  value,
  subtitle,
  color,
  isLoading,
}) => {
  const colors = useThemeColors();
  const iconColor = color || colors.primary;

  if (isLoading) {
    return (
      <View style={styles.summaryRow}>
        <View style={[styles.iconCircle, { backgroundColor: colors.surfaceElevated }]}>
          <SkeletonBox height={20} width={20} borderRadius={10} />
        </View>
        <View style={styles.rowContent}>
          <SkeletonBox height={14} width={100} style={{ marginBottom: 4 }} />
          <SkeletonBox height={20} width={60} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.summaryRow}>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: `${iconColor}15` },
        ]}
      >
        {/* @ts-ignore */}
        <Icon size={18} color={iconColor} strokeWidth={1.5} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <View style={styles.rowValueRow}>
          <Text style={[styles.rowValue, { color: colors.textPrimary }]}>
            {value}
          </Text>
          {subtitle && (
            <Text style={[styles.rowSubtitle, { color: colors.success }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

/**
 * Aggregated user summary — uses EXISTING hooks only.
 * No new API calls, no new calculations.
 */
export const ProfileSummaryCard: React.FC = () => {
  const colors = useThemeColors();
  const now = new Date();

  const { data: cards, isLoading: cardsLoading } = useCards();
  const { data: transactionsData, isLoading: txLoading } = useTransactions();
  const { data: monthlySummary, isLoading: summaryLoading } =
    useMonthlyIntelligence(now.getFullYear(), now.getMonth() + 1);

  const isLoading = cardsLoading || txLoading || summaryLoading;

  // Safe data extraction from existing hooks
  const cardCount = cards?.length || 0;

  const allTransactions = transactionsData?.pages?.flatMap((p) => p.data) || [];
  const lifetimeRewards = allTransactions.reduce(
    (sum, tx) => sum + (typeof tx?.reward_earned === 'number' ? tx.reward_earned : 0),
    0
  );

  const optimizationRate = monthlySummary?.optimization_rate;
  const bestCard =
    cards && cards.length > 0
      ? cards.reduce((best, card) => {
          const currentRate =
            card.optimization_stats?.optimization_rate || 0;
          const bestRate =
            best?.optimization_stats?.optimization_rate || 0;
          return currentRate > bestRate ? card : best;
        }, cards[0])
      : null;

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  };

  return (
    <Card variant="elevated" padded style={{ marginBottom: 0 }}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        Your Summary
      </Text>

      <SummaryRow
        icon={Target}
        label="Reward Efficiency"
        value={
          optimizationRate != null ? `${Math.round(optimizationRate)}%` : '—'
        }
        subtitle="this month"
        color={colors.warning}
        isLoading={isLoading}
      />

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <SummaryRow
        icon={TrendingUp}
        label="Lifetime Rewards"
        value={lifetimeRewards > 0 ? formatCurrency(lifetimeRewards) : '—'}
        color={colors.success}
        isLoading={isLoading}
      />

      {bestCard && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SummaryRow
            icon={Trophy}
            label="Best Card"
            value={bestCard.nickname || bestCard.card_details?.card_name || '—'}
            subtitle={
              bestCard.optimization_stats?.optimization_rate
                ? `${Math.round(bestCard.optimization_stats.optimization_rate)}% eff.`
                : undefined
            }
            color={colors.primary}
            isLoading={isLoading}
          />
        </>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: 2,
  },
  rowValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rowValue: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.tight,
  },
  rowSubtitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.semibold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
