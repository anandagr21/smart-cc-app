import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SectionList, RefreshControl, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { useTransactions } from '../../features/transactions/hooks/useTransactions';
import { groupTransactionsByDate } from '../../features/transactions/utils/dateGrouping';
import { TransactionRow } from '../../features/transactions/components/TransactionRow';
import { EmptyTransactionState } from '../../features/transactions/components/EmptyTransactionState';
import { SavingsSummaryCard } from '../../features/transactions/components/SavingsSummaryCard';
import { TransactionFormSheet } from '../../features/transactions/components/TransactionFormSheet';
import { TransactionDetailSheet } from '../../features/transactions/components/TransactionDetailSheet';
import { TransactionListSkeleton } from '../../features/transactions/components/TransactionSkeleton';
import { TransactionResponse } from '../../features/transactions/types/transaction.types';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { useThemeStore } from '../../features/theme/store/themeStore';
import { tokens } from '../../theme/tokens';

export default function HistoryScreen() {
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage } = useTransactions();
  const [isFormSheetVisible, setFormSheetVisible] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionResponse | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionResponse | null>(null);
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  const handleOpenAdd = () => {
    setTransactionToEdit(null);
    setFormSheetVisible(true);
  };

  const handleOpenEdit = (transaction: TransactionResponse) => {
    setSelectedTransaction(null);
    setTransactionToEdit(transaction);
    setFormSheetVisible(true);
  };

  const allTransactions = data?.pages.flatMap((page) => page.data) || [];
  const groupedTransactions = groupTransactionsByDate(allTransactions);

  const handleEndReached = () => {
    if (hasNextPage) fetchNextPage();
  };

  const handleTransactionPress = React.useCallback((transaction: TransactionResponse) => {
    setSelectedTransaction(transaction);
  }, []);

  const renderItem = React.useCallback(
    ({ item, index }: { item: TransactionResponse; index: number }) => (
      <TransactionRow transaction={item} onPress={handleTransactionPress} index={index} />
    ),
    [handleTransactionPress]
  );

  return (
    <ScreenContainer noPadding>
      <View style={styles.header}>
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Activity</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your spending intelligence
          </Text>
        </Animated.View>

        {allTransactions.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <TouchableOpacity
              testID="add-tx-btn"
              onPress={handleOpenAdd}
              style={[
                styles.addBtn,
                { backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight },
              ]}
              activeOpacity={0.75}
            >
              {/* @ts-ignore */}
              <Plus size={20} color={colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={{ paddingHorizontal: 24 }}>
            <TransactionListSkeleton />
          </View>
        ) : allTransactions.length === 0 ? (
          <EmptyTransactionState onAddPress={handleOpenAdd} />
        ) : (
          <SectionList
            sections={groupedTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={({ section: { title } }) => (
              <BlurView
                tint={isDark ? 'dark' : 'light'}
                intensity={80}
                style={[
                  styles.sectionHeader,
                  { backgroundColor: colors.glassSurface, borderBottomColor: colors.glassBorder },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
              </BlurView>
            )}
            ListHeaderComponent={
              <View style={styles.summaryWrap}>
                <SavingsSummaryCard transactions={allTransactions} />
              </View>
            }
            contentContainerStyle={styles.scrollContent}
            stickySectionHeadersEnabled={true}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
          />
        )}
      </View>

      <TransactionFormSheet
        visible={isFormSheetVisible}
        onClose={() => setFormSheetVisible(false)}
        initialData={transactionToEdit}
      />

      <TransactionDetailSheet
        transaction={selectedTransaction}
        visible={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onEdit={handleOpenEdit}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.layout.screenPadding,
    marginTop: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: tokens.fontSize.label,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: tokens.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    flex: 1,
  },
  summaryWrap: {
    marginBottom: 16,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.widest,
  },
  scrollContent: {
    paddingBottom: 140,
  },
});
