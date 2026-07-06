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
import { QueryKeys } from '@/features/core/api/queryKeys';

import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { DynamicIcon } from '@/components/DynamicIcon';

// ── Greeting ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Category → Icon mapping ──────────────────────────────────────────────────

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

// ── Urgency order ─────────────────────────────────────────────────────────────

const URGENCY_ORDER: Record<string, number> = {
  HIGH: 0,
  ELEVATED: 1,
  MODERATE: 2,
  LOW: 3,
};

// ── Dashboard Screen ──────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const { primaryInsight, isLoading: insightsLoading } = useSpendInsights();
  const { data: cardsData } = useCards();

  const isLoading = statsLoading || insightsLoading;
  const hasStats =
    monthlySummary &&
    (monthlySummary.total_rewards_optimized > 0 ||
      monthlySummary.optimization_rate > 0);

  // ── Fee Waiver Alerts ──────────────────────────────────────────────────
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

  // ── Best Card Pairings ─────────────────────────────────────────────────
  const { data: transactionsPages } = useTransactions();
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
      .slice(0, 5);
  })();

  // ── Pull-to-refresh ────────────────────────────────────────────────────
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
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const maybeAnimated = (delay: number) =>
    reduceMotion
      ? FadeInDown.delay(delay).duration(0)
      : FadeInDown.delay(delay).springify();

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
        {/* ── Header ────────────────────────────────────────────────────── */}
        <Animated.View entering={maybeAnimated(50)} style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.heroLine, { color: colors.textPrimary }]}>
            Here's how your cards are doing.
          </Text>

          {/* Monthly Intelligence — lightweight text link, not a card */}
          <TouchableOpacity
            style={styles.intelRow}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Monthly Intelligence"
            onPress={() => {
              Sentry.addBreadcrumb({
                category: 'navigation',
                message: 'Monthly Intelligence Opened',
              });
              router.push('/monthly-intelligence');
            }}
          >
            <DynamicIcon
              name="Sparkles"
              size={14}
              color={colors.primary}
              strokeWidth={2}
            />
            <Text style={[styles.intelLabel, { color: colors.primary }]}>
              Monthly Intelligence
            </Text>
            <DynamicIcon
              name="ChevronRight"
              size={14}
              color={colors.primary}
              strokeWidth={2}
            />
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

        {/* ── Loading Skeleton ──────────────────────────────────────────── */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <SkeletonBox
              height={14}
              width="55%"
              borderRadius={6}
              style={{ marginBottom: 10 }}
            />
            <SkeletonBox
              height={36}
              width="40%"
              borderRadius={8}
              style={{ marginBottom: 20 }}
            />
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <SkeletonBox height={12} width="60%" borderRadius={6} />
                <View style={{ height: 12 }} />
                <SkeletonBox height={28} width="40%" borderRadius={8} />
              </View>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <SkeletonBox height={12} width="50%" borderRadius={6} />
                <View style={{ height: 12 }} />
                <SkeletonBox height={28} width="50%" borderRadius={8} />
              </View>
            </View>
            <View
              style={[
                styles.insightCard,
                { backgroundColor: colors.surface, marginTop: 16 },
              ]}
            >
              <SkeletonBox height={12} width="35%" borderRadius={6} />
              <View style={{ height: 16 }} />
              <SkeletonBox height={16} width="90%" borderRadius={8} />
              <View style={{ height: 8 }} />
              <SkeletonBox height={12} width="70%" borderRadius={6} />
            </View>
          </View>
        ) : null}

        {/* ── Empty Dashboard State ─────────────────────────────────────── */}
        {!isLoading && !hasStats && !primaryInsight ? (
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

        {/* ── Stats Section ─────────────────────────────────────────────── */}
        {!isLoading && hasStats ? (
          <Animated.View
            entering={maybeAnimated(100)}
            style={styles.statsContainer}
          >
            {/* Reward Efficiency + Rewards — side by side */}
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.statHeader}>
                  <DynamicIcon
                    name="Trophy"
                    size={15}
                    color={colors.warning}
                    strokeWidth={2}
                  />
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Reward Efficiency
                  </Text>
                </View>
                <AnimatedNumber
                  value={monthlySummary?.optimization_rate || 0}
                  suffix="%"
                  style={[styles.statValue, { color: colors.textPrimary }]}
                />
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.successSoft },
                ]}
              >
                <View style={styles.statHeader}>
                  <DynamicIcon
                    name="TrendingUp"
                    size={15}
                    color={colors.success}
                    strokeWidth={2}
                  />
                  <Text style={[styles.statLabel, { color: colors.success }]}>
                    Rewards this month
                  </Text>
                </View>
                <AnimatedNumber
                  value={monthlySummary?.total_rewards_optimized || 0}
                  prefix="₹"
                  style={[styles.statValue, { color: colors.success }]}
                />
              </View>
            </View>

            {/* Best Category */}
            {monthlySummary?.strongest_category ? (
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Best category: ${monthlySummary.strongest_category}`}
                onPress={() => {
                  Sentry.addBreadcrumb({
                    category: 'navigation',
                    message: 'Best Category → Monthly Intelligence',
                  });
                  router.push('/monthly-intelligence');
                }}
              >
                <View
                  style={[
                    styles.bestCatRow,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Text
                    style={[
                      styles.bestCatLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Best category
                  </Text>
                  <View style={styles.bestCatRight}>
                    <Text
                      style={[
                        styles.bestCatPill,
                        {
                          color: colors.success,
                          backgroundColor: colors.successSoft,
                        },
                      ]}
                    >
                      {monthlySummary.strongest_category}
                    </Text>
                    <DynamicIcon
                      name="ChevronRight"
                      size={14}
                      color={colors.textMuted}
                      strokeWidth={2}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ) : null}
          </Animated.View>
        ) : null}

        {/* ── Primary Action ────────────────────────────────────────────── */}
        {cardsData && cardsData.length > 0 ? (
          <Animated.View
            entering={maybeAnimated(120)}
            style={styles.actionContainer}
          >
            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                { backgroundColor: colors.primary },
              ]}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Add transaction"
              onPress={() => {
                setQuickStartData(null);
                setFormSheetVisible(true);
              }}
            >
              <DynamicIcon
                name="Plus"
                size={22}
                color="#FFF"
                strokeWidth={2.5}
              />
              <Text style={styles.primaryActionText}>Add Transaction</Text>
            </TouchableOpacity>
            <Text style={[styles.actionHint, { color: colors.textSecondary }]}>
              Get instant recommendations based on your portfolio.
            </Text>
          </Animated.View>
        ) : null}

        {/* ── Add First Card prompt ─────────────────────────────────────── */}
        {cardsData && cardsData.length === 0 ? (
          <Animated.View
            entering={maybeAnimated(120)}
            style={styles.actionContainer}
          >
            <View
              style={[
                styles.addCardCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <View
                style={[
                  styles.addCardIconWrap,
                  { backgroundColor: colors.primarySoft },
                ]}
              >
                <DynamicIcon
                  name="CreditCard"
                  size={28}
                  color={colors.primary}
                  strokeWidth={1.5}
                />
              </View>
              <Text
                style={[styles.addCardTitle, { color: colors.textPrimary }]}
              >
                Add your first card
              </Text>
              <Text
                style={[styles.addCardBody, { color: colors.textSecondary }]}
              >
                Connect your credit cards to unlock reward optimization and
                real-time recommendations.
              </Text>
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  { backgroundColor: colors.primary },
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Add a card"
                onPress={() => router.push('/cards')}
              >
                <DynamicIcon
                  name="Plus"
                  size={22}
                  color="#FFF"
                  strokeWidth={2.5}
                />
                <Text style={styles.primaryActionText}>Add a Card</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.actionHint, { color: colors.textSecondary }]}>
              We support 60+ Indian credit cards across 14 banks.
            </Text>
          </Animated.View>
        ) : null}

        {/* ── Fee Waiver Alerts ──────────────────────────────────────────── */}
        {!isLoading && feeWaiverAlerts.length > 0 ? (
          <Animated.View entering={maybeAnimated(130)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Fee waiver alerts
            </Text>
            <View style={styles.alertList}>
              {feeWaiverAlerts.map((card) => {
                const isUrgent =
                  card.urgency_level === 'HIGH' ||
                  card.urgency_level === 'ELEVATED';
                const urgencyColor = isUrgent
                  ? colors.warning
                  : colors.textSecondary;
                const cardName =
                  card.card_details?.card_name || 'Unknown Card';
                const remaining = card.remaining_spend_for_waiver || 0;
                const monthsLeft = card.days_until_renewal
                  ? Math.max(1, Math.round(card.days_until_renewal / 30))
                  : null;
                const monthlyTarget = monthsLeft
                  ? Math.round(remaining / monthsLeft)
                  : null;

                return (
                  <TouchableOpacity
                    key={card.id}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${cardName}: ₹${Math.round(remaining).toLocaleString('en-IN')} more to waive your ₹${card.effective_annual_fee || 0} fee`}
                    onPress={() => router.push('/cards')}
                    style={[
                      styles.alertCard,
                      {
                        backgroundColor: isUrgent
                          ? colors.warning + '0A'
                          : colors.surface,
                        borderLeftColor: urgencyColor,
                      },
                    ]}
                  >
                    <View style={styles.alertHeader}>
                      <DynamicIcon
                        name={isUrgent ? 'AlertTriangle' : 'Clock'}
                        size={15}
                        color={urgencyColor}
                        strokeWidth={2}
                      />
                      <Text
                        style={[
                          styles.alertCardName,
                          { color: colors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {cardName}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.alertBody,
                        { color: colors.textSecondary },
                      ]}
                    >
                      ₹{Math.round(remaining).toLocaleString('en-IN')} more to waive your ₹
                      {(card.effective_annual_fee || 0).toLocaleString('en-IN')}{' '}
                      fee
                    </Text>
                    {monthsLeft && monthlyTarget ? (
                      <Text
                        style={[
                          styles.alertHint,
                          { color: colors.textMuted },
                        ]}
                      >
                        {monthsLeft} month{monthsLeft > 1 ? 's' : ''}{' '}
                        remaining · ₹{Math.round(monthlyTarget).toLocaleString('en-IN')}
                        /month
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        {/* ── Best Card Pairings ─────────────────────────────────────────── */}
        {!isLoading && bestPairings.length > 0 ? (
          <Animated.View entering={maybeAnimated(140)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Your best pairings
            </Text>
            <View
              style={[styles.pairingsCard, { backgroundColor: colors.surface }]}
            >
              {bestPairings.map((pairing, idx) => (
                <View
                  key={pairing.category}
                  style={[
                    styles.pairingRow,
                    idx < bestPairings.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                      paddingBottom: 10,
                      marginBottom: 10,
                    },
                  ]}
                >
                  <DynamicIcon
                    name={iconForCategory(pairing.category)}
                    size={15}
                    color={colors.textSecondary}
                    strokeWidth={1.5}
                  />
                  <Text
                    style={[
                      styles.pairingCategory,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {pairing.category.charAt(0) +
                      pairing.category.slice(1).toLowerCase()}
                  </Text>
                  <DynamicIcon
                    name="ArrowRight"
                    size={13}
                    color={colors.textMuted}
                    strokeWidth={2}
                  />
                  <Text
                    style={[styles.pairingCard, { color: colors.primary }]}
                    numberOfLines={1}
                  >
                    {pairing.cardName}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {/* ── Recent Recommendation ──────────────────────────────────────── */}
        {!isLoading && primaryInsight ? (
          <Animated.View
            entering={maybeAnimated(150)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              Recent recommendation
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={primaryInsight.title}
              style={[
                styles.insightCard,
                {
                  backgroundColor: primaryInsight.badge_color + '0A',
                  borderLeftColor: primaryInsight.badge_color,
                },
              ]}
            >
              <View style={styles.insightHeader}>
                <View style={styles.insightHeaderLeft}>
                  <DynamicIcon
                    name="Lightbulb"
                    size={16}
                    color={primaryInsight.badge_color}
                    strokeWidth={2}
                  />
                  <View
                    style={[
                      styles.insightBadge,
                      {
                        backgroundColor: primaryInsight.badge_color + '15',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.insightBadgeText,
                        { color: primaryInsight.badge_color },
                      ]}
                    >
                      {primaryInsight.badge_label}
                    </Text>
                  </View>
                </View>
                <DynamicIcon
                  name="ChevronRight"
                  size={16}
                  color={colors.textMuted}
                  strokeWidth={2}
                />
              </View>
              <Text
                style={[styles.insightTitle, { color: colors.textPrimary }]}
              >
                {primaryInsight.title}
              </Text>
              <Text
                style={[
                  styles.insightSummary,
                  { color: colors.textSecondary },
                ]}
              >
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

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120 },

  // ── Header ────────────────────────────────────────────────────────────
  header: {
    marginBottom: 28,
    paddingTop: 4,
  },
  greeting: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: 4,
  },
  heroLine: {
    fontSize: 28,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -0.8,
    lineHeight: 34,
    marginBottom: 16,
  },
  intelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  intelLabel: {
    fontSize: tokens.fontSize.bodySm,
    fontWeight: tokens.fontWeight.semibold,
  },

  // ── Skeleton ──────────────────────────────────────────────────────────
  skeletonContainer: {
    gap: 0,
  },

  // ── Stats ─────────────────────────────────────────────────────────────
  statsContainer: {
    marginBottom: 8,
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: tokens.radius.card,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 10,
  },
  statLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 30,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: -1,
  },
  // ── Best Category ─────────────────────────────────────────────────────
  bestCatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: tokens.radius.card,
  },
  bestCatLabel: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
  },
  bestCatRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bestCatPill: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: tokens.radius.full,
    textTransform: 'capitalize',
  },

  // ── Insight ───────────────────────────────────────────────────────────
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  insightCard: {
    padding: 18,
    borderRadius: tokens.radius.card,
    borderLeftWidth: 3,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  insightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  insightBadgeText: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  insightTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 4,
  },
  insightSummary: {
    fontSize: tokens.fontSize.bodySm,
    lineHeight: 19,
  },

  // ── Pairings ──────────────────────────────────────────────────────────
  pairingsCard: {
    borderRadius: tokens.radius.card,
    padding: 14,
  },
  pairingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pairingCategory: {
    fontSize: tokens.fontSize.bodySm,
    fontWeight: tokens.fontWeight.semibold,
    flex: 1,
  },
  pairingCard: {
    fontSize: tokens.fontSize.bodySm,
    fontWeight: tokens.fontWeight.semibold,
    maxWidth: '50%',
  },

  // ── Add Card Prompt ───────────────────────────────────────────────────
  addCardCard: {
    padding: 28,
    borderRadius: tokens.radius.card,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  addCardIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  addCardTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  addCardBody: {
    fontSize: tokens.fontSize.body,
    lineHeight: tokens.fontSize.body * 1.6,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 290,
  },

  // ── Fee Waiver Alerts ─────────────────────────────────────────────────
  alertList: {
    gap: 8,
  },
  alertCard: {
    padding: 14,
    borderRadius: tokens.radius.sm,
    borderLeftWidth: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  alertCardName: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
    flex: 1,
  },
  alertBody: {
    fontSize: tokens.fontSize.bodySm,
    lineHeight: 19,
    marginLeft: 23,
  },
  alertHint: {
    fontSize: tokens.fontSize.caption,
    marginLeft: 23,
    marginTop: 3,
  },

  // ── CTA ───────────────────────────────────────────────────────────────
  actionContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: tokens.radius.full,
    width: '100%',
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.3,
  },
  actionHint: {
    marginTop: 14,
    fontSize: tokens.fontSize.bodySm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
