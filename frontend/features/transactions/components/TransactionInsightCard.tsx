import React from 'react';
import { View, Text } from 'react-native';
import { TransactionResponse } from '../types/transaction.types';
import { Sparkles, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react-native';

interface TransactionInsightCardProps {
  transaction: TransactionResponse;
}

export function TransactionInsightCard({ transaction }: TransactionInsightCardProps) {
  const hasReward = transaction.reward_earned !== undefined && transaction.reward_earned !== null;
  const hasMissedSavings = transaction.missed_savings && parseFloat(transaction.missed_savings as unknown as string) > 0;
  
  if (!hasReward) {
    return (
      <View className="bg-surface/50 rounded-2xl p-5 border border-white/5 items-center">
        <Text className="text-textSecondary text-sm">No insights available for this transaction.</Text>
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
    <View className="space-y-4">
      {/* Reward Earned Section */}
      <View className="bg-emerald-500/10 rounded-2xl p-5 border border-emerald-500/20">
        <View className="flex-row items-center mb-2">
          <Sparkles size={16} color="#34d399" className="mr-2" />
          <Text className="text-emerald-400 text-sm font-semibold uppercase tracking-widest">
            Reward Earned
          </Text>
        </View>
        <Text className="text-textPrimary text-2xl font-bold mb-1">
          {formattedReward}
        </Text>
        
        {transaction.recommendation_reason && (
          <Text className="text-textSecondary text-sm mt-2">
            {transaction.recommendation_reason}
          </Text>
        )}
      </View>

      {/* Missed Savings Section (Better Card) */}
      {hasMissedSavings && (
        <View className="bg-surface/50 rounded-2xl p-5 border border-white/5">
          <View className="flex-row items-center mb-2">
            <ArrowUpRight size={16} color="#cba766" className="mr-2" />
            <Text className="text-accent text-sm font-semibold uppercase tracking-widest">
              Optimization Opportunity
            </Text>
          </View>
          <Text className="text-textPrimary text-lg font-semibold mb-1">
            Use {transaction.best_possible_card}
          </Text>
          <Text className="text-textSecondary text-sm">
            You could have earned an additional ₹{numericMissed.toFixed(0)} by using this card.
          </Text>
        </View>
      )}

      {/* Warnings */}
      {transaction.warnings && transaction.warnings.length > 0 && (
        <View className="bg-orange-500/10 rounded-2xl p-4 border border-orange-500/20 flex-row items-start">
          <AlertCircle size={16} color="#fb923c" className="mr-2 mt-0.5" />
          <View className="flex-1">
            {transaction.warnings.map((warning, i) => (
              <Text key={i} className="text-orange-400 text-sm mb-1">
                {warning}
              </Text>
            ))}
          </View>
        </View>
      )}
      
      {/* Fully Optimized State */}
      {!hasMissedSavings && (!transaction.warnings || transaction.warnings.length === 0) && (
        <View className="flex-row items-center justify-center p-3">
          <CheckCircle2 size={14} color="#9ca3af" className="mr-2" />
          <Text className="text-textMuted text-xs font-medium uppercase tracking-widest">
            Fully Optimized
          </Text>
        </View>
      )}
    </View>
  );
}
