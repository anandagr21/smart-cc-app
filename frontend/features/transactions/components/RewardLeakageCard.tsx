import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TransactionResponse } from '../types/transaction.types';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { formatCurrencyIN } from '@/utils/currency';

interface RewardLeakageCardProps {
  transactions: TransactionResponse[];
}

export const RewardLeakageCard: React.FC<RewardLeakageCardProps> = ({ transactions }) => {
  const colors = useThemeColors();

  const leakageTransactions = useMemo(() => {
    return transactions
      .filter((tx) => tx.missed_savings && tx.missed_savings > 0)
      .sort((a, b) => (b.missed_savings || 0) - (a.missed_savings || 0))
      .slice(0, 3); // Top 3 missed opportunities
  }, [transactions]);

  if (leakageTransactions.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>REWARD LEAKAGE</Text>
      
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {leakageTransactions.map((tx, index) => (
          <View 
            key={tx.id} 
            style={[
              styles.row, 
              index !== leakageTransactions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
            ]}
          >
            <View style={styles.left}>
              {/* @ts-ignore */}
              <AlertTriangle size={16} color={colors.danger} style={styles.icon} />
              <View>
                <Text style={[styles.merchantName, { color: colors.textPrimary }]}>
                  {tx.merchant_name}
                </Text>
                <Text style={[styles.reasoning, { color: colors.textSecondary }]}>
                  {tx.recommendation_reason || `Could have used ${tx.best_possible_card || 'a better card'}`}
                </Text>
              </View>
            </View>
            
            <View style={styles.right}>
              <Text style={[styles.missedAmount, { color: colors.danger }]}>
                -{formatCurrencyIN(tx.missed_savings || 0)}
              </Text>
            </View>
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
    borderRadius: tokens.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 16,
  },
  icon: {
    marginRight: 12,
  },
  merchantName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 2,
  },
  reasoning: {
    fontSize: tokens.fontSize.caption,
  },
  right: {
    alignItems: 'flex-end',
  },
  missedAmount: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
});
