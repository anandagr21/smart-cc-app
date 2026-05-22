import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TransactionResponse } from '../types/transaction.types';
import { getCategoryAccent } from '../utils/categoryAccents';
import { useCards } from '../../cards/hooks/useCards';
import * as Icons from 'lucide-react-native';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { RewardInsightPill } from './RewardInsightPill';

interface TransactionRowProps {
  transaction: TransactionResponse;
  onPress: (transaction: TransactionResponse) => void;
}

export const TransactionRow = React.memo(({ transaction, onPress }: TransactionRowProps) => {
  const { data: cardsData } = useCards();
  const colors = useThemeColors();
  const card = cardsData?.find((c) => c.id === transaction.user_card_id);

  const cardName = card?.nickname || card?.card_details?.card_name || 'Unknown Card';
  const isDifferent = transaction.normalized_merchant !== transaction.merchant_name;
  
  const accent = getCategoryAccent(transaction.category);
  // @ts-ignore - dynamic icon access
  const IconComponent = Icons[accent.iconName] || Icons.Receipt;

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: transaction.currency || 'INR',
      minimumFractionDigits: 0,
    }).format(amt);
  };

  return (
    <Pressable
      onPress={() => onPress(transaction)}
      className="flex-row items-center justify-between py-4 px-5 mb-3 mx-6 rounded-[28px]"
      style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }}
    >
      <View className="flex-row items-center flex-1">
        {/* Category Icon */}
        <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${accent.bgClass}`}>
          <IconComponent size={24} className={accent.textClass} strokeWidth={1.5} />
        </View>

        {/* Merchant & Metadata */}
        <View className="flex-1">
          <Text style={{ color: colors.textPrimary }} className="font-semibold text-base tracking-wide" numberOfLines={1}>
            {transaction.normalized_merchant}
          </Text>
          <View className="flex-row items-center mt-0.5 mb-1">
            <Text style={{ color: colors.textSecondary }} className="text-xs font-medium mr-2">{cardName}</Text>
            {isDifferent && (
              <Text style={{ color: colors.textMuted }} className="text-[10px] font-medium" numberOfLines={1}>
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

      {/* Amount & Status */}
      <View className="items-end pl-2 self-start mt-1">
        <Text style={{ color: colors.textPrimary }} className="font-bold text-base tracking-wide">
          {formatAmount(transaction.amount)}
        </Text>
      </View>
    </Pressable>
  );
});
