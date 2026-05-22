import React, { useState } from 'react';
import { View, Text, Pressable, SectionList, RefreshControl, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useTransactions } from '../../features/transactions/hooks/useTransactions';
import { groupTransactionsByDate } from '../../features/transactions/utils/dateGrouping';
import { TransactionRow } from '../../features/transactions/components/TransactionRow';
import { EmptyTransactionState } from '../../features/transactions/components/EmptyTransactionState';
import { SavingsSummaryCard } from '../../features/transactions/components/SavingsSummaryCard';
import { AddTransactionSheet } from '../../features/transactions/components/AddTransactionSheet';
import { TransactionDetailSheet } from '../../features/transactions/components/TransactionDetailSheet';
import { TransactionListSkeleton } from '../../features/transactions/components/TransactionSkeleton';
import { TransactionResponse } from '../../features/transactions/types/transaction.types';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { AnimatedContainer } from '../../components/ui/AnimatedContainer';

export default function HistoryScreen() {
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage } = useTransactions();
  const [isAddSheetVisible, setAddSheetVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionResponse | null>(null);
  const colors = useThemeColors();

  // Flatten infinite pages into a single array
  const allTransactions = data?.pages.flatMap((page) => page.data) || [];
  const groupedTransactions = groupTransactionsByDate(allTransactions);

  const handleEndReached = () => {
    if (hasNextPage) {
      fetchNextPage();
    }
  };

  const handleTransactionPress = (transaction: TransactionResponse) => {
    setSelectedTransaction(transaction);
  };

  return (
    <ScreenContainer className="pt-2">
      <View className="flex-row justify-between items-end mb-8 mt-4">
        <AnimatedContainer delay={100}>
          <Text style={{ color: colors.textPrimary }} className="text-4xl font-bold tracking-tight">Activity</Text>
          <Text style={{ color: colors.textSecondary }} className="text-sm font-medium mt-1 uppercase tracking-widest">Your spending intelligence</Text>
        </AnimatedContainer>
        
        {/* Only show Add button here if we have transactions */}
        {allTransactions.length > 0 && (
          <AnimatedContainer delay={200}>
            <Pressable
              onPress={() => setAddSheetVisible(true)}
              style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight, borderWidth: StyleSheet.hairlineWidth }}
              className="p-3 rounded-full shadow-sm"
            >
              {/* @ts-ignore */}
              <Plus size={24} color={colors.primary} strokeWidth={2.5} />
            </Pressable>
          </AnimatedContainer>
        )}
      </View>

      <View className="flex-1">
        {isLoading ? (
          <TransactionListSkeleton />
        ) : allTransactions.length === 0 ? (
          <EmptyTransactionState onAddPress={() => setAddSheetVisible(true)} />
        ) : (
          <SectionList
            sections={groupedTransactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TransactionRow transaction={item} onPress={handleTransactionPress} />
            )}
            renderSectionHeader={({ section: { title } }) => (
              <View style={{ backgroundColor: colors.background, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }} className="pt-6 pb-2 px-4 mb-2">
                <Text style={{ color: colors.textSecondary }} className="text-xs font-bold uppercase tracking-widest">
                  {title}
                </Text>
              </View>
            )}
            ListHeaderComponent={
              <View className="mt-4 mb-4">
                <SavingsSummaryCard transactions={allTransactions} />
              </View>
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            stickySectionHeadersEnabled={true}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl 
                refreshing={isRefetching} 
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </View>

      <AddTransactionSheet
        visible={isAddSheetVisible}
        onClose={() => setAddSheetVisible(false)}
      />

      <TransactionDetailSheet
        transaction={selectedTransaction}
        visible={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </ScreenContainer>
  );
}
