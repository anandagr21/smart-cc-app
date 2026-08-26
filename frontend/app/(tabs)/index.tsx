import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  AccessibilityInfo,
} from 'react-native';
import * as Sentry from '@sentry/react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { showToast } from '@/components/ui/Toast';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useRouter } from 'expo-router';
import { TransactionFormSheet } from '@/features/transactions/components/TransactionFormSheet';
import { EmptyDashboardState } from '@/features/transactions/components/EmptyDashboardState';
import { useMonthlyIntelligence } from '@/features/monthly_intelligence/hooks/useMonthlyIntelligence';
import { useSpendInsights } from '@/features/insights/hooks/useSpendInsights';
import { useCards } from '@/features/cards/hooks/useCards';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { useAuthStore } from '@/features/auth/store/authStore';
import { formatCategoryLabel } from '@/features/transactions/utils/categoryAccents';
import { QueryKeys } from '@/features/core/api/queryKeys';
import { DynamicIcon } from '@/components/DynamicIcon';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const CATEGORY_ICONS: Record<string, string> = {
  FOOD: 'Utensils',
  DINING: 'Utensils',
  FUEL: 'Fuel',
  ECOMMERCE: 'ShoppingBag',
  TRAVEL: 'Plane',
  GROCERY: 'ShoppingCart',
};

function iconForCategory(cat: string): string {
  return CATEGORY_ICONS[cat] || 'Tag';
}

const URGENCY_ORDER: Record<string, number> = {
  HIGH: 0,
  ELEVATED: 1,
  MODERATE: 2,
  LOW: 3,
};

