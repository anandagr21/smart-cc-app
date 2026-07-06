import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SectionList, RefreshControl, StyleSheet, AccessibilityInfo, ScrollView } from 'react-native';

import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { tokens } from '@/theme/tokens';
import { DynamicIcon } from '@/components/DynamicIcon';

export default function HistoryScreen() {
  const { cardId } = useLocalSearchParams<{ cardId?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: cards } = useCards();
  const filteredCard = cards?.find(c => c.id === cardId);

  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage } = useTransactions({ cardId });
  const [isFormSheetVisible, setFormSheetVisible] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionResponse | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'activity' | 'insights'>('activity');
  const [reduceMotion, setReduceMotion] = useState(false);
  const colors = useThemeColors();

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

  const handleEndReached = () => { if (hasNextPage) fetchNextPage(); };

  const handleTransactionPress = (tx: TransactionResponse) => {
    setSelectedTransaction(tx);
  };

  const handleClearFilter = () => { router.setParams({ cardId: '' }); };

  const anim = (delay: number) =>
    reduceMotion ? FadeInDown.duration(0) : FadeInDown.delay(delay).springify();

  const showHeader = allTransactions.length > 0;

  return (
    <ScreenContainer noPadding>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Animated.View entering={anim(50)} style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Activity</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your spending intelligence</Text>
        </Animated.View>

        {showHeader && (
          <Animated.View entering={anim(100)}>
            <TouchableOpacity
              testID="add-tx-btn"
              onPress={handleOpenAdd}
              style={[styles.addBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              activeOpacity={0.75}
            >
              <DynamicIcon name="Plus" size={22} color="#FFF" strokeWidth={2.5} />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* ── Segmented Control ───────────────────────────────────────────── */}
      {showHeader && (
        <Animated.View entering={anim(80)} style={styles.segmentWrap}>
          <View style={[styles.segmentBg, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.segment, activeTab === 'activity' && [styles.segmentActive, { backgroundColor: colors.surface, borderColor: colors.border }]]}
              onPress={() => setActiveTab('activity')}
              activeOpacity={0.8}
            >
              <DynamicIcon name="LayoutList" size={14} color={activeTab === 'activity' ? colors.textPrimary : colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.segmentText, { color: activeTab === 'activity' ? colors.textPrimary : colors.textSecondary }]}>Activity</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, activeTab === 'insights' && [styles.segmentActive, { backgroundColor: colors.surface, borderColor: colors.border }]]}
              onPress={() => setActiveTab('insights')}
              activeOpacity={0.8}
            >
              <DynamicIcon name="BarChart3" size={14} color={activeTab === 'insights' ? colors.textPrimary : colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.segmentText, { color: activeTab === 'insights' ? colors.textPrimary : colors.textSecondary }]}>Insights</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* ── Filter Pill ─────────────────────────────────────────────────── */}
      {cardId && filteredCard && (
        <Animated.View entering={anim(80)} style={styles.filterWrap}>
          <TouchableOpacity
            style={[styles.filterPill, { backgroundColor: colors.primarySoft, borderColor: colors.primary + '30' }]}
            onPress={handleClearFilter}
            activeOpacity={0.7}
          >
            <DynamicIcon name="Filter" size={12} color={colors.primary} />
            <Text style={[styles.filterText, { color: colors.primary }]}>
              {filteredCard.nickname || filteredCard.card_details?.card_name || 'Card'}
            </Text>
            <DynamicIcon name="X" size={12} color={colors.primary} strokeWidth={2.5} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── Content Area ────────────────────────────────────────────────── */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={{ paddingHorizontal: 24 }}>
            <TransactionListSkeleton />
          </View>
        ) : allTransactions.length === 0 ? (
          cardId ? (
            <ScrollView
              contentContainerStyle={styles.filteredEmpty}
              refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
            >
              <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
                <DynamicIcon name="Search" size={28} color={colors.textMuted} strokeWidth={1.5} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No matches</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No transactions found for this card yet.
              </Text>
              <TouchableOpacity onPress={handleClearFilter} style={[styles.clearBtn, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.clearBtnText, { color: colors.primary }]}>Clear filter</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <EmptyTransactionState onAddPress={handleOpenAdd} />
          )
        ) : activeTab === 'activity' ? (
          <SectionList
            sections={groupedTransactions}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TransactionRow transaction={item} onPress={handleTransactionPress} index={index} />
            )}
            getItemLayout={(_, index) => ({
              length: ITEM_HEIGHT,
              offset: ITEM_HEIGHT * index,
              index,
            })}
            renderSectionHeader={({ section: { title } }) => (
              <View style={[styles.sectionHeader]}>
                <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
              </View>
            )}
            ListHeaderComponent={
              <View style={styles.summaryWrap}>
                <SavingsSummaryCard transactions={allTransactions} />
              </View>
            }
            contentContainerStyle={styles.scrollContent}
            stickySectionHeadersEnabled={false}
            showsVerticalScrollIndicator={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
          />
        ) : (
          <Animated.ScrollView
            entering={anim(0)}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <CategoryRewardsChart transactions={allTransactions} />
            <RewardLeakageCard transactions={allTransactions} />
          </Animated.ScrollView>
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

const ITEM_HEIGHT = 88;

const styles = StyleSheet.create({
  // ── Header ─────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: tokens.layout.screenPadding,
    paddingBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: tokens.fontSize.display,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: 0.2,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  // ── Segmented Control ──────────────────────────────────────────────────
  segmentWrap: {
    paddingHorizontal: tokens.layout.screenPadding,
    paddingBottom: 24,
  },
  segmentBg: {
    flexDirection: 'row',
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    padding: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: tokens.radius.md,
  },
  segmentActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
  },

  // ── Filter ─────────────────────────────────────────────────────────────
  filterWrap: {
    paddingHorizontal: tokens.layout.screenPadding,
    marginBottom: 8,
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  filterText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },

  // ── List ───────────────────────────────────────────────────────────────
  listContainer: {
    flex: 1,
  },
  summaryWrap: {
    marginBottom: 8,
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
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

  // ── Empty States ───────────────────────────────────────────────────────
  filteredEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 64,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: tokens.fontSize.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  clearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: tokens.radius.full,
  },
  clearBtnText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
});
