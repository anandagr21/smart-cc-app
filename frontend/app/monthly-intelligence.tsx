import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Stack, useRouter as useExpoRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useMonthlyIntelligence } from '@/features/monthly_intelligence/hooks/useMonthlyIntelligence';

import { HeroNarrative } from '@/features/monthly_intelligence/components/HeroNarrative';
import { BehavioralHighlights } from '@/features/monthly_intelligence/components/BehavioralHighlights';
import { OptimizationTimeline } from '@/features/monthly_intelligence/components/OptimizationTimeline';
import { OptimizationVisuals } from '@/features/monthly_intelligence/components/OptimizationVisuals';
import { ForecastingSurface } from '@/features/monthly_intelligence/components/ForecastingSurface';
import { ExplainabilitySheet } from '@/features/monthly_intelligence/components/ExplainabilitySheet';
import { AnticipatoryState } from '@/features/monthly_intelligence/components/AnticipatoryState';
import { Narrative, Forecast, Streak } from '@/features/monthly_intelligence/types/monthly_intelligence.types';

export default function MonthlyIntelligenceScreen() {
  const router = useExpoRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  // Historical Navigation State
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1); // 1-indexed

  const { data: summary, isLoading, error } = useMonthlyIntelligence(currentYear, currentMonth);

  // Explainability State
  const [explainData, setExplainData] = useState<any>(null);

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    // Prevent going into the future
    if (currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1) return;
    
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
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

  const monthName = new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' });
  const isLatestMonth = currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      
      {/* HEADER: Historical Navigation & Close */}
      <View style={styles.header}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.navBtn}>
            {/* @ts-ignore */}
            <ChevronLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.periodText, { color: colors.textPrimary }]}>
            {monthName} {currentYear}
          </Text>
          <TouchableOpacity 
            onPress={handleNextMonth} 
            style={[styles.navBtn, { opacity: isLatestMonth ? 0.3 : 1 }]}
            disabled={isLatestMonth}
          >
            {/* @ts-ignore */}
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: colors.surface }]}>
          {/* @ts-ignore */}
          <X size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error || !summary ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary }}>Not enough data for this period.</Text>
        </View>
      ) : summary.transaction_count === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <AnticipatoryState />
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {summary.narratives && summary.narratives.length > 0 && (
            <HeroNarrative 
              narrative={summary.narratives[0]} 
              onPressExplain={openExplainability} 
            />
          )}

          <OptimizationVisuals summary={summary} />

          <BehavioralHighlights summary={summary} />

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navBtn: {
    padding: 8,
  },
  periodText: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  },
});
