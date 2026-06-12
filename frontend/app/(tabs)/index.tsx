import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Sparkles, Plus, Trophy, TrendingUp, Lightbulb } from 'lucide-react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { useRouter } from 'expo-router';
import { TransactionFormSheet } from '@/features/transactions/components/TransactionFormSheet';
import { useMonthlyIntelligence } from '@/features/monthly_intelligence/hooks/useMonthlyIntelligence';
import { useSpendInsights } from '@/features/insights/hooks/useSpendInsights';
import { formatCurrencyIN } from '@/utils/currency';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [isFormSheetVisible, setFormSheetVisible] = useState(false);

  // Load existing intelligence data
  const now = new Date();
  const { data: monthlySummary } = useMonthlyIntelligence(now.getFullYear(), now.getMonth() + 1);
  const { primaryInsight } = useSpendInsights();

  const hasStats = monthlySummary && (monthlySummary.total_rewards_optimized > 0 || monthlySummary.optimization_rate > 0);

  return (
    <ScreenContainer>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>
            {getGreeting()} · Smart CC
          </Text>
          <Text style={[styles.heroText, { color: colors.textPrimary }]}>
            Dashboard
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            Your proactive financial assistant.
          </Text>
          
          <TouchableOpacity 
            style={[styles.intelligenceCta, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => router.push('/monthly-intelligence')}
          >
            {/* @ts-ignore */}
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.intelligenceCtaText, { color: colors.textPrimary }]}>
              Your Monthly Intelligence
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Intelligence Cards Section */}
        {hasStats && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsContainer}>
            <View style={styles.statsRow}>
              {/* Optimization Score */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statHeader}>
                  {/* @ts-ignore */}
                  <Trophy size={16} color={colors.warning} />
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Opt. Score</Text>
                </View>
                <AnimatedNumber
                  value={monthlySummary?.optimization_rate || 0}
                  suffix="%"
                  style={[styles.statValue, { color: colors.textPrimary }]}
                />
              </View>

              {/* Monthly Rewards */}
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.statHeader}>
                  {/* @ts-ignore */}
                  <TrendingUp size={16} color={colors.success} />
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rewards</Text>
                </View>
                <AnimatedNumber
                  value={monthlySummary?.total_rewards_optimized || 0}
                  prefix="₹"
                  style={[styles.statValue, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            {/* Best Category card */}
            {!!monthlySummary?.strongest_category && (
              <View style={[styles.fullWidthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.fullWidthRow}>
                  <Text style={[styles.fullWidthLabel, { color: colors.textSecondary }]}>Best Category</Text>
                  <Text style={[styles.fullWidthValue, { color: colors.success, backgroundColor: colors.successSoft }]}>
                    {monthlySummary.strongest_category}
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* Recent Recommendation Section */}
        {primaryInsight && (
          <Animated.View 
            entering={FadeInDown.delay(150).springify()} 
            style={styles.insightSection}
          >
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>RECENT RECOMMENDATION</Text>
            <View style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.insightHeader}>
                {/* @ts-ignore */}
                <Lightbulb size={18} color={colors.primary} />
                <View style={[styles.insightBadge, { backgroundColor: primaryInsight.badge_color + '15' }]}>
                  <Text style={[styles.insightBadgeText, { color: primaryInsight.badge_color }]}>
                    {primaryInsight.badge_label}
                  </Text>
                </View>
              </View>
              <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
                {primaryInsight.title}
              </Text>
              <Text style={[styles.insightSummary, { color: colors.textSecondary }]}>
                {primaryInsight.summary}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Primary Action Button */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary, ...tokens.elevation.glow }]}
            activeOpacity={0.8}
            onPress={() => setFormSheetVisible(true)}
          >
            {/* @ts-ignore */}
            <Plus size={24} color="#FFF" strokeWidth={2.5} />
            <Text style={styles.primaryActionText}>Add Transaction</Text>
          </TouchableOpacity>
          <Text style={[styles.actionHint, { color: colors.textSecondary }]}>
            Get instant, live recommendations based on your portfolio.
          </Text>
        </Animated.View>
      </ScrollView>

      <TransactionFormSheet
        visible={isFormSheetVisible}
        onClose={() => setFormSheetVisible(false)}
        initialData={null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120 },
  header: { marginTop: 16, marginBottom: 24 },
  greeting: {
    fontSize: tokens.fontSize.label,
    fontWeight: tokens.fontWeight.medium,
    letterSpacing: tokens.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroText: {
    fontSize: tokens.fontSize.heroXl,
    fontWeight: tokens.fontWeight.heavy,
    letterSpacing: tokens.letterSpacing.tightest,
    lineHeight: tokens.fontSize.heroXl * 1.05,
    marginBottom: 10,
  },
  subText: {
    fontSize: tokens.fontSize.bodyLg,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: tokens.fontSize.bodyLg * 1.55,
  },
  intelligenceCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  intelligenceCtaText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.wide,
  },
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
  fullWidthValue: {
    fontSize: tokens.fontSize.caption,
    fontWeight: tokens.fontWeight.bold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    textTransform: 'capitalize',
  },
  insightSection: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
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
  actionContainer: {
    alignItems: 'center',
    marginTop: 8,
    padding: 24,
    borderRadius: tokens.radius.card,
    backgroundColor: 'rgba(79, 54, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(79, 54, 255, 0.08)',
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
