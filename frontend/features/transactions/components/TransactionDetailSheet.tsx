import React from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { TransactionResponse } from '../types/transaction.types';
import { getCategoryAccent } from '../utils/categoryAccents';
import { useCards } from '../../cards/hooks/useCards';
import * as Icons from 'lucide-react-native';

import { TransactionInsightCard } from './TransactionInsightCard';

interface TransactionDetailSheetProps {
  transaction: TransactionResponse | null;
  visible: boolean;
  onClose: () => void;
}

export function TransactionDetailSheet({ transaction, visible, onClose }: TransactionDetailSheetProps) {
  const { data: cardsData } = useCards();
  if (!transaction) return null;

  const card = cardsData?.find((c) => c.id === transaction.user_card_id);
  const cardName = card?.nickname || card?.card_details?.card_name || 'Unknown Card';
  const isDifferent = transaction.normalized_merchant !== transaction.merchant_name;
  
  const accent = getCategoryAccent(transaction.category);
  // @ts-ignore
  const IconComponent = Icons[accent.iconName] || Icons.Receipt;

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: transaction.currency || 'INR',
    }).format(amt);
  };

  const formattedDate = new Date(transaction.transaction_date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-surfaceElevated rounded-t-3xl pt-6 pb-10 px-6 max-h-[90%] border-t border-white/10 shadow-lg shadow-black">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-textPrimary">Transaction Details</Text>
            <Pressable onPress={onClose} className="p-2 bg-white/5 rounded-full">
              <X size={20} color="#fff" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <View className="items-center mb-8">
              <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${accent.bgClass}`}>
                <IconComponent size={40} className={accent.textClass} strokeWidth={1.5} />
              </View>
              <Text className="text-3xl font-bold text-textPrimary text-center mb-1">
                {transaction.normalized_merchant}
              </Text>
              <Text className="text-4xl font-light text-textPrimary mt-2">
                {formatAmount(transaction.amount)}
              </Text>
            </View>

            {/* Details List */}
            <View className="bg-surface/50 rounded-2xl p-4 border border-white/5 mb-6">
              <DetailRow label="Date" value={formattedDate} />
              <DetailRow label="Status" value={transaction.status} capitalize />
              <DetailRow label="Payment Mode" value={transaction.payment_mode || 'Unknown'} capitalize />
              <DetailRow label="Card Used" value={cardName} />
              <DetailRow label="Category" value={transaction.category} capitalize />
              {isDifferent && (
                <DetailRow label="Raw Merchant" value={transaction.merchant_name} isLast />
              )}
            </View>

            {/* Smart Reward Insights */}
            <TransactionInsightCard transaction={transaction} />
            
            <View className="h-10" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, capitalize, isLast }: { label: string; value: string; capitalize?: boolean; isLast?: boolean }) {
  return (
    <View className={`flex-row justify-between items-center py-3 ${isLast ? '' : 'border-b border-white/5'}`}>
      <Text className="text-textSecondary font-medium">{label}</Text>
      <Text className={`text-textPrimary font-semibold ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </Text>
    </View>
  );
}