export default function DashboardScreen() {
  const colors = useThemeColors();
  const isDark = colors.isDark;
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [isFormSheetVisible, setFormSheetVisible] = useState(false);
  const [quickStartData, setQuickStartData] = useState<{
    merchant_name: string;
    amount: string;
  } | null>(null);
  const [isRefreshing, setRefreshing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const now = new Date();
  const {
    data: monthlySummary,
    isLoading: statsLoading,
    error: statsError,
  } = useMonthlyIntelligence(now.getFullYear(), now.getMonth() + 1);
  const { primaryInsight, insights, isLoading: insightsLoading } = useSpendInsights();
  const { data: cardsData, isLoading: cardsLoading } = useCards();
  const { data: transactionsPages } = useTransactions();

  const isLoading = statsLoading || insightsLoading || cardsLoading;
  const hasStats =
    monthlySummary &&
    (monthlySummary.total_rewards_optimized > 0 ||
      monthlySummary.optimization_rate > 0);

  const feeWaiverAlerts = (cardsData || [])
    .filter(
      (c) =>
        c.effective_fee_waiver_threshold &&
        c.effective_fee_waiver_threshold > 0 &&
        !c.waiver_achieved,
    )
    .sort(
      (a, b) =>
        (URGENCY_ORDER[a.urgency_level || 'LOW'] ?? 3) -
        (URGENCY_ORDER[b.urgency_level || 'LOW'] ?? 3),
    )
    .slice(0, 3);

  const bestPairings: {
    category: string;
    cardName: string;
    txCount: number;
  }[] = (() => {
    if (!transactionsPages || !cardsData) return [];
    const allTxs = transactionsPages.pages.flatMap((p) => p.data);
    if (!allTxs.length) return [];
    const cardMap = new Map(
      cardsData.map((c) => [c.id, c.card_details?.card_name || 'Unknown Card']),
    );
    const categoryStats: Record<string, Record<string, number>> = {};
    allTxs.forEach((tx) => {
      if (!tx.category || !tx.user_card_id || tx.category === 'UNKNOWN') return;
      const cat = tx.category;
      const cardName = cardMap.get(tx.user_card_id);
      if (!cardName) return;
      if (!categoryStats[cat]) categoryStats[cat] = {};
      categoryStats[cat][cardName] =
        (categoryStats[cat][cardName] || 0) + 1;
    });
    return Object.entries(categoryStats)
      .flatMap(([category, cardCounts]) => {
        const best = Object.entries(cardCounts).sort(
          (a, b) => b[1] - a[1],
        )[0];
        return best
          ? [{ category, cardName: best[0], txCount: best[1] }]
          : [];
      })
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 4);
  })();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: QueryKeys.monthlyIntelligence.summary(
            now.getFullYear(),
            now.getMonth() + 1,
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: QueryKeys.insights.all,
        }),
        queryClient.invalidateQueries({
          queryKey: QueryKeys.cards.all,
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const maybeAnimated = (delay: number) =>
    reduceMotion
      ? FadeInDown.delay(delay).duration(0)
      : FadeInDown.delay(delay).springify();

  const userName = user?.full_name?.split(' ')[0] || 'User';

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <Animated.View entering={maybeAnimated(40)} style={styles.header}>
          <TouchableOpacity
            style={styles.profileHeaderLeft}
            activeOpacity={0.8}
            onPress={() => router.push('/profile')}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {userName.substring(0, 1).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.greetingText, { color: colors.textSecondary }]}>
                {userName}
              </Text>
              <View style={styles.premiumBadgeRow}>
                <Text style={styles.premiumBadgeText}>Beta Access</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.notificationIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push('/profile')}
          >
            <DynamicIcon name="Settings" size={18} color={colors.textPrimary} strokeWidth={1.8} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Error Banner ──────────────────────────────────────────────── */}
        {statsError && !isLoading ? (
          <ErrorBanner
            message="Unable to load dashboard data. Check your connection and try again."
            variant="error"
            onRetry={handleRefresh}
            onDismiss={() => {}}
          />
        ) : null}

        {/* ── Optimization Score Card ──────────────────────────────────── */}
        {!isLoading && (
          <Animated.View entering={maybeAnimated(60)} style={styles.scoreSection}>
            <View style={[styles.scoreCard, { backgroundColor: isDark ? '#13162A' : colors.surface, borderColor: isDark ? 'rgba(139,92,246,0.2)' : colors.border }]}>
              <View style={styles.scoreCardHeader}>
                <Text style={[styles.scoreCardLabel, { color: colors.textSecondary }]}>Your Optimization Score</Text>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => router.push('/monthly-intelligence')}
                >
                  <DynamicIcon name="ChevronRight" size={18} color={colors.textMuted} strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <View style={styles.scoreCardBody}>
                {/* Circular Score Ring */}
                <View style={styles.scoreRingWrap}>
                  <View style={styles.scoreRingOuter}>
                    <View style={[styles.scoreRingInner, { borderColor: isDark ? '#1E2340' : '#E5E7EB' }]}>
                      <View style={styles.scoreRingFill}>
                        <Text style={styles.scoreNumber}>
                          {monthlySummary?.optimization_rate ? Math.round(monthlySummary.optimization_rate) : '—'}
                        </Text>
                        <Text style={styles.scoreOutOf}>/100</Text>
                      </View>
                    </View>
                    {/* Arc segment overlay */}
                    <View style={[styles.scoreArcGreen, { opacity: monthlySummary?.optimization_rate ? 1 : 0.3 }]} />
                  </View>
                </View>

                {/* Score description */}
                <View style={styles.scoreDescWrap}>
                  <Text style={[styles.scoreGreatLabel, { color: colors.textPrimary }]}>
                    {monthlySummary?.optimization_rate
                      ? monthlySummary.optimization_rate >= 80
                        ? 'Great! 🎉'
                        : monthlySummary.optimization_rate >= 60
                        ? 'Good! 👍'
                        : 'Getting there!'
                      : 'No data yet'}
                  </Text>
                  <Text style={[styles.scoreSubText, { color: colors.textSecondary }]}>
                    {monthlySummary?.optimization_rate
                      ? `${Math.round(monthlySummary.optimization_rate)}% of this month's purchases optimized`
                      : 'Add purchases to see your score'}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Primary action: "Which card should I use?" ─────────────────── */}
        {!isLoading && cardsData && cardsData.length > 0 ? (
          <Animated.View entering={maybeAnimated(80)} style={styles.primaryActionWrap}>
            <TouchableOpacity
              style={[styles.primaryAction, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
              onPress={() => {
                setQuickStartData(null);
                setFormSheetVisible(true);
              }}
            >
              <View style={styles.primaryActionIcon}>
                <DynamicIcon name="CreditCard" size={18} color="#FFFFFF" strokeWidth={2.4} />
              </View>
              <View style={styles.primaryActionTextWrap}>
                <Text style={styles.primaryActionTitle}>Which card should I use?</Text>
                <Text style={styles.primaryActionSub}>Enter a purchase to find your best card</Text>
              </View>
              <DynamicIcon name="ArrowRight" size={18} color="rgba(255,255,255,0.85)" strokeWidth={2.4} />
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {/* ── 4-Button Action Bar ───────────────────────────────────────── */}
        <Animated.View entering={maybeAnimated(90)} style={styles.actionGrid}>
          {/* Add Transaction */}
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => {
              setQuickStartData(null);
              setFormSheetVisible(true);
            }}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.primary }]}>
              <DynamicIcon name="Plus" size={20} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Add purchase</Text>
          </TouchableOpacity>

          {/* My Cards */}
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => router.push('/cards')}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <DynamicIcon name="CreditCard" size={19} color={colors.textPrimary} strokeWidth={2} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>My cards</Text>
          </TouchableOpacity>

          {/* Monthly Intelligence */}
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => router.push('/monthly-intelligence')}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <DynamicIcon name="BarChart3" size={19} color={colors.textPrimary} strokeWidth={2} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Insights</Text>
          </TouchableOpacity>

          {/* Activity / History */}
          <TouchableOpacity
            style={styles.actionItem}
            activeOpacity={0.8}
            onPress={() => router.push('/history')}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <DynamicIcon name="Clock" size={19} color={colors.textPrimary} strokeWidth={2} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Activity</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Loading Skeleton ──────────────────────────────────────────── */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <SkeletonBox height={160} width="100%" borderRadius={tokens.radius.card} style={{ marginBottom: 16 }} />
            <SkeletonBox height={80} width="100%" borderRadius={tokens.radius.card} style={{ marginBottom: 16 }} />
          </View>
        ) : null}

        {/* ── Empty Dashboard State ─────────────────────────────────────── */}
        {!isLoading && !hasStats && !primaryInsight && (!cardsData || cardsData.length === 0) ? (
          <EmptyDashboardState
            onAddCard={() => router.push('/cards')}
            onAddTransaction={() => {
              setQuickStartData(null);
              setFormSheetVisible(true);
            }}
            onQuickStart={(merchant, amount) => {
              setQuickStartData({
                merchant_name: merchant,
                amount: String(amount),
              });
              setFormSheetVisible(true);
            }}
          />
        ) : null}



        {/* ── Fee Waiver Radar ──────────────────────────────────────────── */}
        {!isLoading && feeWaiverAlerts.length > 0 ? (
          <Animated.View entering={maybeAnimated(110)} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                ANNUAL FEES
              </Text>
              <DynamicIcon name="ShieldAlert" size={15} color={colors.warning} />
            </View>

            <View style={styles.alertList}>
              {feeWaiverAlerts.map((card) => {
                const isUrgent =
                  card.urgency_level === 'HIGH' ||
                  card.urgency_level === 'ELEVATED';
                const cardName = card.card_details?.card_name || 'Card';
                const remaining = card.remaining_spend_for_waiver || 0;
                const fee = card.effective_annual_fee || 0;
                const days = card.days_until_renewal;

                return (
                  <TouchableOpacity
                    key={card.id}
                    activeOpacity={0.8}
                    onPress={() => router.push('/cards')}
                    style={[
                      styles.waiverCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.waiverCardHeader}>
                      <View style={styles.waiverCardTitleWrap}>
                        <Text style={[styles.waiverCardName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {cardName}
                        </Text>
                        <Text style={[styles.waiverFeeSub, { color: colors.textSecondary }]}>
                          Save ₹{fee.toLocaleString('en-IN')} annual fee
                        </Text>
                      </View>

                      {isUrgent && (
                        <View style={[styles.urgencyBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.10)' }]}>
                          <Text style={styles.urgencyText}>Action needed</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.waiverMetricRow}>
                      <Text style={[styles.waiverTargetText, { color: colors.textPrimary }]}>
                        ₹{Math.round(remaining).toLocaleString('en-IN')}{' '}
                        <Text style={[styles.waiverTargetSub, { color: colors.textSecondary }]}>remaining target</Text>
                      </Text>
                      {days !== undefined && days !== null && (
                        <Text style={[styles.waiverDaysText, { color: colors.textSecondary }]}>
                          {days} days left
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {/* ── Top Recommendations ──────────────────────────────────────── */}
        {!isLoading && bestPairings.length > 0 ? (
          <Animated.View entering={maybeAnimated(120)} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                TOP RECOMMENDATIONS
              </Text>
            </View>

            <View style={[styles.recCard, { backgroundColor: isDark ? '#13162A' : colors.surface, borderColor: isDark ? 'rgba(139,92,246,0.15)' : colors.border }]}>
              {bestPairings.map((pairing, idx) => {
                const icon = iconForCategory(pairing.category);
                const iconColors: Record<string, string> = {
                  FOOD: '#3B82F6', DINING: '#3B82F6', FUEL: '#F97316',
                  ECOMMERCE: '#EC4899', TRAVEL: '#06B6D4', GROCERY: '#10B981',
                };
                const iconBg = iconColors[pairing.category] || '#8B5CF6';
                return (
                  <TouchableOpacity
                    key={pairing.category}
                    activeOpacity={0.75}
                    onPress={() => router.push('/cards')}
                    style={[
                      styles.recRow,
                      idx < bestPairings.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.recIconCircle, { backgroundColor: iconBg + '22' }]}>
                      <DynamicIcon name={icon} size={18} color={iconBg} strokeWidth={2.2} />
                    </View>
                    <View style={styles.recInfo}>
                      <Text style={[styles.recCardName, { color: colors.textPrimary }]} numberOfLines={1}>
                        Use <Text style={{ color: '#8B5CF6', fontWeight: '700' }}>{pairing.cardName}</Text>
                      </Text>
                      <Text style={[styles.recDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                        for {formatCategoryLabel(pairing.category).toLowerCase()}
                      </Text>
                    </View>
                    <DynamicIcon name="ChevronRight" size={16} color={colors.textMuted} strokeWidth={2} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {/* ── Potential Annual Benefit ─────────────────────────────────── */}
        {!isLoading && monthlySummary ? (
          <Animated.View entering={maybeAnimated(130)} style={styles.section}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/monthly-intelligence')}
              style={[styles.benefitCard, { backgroundColor: isDark ? '#13162A' : colors.surface, borderColor: isDark ? 'rgba(139,92,246,0.2)' : colors.border }]}
            >
              <View style={styles.benefitCardHeader}>
                <Text style={[styles.benefitCardLabel, { color: colors.textSecondary }]}>Rewards optimized this month</Text>
                <DynamicIcon name="ArrowRight" size={16} color={colors.textMuted} strokeWidth={2} />
              </View>
              <View style={styles.benefitCardBody}>
                <Text style={[styles.benefitAmount, { color: colors.textPrimary }]}>
                  ₹{(monthlySummary.total_rewards_optimized || 0).toLocaleString('en-IN')}
                </Text>
                <View style={[styles.benefitGiftIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                  <Text style={styles.benefitGiftEmoji}>🎁</Text>
                </View>
              </View>
              <Text style={[styles.benefitSub, { color: colors.textSecondary }]}>from purchases logged this month</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : primaryInsight ? (
          <Animated.View entering={maybeAnimated(130)} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                RECOMMENDATION
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/monthly-intelligence')}
              style={[
                styles.insightCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.insightHeader}>
                <View style={styles.insightHeaderLeft}>
                  <View style={[styles.insightIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                    <DynamicIcon name="Sparkles" size={14} color={colors.primary} strokeWidth={2.4} />
                  </View>
                  <Text style={[styles.insightTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    {primaryInsight.title}
                  </Text>
                </View>
                <DynamicIcon name="ChevronRight" size={16} color={colors.textSecondary} strokeWidth={2} />
              </View>
              <Text style={[styles.insightSummary, { color: colors.textSecondary }]}>
                {primaryInsight.summary}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}
      </ScrollView>

      <TransactionFormSheet
        visible={isFormSheetVisible}
        onClose={() => {
          setFormSheetVisible(false);
          setTimeout(() => setQuickStartData(null), 300);
        }}
        onSuccess={() => {
          showToast('Transaction logged');
          setTimeout(() => {
            handleRefresh();
          }, 600);
        }}
        initialData={quickStartData}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 120,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6D28D9',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarInitials: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.heavy,
    color: '#FFFFFF',
  },
  greetingText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: -0.2,
  },
  premiumBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  premiumBadgeIcon: {
    fontSize: 11,
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: tokens.fontWeight.semibold,
    color: '#FBBF24',
    letterSpacing: 0.2,
  },
  notificationIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  // Score ring
  scoreSection: {
    marginBottom: 22,
  },
  scoreCard: {
    borderRadius: tokens.radius.card,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  scoreCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreCardLabel: {
    fontSize: tokens.fontSize.bodySm,
    fontWeight: tokens.fontWeight.semibold,
  },
  scoreCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scoreRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scoreRingInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRingFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreArcGreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: 'transparent',
    borderTopColor: '#10B981',
    borderRightColor: '#10B981',
    transform: [{ rotate: '-45deg' }],
  },
  scoreNumber: {
    fontSize: 22,
    fontWeight: tokens.fontWeight.heavy,
    color: '#10B981',
    letterSpacing: -0.5,
  },
  scoreOutOf: {
    fontSize: 10,
    fontWeight: tokens.fontWeight.medium,
    color: '#6B7280',
  },
  scoreDescWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  scoreGreatLabel: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  scoreSubText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: 17,
  },
  primaryActionWrap: {
    marginBottom: 22,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: tokens.radius.card,
    shadowColor: '#0052FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  primaryActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  primaryActionTextWrap: {
    flex: 1,
  },
  primaryActionTitle: {
    color: '#FFFFFF',
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  primaryActionSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 6,
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  actionLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: -0.1,
  },
  skeletonContainer: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 1.2,
  },
  seeAllLink: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
  },
  cardCarouselContent: {
    paddingRight: 20,
    gap: 14,
  },
  carouselItemWrapper: {
    marginRight: 2,
  },
  alertList: {
    gap: 10,
  },
  waiverCard: {
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  waiverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  waiverCardTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  waiverCardName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  waiverFeeSub: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgencyText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: tokens.fontWeight.bold,
  },
  waiverMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  waiverTargetText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  waiverTargetSub: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.normal,
  },
  waiverDaysText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  // Recommendation rows
  recCard: {
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  recIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recInfo: {
    flex: 1,
  },
  recCardName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
    marginBottom: 2,
  },
  recDesc: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  // Benefit card
  benefitCard: {
    borderRadius: tokens.radius.card,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  benefitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitCardLabel: {
    fontSize: tokens.fontSize.bodySm,
    fontWeight: tokens.fontWeight.semibold,
  },
  benefitCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  benefitAmount: {
    fontSize: 30,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.8,
  },
  benefitGiftIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitGiftEmoji: {
    fontSize: 22,
  },
  benefitSub: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.medium,
  },
  // Legacy pairing styles (kept for compatibility)
  pairingsCard: {
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
  },
  pairingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pairingCategoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pairingInfo: {
    flex: 1,
    marginRight: 10,
  },
  pairingCategory: {
    fontSize: tokens.fontSize.bodySm,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 2,
  },
  pairingCount: {
    fontSize: 11,
    fontWeight: tokens.fontWeight.medium,
  },
  pairingCardPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: '45%',
  },
  pairingCardText: {
    fontSize: 11,
    fontWeight: tokens.fontWeight.bold,
  },
  insightCard: {
    padding: 18,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  insightIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: -0.2,
    flex: 1,
  },
  insightSummary: {
    fontSize: tokens.fontSize.bodySm,
    lineHeight: 18,
  },
});
