import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { Stack, useRouter as useExpoRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, withRepeat, withSequence, withTiming, useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useEffect } from 'react';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { useThemeStore } from '@/features/theme/store/themeStore';
import { tokens } from '@/theme/tokens';
import { useMonthlyIntelligence } from '@/features/monthly_intelligence/hooks/useMonthlyIntelligence';
import { QueryKeys } from '@/features/core/api/queryKeys';
import { SkeletonBox } from '@/components/ui/SkeletonBox';
import { ErrorBanner } from '@/components/ui/ErrorBanner';

import { HeroNarrative } from '@/features/monthly_intelligence/components/HeroNarrative';
import { BehavioralHighlights } from '@/features/monthly_intelligence/components/BehavioralHighlights';
import { OptimizationTimeline } from '@/features/monthly_intelligence/components/OptimizationTimeline';
import { OptimizationVisuals } from '@/features/monthly_intelligence/components/OptimizationVisuals';
import { ForecastingSurface } from '@/features/monthly_intelligence/components/ForecastingSurface';
import { ExplainabilitySheet } from '@/features/monthly_intelligence/components/ExplainabilitySheet';
import { AnticipatoryState } from '@/features/monthly_intelligence/components/AnticipatoryState';
import { Narrative, Forecast, Streak } from '@/features/monthly_intelligence/types/monthly_intelligence.types';
import { DynamicIcon } from '@/components/DynamicIcon';

function getMonthName(year: number, month: number) {
  return new Date(year, month - 1).toLocaleString('default', { month: 'long' });
}

export default function MonthlyIntelligenceScreen() {
  const router = useExpoRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { themeMode } = useThemeStore();
  const isDark = themeMode === 'dark' || (themeMode === 'system' && colors.background === '#0A0E17');

  // Historical Navigation State
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [isRefreshing, setRefreshing] = useState(false);

  const { data: summary, isLoading, error } = useMonthlyIntelligence(currentYear, currentMonth);

  // Explainability State
  const [explainData, setExplainData] = useState<any>(null);

  // Breathing Skeletons
  const skeletonOpacity = useSharedValue(0.4);
  useEffect(() => {
    skeletonOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);
  const animatedSkeletonStyle = useAnimatedStyle(() => ({ opacity: skeletonOpacity.value }));

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1) return;
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: QueryKeys.monthlyIntelligence.summary(currentYear, currentMonth),
      });
    } finally {
      setRefreshing(false);
    }
  };

  const openExplainability = (item: Narrative | Forecast | Streak) => {
    let type = 'NARRATIVE';
    if ('target_metric' in item) type = 'FORECAST';
    if ('count' in item) type = 'STREAK';

    setExplainData({
      title: item.text,
      reasoning: item.reasoning,
      type,
      metrics: type === 'NARRATIVE' && summary?.supporting_metrics ? summary.supporting_metrics : undefined,
    });
  };

  const monthName = getMonthName(currentYear, currentMonth);
  const isLatestMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />

      {/* CONTENT */}
      {isLoading ? (
        <Animated.View style={[styles.skeletonContainer, { paddingTop: insets.top + 80 }, animatedSkeletonStyle]}>
          {/* Hero skeleton */}
          <View style={styles.skeletonHero}>
            <SkeletonBox height={12} width="30%" borderRadius={6} />
            <View style={{ height: 20 }} />
            <SkeletonBox height={36} width="90%" borderRadius={12} />
            <View style={{ height: 12 }} />
            <SkeletonBox height={14} width="70%" borderRadius={6} />
          </View>
          {/* Chart skeleton */}
          <View style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SkeletonBox height={10} width="40%" borderRadius={5} />
            <View style={{ height: 20 }} />
            <SkeletonBox height={160} width="100%" borderRadius={16} />
          </View>
          {/* Highlights skeleton */}
          <View style={styles.skeletonCard}>
            <SkeletonBox height={10} width="45%" borderRadius={5} />
            <View style={{ height: 16 }} />
            <SkeletonBox height={60} width="100%" borderRadius={12} />
            <View style={{ height: 12 }} />
            <SkeletonBox height={60} width="100%" borderRadius={12} />
          </View>
        </Animated.View>
      ) : error ? (
        <View style={styles.center}>
          <ErrorBanner
            message="Unable to load monthly intelligence. Check your connection and try again."
            variant="error"
            onRetry={handleRefresh}
            onDismiss={() => {}}
          />
        </View>
      ) : !summary ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>Not enough data for this period.</Text>
        </View>
      ) : summary.transaction_count === 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80 }]}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} progressViewOffset={insets.top + 60} />
          }
        >
          <AnticipatoryState />
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80 }]}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} progressViewOffset={insets.top + 60} />
          }
        >
          {summary.narratives && summary.narratives.length > 0 && (
            <HeroNarrative
              narrative={summary.narratives[0]}
              onPressExplain={openExplainability}
            />
          )}

          <OptimizationVisuals summary={summary} />

          <BehavioralHighlights
            summary={summary}
            onPressExplain={openExplainability}
          />

          <OptimizationTimeline
            narratives={summary.narratives?.slice(1) || []}
            streaks={summary.streaks || []}
            onPressExplain={openExplainability}
          />

          <ForecastingSurface
            forecasts={summary.forecasts || []}
            onPressExplain={openExplainability}
          />
        </ScrollView>
      )}

      {/* HEADER: Historical Navigation & Close (Sticky Glass) */}
      <View style={styles.headerAbsolute}>
        <BlurView intensity={isDark ? 80 : 100} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(10,14,23,0.5)' : 'rgba(255,255,255,0.7)' }]} />
        <View style={[styles.headerInner, { paddingTop: insets.top + 12 }]}>
          <View style={styles.navRow}>
            <TouchableOpacity onPress={handlePreviousMonth} style={styles.navBtn} activeOpacity={0.7}>
              <DynamicIcon name="ChevronLeft" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.periodText, { color: colors.textPrimary }]}>
              {monthName} {currentYear}
            </Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              style={[styles.navBtn, isLatestMonth && styles.navBtnDisabled]}
              disabled={isLatestMonth}
              activeOpacity={0.7}
            >
              <DynamicIcon name="ChevronRight" size={22} color={isLatestMonth ? colors.textMuted : colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}
            activeOpacity={0.7}
          >
            <DynamicIcon name="X" size={18} color={colors.textSecondary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
        <View style={[styles.headerHighlight, { backgroundColor: colors.border }]} />
      </View>

      {/* BOTTOM SHEET */}
      <ExplainabilitySheet
        visible={!!explainData}
        onClose={() => setExplainData(null)}
        data={explainData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  periodText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  // ── Skeleton ─────────────────────────────────────────────────────────────
  skeletonContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 24,
  },
  skeletonHero: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  skeletonCard: {
    padding: 24,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
  },
});
