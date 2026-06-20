import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TransactionResponse } from '../types/transaction.types';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

interface TransactionInsightCardProps {
  transaction: TransactionResponse;
}

export function TransactionInsightCard({ transaction }: TransactionInsightCardProps) {
  const colors = useThemeColors();
  
  const hasReward = transaction.reward_earned !== undefined && transaction.reward_earned !== null;
  const hasMissedSavings = transaction.missed_savings && parseFloat(transaction.missed_savings as unknown as string) > 0;
  
  if (!hasReward) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.borderHighlight }]}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No insights available for this transaction.
        </Text>
      </View>
    );
  }

  const numericReward = typeof transaction.reward_earned === 'string' ? parseFloat(transaction.reward_earned) : transaction.reward_earned!;
  const numericMissed = typeof transaction.missed_savings === 'string' ? parseFloat(transaction.missed_savings) : (transaction.missed_savings || 0);

  const isPoints = transaction.reward_type?.toLowerCase().includes('point');
  const formattedReward = isPoints 
    ? `+${Math.round(numericReward)} points`
    : `+₹${numericReward.toFixed(0)} cashback`;

  return (
    <View style={styles.container}>
      {/* Reward Earned Section */}
      <View style={[styles.card, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
        <View style={styles.header}>
          <DynamicIcon name="Sparkles" size={16} color={colors.success} style={styles.icon} strokeWidth={2.5} />
          <Text style={[styles.eyebrow, { color: colors.success }]}>
            Reward Earned
          </Text>
        </View>
        <Text style={[styles.heroValue, { color: colors.textPrimary }]}>
          {formattedReward}
        </Text>
        
        {transaction.recommendation_reason && (
          <Text style={[styles.reason, { color: colors.textSecondary }]}>
            {transaction.recommendation_reason}
          </Text>
        )}
      </View>

      {/* Missed Savings Section */}
      {hasMissedSavings && (
        <View style={[styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight, marginTop: 12 }]}>
          <View style={styles.header}>
            <DynamicIcon name="ArrowUpRight" size={16} color={colors.warning} style={styles.icon} strokeWidth={2.5} />
            <Text style={[styles.eyebrow, { color: colors.warning }]}>
              Optimization Opportunity
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Use {transaction.best_possible_card}
          </Text>
          <Text style={[styles.reason, { color: colors.textSecondary }]}>
            You could have earned an additional ₹{numericMissed.toFixed(0)} by using this card.
          </Text>
        </View>
      )}

      {/* Warnings */}
      {transaction.warnings && transaction.warnings.length > 0 && (
        <View style={[styles.warningCard, { backgroundColor: colors.warningSoft, borderColor: colors.warning, marginTop: 12 }]}>
          <DynamicIcon name="AlertCircle" size={16} color={colors.warning} style={styles.warningIcon} strokeWidth={2.5} />
          <View style={styles.warningContent}>
            {transaction.warnings.map((warning, i) => (
              <Text key={i} style={[styles.warningText, { color: colors.warning }]}>
                {warning}
              </Text>
            ))}
          </View>
        </View>
      )}
      
      {/* Fully Optimized State */}
      {!hasMissedSavings && (!transaction.warnings || transaction.warnings.length === 0) && (
        <View style={styles.optimizedWrap}>
          <DynamicIcon name="CheckCircle2" size={14} color={colors.textMuted} style={styles.icon} strokeWidth={2.5} />
          <Text style={[styles.optimizedText, { color: colors.textMuted }]}>
            Fully Optimized
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  emptyContainer: {
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
  card: {
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
  heroValue: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 4,
  },
  title: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 4,
  },
  reason: {
    fontSize: tokens.fontSize.body,
    lineHeight: tokens.fontSize.body * 1.5,
    marginTop: 4,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  warningIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  warningContent: {
    flex: 1,
  },
  warningText: {
    fontSize: tokens.fontSize.body,
    lineHeight: tokens.fontSize.body * 1.4,
    marginBottom: 4,
  },
  optimizedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
  },
  optimizedText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
  },
});
