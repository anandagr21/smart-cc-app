import React from 'react';
import { View, Text } from 'react-native';
import { Trophy, TrendingUp } from 'lucide-react-native';
import { TransactionResponse } from '../types/transaction.types';
import { AnimatedContainer } from '../../../components/ui/AnimatedContainer';

interface SavingsSummaryCardProps {
  transactions: TransactionResponse[];
}

export function SavingsSummaryCard({ transactions }: SavingsSummaryCardProps) {
  if (!transactions || transactions.length === 0) return null;

  // Aggregate total rewards
  const totalRewards = transactions.reduce((sum, tx) => {
    const reward = typeof tx.reward_earned === 'string' ? parseFloat(tx.reward_earned) : (tx.reward_earned || 0);
    return sum + reward;
  }, 0);
  
  if (totalRewards === 0) return null;

  // Find best optimization category (category with highest total rewards)
  const categoryRewards = transactions.reduce((acc, tx) => {
    if (tx.reward_earned && tx.category) {
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
    <AnimatedContainer delay={50} className="mx-4 mb-6">
      <View className="bg-gradient-to-br from-accent/20 to-surface/40 rounded-3xl p-6 border border-accent/30 overflow-hidden">
        {/* Decorative background glow */}
        <View className="absolute -top-10 -right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl opacity-50" />
        
        <View className="flex-row items-center mb-4">
          <Trophy size={20} color="#cba766" className="mr-2" />
          <Text className="text-accent font-semibold uppercase tracking-widest text-xs">
            Optimization Summary
          </Text>
        </View>

        <Text className="text-textSecondary text-lg mb-1">
          You optimized
        </Text>
        <Text className="text-4xl font-bold text-textPrimary tracking-tight mb-4">
          ₹{totalRewards.toFixed(0)}
        </Text>

        {maxCategoryReward > 0 && (
          <View className="flex-row items-center bg-black/20 self-start px-3 py-1.5 rounded-full border border-white/5">
            <TrendingUp size={14} color="#34d399" className="mr-1.5" />
            <Text className="text-emerald-400 text-xs font-medium">
              Best optimization: <Text className="font-bold capitalize">{bestCategory}</Text>
            </Text>
          </View>
        )}
      </View>
    </AnimatedContainer>
  );
}
