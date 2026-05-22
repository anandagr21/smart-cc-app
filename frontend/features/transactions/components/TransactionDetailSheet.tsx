import React from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Edit2, X } from 'lucide-react-native';
import { TransactionResponse } from '../types/transaction.types';
import { getCategoryAccent } from '../utils/categoryAccents';
import { useCards } from '../../cards/hooks/useCards';
import { useThemeColors } from '../../theme/hooks/useThemeColors';
import { useThemeStore } from '../../theme/store/themeStore';
import { tokens } from '../../../theme/tokens';
import * as Icons from 'lucide-react-native';

import { TransactionInsightCard } from './TransactionInsightCard';

interface TransactionDetailSheetProps {
  transaction: TransactionResponse | null;
  visible: boolean;
  onClose: () => void;
  onEdit?: (transaction: TransactionResponse) => void;
}

export function TransactionDetailSheet({ transaction, visible, onClose, onEdit }: TransactionDetailSheetProps) {
  const { data: cardsData } = useCards();
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  
  if (!transaction) return null;

  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0B0E14');
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
      <View className="flex-1 justify-end bg-black/40">
        <BlurView 
          tint={isDark ? 'dark' : 'light'} 
          intensity={80}
          className="rounded-t-[36px] pt-6 pb-6 px-6 max-h-[90%] overflow-hidden"
          style={[
            tokens.elevation.level3,
            { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder, borderWidth: StyleSheet.hairlineWidth }
          ]}
        >
          {/* Metallic Top Highlight */}
          <View className="absolute top-0 left-0 right-0 h-[1px]" style={{ backgroundColor: colors.glassHighlight }} />

          {/* Header */}
          <View className="flex-row justify-between items-center mb-8">
            <Text style={{ color: colors.textPrimary }} className="text-xl font-bold tracking-tight">Transaction Details</Text>
            <View className="flex-row items-center gap-3">
              {onEdit && (
                <Pressable onPress={() => onEdit(transaction)} style={{ backgroundColor: colors.surfaceElevated }} className="p-2 rounded-full">
                  <Edit2 size={20} color={colors.textPrimary} />
                </Pressable>
              )}
              <Pressable onPress={onClose} style={{ backgroundColor: colors.surfaceElevated }} className="p-2 rounded-full">
                <X size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
          >
            {/* Hero Section */}
            <View className="items-center mb-10">
              <View className={`w-20 h-20 rounded-full items-center justify-center mb-4 ${accent.bgClass}`}>
                <IconComponent size={40} className={accent.textClass} strokeWidth={1.5} />
              </View>
              <Text style={{ color: colors.textPrimary }} className="text-3xl font-bold text-center mb-1 tracking-tight">
                {transaction.normalized_merchant}
              </Text>
              <Text style={{ color: colors.textPrimary }} className="text-4xl font-light mt-2 tracking-tighter">
                {formatAmount(transaction.amount)}
              </Text>
            </View>

            {/* Details List */}
            <View 
              style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight, borderWidth: StyleSheet.hairlineWidth }} 
              className="rounded-3xl p-5 mb-8"
            >
              <DetailRow label="Date" value={formattedDate} colors={colors} />
              <DetailRow label="Status" value={transaction.status} capitalize colors={colors} />
              <DetailRow label="Payment Mode" value={transaction.payment_mode || 'Unknown'} capitalize colors={colors} />
              <DetailRow label="Card Used" value={cardName} colors={colors} />
              <DetailRow label="Category" value={transaction.category} capitalize colors={colors} />
              {isDifferent && (
                <DetailRow label="Raw Merchant" value={transaction.merchant_name} isLast colors={colors} />
              )}
            </View>

            {/* Smart Reward Insights */}
            <TransactionInsightCard transaction={transaction} />
            
            <View className="h-10" />
          </ScrollView>
        </BlurView>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, capitalize, isLast, colors }: { label: string; value: string; capitalize?: boolean; isLast?: boolean; colors: any }) {
  return (
    <View 
      className={`flex-row justify-between items-center py-3.5`}
      style={!isLast ? { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth } : {}}
    >
      <Text style={{ color: colors.textSecondary }} className="font-medium text-[13px] uppercase tracking-widest">{label}</Text>
      <Text style={{ color: colors.textPrimary }} className={`font-semibold text-sm ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </Text>
    </View>
  );
}
