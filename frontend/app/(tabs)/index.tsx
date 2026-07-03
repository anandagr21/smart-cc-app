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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isFormSheetVisible, setFormSheetVisible] = useState(false);
  const [quickStartData, setQuickStartData] = useState<{ merchant_name: string; amount: string } | null>(null);
  const [isRefreshing, setRefreshing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Check reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  // Load existing intelligence data
  const now = new Date();
  const {
    data: monthlySummary,
    isLoading: statsLoading,
    error: statsError,
  } = useMonthlyIntelligence(now.getFullYear(), now.getMonth() + 1);
  const {
    primaryInsight,
    isLoading: insightsLoading,
  } = useSpendInsights();
  const { data: cardsData } = useCards();

  const isLoading = statsLoading || insightsLoading;
  const hasStats = monthlySummary && (monthlySummary.total_rewards_optimized > 0 || monthlySummary.optimization_rate > 0);

  // ── Fee Waiver Alerts ────────────────────────────────────────────────────────
  const feeWaiverAlerts = (cardsData || [])
    .filter(c => c.effective_fee_waiver_threshold && c.effective_fee_waiver_threshold > 0 && !c.waiver_achieved)
    .sort((a, b) => {
      const urgencyOrder: Record<string, number> = { HIGH: 0, ELEVATED: 1, MODERATE: 2, LOW: 3 };
      return (urgencyOrder[a.urgency_level || 'LOW'] ?? 3) - (urgencyOrder[b.urgency_level || 'LOW'] ?? 3);
    })
    .slice(0, 3);

  // ── Best Card Pairings (Cheat Sheet) ─────────────────────────────────────────
  const { data: transactionsPages } = useTransactions();
  const bestPairings: { category: string; cardName: string; txCount: number }[] = (() => {
    if (!transactionsPages || !cardsData) return [];
    const allTxs = transactionsPages.pages.flatMap(p => p.data);
    if (!allTxs.length) return [];
    const cardMap = new Map(cardsData.map(c => [c.id, c.card_details?.card_name || 'Unknown Card']));
    const categoryStats: Record<string, Record<string, number>> = {};
    allTxs.forEach((tx) => {
      if (!tx.category || !tx.user_card_id || tx.category === 'UNKNOWN') return;
      const cat = tx.category;
      const cardName = cardMap.get(tx.user_card_id);
      if (!cardName) return;
      if (!categoryStats[cat]) categoryStats[cat] = {};
      categoryStats[cat][cardName] = (categoryStats[cat][cardName] || 0) + 1;
    });
    return Object.entries(categoryStats)
      .flatMap(([category, cardCounts]) => {
        const best = Object.entries(cardCounts).sort((a, b) => b[1] - a[1])[0];
        return best ? [{ category, cardName: best[0], txCount: best[1] }] : [];
      })
      .sort((a, b) => b.txCount - a.txCount)
      .slice(0, 5);
  })();

  // ── Pull-to-refresh ──────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QueryKeys.monthlyIntelligence.summary(now.getFullYear(), now.getMonth() + 1) }),
        queryClient.invalidateQueries({ queryKey: QueryKeys.insights.all }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Animation helper: instant fade when reduced motion, springified otherwise
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
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Animated.View entering={maybeAnimated(50)} style={styles.header}>
          <Text style={[styles.heroText, { color: colors.textPrimary }]}>
            {getGreeting()}
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            Your proactive financial assistant.
          </Text>

          <TouchableOpacity
            style={[styles.intelligenceBanner, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => {
              Sentry.addBreadcrumb({
                category: 'navigation',
                message: 'Monthly Intelligence Opened',
              });
              router.push('/monthly-intelligence');
            }}
          >
            <View style={[styles.intelligenceIconWrap, { backgroundColor: colors.surfaceElevated }]}>
              <DynamicIcon name="Sparkles" size={20} color={colors.primary} />
            </View>
            <View style={styles.intelligenceBannerText}>
              <Text style={[styles.intelligenceBannerTitle, { color: colors.textPrimary }]}>
                Monthly Intelligence
              </Text>
              <Text style={[styles.intelligenceBannerSub, { color: colors.textSecondary }]}>
                Tap to view your detailed portfolio analysis
              </Text>
            </View>
            <DynamicIcon name="ChevronRight" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Error Banner ────────────────────────────────────────────────── */}
        {statsError && !isLoading && (
          <ErrorBanner
            message="Unable to load dashboard data. Check your connection and try again."
            variant="error"
            onRetry={handleRefresh}
            onDismiss={() => {}}
          />
        )}

        {/* ── Loading Skeleton ────────────────────────────────────────────── */}
        {isLoading && (
          <View style={styles.skeletonContainer}>
            {/* Stat cards row */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <SkeletonBox height={12} width="60%" borderRadius={6} />
                <View style={{ height: 12 }} />
                <SkeletonBox height={28} width="40%" borderRadius={8} />
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <SkeletonBox height={12} width="50%" borderRadius={6} />
                <View style={{ height: 12 }} />
                <SkeletonBox height={28} width="50%" borderRadius={8} />
              </View>
            </View>
            {/* Best Category skeleton */}
            <View style={[styles.fullWidthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <SkeletonBox height={14} width="40%" borderRadius={6} />
              <View style={{ height: 8 }} />
              <SkeletonBox height={20} width="30%" borderRadius={8} />
            </View>
            {/* Insight card skeleton */}
            <View style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <SkeletonBox height={12} width="35%" borderRadius={6} />
              <View style={{ height: 16 }} />
              <SkeletonBox height={16} width="90%" borderRadius={8} />
              <View style={{ height: 8 }} />
              <SkeletonBox height={12} width="70%" borderRadius={6} />
            </View>
          </View>
        )}

        {/* ── Empty Dashboard State ───────────────────────────────────────── */}
        {!isLoading && !hasStats && !primaryInsight && (
          <EmptyDashboardState
            onAddCard={() => router.push('/cards')}
            onAddTransaction={() => {
              setQuickStartData(null);
              setFormSheetVisible(true);
            }}
            onQuickStart={(merchant, amount) => {
              setQuickStartData({ merchant_name: merchant, amount: String(amount) });
              setFormSheetVisible(true);
            }}
          />
        )}

        {/* ── Intelligence Cards Section ──────────────────────────────────── */}
        {!isLoading && hasStats && (
          <Animated.View entering={maybeAnimated(100)} style={styles.statsContainer}>
            <View style={styles.statsRow}>
              {/* Optimization Score */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statHeader}>
                  <DynamicIcon name="Trophy" size={16} color={colors.warning} />
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reward Efficiency</Text>
                </View>
                <AnimatedNumber
                  value={monthlySummary?.optimization_rate || 0}
                  suffix="%"
                  style={[styles.statValue, { color: colors.textPrimary }]}
                />
              </View>

              {/* Monthly Rewards (Hero Bento) */}
              <View style={[styles.statCard, { backgroundColor: colors.successSoft, borderColor: colors.success + '30' }]}>
                <View style={styles.statHeader}>
                  <DynamicIcon name="TrendingUp" size={16} color={colors.success} />
                  <Text style={[styles.statLabel, { color: colors.textPrimary }]}>Rewards</Text>
                </View>
                <AnimatedNumber
                  value={monthlySummary?.total_rewards_optimized || 0}
                  prefix="₹"
                  style={[styles.statValue, { color: colors.success }]}
                />
              </View>
            </View>

            {/* Best Category card — now interactive */}
            {!!monthlySummary?.strongest_category && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Sentry.addBreadcrumb({
                    category: 'navigation',
                    message: 'Best Category → Monthly Intelligence',
                  });
                  router.push('/monthly-intelligence');
                }}
              >
                <View style={[styles.fullWidthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.fullWidthRow}>
                    <Text style={[styles.fullWidthLabel, { color: colors.textSecondary }]}>Best Category</Text>
                    <View style={styles.fullWidthValueRow}>
                      <Text style={[styles.fullWidthValue, { color: colors.success, backgroundColor: colors.successSoft }]}>
                        {monthlySummary.strongest_category}
                      </Text>
                      <DynamicIcon name="ChevronRight" size={16} color={colors.textSecondary} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* ── Fee Waiver Alerts ────────────────────────────────────────────── */}
        {!isLoading && feeWaiverAlerts.length > 0 && (
          <Animated.View entering={maybeAnimated(130)} style={{ marginBottom: 28 }}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>FEE WAIVER ALERTS</Text>
            <View style={{ gap: 8 }}>
              {feeWaiverAlerts.map((card) => {
                const isUrgent = card.urgency_level === 'HIGH' || card.urgency_level === 'ELEVATED';
                const urgencyColor = isUrgent ? colors.warning : colors.textSecondary;
                const cardName = card.card_details?.card_name || 'Unknown Card';
                const remaining = card.remaining_spend_for_waiver || 0;
                const monthsLeft = card.days_until_renewal ? Math.max(1, Math.round(card.days_until_renewal / 30)) : null;
                const monthlyTarget = monthsLeft ? Math.round(remaining / monthsLeft) : null;

                return (
                  <TouchableOpacity
                    key={card.id}
                    activeOpacity={0.8}
                    onPress={() => router.push('/cards')}
                    style={[
                      styles.statCard,
                      {
                        backgroundColor: isUrgent ? colors.warning + '0A' : colors.surface,
                        borderColor: isUrgent ? colors.warning + '30' : colors.border,
                        borderLeftWidth: 3,
                        borderLeftColor: urgencyColor,
                      },
                    ]}
                  >
                    <View style={styles.statHeader}>
                      <DynamicIcon
                        name={isUrgent ? 'AlertTriangle' : 'Clock'}
                        size={16}
                        color={urgencyColor}
                      />
                      <Text style={[styles.statLabel, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                        {cardName}
                      </Text>
                    </View>
                    <Text style={[styles.feeWaiverBody, { color: colors.textSecondary }]}>
                      ₹{remaining.toLocaleString('en-IN')} more to waive ₹{(card.effective_fee_waiver_threshold || 0).toLocaleString('en-IN')} fee
                    </Text>
                    {monthsLeft && monthlyTarget && (
                      <Text style={[styles.feeWaiverHint, { color: colors.textMuted }]}>
                        {monthsLeft} month{monthsLeft > 1 ? 's' : ''} remaining · Spend ₹{monthlyTarget.toLocaleString('en-IN')}/month
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* ── Best Card Pairings (Cheat Sheet) ────────────────────────────── */}
        {!isLoading && bestPairings.length > 0 && (
          <Animated.View entering={maybeAnimated(140)} style={{ marginBottom: 28 }}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>YOUR BEST PAIRINGS</Text>
            <View style={[styles.fullWidthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {bestPairings.map((pairing, idx) => (
                <View
                  key={pairing.category}
                  style={[
                    styles.pairingRow,
                    idx < bestPairings.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 10, marginBottom: 10 },
                  ]}
                >
                  <DynamicIcon
                    name={pairing.category === 'FOOD' || pairing.category === 'DINING' ? 'Utensils' : pairing.category === 'FUEL' ? 'Fuel' : pairing.category === 'ECOMMERCE' ? 'ShoppingBag' : pairing.category === 'TRAVEL' ? 'Plane' : pairing.category === 'GROCERY' ? 'ShoppingCart' : 'Tag'}
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.pairingCategory, { color: colors.textPrimary }]}>
                    {pairing.category.charAt(0) + pairing.category.slice(1).toLowerCase()}
                  </Text>
                  <DynamicIcon name="ArrowRight" size={14} color={colors.textMuted} />
                  <Text style={[styles.pairingCard, { color: colors.primary }]} numberOfLines={1}>
                    {pairing.cardName}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── Recent Recommendation Section ──────────────────────────────── */}
        {!isLoading && primaryInsight && (
          <Animated.View
            entering={maybeAnimated(150)}
            style={styles.insightSection}
          >
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>RECENT RECOMMENDATION</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.insightCard,
                {
                  backgroundColor: primaryInsight.badge_color + '0A',
                  borderColor: colors.border,
                  borderLeftWidth: 4,
                  borderLeftColor: primaryInsight.badge_color,
                },
              ]}
            >
              <View style={styles.insightHeader}>
                <View style={styles.insightHeaderLeft}>
                  <DynamicIcon name="Lightbulb" size={18} color={primaryInsight.badge_color} />
                  <View style={[styles.insightBadge, { backgroundColor: primaryInsight.badge_color + '15' }]}>
                    <Text style={[styles.insightBadgeText, { color: primaryInsight.badge_color }]}>
                      {primaryInsight.badge_label}
                    </Text>
                  </View>
                </View>
                <DynamicIcon name="ChevronRight" size={18} color={colors.textSecondary} />
              </View>
              <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
                {primaryInsight.title}
              </Text>
              <Text style={[styles.insightSummary, { color: colors.textSecondary }]}>
                {primaryInsight.summary}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Primary Action Button ───────────────────────────────────────── */}
        <Animated.View
          entering={maybeAnimated(250)}
          style={styles.actionContainer}
        >
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={() => {
              setQuickStartData(null);
              setFormSheetVisible(true);
            }}
          >
            <DynamicIcon name="Plus" size={24} color="#FFF" strokeWidth={2.5} />
            <Text style={styles.primaryActionText}>Add Transaction</Text>
          </TouchableOpacity>
          <Text style={[styles.actionHint, { color: colors.textSecondary }]}>
            Get instant, live recommendations based on your portfolio.
          </Text>
        </Animated.View>
      </ScrollView>

      <TransactionFormSheet
        visible={isFormSheetVisible}
        onClose={() => {
          setFormSheetVisible(false);
          // Small delay before clearing to prevent UI jump during sheet closing animation
          setTimeout(() => setQuickStartData(null), 300);
        }}
        onSuccess={() => {
          showToast('Transaction logged successfully');
          // Refresh dashboard data to reflect the new transaction
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
  scroll: { paddingBottom: 120 },
  header: {
    marginBottom: 32,
  },
  heroText: {
    fontSize: tokens.fontSize.title * 1.5,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tight,
    marginBottom: 6,
  },
  subText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
  },
  intelligenceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
  },
  intelligenceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intelligenceBannerText: {
    flex: 1,
    gap: 2,
  },
  intelligenceBannerTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
  },
  intelligenceBannerSub: {
    fontSize: tokens.fontSize.caption,
  },

  // ── Skeleton ─────────────────────────────────────────────────────────────
  skeletonContainer: {
    gap: 12,
  },

  // ── Stats ────────────────────────────────────────────────────────────────
  statsContainer: {
    marginBottom: 28,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tight,
  },
  fullWidthCard: {
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
  },
  fullWidthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullWidthLabel: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
  },
  fullWidthValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullWidthValue: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    textTransform: 'capitalize',
  },

  // ── Insight ──────────────────────────────────────────────────────────────
  insightSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 12,
    marginLeft: 4,
  },
  insightCard: {
    padding: 20,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  insightBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  insightBadgeText: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  insightTitle: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 6,
  },
  insightSummary: {
    fontSize: tokens.fontSize.body,
    lineHeight: 20,
  },

  // ── Best Pairings ──────────────────────────────────────────────────────
  pairingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pairingCategory: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
    flex: 1,
  },
  pairingCard: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.semibold,
    maxWidth: '50%',
  },

  // ── Fee Waiver ──────────────────────────────────────────────────────────
  feeWaiverBody: {
    fontSize: tokens.fontSize.body,
    lineHeight: 20,
    marginTop: 4,
  },
  feeWaiverHint: {
    fontSize: tokens.fontSize.caption,
    marginTop: 4,
  },

  // ── CTA ─────────────────────────────────────────────────────────────────
  actionContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: tokens.radius.full,
    width: '100%',
  },
  primaryActionText: {
    color: '#FFF',
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: 0.5,
  },
  actionHint: {
    marginTop: 16,
    fontSize: tokens.fontSize.body,
    textAlign: 'center',
    lineHeight: 22,
  },
});
