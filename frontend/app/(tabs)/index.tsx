import React, { useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenContainer } from '../../components/ui/ScreenContainer';
import { RecommendationForm } from '../../features/recommendations/components/RecommendationForm';
import { RecommendationSkeleton } from '../../features/recommendations/components/RecommendationSkeleton';
import { RecommendationCard } from '../../features/recommendations/components/RecommendationCard';
import { useRecommendation } from '../../features/recommendations/hooks/useRecommendation';
import { AlertCircle, Sparkles } from 'lucide-react-native';
import { useThemeColors } from '../../features/theme/hooks/useThemeColors';
import { RecommendationRequest } from '../../features/recommendations/types/api';
import { tokens } from '../../theme/tokens';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function RecommendationsScreen() {
  const { mutate: evaluateTransaction, data, isPending, isError, error } = useRecommendation();
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);

  const handleSubmit = (formData: RecommendationRequest) => {
    evaluateTransaction(formData, {
      onSuccess: () => {
        setTimeout(() => scrollRef.current?.scrollTo({ y: 200, animated: true }), 150);
      },
    });
  };

  return (
    <ScreenContainer>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>
            {getGreeting()} · Smart CC
          </Text>
          <Text style={[styles.heroText, { color: colors.textPrimary }]}>
            Optimize
          </Text>
          <Text style={[styles.subText, { color: colors.textSecondary }]}>
            Let our engine find the maximum reward value for your purchase.
          </Text>
        </Animated.View>

        {/* Form */}
        <RecommendationForm onSubmit={handleSubmit} isLoading={isPending} />

        {/* Error */}
        {isError && (
          <Animated.View
            entering={FadeInDown.delay(50).springify()}
            style={[
              styles.errorBox,
              { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
            ]}
          >
            {/* @ts-ignore */}
            <AlertCircle size={22} color={colors.danger} strokeWidth={2} />
            <View style={styles.errorText}>
              <Text style={[styles.errorTitle, { color: colors.danger }]}>Analysis Failed</Text>
              <Text style={[styles.errorMsg, { color: colors.danger }]}>
                {(error as any)?.response?.data?.detail ||
                  'An unexpected error occurred. Please try again.'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Loading */}
        {isPending && <RecommendationSkeleton />}

        {/* Results */}
        {!isPending && data && data.ranked_cards.length > 0 && (
          <Animated.View entering={FadeInDown.delay(50)} style={styles.resultsWrap}>
            <View style={styles.resultsHeader}>
              {/* @ts-ignore */}
              <Sparkles size={18} color={colors.success} strokeWidth={2} />
              <Text style={[styles.resultsTitle, { color: colors.textPrimary }]}>
                Optimal Strategy
              </Text>
            </View>
            {data.ranked_cards.map((card, index) => (
              <RecommendationCard key={card.card_id} card={card} index={index} />
            ))}
          </Animated.View>
        )}

        {/* Empty result */}
        {!isPending && data && data.ranked_cards.length === 0 && (
          <Animated.View
            entering={FadeInDown.delay(50).springify()}
            style={[
              styles.emptyResult,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Matching Cards
            </Text>
            <Text style={[styles.emptyMsg, { color: colors.textSecondary }]}>
              We couldn't find any cards in your wallet that yield rewards for this transaction.
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 120 },
  header: { marginTop: 16, marginBottom: 28 },
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    marginBottom: 20,
  },
  errorText: { flex: 1 },
  errorTitle: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 3,
  },
  errorMsg: {
    fontSize: tokens.fontSize.body,
    fontWeight: tokens.fontWeight.medium,
    lineHeight: tokens.fontSize.body * 1.5,
    opacity: 0.85,
  },
  resultsWrap: { marginTop: 8 },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: tokens.fontSize.headline,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.tight,
  },
  emptyResult: {
    padding: 28,
    borderRadius: tokens.radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: tokens.fontSize.title,
    fontWeight: tokens.fontWeight.bold,
    marginBottom: 8,
    letterSpacing: tokens.letterSpacing.tight,
  },
  emptyMsg: {
    fontSize: tokens.fontSize.body,
    lineHeight: tokens.fontSize.body * 1.55,
    textAlign: 'center',
  },
});
