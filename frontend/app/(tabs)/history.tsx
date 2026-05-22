import React, { useState } from 'react';
import { View, Text, Pressable, SectionList, RefreshControl } from 'react-native';
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

export default function HistoryScreen() {
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage } = useTransactions();
  const [isAddSheetVisible, setAddSheetVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionResponse | null>(null);

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
      <View className="flex-row justify-between items-center px-4 mb-4">
        <Text className="text-3xl font-bold text-textPrimary tracking-tight">Activity</Text>
        
        {/* Only show Add button here if we have transactions (Empty state has its own) */}
        {allTransactions.length > 0 && (
          <Pressable
            onPress={() => setAddSheetVisible(true)}
            className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 items-center justify-center active:bg-accent/30"
          >
            <Plus size={20} color="#cba766" />
          </Pressable>
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
              <View className="bg-background pt-6 pb-2 px-4 border-b border-white/5">
                <Text className="text-textSecondary text-sm font-semibold uppercase tracking-widest">
                  {title}
                </Text>
              </View>
            )}
            ListHeaderComponent={
              <View className="mt-4">
                <SavingsSummaryCard transactions={allTransactions} />
              </View>
            }
            stickySectionHeadersEnabled={true}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl 
                refreshing={isRefetching} 
                onRefresh={refetch}
                tintColor="#cba766"
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
