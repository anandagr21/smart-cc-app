import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SectionList, RefreshControl, StyleSheet, AccessibilityInfo, ScrollView } from 'react-native';

import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { useCards } from '@/features/cards/hooks/useCards';
import { groupTransactionsByDate } from '@/features/transactions/utils/dateGrouping';
import { TransactionRow } from '@/features/transactions/components/TransactionRow';
import { EmptyTransactionState } from '@/features/transactions/components/EmptyTransactionState';
import { SavingsSummaryCard } from '@/features/transactions/components/SavingsSummaryCard';
import { CategoryRewardsChart } from '@/features/transactions/components/CategoryRewardsChart';
import { RewardLeakageCard } from '@/features/transactions/components/RewardLeakageCard';
import { TransactionFormSheet } from '@/features/transactions/components/TransactionFormSheet';
import { TransactionDetailSheet } from '@/features/transactions/components/TransactionDetailSheet';
import { TransactionListSkeleton } from '@/features/transactions/components/TransactionSkeleton';
import { TransactionResponse } from '@/features/transactions/types/transaction.types';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

export default function HistoryScreen() {
  const { cardId } = useLocalSearchParams<{ cardId?: string }>();
  const router = useRouter();
  
  const { data: cards } = useCards();
  const filteredCard = cards?.find(c => c.id === cardId);

  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage } = useTransactions({ cardId });
  const [isFormSheetVisible, setFormSheetVisible] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionResponse | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionResponse | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const colors = useThemeColors();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

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

  const handleClearFilter = () => {
    router.setParams({ cardId: '' });
  };

  return (
    <ScreenContainer noPadding>
      {/* Sticky Glass Header */}
      <View style={styles.headerAbsolute}>
        <BlurView intensity={isDark ? 80 : 100} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(10,14,23,0.5)' : 'rgba(255,255,255,0.7)' }]} />
        <View style={styles.headerInner}>
          <Animated.View entering={reduceMotion ? FadeInDown.duration(0) : FadeInDown.delay(50).springify()}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Activity</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your spending intelligence
            </Text>
          </Animated.View>

          {allTransactions.length > 0 && (
            <Animated.View entering={reduceMotion ? FadeInDown.duration(0) : FadeInDown.delay(100).springify()}>
              <TouchableOpacity
                testID="add-tx-btn"
                onPress={handleOpenAdd}
                style={[
                  styles.addBtn,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight },
                ]}
                activeOpacity={0.75}
              >
                <DynamicIcon name="Plus" size={20} color={colors.primary} strokeWidth={2.5} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
        <View style={[styles.headerHighlight, { backgroundColor: colors.border }]} />
      </View>

      {cardId && filteredCard && (
        <Animated.View entering={reduceMotion ? FadeInDown.duration(0) : FadeInDown.delay(80).springify()} style={[styles.filterWrap, { paddingTop: 100 }]}>
          <TouchableOpacity 
            style={[styles.filterPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} 
            onPress={handleClearFilter}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, { color: colors.primary }]}>
              {filteredCard.nickname || filteredCard.card_details?.card_name || 'Card'}
            </Text>
            <DynamicIcon name="X" size={14} color={colors.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={{ paddingHorizontal: 24 }}>
            <TransactionListSkeleton />
          </View>
        ) : allTransactions.length === 0 ? (
          cardId ? (
            <ScrollView
              contentContainerStyle={styles.filteredEmptyState}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
            >
              <Text style={[styles.emptyFilteredText, { color: colors.textSecondary }]}>
                No transactions found for {filteredCard?.nickname || filteredCard?.card_details?.card_name || 'this card'} yet.
              </Text>
              <TouchableOpacity onPress={handleClearFilter} style={styles.clearBtn}>
                <Text style={[styles.clearBtnText, { color: colors.primary }]}>Clear Filter</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <EmptyTransactionState onAddPress={handleOpenAdd} />
          )
        ) : (
          <SectionList
            sections={groupedTransactions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            getItemLayout={(_, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
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
                
                {allTransactions.length > 0 && (
                  <View style={styles.insightToggleWrap}>
                    <TouchableOpacity
                      onPress={() => setShowInsights(!showInsights)}
                      style={[
                        styles.insightChip,
                        {
                          backgroundColor: showInsights ? colors.primary + '1A' : colors.surfaceElevated,
                          borderColor: showInsights ? colors.primary + '33' : colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={showInsights ? 'Hide analytics' : 'Show analytics'}
                    >
                      <DynamicIcon name="BarChart3" size={16} color={showInsights ? colors.primary : colors.textSecondary} strokeWidth={1.8} />
                      <Text style={[styles.insightChipText, { color: showInsights ? colors.primary : colors.textSecondary }]}>
                        {showInsights ? 'Hide Analytics' : 'Analytics'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {showInsights && (
                  <Animated.View entering={reduceMotion ? FadeInDown.duration(0) : FadeInDown.springify()}>
                    <CategoryRewardsChart transactions={allTransactions} />
                    <RewardLeakageCard transactions={allTransactions} />
                  </Animated.View>
                )}
              </View>
            }
            contentContainerStyle={[styles.scrollContent, !cardId && { paddingTop: 100 }]}
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

const ITEM_HEIGHT = 88; // TransactionRow: 76px content + 12px marginBottom

const styles = StyleSheet.create({
  headerAbsolute: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 100,
  },
  headerHighlight: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.layout.screenPadding,
    paddingTop: 60, // approximate safe area + spacing
    paddingBottom: 16,
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
    width: 44,
    height: 44,
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
  filterWrap: {
    paddingHorizontal: tokens.layout.screenPadding,
    marginBottom: 16,
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
  filteredEmptyState: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
    paddingBottom: 64,
  },
  emptyFilteredText: {
    fontSize: tokens.fontSize.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  clearBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearBtnText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  insightToggleWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  insightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  insightChipText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.3,
  },
});
